"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { COOP_TYPES, OFFER_KINDS } from "@/db/schema";
import { createSession, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { brl, slugify, str, toCents } from "@/lib/format";
import { appendLedger } from "@/lib/ledger-db";
import { isValidPixKey } from "@/lib/pix";
import { requiredSignatures } from "@/guardiao/seguranca";

const fail = (path: string, msg: string): never => redirect(`${path}?erro=${encodeURIComponent(msg)}`);

/** Lê bairro/cidade/UF/geohash de um formulário. O geohash chega já aproximado pelo navegador. */
function placeFrom(form: FormData) {
  const geohash = str(form, "geohash", 12).toLowerCase();
  return {
    bairro: str(form, "bairro", 80),
    city: str(form, "city", 80),
    uf: str(form, "uf", 2).toUpperCase(),
    // aceitamos no máximo 6 caracteres (~1 km), mesmo que mandem mais
    geohash: /^[0-9bcdefghjkmnpqrstuvwxyz]{4,12}$/.test(geohash) ? geohash.slice(0, 6) : "",
  };
}

async function memberCount(coopId: number) {
  return (await db.select({ id: schema.memberships.id }).from(schema.memberships).where(eq(schema.memberships.coopId, coopId))).length;
}

async function requireMember(coopId: number, userId: number) {
  const m = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.coopId, coopId), eq(schema.memberships.userId, userId)))
    .get();
  return !!m;
}

async function coopById(id: number) {
  const coop = await db.select().from(schema.coops).where(eq(schema.coops.id, id)).get();
  if (!coop) redirect("/cooperativas");
  return coop;
}

// ---------- Contas ----------

export async function cadastrar(form: FormData) {
  const name = str(form, "name", 80);
  const email = str(form, "email", 120).toLowerCase();
  const password = String(form.get("password") ?? "");
  const place = placeFrom(form);
  if (!name || !email.includes("@")) fail("/cadastrar", "Preencha nome e e-mail válidos.");
  if (password.length < 8) fail("/cadastrar", "A senha precisa ter pelo menos 8 caracteres.");
  const exists = await db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (exists) fail("/cadastrar", "Já existe uma conta com esse e-mail.");
  const [user] = await db
    .insert(schema.users)
    .values({ name, email, ...place, passwordHash: await hashPassword(password), skills: str(form, "skills", 300) })
    .returning();
  await createSession(user.id);
  redirect("/bairro");
}

export async function entrar(form: FormData) {
  const email = str(form, "email", 120).toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (!user || !(await verifyPassword(password, user.passwordHash))) fail("/entrar", "E-mail ou senha incorretos.");
  await createSession(user!.id);
  redirect("/bairro");
}

export async function sair() {
  await destroySession();
  redirect("/");
}

export async function atualizarPerfil(form: FormData) {
  const user = await requireUser();
  await db
    .update(schema.users)
    .set({
      name: str(form, "name", 80) || user.name,
      ...placeFrom(form),
      bio: str(form, "bio", 600),
      skills: str(form, "skills", 300),
    })
    .where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
  redirect(`/pessoas/${user.id}`);
}

// ---------- Cooperativas ----------

export async function criarCoop(form: FormData) {
  const user = await requireUser();
  const name = str(form, "name", 100);
  const type = str(form, "type") as schema.CoopType;
  const description = str(form, "description", 3000);
  if (!name || !description) fail("/cooperativas/nova", "Nome e descrição são obrigatórios.");
  if (!(type in COOP_TYPES)) fail("/cooperativas/nova", "Escolha um tipo de cooperativa.");
  const reservePct = Math.max(0, Math.min(100, Number(form.get("reservePct") ?? 20) || 0));
  const socialPct = Math.max(0, Math.min(100 - reservePct, Number(form.get("socialPct") ?? 10) || 0));

  let slug = slugify(name) || "coop";
  if (await db.select().from(schema.coops).where(eq(schema.coops.slug, slug)).get()) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }
  const [coop] = await db
    .insert(schema.coops)
    .values({
      slug,
      name,
      type,
      description,
      ...(() => {
        const p = placeFrom(form);
        return p.city ? p : { bairro: user.bairro, city: user.city, uf: user.uf, geohash: user.geohash };
      })(),
      quotaCents: toCents(form.get("quota")) ?? 0,
      reservePct,
      socialPct,
      createdBy: user.id,
    })
    .returning();
  await db.insert(schema.memberships).values({ coopId: coop.id, userId: user.id, role: "fundador" });
  redirect(`/cooperativas/${coop.slug}`);
}

