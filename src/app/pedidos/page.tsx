import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listMyOrders } from "@/lib/queries";
import { ORDER_STATUS } from "@/db/schema";
import { brl, dateBR } from "@/lib/format";
import { PageTitle } from "@/components/ui";

type Rows = Awaited<ReturnType<typeof listMyOrders>>;

export default async function Pedidos() {
  const user = await requireUser();
  const rows = await listMyOrders(user.id);
  const compras = rows.filter((r) => r.order.buyerId === user.id);
  const vendas = rows.filter((r) => r.order.buyerId !== user.id);

  return (
    <div className="space-y-8">
      <PageTitle title="Pedidos" subtitle="O dinheiro vai direto, por Pix, para a conta da cooperativa. A plataforma só organiza as confirmações." />
      <section>
        <h2 className="h-display mb-3 text-xl">Vendas das minhas cooperativas</h2>
        <OrderList items={vendas} empty="Nenhuma venda ainda." asBuyer={false} />
      </section>
      <section>
        <h2 className="h-display mb-3 text-xl">Minhas compras</h2>
        <OrderList items={compras} empty="Você ainda não comprou nada na rede." asBuyer />
      </section>
    </div>
  );
}

function OrderList({ items, empty, asBuyer }: { items: Rows; empty: string; asBuyer: boolean }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {items.map(({ order, offerTitle, coopName, buyer }) => (
        <li key={order.id}>
          <Link href={`/pedidos/${order.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2">
            <span>
              <b>#{order.id}</b> {offerTitle}{" "}
              <span className="text-xs text-muted">· {asBuyer ? coopName : buyer} · {dateBR(order.updatedAt)}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="chip">{ORDER_STATUS[order.status]}</span>
              <b>{brl(order.totalCents)}</b>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
