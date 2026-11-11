import "server-only";
import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { computeHealth } from "@/guardiao/saude";
import { distributeSurplus } from "@/guardiao/sobras";
import { suggestFacilitators } from "@/guardiao/lideranca";
import { matchNeeds, type Capacity, type Need } from "@/guardiao/conexoes";
import { securityAlerts, requiredSignatures } from "@/guardiao/seguranca";
import { verifyChain } from "@/lib/ledger";
import { proximity, type Place } from "@/lib/geo";

const { coops, memberships, users, ledger, workLogs, proposals, votes, offers, orders, approvals, approvalSignatures } = schema;
const DAY = 24 * 60 * 60 * 1000;

export async function listCoops(type?: string) {
  const rows = await db
    .select({
      coop: coops,
      members: sql<number>`(select count(*) from memberships m where m.coop_id = "coops"."id")`,
    })
    .from(coops)
    .where(type ? eq(coops.type, type as schema.CoopType) : undefined)
    .orderBy(desc(coops.createdAt));
  return rows;
}

export async function getCoopDetail(slug: string, viewerId?: number) {
  const coop = await db.select().from(coops).where(eq(coops.slug, slug)).get();
  if (!coop) return null;
  const now = Date.now();
  const since = now - 90 * DAY;

  const [members, entries, logs, props, coopOffers] = await Promise.all([
    db
      .select({ userId: users.id, name: users.name, city: users.city, skills: users.skills, role: memberships.role, joinedAt: memberships.joinedAt })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.coopId, coop.id))
      .orderBy(memberships.joinedAt),
    db.select().from(ledger).where(eq(ledger.coopId, coop.id)).orderBy(asc(ledger.id)),
    db
      .select({ log: workLogs, name: users.name })
      .from(workLogs)
      .innerJoin(users, eq(users.id, workLogs.userId))
      .where(eq(workLogs.coopId, coop.id))
      .orderBy(desc(workLogs.createdAt)),
    db
      .select({ proposal: proposals, author: users.name })
      .from(proposals)
      .innerJoin(users, eq(users.id, proposals.authorId))
      .where(eq(proposals.coopId, coop.id))
      .orderBy(desc(proposals.createdAt)),
    db.select().from(offers).where(eq(offers.coopId, coop.id)).orderBy(desc(offers.createdAt)),
  ]);

  const chain = verifyChain(entries);
  entries.reverse(); // mais recentes primeiro para exibição

  const [coopOrders, pendingApprovals, reputation] = await Promise.all([
    db
      .select({ order: orders, buyer: users.name, offerTitle: offers.title })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.buyerId))
      .innerJoin(offers, eq(offers.id, orders.offerId))
      .where(eq(orders.coopId, coop.id))
      .orderBy(desc(orders.updatedAt)),
    db
      .select({ approval: approvals, requester: users.name })
      .from(approvals)
      .innerJoin(users, eq(users.id, approvals.requestedBy))
      .where(and(eq(approvals.coopId, coop.id), eq(approvals.status, "pendente")))
      .orderBy(desc(approvals.createdAt)),
    coopReputation(coop.id),
  ]);
  const sigs = pendingApprovals.length
    ? await db
        .select()
        .from(approvalSignatures)
        .where(inArray(approvalSignatures.approvalId, pendingApprovals.map((a) => a.approval.id)))
    : [];
  const approvalsView = pendingApprovals.map(({ approval, requester }) => ({
    ...approval,
    requester,
    signatures: sigs.filter((x) => x.approvalId === approval.id && x.decision === "aprovar").length,
    canSign:
      viewerId != null &&
      viewerId !== approval.requestedBy &&
      !sigs.some((x) => x.approvalId === approval.id && x.userId === viewerId),
  }));

  const propIds = props.map((p) => p.proposal.id);
  const allVotes = propIds.length ? await db.select().from(votes).where(inArray(votes.proposalId, propIds)) : [];

  const isMember = viewerId != null && members.some((m) => m.userId === viewerId);
  const memberCountAt = (t: number) => members.filter((m) => m.joinedAt <= t).length || members.length;

  const proposalsView = props.map(({ proposal, author }) => {
    const pv = allVotes.filter((v) => v.proposalId === proposal.id);
    const tally = { sim: 0, nao: 0, abstencao: 0 };
    pv.forEach((v) => tally[v.choice]++);
    const open = proposal.closesAt > now;
    const eligible = memberCountAt(proposal.createdAt);
    // Aprovação: maioria simples dos votos válidos + quórum de metade dos membros
    const quorum = pv.length >= Math.ceil(eligible / 2);
    const result = open ? "em votação" : !quorum ? "sem quórum" : tally.sim > tally.nao ? "aprovada" : "rejeitada";
    return {
      ...proposal,
      author,
      tally,
      voters: pv.length,
      eligible,
      open,
      result,
      myVote: viewerId ? pv.find((v) => v.userId === viewerId)?.choice : undefined,
    };
  });

  // ---- Guardião ----
  const recentLedger = entries.filter((e) => e.createdAt >= since);
  const recentLogs = logs.filter((l) => l.log.createdAt >= since);
  const hoursRecent = new Map<number, number>();
  recentLogs.forEach((l) => hoursRecent.set(l.log.userId, (hoursRecent.get(l.log.userId) ?? 0) + l.log.hours));

  const health = computeHealth({
    now,
    memberCount: members.length,
    newMembers90d: members.filter((m) => m.joinedAt >= since).length,
    recentProposals: proposalsView
      .filter((p) => p.createdAt >= since)
      .map((p) => ({ authorId: p.authorId, voters: p.voters, membersAtTime: p.eligible })),
    hoursByMember: members.map((m) => hoursRecent.get(m.userId) ?? 0),
    income90d: recentLedger.filter((e) => e.type === "receita").reduce((a, e) => a + e.amountCents, 0),
    expense90d: recentLedger.filter((e) => e.type === "despesa").reduce((a, e) => a + e.amountCents, 0),
    lastLedgerAt: entries[0]?.createdAt ?? null,
  });

  // Sobras: considera todo o histórico do caixa e todas as horas
  const hoursAll = new Map<number, number>();
  logs.forEach((l) => hoursAll.set(l.log.userId, (hoursAll.get(l.log.userId) ?? 0) + l.log.hours));
  const totalIncome = entries.filter((e) => e.type === "receita").reduce((a, e) => a + e.amountCents, 0);
  const totalExpense = entries.filter((e) => e.type === "despesa").reduce((a, e) => a + e.amountCents, 0);
  const surplus = distributeSurplus({
    incomeCents: totalIncome,
    expenseCents: totalExpense,
    reservePct: coop.reservePct,
    socialPct: coop.socialPct,
    hoursByMember: members.map((m) => ({ userId: m.userId, name: m.name, hours: hoursAll.get(m.userId) ?? 0 })),
  });

  const facilitators = suggestFacilitators(
    members.map((m) => ({
      userId: m.userId,
      name: m.name,
      proposalsAuthored: props.filter((p) => p.proposal.authorId === m.userId && p.proposal.createdAt >= since).length,
      votesCast: allVotes.filter((v) => v.userId === m.userId && v.createdAt >= since).length,
      hours: hoursRecent.get(m.userId) ?? 0,
    })),
  );

  const memberName = new Map(members.map((m) => [m.userId, m.name]));
  const security = securityAlerts({
    now,
    chain,
    pixKeyUpdatedAt: coop.pixKeyUpdatedAt,
    expenses: entries
      .filter((e) => e.type === "despesa" && e.reversesId == null)
      .map((e) => ({
        id: e.id,
        amountCents: e.amountCents,
        createdBy: e.createdBy,
        createdByName: memberName.get(e.createdBy) ?? "ex-membro",
        createdAt: e.createdAt,
      })),
    memberCount: members.length,
    pendingApprovals: approvalsView.filter((a) => a.canSign).length,
    disputes: coopOrders.filter((o) => o.order.status === "em_disputa").length,
    ordersAwaitingConfirmation: coopOrders
      .filter((o) => o.order.status === "pagamento_informado")
      .map((o) => ({ id: o.order.id, createdAt: o.order.updatedAt })),
  });
  const reversed = new Set(entries.filter((e) => e.reversesId != null).map((e) => e.reversesId));

  return {
    coop,
    members,
    entries,
    reversed,
    chain,
    orders: coopOrders,
    approvals: approvalsView,
    reputation,
    signaturesNeeded: requiredSignatures(members.length),
    logs,
    proposals: proposalsView,
    offers: coopOffers,
    isMember,
    totals: { income: totalIncome, expense: totalExpense },
    guardiao: { health, surplus, facilitators, security },
  };
}

