import Link from "next/link";
import { listCoops, listOffers } from "@/lib/queries";
import { COOP_TYPES, OFFER_KINDS } from "@/db/schema";
import { brl } from "@/lib/format";

export default async function Home() {
  const [coops, offers] = await Promise.all([listCoops(), listOffers()]);
  return (
    <div className="space-y-14">
      <section className="grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div>
          <p className="chip mb-4">Software livre · gratuito · feito pela comunidade</p>
          <h1 className="h-display text-4xl leading-tight sm:text-5xl">
            Empresas que pertencem a quem trabalha nelas.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            O Mutirão ajuda pessoas a criar, manter e expandir cooperativas — um mercado, uma fábrica, uma produtora,
            um grupo de teatro ou de artesanato — e conecta todas elas numa rede de troca e ajuda mútua. O lucro é
            coletivo, as contas são abertas e cada pessoa tem um voto.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/cooperativas/nova" className="btn">Criar uma cooperativa</Link>
            <Link href="/cooperativas" className="btn-ghost">Conhecer as cooperativas</Link>
          </div>
        </div>
        <div className="card space-y-3 bg-surface-2">
          <p className="h-display text-lg">Como funciona</p>
          {[
            ["1", "Junte gente", "Crie a cooperativa, defina a cota de entrada e as regras das sobras."],
            ["2", "Produza e venda", "Publique produtos e serviços no mercado da rede."],
            ["3", "Decida junto", "Propostas e votações: 1 pessoa = 1 voto, com quórum."],
            ["4", "Divida com justiça", "Sobras divididas por trabalho, com fundo de reserva e fundo social."],
            ["5", "Coopere com outras", "O Guardião aponta quem pode ajudar quem na rede."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-brand-ink">{n}</span>
              <p className="text-sm"><b>{t}.</b> <span className="text-muted">{d}</span></p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="h-display text-2xl">Cooperativas na rede</h2>
          <Link href="/cooperativas" className="text-sm font-medium text-brand">ver todas →</Link>
        </div>
        {coops.length === 0 ? (
          <p className="text-muted">Nenhuma ainda. <Link className="text-brand underline" href="/cooperativas/nova">Seja a primeira.</Link></p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coops.slice(0, 6).map(({ coop, members }) => (
              <Link key={coop.id} href={`/cooperativas/${coop.slug}`} className="card transition hover:border-brand">
                <span className="chip">{COOP_TYPES[coop.type]}</span>
                <p className="h-display mt-2 text-lg">{coop.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{coop.description}</p>
                <p className="mt-3 text-xs text-muted">{members} membro(s){coop.city && ` · ${coop.city}`}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="h-display text-2xl">Acontecendo no mercado</h2>
          <Link href="/mercado" className="text-sm font-medium text-brand">ver tudo →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {offers.slice(0, 6).map(({ offer, userName, coopName }) => (
            <Link key={offer.id} href={`/mercado/${offer.id}`} className="card flex items-start justify-between gap-3 hover:border-brand">
              <div>
                <span className="chip">{OFFER_KINDS[offer.kind]}</span>
                <p className="mt-2 font-semibold">{offer.title}</p>
                <p className="text-xs text-muted">{coopName ?? userName}{offer.city && ` · ${offer.city}`}</p>
              </div>
              {offer.priceCents != null && <span className="font-semibold text-leaf">{brl(offer.priceCents)}</span>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