export async function entrarNaCoop(form: FormData) {
  const user = await requireUser();
  const coop = await coopById(Number(form.get("coopId")));
  await db.insert(schema.memberships).values({ coopId: coop.id, userId: user.id }).onConflictDoNothing();
  revalidatePath(`/cooperativas/${coop.slug}`);
}

export async function sairDaCoop(form: FormData) {
  const user = await requireUser();
  const coop = await coopById(Number(form.get("coopId")));
  await db
    .delete(schema.memberships)
    .where(and(eq(schema.memberships.coopId, coop.id), eq(schema.memberships.userId, user.id)));
  revalidatePath(`/cooperativas/${coop.slug}`);
}

export async function lancarCaixa(form: FormData) {
  const user = await requireUser();
  const coop = await coopById(Number(form.get("coopId")));
  const path = `/cooperativas/${coop.slug}`;
  if (!(await requireMember(coop.id, user.id))) fail(path, "Só membros podem lançar no caixa.");
  const amount = toCents(form.get("amount"));
  const type = form.get("type") === "despesa" ? "despesa" : "receita";
  const description = str(form, "description", 200);
  if (!amount || !description) fail(path, "Informe valor e descrição.");
  const needed = requiredSignatures(await memberCount(coop.id));
  if (type === "despesa" && amount! > coop.expenseLimitCents && needed > 0) {
    // Despesa grande: só entra no caixa depois da assinatura de outro(s) membro(s)
    await db.insert(schema.approvals).values({
      coopId: coop.id,
      kind: "despesa",
      payload: JSON.stringify({ amountCents: amount, description }),
      summary: `Despesa de ${brl(amount)}: ${description}`,
      requestedBy: user.id,
      required: needed,
    });
    revalidatePath(path);
    return;
  }
  await appendLedger({ coopId: coop.id, type, amountCents: amount!, description, createdBy: user.id });
  revalidatePath(path);
}

/** Não existe apagar lançamento: corrige-se com um estorno, que fica visível para sempre. */
export async function estornarLancamento(form: FormData) {
  const user = await requireUser();
  const entry = await db.select().from(schema.ledger).where(eq(schema.ledger.id, Number(form.get("entryId")))).get();
  if (!entry) redirect("/cooperativas");
  const coop = await coopById(entry!.coopId);
  const path = `/cooperativas/${coop.slug}`;
  if (!(await requireMember(coop.id, user.id))) fail(path, "Só membros podem estornar.");
  if (entry!.reversesId != null) fail(path, "Não dá para estornar um estorno.");
  const already = await db.select().from(schema.ledger).where(eq(schema.ledger.reversesId, entry!.id)).get();
  if (already) fail(path, "Esse lançamento já foi estornado.");
  const reason = str(form, "reason", 150) || "correção";
  await appendLedger({
    coopId: coop.id,
    type: entry!.type === "receita" ? "despesa" : "receita",
    amountCents: entry!.amountCents,
    description: `Estorno do #${entry!.id} (${reason})`,
    createdBy: user.id,
    reversesId: entry!.id,
  });
  revalidatePath(path);
}

/** Trocar a chave Pix é o golpe mais comum: exige assinatura de outro membro. */
export async function solicitarChavePix(form: FormData) {
  const user = await requireUser();
  const coop = await coopById(Number(form.get("coopId")));
  const path = `/cooperativas/${coop.slug}`;
  if (!(await requireMember(coop.id, user.id))) fail(path, "Só membros podem alterar o recebimento.");
  const pixKey = str(form, "pixKey", 77);
  const pixName = str(form, "pixName", 60);
  if (!isValidPixKey(pixKey)) fail(path, "Chave Pix inválida. Use CPF/CNPJ só números, e-mail, telefone (+55…) ou chave aleatória.");
  if (!pixName) fail(path, "Informe o nome do titular da conta.");
  const needed = requiredSignatures(await memberCount(coop.id));
  if (needed === 0) {
    await db
      .update(schema.coops)
      .set({ pixKey, pixName, pixKeyUpdatedAt: Date.now() })
      .where(eq(schema.coops.id, coop.id));
  } else {
    await db.insert(schema.approvals).values({
      coopId: coop.id,
      kind: "chave_pix",
      payload: JSON.stringify({ pixKey, pixName }),
      summary: `Mudar a chave Pix de recebimento para "${pixKey}" (titular: ${pixName})`,
      requestedBy: user.id,
      required: needed,
    });
  }
  revalidatePath(path);
}