export async function listOffers(kind?: string) {
  return db
    .select({
      offer: offers,
      userName: users.name,
      coopName: coops.name,
      coopSlug: coops.slug,
      interests: sql<number>`(select count(*) from interests i where i.offer_id = "offers"."id")`,
    })
    .from(offers)
    .innerJoin(users, eq(users.id, offers.userId))
    .leftJoin(coops, eq(coops.id, offers.coopId))
    .where(and(eq(offers.status, "aberta"), kind ? eq(offers.kind, kind as schema.OfferKind) : undefined))
    .orderBy(desc(offers.createdAt));
}

export async function getOffer(id: number) {
  const row = await db
    .select({ offer: offers, userName: users.name, userCity: users.city, coopName: coops.name, coopSlug: coops.slug })
    .from(offers)
    .innerJoin(users, eq(users.id, offers.userId))
    .leftJoin(coops, eq(coops.id, offers.coopId))
    .where(eq(offers.id, id))
    .get();
  if (!row) return null;
  const ints = await db
    .select({ interest: schema.interests, name: users.name, email: users.email })
    .from(schema.interests)
    .innerJoin(users, eq(users.id, schema.interests.userId))
    .where(eq(schema.interests.offerId, id))
    .orderBy(desc(schema.interests.createdAt));
  return { ...row, interests: ints };
}

