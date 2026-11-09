/**
 * Guardião — Alertas de segurança financeira
 *
 * Golpes em coletivos costumam seguir poucos roteiros conhecidos:
 *  - trocar a chave Pix para a de uma pessoa e desviar os pagamentos;
 *  - lançar despesas fora do padrão, ou muitas despesas por uma só pessoa;
 *  - "sumir" com registros do caixa;
 *  - vender e não entregar.
 * Cada regra abaixo vigia um desses roteiros e explica o motivo do alerta.
 */

const DAY = 86_400_000;

export type SecurityInput = {
  now: number;
  chain: { ok: true } | { ok: false; brokenAt: number };
  pixKeyUpdatedAt: number | null;
  expenses: { id: number; amountCents: number; createdBy: number; createdByName: string; createdAt: number }[];
  memberCount: number;
  pendingApprovals: number;
  disputes: number;
  ordersAwaitingConfirmation: { id: number; createdAt: number }[];
};

export type SecurityAlert = { level: "grave" | "atencao" | "info"; title: string; detail: string };

function median(values: number[]) {
  if (!values.length) return 0;
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function securityAlerts(input: SecurityInput): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];

  if (!input.chain.ok) {
    alerts.push({
      level: "grave",
      title: "O livro-caixa foi alterado por fora",
      detail: `A corrente de registros quebra no lançamento #${input.chain.brokenAt}. Alguém mexeu direto no banco de dados. Convoque a assembleia e compare com os extratos bancários.`,
    });
  }

  if (input.pixKeyUpdatedAt && input.now - input.pixKeyUpdatedAt < 7 * DAY) {
    alerts.push({
      level: "atencao",
      title: "Chave Pix alterada há menos de 7 dias",
      detail: "A troca foi aprovada por outro membro, mas confira com a assembleia se a nova chave é mesmo uma conta da cooperativa.",
    });
  }

  const recent = input.expenses.filter((e) => input.now - e.createdAt < 90 * DAY);
  const med = median(input.expenses.map((e) => e.amountCents));
  for (const e of recent) {
    if (input.expenses.length >= 5 && med > 0 && e.amountCents > med * 4) {
      alerts.push({
        level: "atencao",
        title: `Despesa fora do padrão (lançamento #${e.id})`,
        detail: `Lançada por ${e.createdByName}, vale mais de 4 vezes a despesa típica da cooperativa. Peça o comprovante.`,
      });
    }
  }

  if (recent.length >= 5 && input.memberCount >= 3) {
    const byPerson = new Map<string, number>();
    recent.forEach((e) => byPerson.set(e.createdByName, (byPerson.get(e.createdByName) ?? 0) + e.amountCents));
    const total = recent.reduce((a, e) => a + e.amountCents, 0);
    for (const [name, sum] of byPerson) {
      if (sum / total > 0.8) {
        alerts.push({
          level: "info",
          title: "Uma pessoa concentra as despesas",
          detail: `${name} lançou mais de 80% do valor das despesas nos últimos 90 dias. Não é necessariamente um problema, mas rodiziar a função de tesouraria protege a todos.`,
        });
      }
    }
  }

  if (input.disputes > 0) {
    alerts.push({
      level: "atencao",
      title: `${input.disputes} pedido(s) em disputa`,
      detail: "Alguém relatou problema com uma compra. Resolva rápido: a reputação da cooperativa na rede depende disso.",
    });
  }

  const stale = input.ordersAwaitingConfirmation.filter((o) => input.now - o.createdAt > 3 * DAY);
  if (stale.length) {
    alerts.push({
      level: "info",
      title: `${stale.length} pagamento(s) informado(s) esperando confirmação há mais de 3 dias`,
      detail: "Confira o extrato e confirme ou conteste. Quem comprou está aguardando.",
    });
  }

  if (input.pendingApprovals > 0) {
    alerts.push({
      level: "info",
      title: `${input.pendingApprovals} ação(ões) aguardando a sua assinatura`,
      detail: "Operações sensíveis precisam de dupla aprovação. Veja a seção \"Aprovações\".",
    });
  }

  return alerts;
}

/** Quantas assinaturas, além de quem pediu, uma ação sensível precisa. */
export function requiredSignatures(memberCount: number) {
  if (memberCount <= 1) return 0; // cooperativa de uma pessoa só: sem quem assinar (mostramos aviso)
  if (memberCount <= 5) return 1;
  return 2;
}
