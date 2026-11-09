import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { coopReputation, getOffer, isCoopMember, networkMatches } from "@/lib/queries";
import { OFFER_KINDS } from "@/db/schema";
import { brl, dateBR } from "@/lib/format";
import { formatDistance, proximity } from "@/lib/geo";
import { ErrorBanner } from "@/components/ui";
import { comprar, demonstrarInteresse, fecharOferta } from "../../actions";

/** Chave Pix trocada nos últimos 7 dias? (aviso para quem vai pagar) */
function changedRecently(at: number | null) {
  return at != null && Date.now() - at < 7 * 86_400_000;
}

export default async function OfertaPage({ params, searchParams }: PageProps<"/mercado/[id]">) {
  const { id } = await params;
  const { erro } = await searchParams;
  const data = await getOffer(Number(id));
  if (!data) notFound();
  const user = await getCurrentUser();
  const { offer, userName, coopName, coopSlug, interests } = data;
  const isOwner = user?.id === offer.userId;
  const matches =
    offer.kind === "ajuda" || offer.kind === "troca"
      ? (await networkMatches()).filter((m) => m.need.id === offer.id)
      : [];
  const coop = offer.coopId
    ? await db.select().from(schema.coops).where(eq(schema.coops.id, offer.coopId)).get()
    : undefined;
  const reputation = coop ? await coopReputation(coop.id) : null;
  const viewerIsMember = user && coop ? await isCoopMember(coop.id, user.id) : false;
  const canBuy = !!coop?.pixKey && offer.priceCents != null && offer.status === "aberta" && !viewerIsMember;
  const near = user ? proximity(user, offer) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ErrorBanner message={typeof erro === "string" ? erro : undefined} />
      <article className="card">
        <div className="flex items-start justify-between gap-3">
          <span className="chip">{OFFER_KINDS[offer.kind]}</span>
          {offer.status === "fechada" && <span className="chip">encerrada</span>}
        </div>
        <h1 className="h-display mt-2 text-3xl">{offer.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {coopName ? (
            <Link href={`/cooperativas/${coopSlug}`} className="text-brand">🏠 {coopName}</Link>
          ) : (
            <Link href={`/pessoas/${offer.userId}`} className="text-brand">{userName}</Link>
          )}
          {[offer.bairro, offer.city].filter(Boolean).map((s) => ` · ${s}`)} · {dateBR(offer.createdAt)}
          {near && near.level !== "longe" && (
            <span className="chip ml-2">{near.level === "bairro" ? "no seu bairro" : near.level === "perto" ? formatDistance(near.km) : "na sua cidade"}</span>
          )}
          {offer.urgent && <span className="chip ml-2 !bg-sun/25 !text-ink">🆘 urgente</span>}
        </p>
        {offer.priceCents != null && <p className="mt-3 text-2xl font-bold text-leaf">{brl(offer.priceCents)}</p>}
        <p className="mt-4 whitespace-pre-line">{offer.description}</p>
        {reputation && (
          <p className="mt-4 text-sm text-muted">
            Reputação de {coopName}: {reputation.completed} venda(s) concluída(s)
            {reputation.rating != null && ` · ${"★".repeat(Math.round(reputation.rating))} (${reputation.rating.toFixed(1)})`}
            {reputation.disputes > 0 && ` · ${reputation.disputes} em disputa`}
          </p>
        )}
        {canBuy &&
          (user ? (
            <form action={comprar} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-surface-2 p-3">
              <input type="hidden" name="offerId" value={offer.id} />
              <label className="text-sm">
                <span className="label">Quantidade</span>
                <input className="input w-20" name="quantity" type="number" min={1} max={99} defaultValue={1} />
              </label>
              <input className="input min-w-40 flex-1" name="note" placeholder="Observação (entrega, retirada…)" />
              <button className="btn">Comprar com Pix</button>
              <p className="w-full text-xs text-muted">
                O pagamento vai direto para a conta da cooperativa ({coop!.pixName}). A plataforma não guarda seu dinheiro.
              </p>
              {changedRecently(coop!.pixKeyUpdatedAt) && (
                <p className="w-full rounded-lg bg-sun/15 px-3 py-2 text-xs">
                  ⚠️ A chave Pix desta cooperativa foi trocada em {dateBR(coop!.pixKeyUpdatedAt ?? 0)}. A troca foi aprovada por outro membro, mas
                  se tiver dúvida, confirme com alguém da cooperativa antes de pagar.
                </p>
              )}
            </form>
          ) : (
            <Link href="/entrar" className="btn mt-4">Entre para comprar</Link>
          ))}
        {isOwner && offer.status === "aberta" && (
          <form action={fecharOferta} className="mt-4">
            <input type="hidden" name="offerId" value={offer.id} />
            <button className="btn-ghost">Marcar como encerrada</button>
          </form>
        )}
      </article>

      {matches.length > 0 && (
        <section className="card border-leaf/40">
          <h2 className="h-display text-xl">🌱 O Guardião sugere</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {matches.map((m) => (
              <li key={`${m.capacity.kind}-${m.capacity.id}`}>
                <Link href={m.capacity.href} className="font-medium text-brand">{m.capacity.title}</Link>{" "}
                <span className="text-muted">({m.capacity.kind === "pessoa" ? "pessoa" : "oferta"}) — {m.reasons.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner ? (
        <section className="card">
          <h2 className="h-display text-xl">Interessados ({interests.length})</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {interests.map((i) => (
              <li key={i.interest.id} className="py-2">
                <b>{i.name}</b> <a className="text-brand" href={`mailto:${i.email}`}>{i.email}</a>
                <p className="text-muted">{i.interest.message}</p>
              </li>
            ))}
            {interests.length === 0 && <li className="text-muted">Ninguém ainda.</li>}
          </ul>
        </section>
      ) : user ? (
        offer.status === "aberta" && (
          <form action={demonstrarInteresse} className="card space-y-3">
            <input type="hidden" name="offerId" value={offer.id} />
            <label className="label" htmlFor="message">
              {offer.kind === "ajuda" ? "Como você pode ajudar?" : "Mensagem para quem publicou"}
            </label>
            <textarea className="input min-h-24" id="message" name="message" required />
            <button className="btn">{offer.kind === "ajuda" ? "Quero ajudar" : "Tenho interesse"}</button>
            <p className="text-xs text-muted">Seu nome e e-mail serão compartilhados com quem publicou.</p>
          </form>
        )
      ) : (
        <Link href="/entrar" className="btn">Entre para responder</Link>
      )}
    </div>
  );
}
