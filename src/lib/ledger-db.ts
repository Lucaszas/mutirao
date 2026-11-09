import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { entryHash, type ChainFields } from "./ledger";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Único jeito de escrever no livro-caixa. Roda dentro de uma transação de escrita
 * para que dois lançamentos simultâneos não "bifurquem" a corrente.
 */
export async function appendLedger(
  input: Omit<ChainFields, "createdAt" | "approvedBy" | "orderId" | "reversesId"> &
    Partial<Pick<ChainFields, "approvedBy" | "orderId" | "reversesId">>,
  tx?: Tx,
) {
  const run = async (t: Tx) => {
    const last = await t
      .select({ hash: schema.ledger.hash })
      .from(schema.ledger)
      .where(eq(schema.ledger.coopId, input.coopId))
      .orderBy(desc(schema.ledger.id))
      .limit(1)
      .get();
    const fields: ChainFields = {
      approvedBy: null,
      orderId: null,
      reversesId: null,
      ...input,
      createdAt: Date.now(),
    };
    const prevHash = last?.hash ?? "";
    const [row] = await t
      .insert(schema.ledger)
      .values({ ...fields, prevHash, hash: entryHash(prevHash, fields) })
      .returning();
    return row;
  };
  return tx ? run(tx) : db.transaction(run, { behavior: "immediate" });
}