export async function assinarAprovacao(form: FormData) {
  const user = await requireUser();
  const approval = await db.select().from(schema.approvals).where(eq(schema.approvals.id, Number(form.get("approvalId")))).get();
  if (!approval) redirect("/cooperativas");
  const coop = await coopById(approval!.coopId);
  const path = `/cooperativas/${coop.slug}`;
  if (!(await requireMember(coop.id, user.id))) fail(path, "Só membros assinam.");
  if (approval!.requestedBy === user.id) fail(path, "Quem pediu não pode aprovar o próprio pedido.");
  if (approval!.status !== "pendente") fail(path, "Esse pedido já foi decidido.");
  const decision = form.get("decision") === "rejeitar" ? "rejeitar" : "aprovar";
  await db
    .insert(schema.approvalSignatures)
    .values({ approvalId: approval!.id, userId: user.id, decision })
    .onConflictDoNothing();

  if (decision === "rejeitar") {
    await db.update(schema.approvals).set({ status: "rejeitada" }).where(eq(schema.approvals.id, approval!.id));
    revalidatePath(path);
    return;
  }
  const yes = await db
    .select()
    .from(schema.approvalSignatures)
    .where(and(eq(schema.approvalSignatures.approvalId, approval!.id), eq(schema.approvalSignatures.decision, "aprovar")));
  if (yes.length < approval!.required) {
    revalidatePath(path);
    return;
  }
  // "Reivindica" a execução: só uma requisição consegue mudar de pendente para aprovada
  const claimed = await db
    .update(schema.approvals)
    .set({ status: "aprovada" })
    .where(and(eq(schema.approvals.id, approval!.id), eq(schema.approvals.status, "pendente")))
    .returning();
  if (!claimed.length) {
    revalidatePath(path);
    return;
  }
  const payload = JSON.parse(approval!.payload);
  if (approval!.kind === "chave_pix") {
    await db
      .update(schema.coops)
      .set({ pixKey: payload.pixKey, pixName: payload.pixName, pixKeyUpdatedAt: Date.now() })
      .where(eq(schema.coops.id, coop.id));
  } else {
    await appendLedger({
      coopId: coop.id,
      type: "despesa",
      amountCents: payload.amountCents,
      description: payload.description,
      createdBy: approval!.requestedBy,
      approvedBy: user.id,
    });
  }
  revalidatePath(path);
}

export async function atualizarLocalCoop(form: FormData) {
  const user = await requireUser();
  const coop = await coopById(Number(form.get("coopId")));
  const path = `/cooperativas/${coop.slug}`;
  if (!(await requireMember(coop.id, user.id))) fail(path, "Só membros podem editar.");
  const place = placeFrom(form);
  if (!place.city) fail(path, "Informe ao menos a cidade.");
  await db.update(schema.coops).set(place).where(eq(schema.coops.id, coop.id));
  revalidatePath(path);
}

export async function registrarHoras(form: FormData) {
  const user = await requireUser();
  const coop = await coopById(Number(form.get("coopId")));
  const path = `/cooperativas/${coop.slug}`;
  if (!(await requireMember(coop.id, user.id))) fail(path, "Só membros podem registrar trabalho.");
  const hours = Number(String(form.get("hours") ?? "").replace(",", "."));
  const description = str(form, "description", 200);
  if (!(hours > 0 && hours <= 24 * 7) || !description) fail(path, "Informe horas (até 168) e o que foi feito.");
  await db.insert(schema.workLogs).values({ coopId: coop.id, userId: user.id, hours, description });
  revalidatePath(path);
}

export async function criarProposta(form: FormData) {
  const user = await requireUser();
  const coop = await coopById(Number(form.get("coopId")));
  const path = `/cooperativas/${coop.slug}`;
  if (!(await requireMember(coop.id, user.id))) fail(path, "Só membros podem propor.");
  const title = str(form, "title", 140);
  const body = str(form, "body", 4000);
  const days = Math.max(1, Math.min(30, Number(form.get("days") ?? 7) || 7));
  if (!title || !body) fail(path, "Proposta precisa de título e descrição.");
  await db.insert(schema.proposals).values({
    coopId: coop.id,
    authorId: user.id,
    title,
    body,
    closesAt: Date.now() + days * 24 * 60 * 60 * 1000,
  });
  revalidatePath(path);
}

