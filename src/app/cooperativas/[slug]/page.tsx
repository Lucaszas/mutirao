import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCoopDetail } from "@/lib/queries";
import { COOP_TYPES, OFFER_KINDS } from "@/db/schema";
import { brl, dateBR } from "@/lib/format";
import { Bar, ErrorBanner, HealthMeter } from "@/components/ui";
import { CoopSecurity } from "@/components/CoopSecurity";
import { criarProposta, entrarNaCoop, estornarLancamento, lancarCaixa, registrarHoras, sairDaCoop, votar } from "../../actions";

export default async function CoopPage({ params, searchParams }: PageProps<"/cooperativas/[slug]">) {
  const { slug } = await params;
  const { erro } = await searchParams;
  const user = await getCurrentUser();
  const data = await getCoopDetail(slug, user?.id);
  if (!data) notFound();
  const { coop, members, entries, reversed, logs, proposals, offers, isMember, totals, guardiao } = data;
  const { health, surplus, facilitators } = guardiao;
  const memberOnly = (node: React.ReactNode) =>
    isMember ? node : <p className="text-sm text-muted">Entre na cooperativa para participar.</p>;

  return (
    <div className="space-y-8">
      <ErrorBanner message={typeof erro === "string" ? erro : undefined} />

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <span className="chip">{COOP_TYPES[coop.type]}</span>
          <h1 className="h-display mt-2 text-4xl">{coop.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {[coop.bairro, coop.city].filter(Boolean).join(", ")}
            {coop.city && " · "}desde {dateBR(coop.createdAt)} · {members.length} membro(s) · cota de entrada{" "}
            {coop.quotaCents ? brl(coop.quotaCents) : "livre"}
          </p>
          <p className="mt-4 whitespace-pre-line">{coop.description}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <HealthMeter report={health} />
          {user ? (
            isMember ? (
              <form action={sairDaCoop}>
                <input type="hidden" name="coopId" value={coop.id} />
                <button className="btn-ghost text-xs">Sair da cooperativa</button>
              </form>
            ) : (
              <form action={entrarNaCoop}>
                <input type="hidden" name="coopId" value={coop.id} />
                <button className="btn">Quero participar</button>
              </form>
            )
          ) : (
            <Link href="/entrar" className="btn">Entrar para participar</Link>
          )}
        </div>
      </header>

      {/* ---------------- Guardião ---------------- */}
      <section className="card border-leaf/40">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-display text-2xl">🌱 Guardião</h2>
          <Link href="/guardiao" className="text-sm text-muted underline">como o Guardião calcula isso?</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {health.factors.map((f) => (
            <div key={f.key} className="rounded-xl bg-surface-2 p-4">
              <div className="mb-1 flex justify-between text-sm font-semibold">
                <span>{f.label}</span>
                <span>{f.score}</span>
              </div>
              <Bar value={f.score} />
              <p className="mt-2 text-sm text-muted">{f.explanation}</p>
              {f.suggestion && <p className="mt-1 text-sm">💡 {f.suggestion}</p>}
            </div>
          ))}
        </div>
        {facilitators.length > 0 && (
          <div className="mt-5">
            <p className="font-semibold">Rodízio: quem pode facilitar a próxima assembleia</p>
            <ul className="mt-2 space-y-1 text-sm">
              {facilitators.map((f) => (
                <li key={f.userId}>
                  <Link href={`/pessoas/${f.userId}`} className="font-medium text-brand">{f.name}</Link>{" "}
                  <span className="text-muted">— {f.reasons.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <CoopSecurity data={data} />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* ---------------- Governança ---------------- */}
        <section className="space-y-4">
          <h2 className="h-display text-2xl">Assembleia</h2>
          <p className="text-sm text-muted">1 pessoa = 1 voto. Aprovação por maioria dos votos com quórum de metade dos membros.</p>
          {proposals.length === 0 && <p className="text-sm text-muted">Nenhuma proposta ainda.</p>}
          {proposals.map((p) => (
            <article key={p.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold">{p.title}</h3>
                <span
                  className={`chip ${p.result === "aprovada" ? "!bg-leaf/15 !text-leaf" : p.result === "rejeitada" ? "!bg-danger/15 !text-danger" : ""}`}
                >
                  {p.result}
                </span>
              </div>
              <p className="text-xs text-muted">
                por {p.author} · {p.open ? `encerra em ${dateBR(p.closesAt)}` : `encerrou em ${dateBR(p.closesAt)}`}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm">{p.body}</p>
              <p className="mt-3 text-sm">
                ✅ {p.tally.sim} · ❌ {p.tally.nao} · ⚪ {p.tally.abstencao}{" "}
                <span className="text-muted">({p.voters}/{p.eligible} votaram)</span>
              </p>
              {p.open && isMember && (
                <form action={votar} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="proposalId" value={p.id} />
                  {(["sim", "nao", "abstencao"] as const).map((c) => (
                    <button
                      key={c}
                      name="choice"
                      value={c}
                      className={p.myVote === c ? "btn" : "btn-ghost"}
                    >
                      {c === "sim" ? "Sim" : c === "nao" ? "Não" : "Abstenção"}
                    </button>
                  ))}
                </form>
              )}
            </article>
          ))}
          {memberOnly(
            <details className="card">
              <summary className="cursor-pointer font-semibold">+ Nova proposta</summary>
              <form action={criarProposta} className="mt-4 space-y-3">
                <input type="hidden" name="coopId" value={coop.id} />
                <input className="input" name="title" placeholder="Título" required />
                <textarea className="input min-h-24" name="body" placeholder="O que propõe e por quê?" required />
                <label className="flex items-center gap-2 text-sm text-muted">
                  Prazo de votação
                  <input className="input w-20" name="days" type="number" min={1} max={30} defaultValue={7} /> dias
                </label>
                <button className="btn">Publicar proposta</button>
              </form>
            </details>,
          )}
        </section>

        <aside className="space-y-8">
          {/* ---------------- Caixa aberto ---------------- */}
          <section className="card space-y-3">
            <h2 className="h-display text-xl">Caixa aberto</h2>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div><p className="text-muted">Receitas</p><p className="font-semibold text-leaf">{brl(totals.income)}</p></div>
              <div><p className="text-muted">Despesas</p><p className="font-semibold text-danger">{brl(totals.expense)}</p></div>
              <div><p className="text-muted">Resultado</p><p className="font-semibold">{brl(totals.income - totals.expense)}</p></div>
            </div>
            <ul className="max-h-64 divide-y divide-line overflow-auto text-sm">
              {entries.slice(0, 30).map((e) => (
                <li key={e.id} className="flex justify-between gap-2 py-1.5">
                  <span className={reversed.has(e.id) ? "text-muted line-through" : ""}>
                    <span className="text-xs text-muted">#{e.id}</span> {e.description}{" "}
                    <span className="text-xs text-muted">
                      · {dateBR(e.createdAt)}
                      {e.approvedBy && " · ✔ dupla aprovação"}
                      {e.orderId && " · via pedido"}
                    </span>
                    {isMember && e.reversesId == null && !reversed.has(e.id) && (
                      <form action={estornarLancamento} className="inline">
                        <input type="hidden" name="entryId" value={e.id} />
                        <button className="ml-2 text-xs text-muted underline hover:text-danger" title="Cria um lançamento inverso">
                          estornar
                        </button>
                      </form>
                    )}
                  </span>
                  <span className={e.type === "receita" ? "text-leaf" : "text-danger"}>
                    {e.type === "receita" ? "+" : "−"}{brl(e.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
            {memberOnly(
              <form action={lancarCaixa} className="grid grid-cols-2 gap-2">
                <input type="hidden" name="coopId" value={coop.id} />
                <select name="type" className="input">
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
                <input className="input" name="amount" placeholder="R$ 0,00" inputMode="decimal" required />
                <input className="input col-span-2" name="description" placeholder="Descrição" required />
                <button className="btn-ghost col-span-2">Lançar</button>
              </form>,
            )}
          </section>

          {/* ---------------- Sobras ---------------- */}
          <section className="card space-y-2">
            <h2 className="h-display text-xl">Sobras (lucro coletivo)</h2>
            <p className="text-sm">
              Resultado: <b>{brl(surplus.surplusCents)}</b>
            </p>
            {surplus.surplusCents > 0 && (
              <ul className="text-sm">
                <li>Fundo de reserva ({coop.reservePct}%): {brl(surplus.reserveCents)}</li>
                <li>Fundo social ({coop.socialPct}%): {brl(surplus.socialCents)}</li>
                <li>Para os membros: {brl(surplus.distributableCents)}</li>
              </ul>
            )}
            {surplus.shares.length > 0 && (
              <ul className="divide-y divide-line text-sm">
                {surplus.shares.map((s) => (
                  <li key={s.userId} className="flex justify-between py-1">
                    <span>{s.name} <span className="text-xs text-muted">({s.hours}h · {(s.pct * 100).toFixed(0)}%)</span></span>
                    <b>{brl(s.cents)}</b>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted">{surplus.note}</p>
          </section>

          {/* ---------------- Trabalho ---------------- */}
          <section className="card space-y-3">
            <h2 className="h-display text-xl">Trabalho registrado</h2>
            <ul className="max-h-40 divide-y divide-line overflow-auto text-sm">
              {logs.slice(0, 20).map(({ log, name }) => (
                <li key={log.id} className="py-1.5">
                  <b>{name}</b> · {log.hours}h — {log.description}
                </li>
              ))}
            </ul>
            {memberOnly(
              <form action={registrarHoras} className="grid grid-cols-[5rem_1fr] gap-2">
                <input type="hidden" name="coopId" value={coop.id} />
                <input className="input" name="hours" placeholder="horas" inputMode="decimal" required />
                <input className="input" name="description" placeholder="o que foi feito" required />
                <button className="btn-ghost col-span-2">Registrar</button>
              </form>,
            )}
          </section>

          {/* ---------------- Membros ---------------- */}
          <section className="card">
            <h2 className="h-display mb-2 text-xl">Membros</h2>
            <ul className="space-y-1 text-sm">
              {members.map((m) => (
                <li key={m.userId}>
                  <Link className="font-medium hover:text-brand" href={`/pessoas/${m.userId}`}>{m.name}</Link>
                  {m.role === "fundador" && <span className="chip ml-2">fundador(a)</span>}
                </li>
              ))}
            </ul>
          </section>

          {offers.length > 0 && (
            <section className="card">
              <h2 className="h-display mb-2 text-xl">No mercado</h2>
              <ul className="space-y-1 text-sm">
                {offers.map((o) => (
                  <li key={o.id}>
                    <Link className="hover:text-brand" href={`/mercado/${o.id}`}>{o.title}</Link>{" "}
                    <span className="text-xs text-muted">· {OFFER_KINDS[o.kind]}{o.priceCents != null && ` · ${brl(o.priceCents)}`}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
