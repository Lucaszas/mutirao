import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { OFFER_KINDS } from "@/db/schema";
import { criarOferta } from "../../actions";
import { ErrorBanner, PageTitle } from "@/components/ui";

export default async function NovaOferta({ searchParams }: PageProps<"/mercado/nova">) {
  const user = await requireUser();
  const { erro, tipo } = await searchParams;
  const myCoops = await db
    .select({ id: schema.coops.id, name: schema.coops.name })
    .from(schema.memberships)
    .innerJoin(schema.coops, eq(schema.coops.id, schema.memberships.coopId))
    .where(eq(schema.memberships.userId, user.id));
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Publicar no mercado" subtitle="Venda, ofereça um serviço, proponha uma troca ou peça ajuda à rede." />
      <ErrorBanner message={typeof erro === "string" ? erro : undefined} />
      <form action={criarOferta} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="kind">Tipo</label>
            <select className="input" id="kind" name="kind" defaultValue={typeof tipo === "string" ? tipo : "produto"}>
              {Object.entries(OFFER_KINDS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="coopId">Em nome de</label>
            <select className="input" id="coopId" name="coopId" defaultValue="">
              <option value="">Eu mesmo(a)</option>
              {myCoops.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="title">Título</label>
          <input className="input" id="title" name="title" required placeholder="ex.: Preciso de alguém que saiba fazer nota fiscal" />
        </div>
        <div>
          <label className="label" htmlFor="description">Descrição</label>
          <textarea className="input min-h-28" id="description" name="description" required />
          <p className="mt-1 text-xs text-muted">Seja específico: o Guardião usa as palavras para encontrar quem pode ajudar.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="price">Preço (R$, para produtos e serviços)</label>
            <input className="input" id="price" name="price" inputMode="decimal" placeholder="0,00" />
          </div>
          <label className="flex items-start gap-2 self-end rounded-xl border border-line p-3 text-sm">
            <input type="checkbox" name="urgent" className="mt-1" />
            <span>
              <b>🆘 Pedido urgente</b> (alimento, saúde, moradia, emergência). Aparece primeiro para a vizinhança.
            </span>
          </label>
        </div>
        <p className="text-xs text-muted">
          A localização usada é a {"do seu perfil ou a da cooperativa"} ({[user.bairro, user.city].filter(Boolean).join(", ") || "não informada"}).
        </p>
        <button className="btn">Publicar</button>
      </form>
    </div>
  );
}
