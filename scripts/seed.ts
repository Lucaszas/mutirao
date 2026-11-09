/**
 * Popula o banco com dados de demonstração.
 * Uso: npm run db:seed   (todas as contas de exemplo usam a senha "mutirao123")
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { randomBytes, scryptSync } from "node:crypto";
import * as schema from "../src/db/schema";
import { entryHash } from "../src/lib/ledger";
import { encodeGeohash } from "../src/lib/geo";

const PLACES = {
  itaquera: { bairro: "Itaquera", city: "São Paulo", uf: "SP", geohash: encodeGeohash(-23.54, -46.456) },
  pinheiros: { bairro: "Pinheiros", city: "São Paulo", uf: "SP", geohash: encodeGeohash(-23.5617, -46.6919) },
  vilaMadalena: { bairro: "Vila Madalena", city: "São Paulo", uf: "SP", geohash: encodeGeohash(-23.5535, -46.691) },
  boaVista: { bairro: "Boa Vista", city: "Recife", uf: "PE", geohash: encodeGeohash(-8.0597, -34.889) },
  santoAmaro: { bairro: "Santo Amaro", city: "Recife", uf: "PE", geohash: encodeGeohash(-8.047, -34.881) },
};

const db = drizzle(createClient({ url: process.env.DATABASE_URL ?? "file:local.db", authToken: process.env.DATABASE_AUTH_TOKEN }), { schema });
const DAY = 86_400_000;
const now = Date.now();
const ago = (d: number) => now - d * DAY;

function hash(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

async function main() {
  const existing = await db.select().from(schema.users).limit(1);
  if (existing.length) {
    console.log("O banco já tem dados — seed ignorado.");
    return;
  }
  const pw = hash("mutirao123");
  const people = await db
    .insert(schema.users)
    .values([
      { name: "Ana Souza", email: "ana@exemplo.org", passwordHash: pw, ...PLACES.itaquera, skills: "costura, modelagem, vendas", bio: "Costureira há 15 anos." },
      { name: "Bruno Lima", email: "bruno@exemplo.org", passwordHash: pw, ...PLACES.pinheiros, skills: "contabilidade, nota fiscal, planilhas", bio: "Contador que acredita em economia solidária." },
      { name: "Carla Mendes", email: "carla@exemplo.org", passwordHash: pw, ...PLACES.boaVista, skills: "teatro, produção cultural, edital", bio: "Atriz e produtora." },
      { name: "Diego Santos", email: "diego@exemplo.org", passwordHash: pw, ...PLACES.itaquera, skills: "marcenaria, móveis, reforma", bio: "" },
      { name: "Elisa Rocha", email: "elisa@exemplo.org", passwordHash: pw, ...PLACES.santoAmaro, skills: "design, fotografia, redes sociais", bio: "" },
      { name: "Fábio Nunes", email: "fabio@exemplo.org", passwordHash: pw, ...PLACES.vilaMadalena, skills: "agricultura orgânica, hortaliças, compostagem", bio: "" },
    ])
    .returning();
  const [ana, bruno, carla, diego, elisa, fabio] = people;

  const coopRows = await db
    .insert(schema.coops)
    .values([
      { slug: "fio-de-ouro", name: "Coletivo Fio de Ouro", type: "artesanato", description: "Costureiras da zona leste produzindo roupas e bolsas com tecido reaproveitado.", ...PLACES.itaquera, pixKey: "fiodeouro@exemplo.org", pixName: "Coletivo Fio de Ouro", quotaCents: 5000, createdBy: ana.id, createdAt: ago(200) },
      { slug: "cia-mare-alta", name: "Cia. Maré Alta", type: "teatro", description: "Grupo de teatro de rua que circula por escolas e praças, com oficinas para a comunidade.", ...PLACES.boaVista, quotaCents: 0, createdBy: carla.id, createdAt: ago(150) },
      { slug: "mercado-raiz", name: "Mercado Raiz", type: "mercado", description: "Mercado cooperativo de consumo: cada membro é dono, trabalha algumas horas por mês e compra direto de pequenos produtores.", ...PLACES.pinheiros, pixKey: "mercadoraiz@exemplo.org", pixName: "Mercado Raiz", quotaCents: 10000, createdBy: fabio.id, createdAt: ago(120) },
    ])
    .returning();
  const [fio, mare, raiz] = coopRows;

  await db.insert(schema.memberships).values([
    { coopId: fio.id, userId: ana.id, role: "fundador", joinedAt: ago(200) },
    { coopId: fio.id, userId: diego.id, joinedAt: ago(100) },
    { coopId: fio.id, userId: bruno.id, joinedAt: ago(30) },
    { coopId: mare.id, userId: carla.id, role: "fundador", joinedAt: ago(150) },
    { coopId: mare.id, userId: elisa.id, joinedAt: ago(60) },
    { coopId: raiz.id, userId: fabio.id, role: "fundador", joinedAt: ago(120) },
    { coopId: raiz.id, userId: ana.id, joinedAt: ago(80) },
    { coopId: raiz.id, userId: bruno.id, joinedAt: ago(70) },
    { coopId: raiz.id, userId: diego.id, joinedAt: ago(10) },
  ]);

  const ledgerRows = [
    { coopId: fio.id, type: "receita" as const, amountCents: 480000, description: "Feira de Natal", createdBy: ana.id, createdAt: ago(40) },
    { coopId: fio.id, type: "despesa" as const, amountCents: 120000, description: "Linhas, zíperes e aviamentos", createdBy: ana.id, createdAt: ago(45) },
    { coopId: fio.id, type: "receita" as const, amountCents: 215000, description: "Encomenda de uniformes — escola", createdBy: bruno.id, createdAt: ago(5) },
    { coopId: fio.id, type: "despesa" as const, amountCents: 60000, description: "Conta de luz do ateliê", createdBy: diego.id, createdAt: ago(3) },
    { coopId: mare.id, type: "receita" as const, amountCents: 900000, description: "Edital de circulação", createdBy: carla.id, createdAt: ago(70) },
    { coopId: mare.id, type: "despesa" as const, amountCents: 420000, description: "Figurino e transporte", createdBy: carla.id, createdAt: ago(50) },
    { coopId: raiz.id, type: "receita" as const, amountCents: 1250000, description: "Vendas do mês", createdBy: fabio.id, createdAt: ago(20) },
    { coopId: raiz.id, type: "despesa" as const, amountCents: 1100000, description: "Compra de produtores", createdBy: fabio.id, createdAt: ago(20) },
  ].sort((a, b) => a.createdAt - b.createdAt);
  const heads = new Map<number, string>();
  for (const r of ledgerRows) {
    const fields = { ...r, approvedBy: null, orderId: null, reversesId: null };
    const prevHash = heads.get(r.coopId) ?? "";
    const hash = entryHash(prevHash, fields);
    heads.set(r.coopId, hash);
    await db.insert(schema.ledger).values({ ...fields, prevHash, hash });
  }

  await db.insert(schema.workLogs).values([
    { coopId: fio.id, userId: ana.id, hours: 60, description: "Costura das encomendas", createdAt: ago(20) },
    { coopId: fio.id, userId: diego.id, hours: 25, description: "Montagem do estande da feira", createdAt: ago(41) },
    { coopId: fio.id, userId: bruno.id, hours: 12, description: "Organização das contas", createdAt: ago(6) },
    { coopId: mare.id, userId: carla.id, hours: 80, description: "Ensaios e produção", createdAt: ago(55) },
    { coopId: mare.id, userId: elisa.id, hours: 10, description: "Fotos de divulgação", createdAt: ago(52) },
    { coopId: raiz.id, userId: fabio.id, hours: 40, description: "Caixa e reposição", createdAt: ago(15) },
    { coopId: raiz.id, userId: ana.id, hours: 8, description: "Turno de sábado", createdAt: ago(14) },
    { coopId: raiz.id, userId: bruno.id, hours: 8, description: "Turno de sábado", createdAt: ago(7) },
  ]);

  const props = await db
    .insert(schema.proposals)
    .values([
      { coopId: fio.id, authorId: ana.id, title: "Comprar uma máquina overloque usada", body: "Proposta de usar R$ 1.800 do caixa para uma overloque. Aumenta nossa produção em ~30%.", closesAt: now + 5 * DAY, createdAt: ago(2) },
      { coopId: fio.id, authorId: diego.id, title: "Participar da feira de economia solidária", body: "Inscrição de R$ 150, dois dias de feira.", closesAt: ago(20), createdAt: ago(30) },
      { coopId: raiz.id, authorId: fabio.id, title: "Abrir aos domingos", body: "Abrir das 9h às 13h aos domingos, com turnos voluntários.", closesAt: now + 3 * DAY, createdAt: ago(4) },
    ])
    .returning();
  await db.insert(schema.votes).values([
    { proposalId: props[0].id, userId: ana.id, choice: "sim" },
    { proposalId: props[0].id, userId: bruno.id, choice: "sim" },
    { proposalId: props[1].id, userId: ana.id, choice: "sim", createdAt: ago(25) },
    { proposalId: props[1].id, userId: diego.id, choice: "sim", createdAt: ago(25) },
    { proposalId: props[2].id, userId: fabio.id, choice: "sim" },
  ]);

  await db.insert(schema.offers).values([
    { userId: ana.id, coopId: fio.id, kind: "produto", title: "Bolsa de tecido reaproveitado", description: "Bolsa grande, forrada, feita à mão com retalhos de tecido.", priceCents: 8900, ...PLACES.itaquera, createdAt: ago(10) },
    { userId: fabio.id, coopId: raiz.id, kind: "produto", title: "Cesta semanal de hortaliças orgânicas", description: "Cesta com 8 itens de agricultura familiar e orgânica.", priceCents: 6500, ...PLACES.pinheiros, createdAt: ago(8) },
    { userId: carla.id, coopId: mare.id, kind: "servico", title: "Oficina de teatro para escolas", description: "Oficina de 4 encontros de teatro e expressão corporal.", priceCents: 120000, ...PLACES.boaVista, createdAt: ago(9) },
    { userId: carla.id, coopId: mare.id, kind: "ajuda", title: "Precisamos de ajuda com nota fiscal e contabilidade", description: "Ganhamos um edital e precisamos emitir nota fiscal e organizar a contabilidade do grupo.", ...PLACES.boaVista, createdAt: ago(3) },
    { userId: ana.id, coopId: fio.id, kind: "ajuda", title: "Procuramos marceneiro para bancada de corte", description: "Precisamos de uma bancada de corte grande, em madeira, para o ateliê de costura.", ...PLACES.itaquera, createdAt: ago(2) },
    { userId: elisa.id, kind: "troca", title: "Troco fotografia de produtos por hortaliças", description: "Faço fotos de produtos para redes sociais em troca de cesta de hortaliças orgânicas.", ...PLACES.santoAmaro, createdAt: ago(1) },
  ]);

  await db.insert(schema.offers).values({
    userId: diego.id,
    kind: "ajuda",
    title: "Cesta básica para família desalojada pela chuva",
    description: "Família vizinha perdeu tudo no alagamento. Precisamos de alimentos, roupas e colchões.",
    urgent: true,
    ...PLACES.itaquera,
    createdAt: ago(0),
  });
  const cesta = (await db.select().from(schema.offers)).find((o) => o.title.startsWith("Cesta semanal"))!;
  await db.insert(schema.orders).values({
    offerId: cesta.id,
    buyerId: elisa.id,
    sellerId: fabio.id,
    coopId: raiz.id,
    quantity: 1,
    totalCents: 6500,
    pixKey: "mercadoraiz@exemplo.org",
    pixName: "Mercado Raiz",
    txid: "MUT1",
    status: "entregue",
    rating: 5,
    review: "Hortaliças fresquíssimas!",
    createdAt: ago(6),
    updatedAt: ago(5),
  });

  console.log("Seed concluído. Entre com ana@exemplo.org / mutirao123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
