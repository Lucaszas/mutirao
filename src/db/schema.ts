import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const now = sql`(unixepoch() * 1000)`;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  city: text("city").notNull().default(""),
  // Localização aproximada: bairro + UF + geohash de 6 caracteres (~1 km). Nunca guardamos coordenada exata.
  bairro: text("bairro").notNull().default(""),
  uf: text("uf").notNull().default(""),
  geohash: text("geohash").notNull().default(""),
  bio: text("bio").notNull().default(""),
  // Habilidades separadas por vírgula: "costura, marcenaria, contabilidade"
  skills: text("skills").notNull().default(""),
  // Dado de exemplo (placeholder) — aparece com o selo "exemplo"
  demo: integer("demo", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

export const COOP_TYPES = {
  mercado: "Mercado / consumo",
  agricultura: "Agricultura / alimentos",
  fabrica: "Fábrica / produção",
  artesanato: "Artesanato",
  produtora: "Produtora / audiovisual",
  teatro: "Teatro / artes cênicas",
  servicos: "Serviços",
  tecnologia: "Tecnologia",
  moradia: "Moradia",
  credito: "Crédito / finanças solidárias",
  outro: "Outro",
} as const;
export type CoopType = keyof typeof COOP_TYPES;

export const coops = sqliteTable("coops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull().$type<CoopType>(),
  description: text("description").notNull(),
  city: text("city").notNull().default(""),
  bairro: text("bairro").notNull().default(""),
  uf: text("uf").notNull().default(""),
  geohash: text("geohash").notNull().default(""),
  // Recebimento: o dinheiro vai DIRETO para a chave Pix da cooperativa (a plataforma nunca guarda dinheiro)
  pixKey: text("pix_key").notNull().default(""),
  pixName: text("pix_name").notNull().default(""),
  pixKeyUpdatedAt: integer("pix_key_updated_at"),
  // Despesas acima deste valor precisam de aprovação de outro membro
  expenseLimitCents: integer("expense_limit_cents").notNull().default(50000),
  // Valor da cota-parte de entrada, em centavos
  quotaCents: integer("quota_cents").notNull().default(0),
  // Regras de distribuição das sobras (percentuais)
  reservePct: integer("reserve_pct").notNull().default(20), // fundo de reserva indivisível
  socialPct: integer("social_pct").notNull().default(10), // fundo social / expansão / intercooperação
  // Dado de exemplo (placeholder) — aparece com o selo "exemplo"
  demo: integer("demo", { mode: "boolean" }).notNull().default(false),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull().default(now),
});

export const memberships = sqliteTable(
  "memberships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    coopId: integer("coop_id").notNull().references(() => coops.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().$type<"fundador" | "membro">().default("membro"),
    joinedAt: integer("joined_at").notNull().default(now),
  },
  (t) => [uniqueIndex("membership_unique").on(t.coopId, t.userId)],
);

export const OFFER_KINDS = {
  produto: "Produto à venda",
  servico: "Serviço",
  troca: "Troca",
  ajuda: "Pedido de ajuda",
} as const;
export type OfferKind = keyof typeof OFFER_KINDS;

export const offers = sqliteTable("offers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coopId: integer("coop_id").references(() => coops.id, { onDelete: "set null" }),
  kind: text("kind").notNull().$type<OfferKind>(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents"),
  city: text("city").notNull().default(""),
  bairro: text("bairro").notNull().default(""),
  geohash: text("geohash").notNull().default(""),
  // Pedido urgente (crise, saúde, alimento): aparece primeiro no bairro
  urgent: integer("urgent", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().$type<"aberta" | "fechada">().default("aberta"),
  // Dado de exemplo (placeholder) — aparece com o selo "exemplo"
  demo: integer("demo", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now),
});

export const interests = sqliteTable(
  "interests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    offerId: integer("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("interest_unique").on(t.offerId, t.userId)],
);

// Livro-caixa aberto e encadeado: cada lançamento guarda o hash do anterior.
// Não existe editar nem apagar — correções são feitas com um lançamento de estorno.
export const ledger = sqliteTable(
  "ledger",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    coopId: integer("coop_id").notNull().references(() => coops.id, { onDelete: "cascade" }),
    type: text("type").notNull().$type<"receita" | "despesa">(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description").notNull(),
    createdBy: integer("created_by").notNull().references(() => users.id),
    approvedBy: integer("approved_by").references(() => users.id),
    orderId: integer("order_id"),
    reversesId: integer("reverses_id"),
    prevHash: text("prev_hash").notNull().default(""),
    hash: text("hash").notNull().default(""),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("ledger_coop").on(t.coopId, t.id)],
);

