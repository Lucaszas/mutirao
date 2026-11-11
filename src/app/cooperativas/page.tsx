import Link from "next/link";
import { listCoops } from "@/lib/queries";
import { COOP_TYPES } from "@/db/schema";
import { FilterTabs, PageTitle, DemoTag } from "@/components/ui";

export default async function Cooperativas({ searchParams }: PageProps<"/cooperativas">) {
  const { tipo } = await searchParams;
  const type = typeof tipo === "string" && tipo in COOP_TYPES ? tipo : undefined;
  const coops = await listCoops(type);
  return (
    <>
      <PageTitle
        title="Cooperativas"
        subtitle="Qualquer tipo de empreendimento pode ser coletivo. Encontre uma para participar ou comece a sua."
        action={<Link href="/cooperativas/nova" className="btn">+ Nova cooperativa</Link>}
      />
      <FilterTabs base="/cooperativas" current={type} options={COOP_TYPES} />
      {coops.length === 0 ? (
        <p className="text-muted">Nenhuma cooperativa encontrada nessa categoria.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coops.map(({ coop, members }) => (
            <Link key={coop.id} href={`/cooperativas/${coop.slug}`} className="card transition hover:border-brand">
              <span className="chip">{COOP_TYPES[coop.type]}</span>
              <p className="h-display mt-2 text-lg">{coop.name}<DemoTag on={coop.demo} /></p>
              <p className="mt-1 line-clamp-3 text-sm text-muted">{coop.description}</p>
              <p className="mt-3 text-xs text-muted">{members} membro(s){coop.city && ` · ${coop.city}`}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
