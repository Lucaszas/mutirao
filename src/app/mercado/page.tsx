import Link from "next/link";
import { listOffers } from "@/lib/queries";
import { OFFER_KINDS } from "@/db/schema";
import { brl, dateBR } from "@/lib/format";
import { FilterTabs, PageTitle } from "@/components/ui";

export default async function Mercado({ searchParams }: PageProps<"/mercado">) {
  const { tipo } = await searchParams;
  const kind = typeof tipo === "string" && tipo in OFFER_KINDS ? tipo : undefined;
  const offers = await listOffers(kind);
  return (
    <>
      <PageTitle
        title="Mercado & trocas"
        subtitle="Compre de cooperativas, ofereça serviços, proponha trocas e peça ajuda. Ordem cronológica — sem algoritmo de engajamento."
        action={<Link href="/mercado/nova" className="btn">+ Publicar</Link>}
      />
      <FilterTabs base="/mercado" current={kind} options={OFFER_KINDS} />
      <div className="grid gap-3 md:grid-cols-2">
        {offers.map(({ offer, userName, coopName, interests }) => (
          <Link key={offer.id} href={`/mercado/${offer.id}`} className="card flex flex-col gap-1 hover:border-brand">
            <div className="flex items-start justify-between gap-3">
              <span className={`chip ${offer.kind === "ajuda" ? "!bg-sun/20 !text-ink" : ""}`}>{OFFER_KINDS[offer.kind]}</span>
              {offer.priceCents != null && <span className="font-semibold text-leaf">{brl(offer.priceCents)}</span>}
            </div>
            <p className="font-semibold">{offer.title}</p>
            <p className="line-clamp-2 text-sm text-muted">{offer.description}</p>
            <p className="mt-1 text-xs text-muted">
              {coopName ? `🏠 ${coopName}` : userName}
              {offer.city && ` · ${offer.city}`} · {dateBR(offer.createdAt)}
              {interests > 0 && ` · ${interests} interessado(s)`}
            </p>
          </Link>
        ))}
        {offers.length === 0 && <p className="text-muted">Nada por aqui ainda.</p>}
      </div>
    </>
  );
}
