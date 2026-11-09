import Link from "next/link";
import type { getCoopDetail } from "@/lib/queries";
import { ORDER_STATUS } from "@/db/schema";
import { brl, dateBR } from "@/lib/format";
import { maskPixKey } from "@/lib/pix";
import { LocationFields } from "./LocationFields";
import { assinarAprovacao, atualizarLocalCoop, solicitarChavePix } from "@/app/actions";

type Data = NonNullable<Awaited<ReturnType<typeof getCoopDetail>>>;

const ALERT_STYLE = {
  grave: "border-danger bg-danger/10",
  atencao: "border-sun bg-sun/10",
  info: "border-line bg-surface-2",
} as const;

export function CoopSecurity({ data }: { data: Data }) {
  const { coop, chain, approvals, orders, isMember, signaturesNeeded, guardiao } = data;
  return (
    <section className="card space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h-display text-2xl">🛡️ Dinheiro & segurança</h2>
        <span className={`chip ${chain.ok ? "!bg-leaf/15 !text-leaf" : "!bg-danger/15 !text-danger"}`}>
          {chain.ok ? "Livro-caixa íntegro ✓" : "Livro-caixa adulterado!"}
        </span>
      </div>

      {isMember && guardiao.security.length > 0 && (
        <ul className="space-y-2">
          {guardiao.security.map((a, i) => (
            <li key={i} className={`rounded-xl border p-3 text-sm ${ALERT_STYLE[a.level]}`}>
              <b>{a.title}</b>
              <p className="text-muted">{a.detail}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-semibold">Recebimento por Pix</h3>
          {coop.pixKey ? (
            <p className="text-sm">
              {coop.pixName} · <span className="font-mono">{maskPixKey(coop.pixKey)}</span>
              {coop.pixKeyUpdatedAt && <span className="text-xs text-muted"> · alterada em {dateBR(coop.pixKeyUpdatedAt)}</span>}
            </p>
          ) : (
            <p className="text-sm text-muted">Ainda não configurado. Sem chave Pix, a cooperativa não recebe pedidos pelo mercado.</p>
          )}
          {isMember && (
            <details>
              <summary className="cursor-pointer text-sm text-brand">{coop.pixKey ? "Pedir troca da chave" : "Configurar chave Pix"}</summary>
              <form action={solicitarChavePix} className="mt-2 space-y-2">
                <input type="hidden" name="coopId" value={coop.id} />
                <input className="input" name="pixKey" placeholder="CNPJ, e-mail, +55… ou chave aleatória" required />
                <input className="input" name="pixName" placeholder="Nome do titular (como aparece no banco)" required />
                <button className="btn-ghost">Enviar</button>
                <p className="text-xs text-muted">
                  {signaturesNeeded > 0
                    ? `Por segurança, a troca só vale depois que ${signaturesNeeded} outro(s) membro(s) aprovar(em).`
                    : "⚠️ Com um membro só, não há quem confirme. Convide mais gente para ter dupla aprovação."}{" "}
                  Prefira uma conta no nome da cooperativa (CNPJ) ou de uma conta coletiva.
                </p>
              </form>
            </details>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Regras de proteção</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Despesas acima de <b>{brl(coop.expenseLimitCents)}</b> precisam de aprovação de outro membro.</li>
            <li>Troca da chave Pix precisa de aprovação e gera alerta por 7 dias.</li>
            <li>Lançamentos não podem ser apagados — só estornados, com registro.</li>
            <li>Cada lançamento é encadeado ao anterior (hash). Alteração por fora é detectada.</li>
            <li>A plataforma nunca guarda dinheiro: tudo vai direto para a conta da cooperativa.</li>
          </ul>
        </div>
      </div>

      {approvals.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Aprovações pendentes</h3>
          {approvals.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-sm">
              <span>
                {a.summary} <span className="text-xs text-muted">— pedido por {a.requester} · {a.signatures}/{a.required} assinatura(s)</span>
              </span>
              {a.canSign && isMember && (
                <form action={assinarAprovacao} className="flex gap-2">
                  <input type="hidden" name="approvalId" value={a.id} />
                  <button name="decision" value="aprovar" className="btn py-1">Aprovar</button>
                  <button name="decision" value="rejeitar" className="btn-ghost py-1">Rejeitar</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {isMember && orders.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">Vendas pelo mercado</h3>
          <ul className="divide-y divide-line text-sm">
            {orders.slice(0, 10).map(({ order, buyer, offerTitle }) => (
              <li key={order.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <Link href={`/pedidos/${order.id}`} className="hover:text-brand">
                  #{order.id} {offerTitle} <span className="text-xs text-muted">· {buyer}</span>
                </Link>
                <span>
                  <span className="chip mr-2">{ORDER_STATUS[order.status]}</span>
                  {brl(order.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isMember && (
        <div className="flex flex-wrap gap-4 text-sm">
          <details className="flex-1">
            <summary className="cursor-pointer text-brand">Endereço aproximado da cooperativa</summary>
            <form action={atualizarLocalCoop} className="mt-2 space-y-2">
              <input type="hidden" name="coopId" value={coop.id} />
              <LocationFields bairro={coop.bairro} city={coop.city} uf={coop.uf} geohash={coop.geohash} />
              <button className="btn-ghost">Salvar local</button>
            </form>
          </details>
          <a href={`/cooperativas/${coop.slug}/exportar`} className="text-brand underline">
            ⬇ Exportar todos os dados (JSON)
          </a>
        </div>
      )}
    </section>
  );
}