/** Conexões sugeridas pelo Guardião para toda a rede (ou só para os pedidos de um usuário). */
export async function networkMatches(onlyUserId?: number) {
  const open = await db
    .select({ offer: offers, coopId: offers.coopId })
    .from(offers)
    .where(and(eq(offers.status, "aberta"), gte(offers.createdAt, Date.now() - 180 * DAY)));
  const needs: Need[] = open
    .filter((o) => o.offer.kind === "ajuda" || o.offer.kind === "troca")
    .filter((o) => (onlyUserId ? o.offer.userId === onlyUserId : true))
    .map((o) => ({
      id: o.offer.id,
      title: o.offer.title,
      description: o.offer.description,
      city: o.offer.city,
      bairro: o.offer.bairro,
      geohash: o.offer.geohash,
      userId: o.offer.userId,
      urgent: o.offer.urgent,
    }));

  const people = await db
    .select({ id: users.id, name: users.name, city: users.city, bairro: users.bairro, geohash: users.geohash, skills: users.skills, bio: users.bio })
    .from(users);
  const capacities: Capacity[] = [
    ...open
      .filter((o) => o.offer.kind !== "ajuda")
      .map((o) => ({
        kind: "oferta" as const,
        id: o.offer.id,
        title: o.offer.title,
        text: o.offer.description,
        city: o.offer.city,
        bairro: o.offer.bairro,
        geohash: o.offer.geohash,
        ownerId: o.offer.userId,
        isCoop: o.coopId != null,
        href: `/mercado/${o.offer.id}`,
      })),
    ...people
      .filter((p) => p.skills.trim())
      .map((p) => ({
        kind: "pessoa" as const,
        id: p.id,
        title: p.name,
        text: `${p.skills} ${p.bio}`,
        city: p.city,
        bairro: p.bairro,
        geohash: p.geohash,
        ownerId: p.id,
        isCoop: false,
        href: `/pessoas/${p.id}`,
      })),
  ];
  return matchNeeds(needs, capacities);
}

/** Reputação pública de uma cooperativa como vendedora. */
export async function coopReputation(coopId: number) {
  const rows = await db.select({ status: orders.status, rating: orders.rating }).from(orders).where(eq(orders.coopId, coopId));
  const done = rows.filter((r) => r.status === "entregue");
  const rated = done.filter((r) => r.rating != null);
  return {
    completed: done.length,
    disputes: rows.filter((r) => r.status === "em_disputa").length,
    rating: rated.length ? rated.reduce((a, r) => a + (r.rating ?? 0), 0) / rated.length : null,
    ratings: rated.length,
  };
}

export async function listMyOrders(userId: number) {
  const myCoopIds = (await db.select({ id: memberships.coopId }).from(memberships).where(eq(memberships.userId, userId))).map((r) => r.id);
  return db
    .select({ order: orders, offerTitle: offers.title, coopName: coops.name, buyer: users.name })
    .from(orders)
    .innerJoin(offers, eq(offers.id, orders.offerId))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .leftJoin(coops, eq(coops.id, orders.coopId))
    .where(myCoopIds.length ? or(eq(orders.buyerId, userId), inArray(orders.coopId, myCoopIds)) : eq(orders.buyerId, userId))
    .orderBy(desc(orders.updatedAt));
}

export async function getOrder(id: number) {
  return db
    .select({ order: orders, offerTitle: offers.title, coopName: coops.name, coopSlug: coops.slug, coopCity: coops.city, coopDemo: coops.demo, buyer: users.name })
    .from(orders)
    .innerJoin(offers, eq(offers.id, orders.offerId))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .leftJoin(coops, eq(coops.id, orders.coopId))
    .where(eq(orders.id, id))
    .get();
}