// Pedidos do mercado interno. O pagamento é Pix direto para a cooperativa/vendedor;
// a plataforma só registra e coordena as confirmações das duas partes.
export const ORDER_STATUS = {
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_informado: "Pagamento informado",
  pago: "Pagamento confirmado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  em_disputa: "Em disputa",
} as const;
export type OrderStatus = keyof typeof ORDER_STATUS;

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  offerId: integer("offer_id").notNull().references(() => offers.id),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  coopId: integer("coop_id").references(() => coops.id),
  quantity: integer("quantity").notNull().default(1),
  totalCents: integer("total_cents").notNull(),
  // Chave Pix "congelada" no momento do pedido — se alguém trocar a chave depois, o pedido não muda
  pixKey: text("pix_key").notNull(),
  pixName: text("pix_name").notNull(),
  txid: text("txid").notNull(),
  status: text("status").notNull().$type<OrderStatus>().default("aguardando_pagamento"),
  note: text("note").notNull().default(""),
  disputeReason: text("dispute_reason"),
  rating: integer("rating"),
  review: text("review"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

// Ações sensíveis que exigem a assinatura de outro(s) membro(s)
export const approvals = sqliteTable("approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  coopId: integer("coop_id").notNull().references(() => coops.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().$type<"chave_pix" | "despesa">(),
  payload: text("payload").notNull(), // JSON
  summary: text("summary").notNull(),
  requestedBy: integer("requested_by").notNull().references(() => users.id),
  required: integer("required").notNull().default(1),
  status: text("status").notNull().$type<"pendente" | "aprovada" | "rejeitada">().default("pendente"),
  createdAt: integer("created_at").notNull().default(now),
});

export const approvalSignatures = sqliteTable(
  "approval_signatures",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    approvalId: integer("approval_id").notNull().references(() => approvals.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id),
    decision: text("decision").notNull().$type<"aprovar" | "rejeitar">(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("signature_unique").on(t.approvalId, t.userId)],
);

// Registro de horas trabalhadas: base para a divisão justa das sobras
export const workLogs = sqliteTable("work_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  coopId: integer("coop_id").notNull().references(() => coops.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hours: real("hours").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at").notNull().default(now),
});

export const proposals = sqliteTable("proposals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  coopId: integer("coop_id").notNull().references(() => coops.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  closesAt: integer("closes_at").notNull(),
  createdAt: integer("created_at").notNull().default(now),
});

export const votes = sqliteTable(
  "votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    proposalId: integer("proposal_id").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    choice: text("choice").notNull().$type<"sim" | "nao" | "abstencao">(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("vote_unique").on(t.proposalId, t.userId)],
);

// Mural: ideias, problemas e sugestões de design. Aberto a qualquer pessoa da rede
// (clientes, vizinhos, amigos), não só a membros. Membros cuidam do andamento.
export const POST_KINDS = {
  ideia: "💡 Ideia",
  problema: "🐞 Problema",
  design: "🎨 Design",
  conversa: "💬 Conversa",
} as const;
export type PostKind = keyof typeof POST_KINDS;

export const POST_STATUS = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  feita: "Feita",
  descartada: "Descartada",
} as const;
export type PostStatus = keyof typeof POST_STATUS;

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    coopId: integer("coop_id").notNull().references(() => coops.id, { onDelete: "cascade" }),
    authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<PostKind>(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    // Página ou parte do site a que se refere (opcional), ex.: "/mercado" ou "tela de pedidos"
    page: text("page").notNull().default(""),
    status: text("status").notNull().$type<PostStatus>().default("aberta"),
    statusNote: text("status_note").notNull().default(""),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("posts_coop").on(t.coopId, t.createdAt)],
);

export const postComments = sqliteTable(
  "post_comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("comments_post").on(t.postId, t.id)],
);

// "Apoiar" uma ideia: 1 pessoa = 1 apoio. Ajuda a priorizar, não decide (quem decide é a assembleia).
export const postSupports = sqliteTable(
  "post_supports",
  {
    postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("support_unique").on(t.postId, t.userId)],
);

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Coop = typeof coops.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type LedgerEntry = typeof ledger.$inferSelect;
export type WorkLog = typeof workLogs.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
