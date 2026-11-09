import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { networkMatches } from "@/lib/queries";
import { PageTitle } from "@/components/ui";
import type { Match } from "@/guardiao/conexoes";

export default async function Rede() {
  const user = await getCurrentUser();
  const [mine, all] = await Promise.all([user ? networkMatches(user.id) : Promise.resolve([]), networkMatches()]);
  const helpICanGive = user ? all.filter((m) => m.capacity.kind === "pessoa" && m.capacity.id === user.id) : [];

  return (
    <div className="space-y-10">
      <PageTitle
        title="Conexões"
        subtitle="O Guardião aproxima necessidades de capacidades. Nada de feed infinito: só encontros que podem gerar ajuda e negócio entre iguais."
        action={<Link href="/mercado/nova?tipo=ajuda" className="btn">Pedir ajuda à rede</Link>}
      />
      {user && (
        <>
          <section>
            <h2 className="h-display mb-3 text-xl">Você pode ajudar</h2>
            <MatchList items={helpICanGive} empty="Adicione habilidades ao seu perfil para o Guardião saber onde você pode ajudar." />
          </section>
          <section>
            <h2 className="h-display mb-3 text-xl">Para os seus pedidos</h2>
            <MatchList items={mine} empty="Você não tem pedidos de ajuda ou troca abertos." />
          </section>
        </>
      )}
      <section>
        <h2 className="h-display mb-3 text-xl">Em toda a rede</h2>
        <MatchList items={all.slice(0, 30)} empty="Ainda não há pedidos de ajuda ou trocas para conectar." />
      </section>
    </div>
  );
}

function MatchList({ items, empty }: { items: Match[]; empty: string }) {
  return items.length === 0 ? (
      <p className="text-sm text-muted">{empty}</p>
    ) : (
      <ul className="space-y-3">
        {items.map((m) => (
          <li key={`${m.need.id}-${m.capacity.kind}-${m.capacity.id}`} className="card">
            <p className="text-sm">
              <Link href={`/mercado/${m.need.id}`} className="font-semibold text-brand">{m.need.title}</Link>
              <span className="text-muted"> ↔ </span>
              <Link href={m.capacity.href} className="font-semibold">{m.capacity.title}</Link>
            </p>
            <p className="mt-1 text-xs text-muted">Por que: {m.reasons.join(" · ")}</p>
          </li>
        ))}
      </ul>
    );
}