export async function isCoopMember(coopId: number | null, userId: number) {
  if (coopId == null) return false;
  const m = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.coopId, coopId), eq(memberships.userId, userId)))
    .get();
  return !!m;
}

/** Tudo o que está perto de um lugar: vizinhos, cooperativas e ofertas, do mais perto ao mais longe. */
export async function neighborhood(place: Place, viewerId?: number) {
  const rank = { bairro: 0, perto: 1, cidade: 2, longe: 3 } as const;
  function near<T extends Place>(items: T[]) {
    return items
      .map((it) => ({ ...it, near: proximity(place, it) }))
      .filter((it) => it.near.level !== "longe")
      .sort((a, b) => rank[a.near.level] - rank[b.near.level] || (a.near.km ?? 99) - (b.near.km ?? 99));
  }
  const [people, coopRows, offerRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, city: users.city, bairro: users.bairro, geohash: users.geohash, skills: users.skills, demo: users.demo }).from(users),
    listCoops(),
    listOffers(),
  ]);
  return {
    people: near(people.filter((p) => p.id !== viewerId)),
    coops: near(coopRows.map((c) => ({ ...c, city: c.coop.city, bairro: c.coop.bairro, geohash: c.coop.geohash }))),
    offers: near(offerRows.map((o) => ({ ...o, city: o.offer.city, bairro: o.offer.bairro, geohash: o.offer.geohash }))).sort(
      (a, b) => Number(b.offer.urgent) - Number(a.offer.urgent),
    ),
  };
}

// ---------- Mural (ideias, problemas, design) ----------

export type MuralSort = "apoios" | "recentes";

export async function listPosts(
  coopId: number,
  opts: { kind?: string; status?: string; sort?: MuralSort; viewerId?: number; limit?: number } = {},
) {
  const { posts } = schema;
  const supports = sql<number>`(select count(*) from post_supports s where s.post_id = "posts"."id")`;
  const rows = await db
    .select({
      post: posts,
      author: users.name,
      supports,
      comments: sql<number>`(select count(*) from post_comments c where c.post_id = "posts"."id")`,
      mine: opts.viewerId
        ? sql<number>`exists(select 1 from post_supports s where s.post_id = "posts"."id" and s.user_id = ${opts.viewerId})`
        : sql<number>`0`,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(
      and(
        eq(posts.coopId, coopId),
        opts.kind && opts.kind in schema.POST_KINDS ? eq(posts.kind, opts.kind as schema.PostKind) : undefined,
        opts.status && opts.status in schema.POST_STATUS
          ? eq(posts.status, opts.status as schema.PostStatus)
          : inArray(posts.status, ["aberta", "em_andamento"]),
      ),
    )
    .orderBy(...(opts.sort === "recentes" ? [desc(posts.createdAt)] : [desc(supports), desc(posts.createdAt)]))
    .limit(opts.limit ?? 200);
  return rows.map((r) => ({ ...r, supports: Number(r.supports), comments: Number(r.comments), mine: !!Number(r.mine) }));
}

export async function getPost(id: number, viewerId?: number) {
  const { posts, postComments, postSupports } = schema;
  const row = await db
    .select({ post: posts, author: users.name, coop: coops })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(coops, eq(coops.id, posts.coopId))
    .where(eq(posts.id, id))
    .get();
  if (!row) return null;
  const [comments, supporters, member] = await Promise.all([
    db
      .select({ comment: postComments, author: users.name })
      .from(postComments)
      .innerJoin(users, eq(users.id, postComments.authorId))
      .where(eq(postComments.postId, id))
      .orderBy(asc(postComments.id)),
    db
      .select({ userId: users.id, name: users.name })
      .from(postSupports)
      .innerJoin(users, eq(users.id, postSupports.userId))
      .where(eq(postSupports.postId, id)),
    viewerId ? isCoopMember(row.coop.id, viewerId) : Promise.resolve(false),
  ]);
  const memberIds = new Set(
    (await db.select({ userId: memberships.userId }).from(memberships).where(eq(memberships.coopId, row.coop.id))).map((m) => m.userId),
  );
  return {
    ...row,
    comments: comments.map((c) => ({ ...c, isMember: memberIds.has(c.comment.authorId) })),
    supporters,
    mine: !!viewerId && supporters.some((s) => s.userId === viewerId),
    isMember: member,
  };
}
