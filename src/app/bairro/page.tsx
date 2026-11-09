import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { neighborhood } from "@/lib/queries";
import { COOP_TYPES, OFFER_KINDS } from "@/db/schema";
import { brl } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { PageTitle } from "@/components/ui";

const LEVEL_LABEL = { bairro: "no bairro", perto: "pertinho", cidade: "na cidade", longe: "" } as const;

function Near({ level, km }: { level: keyof typeof LEVEL_LABEL; km: number | null }) {
  return (
    <span className={`chip ${level === "bairro" ? "!bg-leaf/15 !text-leaf" : ""}`}>
      {level === "perto" ? formatDistance(km) : LEVEL_LABEL[level]}
    </span>
  );
}

export default async function Bairro() {
  const user = await requireUser();
  if (!user.city) {
    return (
      <div className="mx-auto max-w-xl card text-center">
        <h1 className="h-display text-2xl">Onde você está?</h1>
        <p className="mt-2 text-muted">Informe seu bairro e cidade para encontrar quem trabalha perto de você.</p>
        <Link href={`/pessoas/${user.id}`} className="btn mt-4">Completar meu perfil</Link>
      </div>
    );
  }
  const { people, coops, offers } = await neighborhood(user, user.id);
  const inBairro = people.filter((p) => p.near.level === "bairro").length + 1;
  const urgent = offers.filter((o) => o.offer.urgent);

  return (
    <div className="space-y-10">
      <PageTitle
        title={user.bairro ? `${user.bairro}` : user.city}
        subtitle={`${user.bairro ? `${user.city} · ` : ""}${inBairro} pessoa(s) da rede no bairro, ${coops.length} cooperativa(s) por perto. A economia começa na vizinhança.`}
        action={
          <div className="flex gap-2">
            <Link href="/mercado/nova?tipo=ajuda" className="btn">Pedir ajuda à vizinhança</Link>
            {!user.geohash && <Link href={`/pessoas/${user.id}`} className="btn-ghost">📍 Ativar proximidade</Link>}
          </div>
        }
      />

      {urgent.length > 0 && (
        <section className="card border-sun bg-sun/10">
          <h2 className="h-display text-xl">🆘 Pedidos urgentes por perto</h2>
          <ul className="mt-3 space-y-2">
            {urgent.map(({ offer, userName, near }) => (
              <li key={offer.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/mercado/${offer.id}`} className="font-semibold text-brand">{offer.title}</Link>
                <span className="text-sm text-muted">— {userName}</span>
                <Near {...near} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="h-display mb-3 text-xl">Cooperativas da região</h2>
        {coops.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma por perto ainda. <Link href="/cooperativas/nova" className="text-brand underline">Que tal fundar a primeira do bairro?</Link>
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coops.map(({ coop, members, near }) => (
              <Link key={coop.id} href={`/cooperativas/${coop.slug}`} className="card hover:border-brand">
                <div className="flex flex-wrap gap-2">
                  <span className="chip">{COOP_TYPES[coop.type]}</span>
                  <Near {...near} />
                </div>
                <p className="h-display mt-2 text-lg">{coop.name}</p>
                <p className="text-xs text-muted">{members} membro(s){coop.bairro && ` · ${coop.bairro}`}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="h-display mb-3 text-xl">Acontecendo por aqui</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {offers.slice(0, 20).map(({ offer, userName, coopName, near }) => (
            <Link key={offer.id} href={`/mercado/${offer.id}`} className="card flex items-start justify-between gap-3 hover:border-brand">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="chip">{OFFER_KINDS[offer.kind]}</span>
                  <Near {...near} />
                </div>
                <p className="mt-2 font-semibold">{offer.title}</p>
                <p className="text-xs text-muted">{coopName ?? userName}</p>
              </div>
              {offer.priceCents != null && <span className="font-semibold text-leaf">{brl(offer.priceCents)}</span>}
            </Link>
          ))}
          {offers.length === 0 && <p className="text-sm text-muted">Nada publicado por perto ainda.</p>}
        </div>
      </section>

      <section>
        <h2 className="h-display mb-3 text-xl">Vizinhança que faz</h2>
        <p className="mb-3 text-sm text-muted">Pessoas da rede perto de você e o que sabem fazer. Uma boa conversa começa aqui.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.slice(0, 30).map((p) => (
            <Link key={p.id} href={`/pessoas/${p.id}`} className="card hover:border-brand">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{p.name}</p>
                <Near {...p.near} />
              </div>
              {p.skills && <p className="mt-1 line-clamp-2 text-xs text-muted">{p.skills}</p>}
            </Link>
          ))}
          {people.length === 0 && <p className="text-sm text-muted">Ninguém da rede por perto ainda. Convide a vizinhança!</p>}
        </div>
      </section>
    </div>
  );
}