export async function votar(form: FormData) {
  const user = await requireUser();
  const proposal = await db
    .select()
    .from(schema.proposals)
    .where(eq(schema.proposals.id, Number(form.get("proposalId"))))
    .get();
  if (!proposal) redirect("/cooperativas");
  const coop = await coopById(proposal!.coopId);
  const path = `/cooperativas/${coop.slug}`;
  if (!(await requireMember(coop.id, user.id))) fail(path, "Só membros votam (1 pessoa = 1 voto).");
  if (proposal!.closesAt < Date.now()) fail(path, "Essa votação já encerrou.");
  const choice = String(form.get("choice"));
  if (!["sim", "nao", "abstencao"].includes(choice)) fail(path, "Voto inválido.");
  await db
    .insert(schema.votes)
    .values({ proposalId: proposal!.id, userId: user.id, choice: choice as "sim" | "nao" | "abstencao" })
    .onConflictDoUpdate({
      target: [schema.votes.proposalId, schema.votes.userId],
      set: { choice: choice as "sim" | "nao" | "abstencao", createdAt: Date.now() },
    });
  revalidatePath(path);
}

// ---------- Mercado / trocas / ajuda ----------

export async function criarOferta(form: FormData) {
  const user = await requireUser();
  const kind = str(form, "kind") as schema.OfferKind;
  const title = str(form, "title", 120);
  const description = str(form, "description", 3000);
  if (!(kind in OFFER_KINDS) || !title || !description) fail("/mercado/nova", "Preencha tipo, título e descrição.");
  const coopIdRaw = Number(form.get("coopId"));
  let coopId: number | null = null;
  let place = { bairro: user.bairro, city: user.city, geohash: user.geohash };
  if (coopIdRaw) {
    if (!(await requireMember(coopIdRaw, user.id))) fail("/mercado/nova", "Você só pode publicar em nome de cooperativas das quais é membro.");
    coopId = coopIdRaw;
    const c = await coopById(coopIdRaw);
    place = { bairro: c.bairro, city: c.city, geohash: c.geohash };
  }
  const [offer] = await db
    .insert(schema.offers)
    .values({
      userId: user.id,
      coopId,
      kind,
      title,
      description,
      priceCents: kind === "produto" || kind === "servico" ? toCents(form.get("price")) : null,
      ...place,
      urgent: kind === "ajuda" && form.get("urgent") === "on",
    })
    .returning();
  redirect(`/mercado/${offer.id}`);
}

export async function demonstrarInteresse(form: FormData) {
  const user = await requireUser();
  const offerId = Number(form.get("offerId"));
  const message = str(form, "message", 1000);
  if (!message) fail(`/mercado/${offerId}`, "Escreva uma mensagem.");
  await db
    .insert(schema.interests)
    .values({ offerId, userId: user.id, message })
    .onConflictDoUpdate({ target: [schema.interests.offerId, schema.interests.userId], set: { message } });
  revalidatePath(`/mercado/${offerId}`);
}

export async function fecharOferta(form: FormData) {
  const user = await requireUser();
  const offerId = Number(form.get("offerId"));
  await db
    .update(schema.offers)
    .set({ status: "fechada" })
    .where(and(eq(schema.offers.id, offerId), eq(schema.offers.userId, user.id)));
  revalidatePath("/mercado");
  redirect("/mercado");
}

// ---------- Pedidos (venda interna com Pix direto) ----------

async function orderFor(form: FormData) {
  const order = await db.select().from(schema.orders).where(eq(schema.orders.id, Number(form.get("orderId")))).get();
  if (!order) redirect("/pedidos");
  return order!;
}

async function setOrderStatus(id: number, from: schema.OrderStatus[], to: schema.OrderStatus, extra: Partial<schema.Order> = {}) {
  const rows = await db
    .update(schema.orders)
    .set({ ...extra, status: to, updatedAt: Date.now() })
    .where(and(eq(schema.orders.id, id), inArray(schema.orders.status, from)))
    .returning();
  return rows.length > 0;
}

