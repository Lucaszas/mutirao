/**
 * Popula o banco com dados de EXEMPLO (placeholders), todos marcados com demo = true
 * e exibidos no site com o selo "exemplo".
 *
 * Uso local:     npm run db:seed          (contas de exemplo com a senha "mutirao123")
 * Uso online:    DEMO_PASSWORD=... HOUSE_OWNER_EMAIL=... npm run db:seed
 *   - DEMO_PASSWORD é obrigatório fora do banco local (a senha local está no código público).
 *   - HOUSE_OWNER_EMAIL: conta que funda a cooperativa da casa ("Mutirão"), cujo mural recebe as sugestões.
 * Pode rodar mais de uma vez: se já houver dados de exemplo, não faz nada.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { randomBytes, scryptSync } from "node:crypto";
import * as schema from "../src/db/schema";
import { entryHash } from "../src/lib/ledger";
import { encodeGeohash } from "../src/lib/geo";
import { HOUSE_COOP_SLUG } from "../src/lib/casa";

const PLACES = {
  itaquera: { bairro: "Itaquera", city: "São Paulo", uf: "SP", geohash: encodeGeohash(-23.54, -46.456) },
  guaianases: { bairro: "Guaianases", city: "São Paulo", uf: "SP", geohash: encodeGeohash(-23.5426, -46.4126) },
  pinheiros: { bairro: "Pinheiros", city: "São Paulo", uf: "SP", geohash: encodeGeohash(-23.5617, -46.6919) },
  vilaMadalena: { bairro: "Vila Madalena", city: "São Paulo", uf: "SP", geohash: encodeGeohash(-23.5535, -46.691) },
  boaVista: { bairro: "Boa Vista", city: "Recife", uf: "PE", geohash: encodeGeohash(-8.0597, -34.889) },
  santoAmaro: { bairro: "Santo Amaro", city: "Recife", uf: "PE", geohash: encodeGeohash(-8.047, -34.881) },
  santaTeresa: { bairro: "Santa Teresa", city: "Belo Horizonte", uf: "MG", geohash: encodeGeohash(-19.9167, -43.9165) },
  sertao: { bairro: "Zona Rural", city: "Juazeiro do Norte", uf: "CE", geohash: encodeGeohash(-7.2131, -39.3153) },
  restinga: { bairro: "Restinga", city: "Porto Alegre", uf: "RS", geohash: encodeGeohash(-30.1475, -51.1394) },
};

const url = process.env.DATABASE_URL ?? "file:local.db";
const isLocal = url.startsWith("file:");
const db = drizzle(createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN }), { schema });
const DAY = 86_400_000;
const now = Date.now();
const ago = (d: number) => now - d * DAY;

function hash(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

async function ensureHouse() {
  // Cooperativa da casa: o próprio Mutirão. NÃO é exemplo — o mural dela recebe sugestões de verdade.
  const ownerEmail = process.env.HOUSE_OWNER_EMAIL?.toLowerCase();
  const owner = ownerEmail ? await db.select().from(schema.users).where(eq(schema.users.email, ownerEmail)).get() : undefined;
  const houseExists = await db.select().from(schema.coops).where(eq(schema.coops.slug, HOUSE_COOP_SLUG)).get();
  if (!houseExists) {
    const founder = owner ?? (isLocal ? await db.select().from(schema.users).where(eq(schema.users.email, "joao@exemplo.org")).get() : undefined);
    if (founder) {
      const [house] = await db
        .insert(schema.coops)
        .values({
          slug: HOUSE_COOP_SLUG,
          name: "Mutirão",
          type: "tecnologia",
          description:
            "A cooperativa que cuida desta plataforma. Software livre, feito em mutirão: qualquer pessoa pode sugerir melhorias, apontar problemas e ajudar no design pelo mural.",
          city: founder.city, bairro: founder.bairro, uf: founder.uf, geohash: founder.geohash,
          createdBy: founder.id,
        })
        .returning();
      await db.insert(schema.memberships).values({ coopId: house.id, userId: founder.id, role: "fundador" });
      console.log(`Cooperativa da casa criada (fundador: ${founder.name}).`);
    } else {
      console.log("Cooperativa da casa não criada: defina HOUSE_OWNER_EMAIL com uma conta existente.");
    }
  }

}

async function main() {
  const password = process.env.DEMO_PASSWORD ?? (isLocal ? "mutirao123" : "");
  if (!password) throw new Error("Defina DEMO_PASSWORD para popular um banco online.");
  if (await db.select().from(schema.users).where(eq(schema.users.demo, true)).limit(1).get()) {
    console.log("Já existem dados de exemplo.");
    await ensureHouse();
    return;
  }
  const pw = hash(password);
  const demo = true;
  const person = (name: string, email: string, place: keyof typeof PLACES, skills: string, bio = "") => ({
    name, email, passwordHash: pw, ...PLACES[place], skills, bio, demo,
  });

  const people = await db
    .insert(schema.users)
    .values([
      person("Ana Souza", "ana@exemplo.org", "itaquera", "costura, modelagem, vendas", "Costureira há 15 anos."),
      person("Bruno Lima", "bruno@exemplo.org", "pinheiros", "contabilidade, nota fiscal, planilhas", "Contador que acredita em economia solidária."),
      person("Carla Mendes", "carla@exemplo.org", "boaVista", "teatro, produção cultural, edital", "Atriz e produtora."),
      person("Diego Santos", "diego@exemplo.org", "itaquera", "marcenaria, móveis, reforma"),
      person("Elisa Rocha", "elisa@exemplo.org", "santoAmaro", "design, fotografia, redes sociais"),
      person("Fábio Nunes", "fabio@exemplo.org", "vilaMadalena", "agricultura orgânica, hortaliças, compostagem"),
      person("Graça Oliveira", "graca@exemplo.org", "sertao", "agricultura, apicultura, mel, beneficiamento"),
      person("Hélio Costa", "helio@exemplo.org", "guaianases", "solda, serralheria, metalurgia, móveis"),
      person("Iara Tupinambá", "iara@exemplo.org", "santaTeresa", "audiovisual, edição de vídeo, roteiro, câmera"),
      person("João Pedro Alves", "joao@exemplo.org", "restinga", "programação, sites, suporte de informática"),
      person("Kátia Ramos", "katia@exemplo.org", "restinga", "entregas, bicicleta, logística"),
      person("Luiza Ferreira", "luiza@exemplo.org", "santaTeresa", "comunicação, roteiro, redes sociais"),
    ])
    .returning();
  const [ana, bruno, carla, diego, elisa, fabio, graca, helio, iara, joao, katia, luiza] = people;

  const coop = (c: Omit<typeof schema.coops.$inferInsert, "demo">) => ({ ...c, demo });
  const coopRows = await db
    .insert(schema.coops)
    .values([
      coop({ slug: "fio-de-ouro", name: "Coletivo Fio de Ouro", type: "artesanato", description: "Costureiras da zona leste produzindo roupas e bolsas com tecido reaproveitado.", ...PLACES.itaquera, pixKey: "fiodeouro@exemplo.org", pixName: "Coletivo Fio de Ouro", quotaCents: 5000, createdBy: ana.id, createdAt: ago(200) }),
      coop({ slug: "cia-mare-alta", name: "Cia. Maré Alta", type: "teatro", description: "Grupo de teatro de rua que circula por escolas e praças, com oficinas para a comunidade.", ...PLACES.boaVista, quotaCents: 0, createdBy: carla.id, createdAt: ago(150) }),
      coop({ slug: "mercado-raiz", name: "Mercado Raiz", type: "mercado", description: "Mercado cooperativo de consumo: cada membro é dono, trabalha algumas horas por mês e compra direto de pequenos produtores.", ...PLACES.pinheiros, pixKey: "mercadoraiz@exemplo.org", pixName: "Mercado Raiz", quotaCents: 10000, createdBy: fabio.id, createdAt: ago(120) }),
      coop({ slug: "mel-do-cariri", name: "Mel do Cariri", type: "agricultura", description: "Apicultoras e apicultores familiares do sertão do Ceará. Mel, própolis e cera, com casa de beneficiamento coletiva.", ...PLACES.sertao, pixKey: "meldocariri@exemplo.org", pixName: "Mel do Cariri", quotaCents: 2000, createdBy: graca.id, createdAt: ago(400) }),
      coop({ slug: "forja-leste", name: "Forja Leste", type: "fabrica", description: "Serralheria e marcenaria autogestionária: móveis de aço e madeira sob encomenda, feitos por quem é dono da oficina.", ...PLACES.guaianases, pixKey: "forjaleste@exemplo.org", pixName: "Forja Leste", quotaCents: 20000, createdBy: helio.id, createdAt: ago(300) }),
      coop({ slug: "lente-viva", name: "Lente Viva Filmes", type: "produtora", description: "Produtora audiovisual cooperativa: documentários, vídeos institucionais para coletivos e oficinas de cinema na periferia.", ...PLACES.santaTeresa, pixKey: "lenteviva@exemplo.org", pixName: "Lente Viva Filmes", quotaCents: 0, createdBy: iara.id, createdAt: ago(90) }),
      coop({ slug: "pedal-solidario", name: "Pedal Solidário", type: "servicos", description: "Entregas de bicicleta no bairro, com remuneração justa e sem aplicativo dono. Atende mercados e cooperativas da região.", ...PLACES.restinga, pixKey: "pedal@exemplo.org", pixName: "Pedal Solidario", quotaCents: 3000, createdBy: katia.id, createdAt: ago(45) }),
      coop({ slug: "codigo-comum", name: "Código Comum", type: "tecnologia", description: "Cooperativa de tecnologia: sites, sistemas e suporte para cooperativas e coletivos, com software livre.", ...PLACES.restinga, pixKey: "codigocomum@exemplo.org", pixName: "Codigo Comum", quotaCents: 0, createdBy: joao.id, createdAt: ago(25) }),
    ])
    .returning();
  const [fio, mare, raiz, mel, forja, lente, pedal, codigo] = coopRows;

  const m = (coopId: number, userId: number, joinedDaysAgo: number, role: "fundador" | "membro" = "membro") => ({ coopId, userId, role, joinedAt: ago(joinedDaysAgo) });
  await db.insert(schema.memberships).values([
    m(fio.id, ana.id, 200, "fundador"), m(fio.id, diego.id, 100), m(fio.id, bruno.id, 30),
    m(mare.id, carla.id, 150, "fundador"), m(mare.id, elisa.id, 60),
    m(raiz.id, fabio.id, 120, "fundador"), m(raiz.id, ana.id, 80), m(raiz.id, bruno.id, 70), m(raiz.id, diego.id, 10),
    m(mel.id, graca.id, 400, "fundador"),
    m(forja.id, helio.id, 300, "fundador"), m(forja.id, diego.id, 200),
    m(lente.id, iara.id, 90, "fundador"), m(lente.id, luiza.id, 80), m(lente.id, elisa.id, 20),
    m(pedal.id, katia.id, 45, "fundador"), m(pedal.id, joao.id, 30),
    m(codigo.id, joao.id, 25, "fundador"),
  ]);

  type L = { coopId: number; type: "receita" | "despesa"; amountCents: number; description: string; createdBy: number; createdAt: number };
  const ledgerRows: L[] = [
    { coopId: fio.id, type: "receita", amountCents: 480000, description: "Feira de Natal", createdBy: ana.id, createdAt: ago(40) },
    { coopId: fio.id, type: "despesa", amountCents: 120000, description: "Linhas, zíperes e aviamentos", createdBy: ana.id, createdAt: ago(45) },
    { coopId: fio.id, type: "receita", amountCents: 215000, description: "Encomenda de uniformes — escola", createdBy: bruno.id, createdAt: ago(5) },
    { coopId: fio.id, type: "despesa", amountCents: 60000, description: "Conta de luz do ateliê", createdBy: diego.id, createdAt: ago(3) },
    { coopId: mare.id, type: "receita", amountCents: 900000, description: "Edital de circulação", createdBy: carla.id, createdAt: ago(70) },
    { coopId: mare.id, type: "despesa", amountCents: 420000, description: "Figurino e transporte", createdBy: carla.id, createdAt: ago(50) },
    { coopId: raiz.id, type: "receita", amountCents: 1250000, description: "Vendas do mês", createdBy: fabio.id, createdAt: ago(20) },
    { coopId: raiz.id, type: "despesa", amountCents: 1100000, description: "Compra de produtores", createdBy: fabio.id, createdAt: ago(20) },
    { coopId: mel.id, type: "receita", amountCents: 1830000, description: "Venda de mel para merenda escolar (PNAE)", createdBy: graca.id, createdAt: ago(60) },
    { coopId: mel.id, type: "despesa", amountCents: 340000, description: "Potes, rótulos e manutenção da centrífuga", createdBy: graca.id, createdAt: ago(58) },
    { coopId: forja.id, type: "receita", amountCents: 760000, description: "Estantes de aço para biblioteca comunitária", createdBy: helio.id, createdAt: ago(35) },
    { coopId: forja.id, type: "despesa", amountCents: 290000, description: "Chapas, eletrodos e madeira", createdBy: helio.id, createdAt: ago(40) },
    { coopId: lente.id, type: "receita", amountCents: 450000, description: "Vídeo institucional — Mel do Cariri", createdBy: iara.id, createdAt: ago(15) },
    { coopId: pedal.id, type: "receita", amountCents: 98000, description: "Entregas do mês — Mercado do bairro", createdBy: katia.id, createdAt: ago(4) },
    { coopId: pedal.id, type: "despesa", amountCents: 31000, description: "Câmaras de ar e manutenção", createdBy: joao.id, createdAt: ago(6) },
  ];
  ledgerRows.sort((a, b) => a.createdAt - b.createdAt);
  const heads = new Map<number, string>();
  for (const r of ledgerRows) {
    const fields = { ...r, approvedBy: null, orderId: null, reversesId: null };
    const prevHash = heads.get(r.coopId) ?? "";
    const h = entryHash(prevHash, fields);
    heads.set(r.coopId, h);
    await db.insert(schema.ledger).values({ ...fields, prevHash, hash: h });
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
    { coopId: forja.id, userId: helio.id, hours: 70, description: "Solda e pintura das estantes", createdAt: ago(36) },
    { coopId: forja.id, userId: diego.id, hours: 45, description: "Prateleiras de madeira", createdAt: ago(36) },
    { coopId: lente.id, userId: iara.id, hours: 30, description: "Filmagem no Cariri", createdAt: ago(18) },
    { coopId: lente.id, userId: luiza.id, hours: 22, description: "Roteiro e edição", createdAt: ago(16) },
    { coopId: lente.id, userId: elisa.id, hours: 6, description: "Fotos still", createdAt: ago(17) },
    { coopId: pedal.id, userId: katia.id, hours: 50, description: "Entregas", createdAt: ago(5) },
    { coopId: pedal.id, userId: joao.id, hours: 35, description: "Entregas e manutenção", createdAt: ago(5) },
  ]);

  const props = await db
    .insert(schema.proposals)
    .values([
      { coopId: fio.id, authorId: ana.id, title: "Comprar uma máquina overloque usada", body: "Proposta de usar R$ 1.800 do caixa para uma overloque. Aumenta nossa produção em ~30%.", closesAt: now + 5 * DAY, createdAt: ago(2) },
      { coopId: fio.id, authorId: diego.id, title: "Participar da feira de economia solidária", body: "Inscrição de R$ 150, dois dias de feira.", closesAt: ago(20), createdAt: ago(30) },
      { coopId: raiz.id, authorId: fabio.id, title: "Abrir aos domingos", body: "Abrir das 9h às 13h aos domingos, com turnos voluntários.", closesAt: now + 3 * DAY, createdAt: ago(4) },
      { coopId: lente.id, authorId: luiza.id, title: "Oficina gratuita de celular-cinema no bairro", body: "Usar 10% das sobras para uma oficina de 4 sábados com jovens do bairro.", closesAt: now + 6 * DAY, createdAt: ago(1) },
      { coopId: pedal.id, authorId: joao.id, title: "Fazer parceria com o Mercado Raiz", body: "Oferecer entregas com preço fixo por bairro para os membros do Mercado Raiz.", closesAt: now + 4 * DAY, createdAt: ago(2) },
    ])
    .returning();
  await db.insert(schema.votes).values([
    { proposalId: props[0].id, userId: ana.id, choice: "sim" },
    { proposalId: props[0].id, userId: bruno.id, choice: "sim" },
    { proposalId: props[1].id, userId: ana.id, choice: "sim", createdAt: ago(25) },
    { proposalId: props[1].id, userId: diego.id, choice: "sim", createdAt: ago(25) },
    { proposalId: props[2].id, userId: fabio.id, choice: "sim" },
    { proposalId: props[3].id, userId: luiza.id, choice: "sim" },
    { proposalId: props[3].id, userId: iara.id, choice: "sim" },
    { proposalId: props[4].id, userId: joao.id, choice: "sim" },
  ]);

  const offer = (o: Omit<typeof schema.offers.$inferInsert, "demo">) => ({ ...o, demo });
  await db.insert(schema.offers).values([
    offer({ userId: ana.id, coopId: fio.id, kind: "produto", title: "Bolsa de tecido reaproveitado", description: "Bolsa grande, forrada, feita à mão com retalhos de tecido.", priceCents: 8900, ...PLACES.itaquera, createdAt: ago(10) }),
    offer({ userId: fabio.id, coopId: raiz.id, kind: "produto", title: "Cesta semanal de hortaliças orgânicas", description: "Cesta com 8 itens de agricultura familiar e orgânica.", priceCents: 6500, ...PLACES.pinheiros, createdAt: ago(8) }),
    offer({ userId: carla.id, coopId: mare.id, kind: "servico", title: "Oficina de teatro para escolas", description: "Oficina de 4 encontros de teatro e expressão corporal.", priceCents: 120000, ...PLACES.boaVista, createdAt: ago(9) }),
    offer({ userId: carla.id, coopId: mare.id, kind: "ajuda", title: "Precisamos de ajuda com nota fiscal e contabilidade", description: "Ganhamos um edital e precisamos emitir nota fiscal e organizar a contabilidade do grupo.", ...PLACES.boaVista, createdAt: ago(3) }),
    offer({ userId: ana.id, coopId: fio.id, kind: "ajuda", title: "Procuramos marceneiro para bancada de corte", description: "Precisamos de uma bancada de corte grande, em madeira, para o ateliê de costura.", ...PLACES.itaquera, createdAt: ago(2) }),
    offer({ userId: elisa.id, kind: "troca", title: "Troco fotografia de produtos por hortaliças", description: "Faço fotos de produtos para redes sociais em troca de cesta de hortaliças orgânicas.", ...PLACES.santoAmaro, createdAt: ago(1) }),
    offer({ userId: graca.id, coopId: mel.id, kind: "produto", title: "Mel silvestre do Cariri — pote de 500 g", description: "Mel puro de florada silvestre da caatinga, colhido e envasado pela cooperativa.", priceCents: 3500, ...PLACES.sertao, createdAt: ago(12) }),
    offer({ userId: helio.id, coopId: forja.id, kind: "produto", title: "Estante de aço e madeira sob medida", description: "Estantes para casa, loja ou biblioteca. Orçamento sem compromisso.", priceCents: 89000, ...PLACES.guaianases, createdAt: ago(7) }),
    offer({ userId: iara.id, coopId: lente.id, kind: "servico", title: "Vídeo de apresentação para sua cooperativa", description: "Vídeo de 2 minutos contando a história do seu coletivo, pronto para redes sociais.", priceCents: 150000, ...PLACES.santaTeresa, createdAt: ago(6) }),
    offer({ userId: katia.id, coopId: pedal.id, kind: "servico", title: "Entrega de bicicleta no bairro", description: "Entregas de até 5 km, com preço fixo e entregadora dona do próprio trabalho.", priceCents: 800, ...PLACES.restinga, createdAt: ago(4) }),
    offer({ userId: joao.id, coopId: codigo.id, kind: "servico", title: "Site simples para cooperativas", description: "Site de uma página com contato, catálogo e Pix, em software livre.", priceCents: 60000, ...PLACES.restinga, createdAt: ago(3) }),
    offer({ userId: graca.id, coopId: mel.id, kind: "ajuda", title: "Procuramos quem faça vídeo da nossa colheita", description: "Queremos um vídeo curto para divulgar o mel. Topamos trocar por mel!", ...PLACES.sertao, createdAt: ago(5) }),
    offer({ userId: luiza.id, kind: "troca", title: "Troco roteiro de vídeo por móveis usados", description: "Escrevo roteiro de vídeo curto em troca de uma estante ou mesa usada para o estúdio.", ...PLACES.santaTeresa, createdAt: ago(2) }),
    offer({ userId: diego.id, kind: "ajuda", title: "Cesta básica para família desalojada pela chuva", description: "Família vizinha perdeu tudo no alagamento. Precisamos de alimentos, roupas e colchões.", urgent: true, ...PLACES.itaquera, createdAt: ago(0) }),
  ]);

  const cesta = (await db.select().from(schema.offers).where(eq(schema.offers.title, "Cesta semanal de hortaliças orgânicas")).get())!;
  await db.insert(schema.orders).values({
    offerId: cesta.id, buyerId: elisa.id, sellerId: fabio.id, coopId: raiz.id, quantity: 1, totalCents: 6500,
    pixKey: "mercadoraiz@exemplo.org", pixName: "Mercado Raiz", txid: "MUT1", status: "entregue", rating: 5,
    review: "Hortaliças fresquíssimas!", createdAt: ago(6), updatedAt: ago(5),
  });

  // Mural de exemplo no Mercado Raiz
  const muralPosts = await db
    .insert(schema.posts)
    .values([
      { coopId: raiz.id, authorId: elisa.id, kind: "ideia", title: "Cesta vegana com proteínas (grão-de-bico, tofu)", body: "Muita gente do bairro procura. Dava para pedir para os produtores parceiros?", createdAt: ago(9) },
      { coopId: raiz.id, authorId: katia.id, kind: "ideia", title: "Entregar as cestas de bicicleta com o Pedal Solidário", body: "Somos uma cooperativa de entregas. Podemos combinar um preço fixo por bairro.", createdAt: ago(3) },
      { coopId: raiz.id, authorId: ana.id, kind: "problema", title: "Fila grande no sábado de manhã", body: "Das 9h às 11h a fila dá volta. Talvez abrir mais um caixa ou separar retirada de cestas.", status: "em_andamento", statusNote: "Vamos testar um caixa só para retirada de cestas.", createdAt: ago(12) },
    ])
    .returning();
  await db.insert(schema.postSupports).values([
    { postId: muralPosts[0].id, userId: elisa.id }, { postId: muralPosts[0].id, userId: ana.id }, { postId: muralPosts[0].id, userId: luiza.id },
    { postId: muralPosts[1].id, userId: katia.id }, { postId: muralPosts[1].id, userId: fabio.id }, { postId: muralPosts[1].id, userId: joao.id }, { postId: muralPosts[1].id, userId: bruno.id },
    { postId: muralPosts[2].id, userId: ana.id }, { postId: muralPosts[2].id, userId: diego.id },
  ]);
  await db.insert(schema.postComments).values([
    { postId: muralPosts[1].id, authorId: fabio.id, body: "Boa! Leva para a assembleia de quinta?", createdAt: ago(2) },
    { postId: muralPosts[1].id, authorId: katia.id, body: "Levo sim. Já abri a proposta lá no Pedal também.", createdAt: ago(2) },
    { postId: muralPosts[2].id, authorId: fabio.id, body: '↪ mudou o andamento para "Em andamento": Vamos testar um caixa só para retirada de cestas.', createdAt: ago(10) },
  ]);

  await ensureHouse();
  console.log(`Exemplos criados: ${people.length} pessoas, ${coopRows.length} cooperativas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
