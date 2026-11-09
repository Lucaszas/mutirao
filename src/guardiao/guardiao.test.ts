import { test } from "node:test";
import assert from "node:assert/strict";
import { computeHealth, gini } from "./saude";
import { distributeSurplus } from "./sobras";
import { matchNeeds } from "./conexoes";
import { suggestFacilitators } from "./lideranca";

test("gini: igualdade = 0, concentração alta > 0.6", () => {
  assert.equal(gini([10, 10, 10]), 0);
  assert.ok(gini([0, 0, 0, 100]) > 0.6);
});

test("sobras: reserva + social + membros somam o resultado", () => {
  const r = distributeSurplus({
    incomeCents: 100_000,
    expenseCents: 40_000,
    reservePct: 20,
    socialPct: 10,
    hoursByMember: [
      { userId: 1, name: "A", hours: 30 },
      { userId: 2, name: "B", hours: 10 },
    ],
  });
  assert.equal(r.surplusCents, 60_000);
  assert.equal(r.reserveCents + r.socialCents + r.shares.reduce((a, s) => a + s.cents, 0), 60_000);
  assert.equal(r.shares[0].cents, 31_500); // 75% de 42.000
});

test("sobras: resultado negativo não distribui nada", () => {
  const r = distributeSurplus({ incomeCents: 10, expenseCents: 20, reservePct: 20, socialPct: 10, hoursByMember: [] });
  assert.equal(r.shares.length, 0);
  assert.equal(r.distributableCents, 0);
});

test("saúde: nota entre 0 e 100 e com explicação em cada fator", () => {
  const h = computeHealth({
    now: Date.now(),
    memberCount: 4,
    newMembers90d: 1,
    recentProposals: [{ authorId: 1, voters: 3, membersAtTime: 4 }],
    hoursByMember: [10, 10, 5, 0],
    income90d: 1000,
    expense90d: 800,
    lastLedgerAt: Date.now(),
  });
  assert.ok(h.score >= 0 && h.score <= 100);
  assert.equal(h.factors.length, 6);
  h.factors.forEach((f) => assert.ok(f.explanation.length > 0));
});

test("conexões: pedido de contabilidade encontra contador da mesma cidade", () => {
  const m = matchNeeds(
    [{ id: 1, title: "Ajuda com contabilidade", description: "nota fiscal", city: "Recife", bairro: "Boa Vista", geohash: "", userId: 9 }],
    [
      { kind: "pessoa", id: 2, title: "Bruno", text: "contabilidade, nota fiscal", city: "Recife", bairro: "Centro", geohash: "", ownerId: 2, isCoop: false, href: "" },
      { kind: "pessoa", id: 3, title: "Diego", text: "marcenaria", city: "Recife", bairro: "", geohash: "", ownerId: 3, isCoop: false, href: "" },
    ],
  );
  assert.equal(m.length, 1);
  assert.equal(m[0].capacity.id, 2);
  assert.ok(m[0].reasons.some((r) => r.includes("mesma cidade")));
});

test("liderança: prioriza quem participa e ainda não propôs", () => {
  const s = suggestFacilitators([
    { userId: 1, name: "Sempre propõe", proposalsAuthored: 5, votesCast: 5, hours: 40 },
    { userId: 2, name: "Nova voz", proposalsAuthored: 0, votesCast: 3, hours: 20 },
  ]);
  assert.equal(s[0].userId, 2);
});

import { encodeGeohash, decodeGeohash, distanceKm, proximity } from "../lib/geo";
import { pixPayload, crc16 } from "../lib/pix";
import { entryHash, verifyChain } from "../lib/ledger";
import { securityAlerts, requiredSignatures } from "./seguranca";

test("geohash: ida e volta preserva posição com erro < 1 km", () => {
  const h = encodeGeohash(-23.5505, -46.6333);
  assert.equal(h.length, 6);
  const p = decodeGeohash(h)!;
  assert.ok(Math.abs(p.lat + 23.5505) < 0.01 && Math.abs(p.lon + 46.6333) < 0.01);
});

test("proximidade: mesmo bairro vence distância", () => {
  const a = { bairro: "Pinheiros", city: "São Paulo", geohash: encodeGeohash(-23.5617, -46.6919) };
  const b = { bairro: "pinheiros", city: "sao paulo", geohash: encodeGeohash(-23.567, -46.6935) };
  const c = { bairro: "Vila Madalena", city: "São Paulo", geohash: encodeGeohash(-23.5535, -46.691) };
  assert.equal(proximity(a, b).level, "bairro");
  assert.equal(proximity(a, c).level, "perto");
  assert.ok(distanceKm(a.geohash, c.geohash)! < 3);
});

test("pix: payload segue o padrão e tem CRC de 4 dígitos", () => {
  const p = pixPayload({ key: "coop@exemplo.org", name: "Coletivo Fio de Ouro", city: "São Paulo", amountCents: 8900, txid: "MUT42" });
  assert.ok(p.startsWith("000201"));
  assert.ok(p.includes("br.gov.bcb.pix"));
  assert.ok(p.includes("540589.00"));
  assert.match(p, /6304[0-9A-F]{4}$/);
});

test("pix: CRC confere com o exemplo do Manual do BR Code (BCB)", () => {
  const official =
    "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
  assert.equal(crc16(official), "1D3D");
  // nosso gerador produz a mesma estrutura (com o nome em maiúsculas, também aceito)
  const p = pixPayload({ key: "123e4567-e12b-12d1-a456-426655440000", name: "Fulano de Tal", city: "BRASILIA" });
  assert.equal(p.slice(0, -4), official.replace("Fulano de Tal", "FULANO DE TAL"));
});

test("livro-caixa: corrente detecta adulteração", () => {
  const base = { coopId: 1, type: "receita" as const, createdBy: 1, approvedBy: null, orderId: null, reversesId: null };
  const e1f = { ...base, amountCents: 100, description: "a", createdAt: 1 };
  const e1 = { ...e1f, id: 1, prevHash: "", hash: entryHash("", e1f) };
  const e2f = { ...base, amountCents: 200, description: "b", createdAt: 2 };
  const e2 = { ...e2f, id: 2, prevHash: e1.hash, hash: entryHash(e1.hash, e2f) };
  assert.equal(verifyChain([e1, e2]).ok, true);
  const tampered = { ...e1, amountCents: 1 };
  const r = verifyChain([tampered, e2]);
  assert.equal(r.ok, false);
});

test("segurança: alerta chave Pix recém-trocada e corrente quebrada", () => {
  const now = Date.now();
  const a = securityAlerts({
    now,
    chain: { ok: false, brokenAt: 7 },
    pixKeyUpdatedAt: now - 86_400_000,
    expenses: [],
    memberCount: 3,
    pendingApprovals: 0,
    disputes: 0,
    ordersAwaitingConfirmation: [],
  });
  assert.equal(a[0].level, "grave");
  assert.ok(a.some((x) => x.title.includes("Chave Pix")));
  assert.equal(requiredSignatures(1), 0);
  assert.equal(requiredSignatures(4), 1);
  assert.equal(requiredSignatures(20), 2);
});