export async function comprar(form: FormData) {
  const user = await requireUser();
  const offer = await db.select().from(schema.offers).where(eq(schema.offers.id, Number(form.get("offerId")))).get();
  if (!offer) redirect("/mercado");
  const path = `/mercado/${offer!.id}`;
  if (offer!.status !== "aberta" || offer!.priceCents == null || offer!.coopId == null) fail(path, "Esta oferta não aceita compra direta.");
  const coop = await coopById(offer!.coopId!);
  if (!coop.pixKey) fail(path, "Essa cooperativa ainda não configurou o recebimento por Pix.");
  if (await requireMember(coop.id, user.id)) fail(path, "Você é membro dessa cooperativa — registre a venda direto no caixa.");
  const quantity = Math.max(1, Math.min(99, Number(form.get("quantity") ?? 1) || 1));
  const [order] = await db
    .insert(schema.orders)
    .values({
      offerId: offer!.id,
      buyerId: user.id,
      sellerId: offer!.userId,
      coopId: coop.id,
      quantity,
      totalCents: offer!.priceCents! * quantity,
      pixKey: coop.pixKey,
      pixName: coop.pixName,
      txid: "",
      note: str(form, "note", 300),
    })
    .returning();
  const txid = `MUT${order.id}`;
  await db.update(schema.orders).set({ txid }).where(eq(schema.orders.id, order.id));
  redirect(`/pedidos/${order.id}`);
}

export async function informarPagamento(form: FormData) {
  const user = await requireUser();
  const order = await orderFor(form);
  if (order.buyerId !== user.id) fail(`/pedidos/${order.id}`, "Só quem comprou informa o pagamento.");
  await setOrderStatus(order.id, ["aguardando_pagamento"], "pagamento_informado");
  revalidatePath(`/pedidos/${order.id}`);
}

/** A cooperativa confere o extrato e confirma. Só então a receita entra no caixa. */
export async function confirmarPagamento(form: FormData) {
  const user = await requireUser();
  const order = await orderFor(form);
  const path = `/pedidos/${order.id}`;
  if (!(await requireMember(order.coopId!, user.id))) fail(path, "Só membros da cooperativa confirmam o recebimento.");
  if (await setOrderStatus(order.id, ["pagamento_informado", "aguardando_pagamento"], "pago")) {
    await appendLedger({
      coopId: order.coopId!,
      type: "receita",
      amountCents: order.totalCents,
      description: `Venda — pedido #${order.id}`,
      createdBy: user.id,
      orderId: order.id,
    });
  }
  revalidatePath(path);
}

export async function confirmarEntrega(form: FormData) {
  const user = await requireUser();
  const order = await orderFor(form);
  const path = `/pedidos/${order.id}`;
  if (order.buyerId !== user.id) fail(path, "Só quem comprou confirma a entrega.");
  const rating = Number(form.get("rating"));
  await setOrderStatus(order.id, ["pago", "em_disputa"], "entregue", {
    rating: rating >= 1 && rating <= 5 ? Math.round(rating) : null,
    review: str(form, "review", 500) || null,
  });
  revalidatePath(path);
}

export async function abrirDisputa(form: FormData) {
  const user = await requireUser();
  const order = await orderFor(form);
  const path = `/pedidos/${order.id}`;
  const isSeller = await requireMember(order.coopId!, user.id);
  if (order.buyerId !== user.id && !isSeller) fail(path, "Só as partes do pedido podem abrir disputa.");
  const reason = str(form, "reason", 600);
  if (!reason) fail(path, "Explique o que aconteceu.");
  await setOrderStatus(order.id, ["pagamento_informado", "pago"], "em_disputa", {
    disputeReason: `${isSeller ? "Cooperativa" : "Comprador(a)"}: ${reason}`,
  });
  revalidatePath(path);
}

export async function cancelarPedido(form: FormData) {
  const user = await requireUser();
  const order = await orderFor(form);
  const path = `/pedidos/${order.id}`;
  const isSeller = await requireMember(order.coopId!, user.id);
  // Comprador só cancela antes de pagar; a cooperativa pode cancelar disputas (devolvendo o dinheiro por fora e estornando no caixa)
  const allowed: schema.OrderStatus[] = isSeller ? ["aguardando_pagamento", "pagamento_informado", "em_disputa"] : order.buyerId === user.id ? ["aguardando_pagamento"] : [];
  if (!(await setOrderStatus(order.id, allowed, "cancelado"))) fail(path, "Este pedido não pode ser cancelado agora.");
  revalidatePath(path);
}
