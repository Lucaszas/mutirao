/**
 * Livro-caixa encadeado (como uma "blockchain" simples, sem criptomoeda).
 * Cada lançamento tem um hash que depende do lançamento anterior. Se alguém
 * alterar ou apagar um registro direto no banco, a corrente quebra e todo membro vê.
 */
import { createHash } from "node:crypto";

export type ChainFields = {
  coopId: number;
  type: "receita" | "despesa";
  amountCents: number;
  description: string;
  createdBy: number;
  approvedBy: number | null;
  orderId: number | null;
  reversesId: number | null;
  createdAt: number;
};

export function entryHash(prevHash: string, f: ChainFields) {
  const canonical = JSON.stringify([
    prevHash,
    f.coopId,
    f.type,
    f.amountCents,
    f.description,
    f.createdBy,
    f.approvedBy,
    f.orderId,
    f.reversesId,
    f.createdAt,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

/** Verifica a corrente inteira (entries em ordem crescente de id). */
export function verifyChain(entries: (ChainFields & { id: number; prevHash: string; hash: string })[]) {
  let prev = "";
  for (const e of entries) {
    if (e.prevHash !== prev || entryHash(prev, e) !== e.hash) {
      return { ok: false as const, brokenAt: e.id };
    }
    prev = e.hash;
  }
  return { ok: true as const, head: prev };
}
