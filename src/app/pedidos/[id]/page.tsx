import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { getOrder, isCoopMember } from "@/lib/queries";
import { ORDER_STATUS, type OrderStatus } from "@/db/schema";
import { brl, dateBR } from "@/lib/format";
import { pixPayload } from "@/lib/pix";
import { ErrorBanner } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { abrirDisputa, cancelarPedido, confirmarEntrega, confirmarPagamento, informarPagamento } from "../../actions";

const STEPS: OrderStatus[] = ["aguardando_pagamento", "pagamento_informado", "pago", "entregue"];

export default async function PedidoPage({ params, searchParams }: PageProps<"/pedidos/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { erro } = await searchParams;
  const data = await getOrder(Number(id));
  if (!data) notFound();
  const { order, offerTitle, coopName, coopSlug, coopCity, buyer } = data;
  const isBuyer = order.buyerId === user.id;
  const isSeller = await isCoopMember(order.coopId, user.id);
  if (!isBuyer && !isSeller) notFound(); // pedidos só são visíveis para as partes

  const payload = pixPayload({ key: order.pixKey, name: order.pixName, city: coopCity ?? "", amountCents: order.totalCents, txid: order.txid });
  const qr = await QRCode.toDataURL(payload, { margin: 1, width: 240 });
  const step = STEPS.indexOf(order.status);
  const S = order.status;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ErrorBanner message={typeof erro === "string" ? erro : undefined} />
      <div className="card">
        <p className="text-sm text-muted">Pedido #{order.id} · {dateBR(order.createdAt)}</p>
        <h1 className="h-display text-3xl">{offerTitle}</h1>
        <p className="mt-1 text-sm">
          {order.quantity}× · total <b className="text-leaf">{brl(order.totalCents)}</b> · vendido por{" "}
          <Link href={`/cooperativas/${coopSlug}`} className="text-brand">{coopName}</Link> · comprado por {buyer}
        </p>
        {order.note && <p className="mt-2 text-sm text-muted">Observação: {order.note}</p>}

        <ol className="mt-5 grid grid-cols-4 gap-2 text-center text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className={`rounded-lg px-2 py-2 ${step >= i ? "bg-leaf/15 font-semibold text-leaf" : "bg-surface-2 text-muted"}`}>
              {ORDER_STATUS[s]}
            </li>
          ))}
        </ol>
        {(S === "cancelado" || S === "em_disputa") && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${S === "em_disputa" ? "bg-sun/15" : "bg-surface-2"}`}>
            <b>{ORDER_STATUS[S]}.</b> {order.disputeReason}
          </p>
        )}
      </div>

      {isBuyer && S === "aguardando_pagamento" && (
        <section className="card grid gap-6 sm:grid-cols-[240px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR Code Pix" width={240} height={240} className="rounded-xl bg-white" />
          <div className="space-y-3">
            <h2 className="h-display text-xl">Pague com Pix</h2>
            <p className="text-sm">
              Abra o app do seu banco e escaneie o QR ou use o Copia e Cola. <b>Confira o nome do recebedor:</b>
            </p>
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
              Recebedor: <b>{order.pixName}</b>
              <br />
              Chave: <span className="font-mono">{order.pixKey}</span>
            </p>
            <CopyButton text={payload} label="Copiar Pix Copia e Cola" />
            <form action={informarPagamento}>
              <input type="hidden" name="orderId" value={order.id} />
              <button className="btn w-full">Já paguei</button>
            </form>
            <p className="text-xs text-muted">
              🛡️ Se o nome no seu banco for diferente de “{order.pixName}”, <b>não pague</b> e abra uma disputa. Em caso de golpe, seu
              banco pode acionar o MED (Mecanismo Especial de Devolução do Pix).
            </p>
          </div>
        </section>
      )}

      {isSeller && (S === "pagamento_informado" || S === "aguardando_pagamento") && (
        <section className="card space-y-3">
          <h2 className="h-display text-xl">Conferir recebimento</h2>
          <p className="text-sm">
            Confira no extrato da conta da cooperativa se entrou <b>{brl(order.totalCents)}</b> (identificador <span className="font-mono">{order.txid}</span>).
            Ao confirmar, a receita entra automaticamente no caixa aberto.
          </p>
          <form action={confirmarPagamento}>
            <input type="hidden" name="orderId" value={order.id} />
            <button className="btn">Confirmo que o dinheiro entrou</button>
          </form>
        </section>
      )}

      {isBuyer && (S === "pago" || S === "em_disputa") && (
        <form action={confirmarEntrega} className="card space-y-3">
          <h2 className="h-display text-xl">Recebeu?</h2>
          <input type="hidden" name="orderId" value={order.id} />
          <label className="label" htmlFor="rating">Avaliação</label>
          <select className="input w-40" id="rating" name="rating" defaultValue="5">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{"★".repeat(n)}</option>
            ))}
          </select>
          <textarea className="input" name="review" placeholder="Conte como foi (opcional)" />
          <button className="btn">Confirmar entrega</button>
        </form>
      )}

      {order.rating && (
        <p className="card text-sm">
          Avaliação: <b>{"★".repeat(order.rating)}</b> {order.review && <>— “{order.review}”</>}
        </p>
      )}

      {(S === "pagamento_informado" || S === "pago") && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">Algo deu errado? Abrir disputa</summary>
          <form action={abrirDisputa} className="mt-3 space-y-2">
            <input type="hidden" name="orderId" value={order.id} />
            <textarea className="input" name="reason" required placeholder="Ex.: paguei e não recebi / o pagamento não entrou" />
            <button className="btn-ghost">Abrir disputa</button>
            <p className="text-xs text-muted">A disputa fica visível para a cooperativa e pesa na reputação dela na rede.</p>
          </form>
        </details>
      )}

      {((isBuyer && S === "aguardando_pagamento") || (isSeller && ["aguardando_pagamento", "pagamento_informado", "em_disputa"].includes(S))) && (
        <form action={cancelarPedido}>
          <input type="hidden" name="orderId" value={order.id} />
          <button className="text-sm text-danger underline">Cancelar pedido</button>
          {isSeller && S === "em_disputa" && (
            <p className="mt-1 text-xs text-muted">Se o dinheiro já tinha entrado, devolva por Pix e lance o estorno no caixa.</p>
          )}
        </form>
      )}
    </div>
  );
}
