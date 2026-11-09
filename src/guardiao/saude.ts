/**
 * Guardião — Saúde da cooperativa
 *
 * Um conjunto de heurísticas simples, explicáveis e auditáveis. Cada fator
 * devolve uma nota de 0 a 100, o porquê da nota e uma sugestão concreta.
 * Nada aqui é caixa-preta: qualquer membro pode ler este arquivo e propor
 * mudanças nos pesos por meio da comunidade.
 */

export type HealthInput = {
  now: number;
  memberCount: number;
  /** Membros que entraram nos últimos 90 dias */
  newMembers90d: number;
  /** Para cada proposta encerrada ou aberta nos últimos 90 dias: quantos membros votaram */
  recentProposals: { authorId: number; voters: number; membersAtTime: number }[];
  /** Horas registradas por membro nos últimos 90 dias */
  hoursByMember: number[];
  /** Movimentações do caixa nos últimos 90 dias */
  income90d: number;
  expense90d: number;
  /** Data do último lançamento no caixa (ou null) */
  lastLedgerAt: number | null;
};

export type HealthFactor = {
  key: string;
  label: string;
  score: number; // 0..100
  weight: number;
  explanation: string;
  suggestion?: string;
};

export type HealthReport = {
  score: number;
  level: "frágil" | "atenção" | "saudável" | "florescendo";
  factors: HealthFactor[];
};

export const WEIGHTS = {
  participacao: 0.25,
  distribuicao: 0.2,
  caixa: 0.2,
  transparencia: 0.15,
  lideranca: 0.1,
  crescimento: 0.1,
} as const;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const DAY = 24 * 60 * 60 * 1000;

/** Coeficiente de Gini (0 = trabalho perfeitamente dividido, 1 = concentrado em uma pessoa). */
export function gini(values: number[]) {
  const v = values.filter((x) => x >= 0).sort((a, b) => a - b);
  const n = v.length;
  const sum = v.reduce((a, b) => a + b, 0);
  if (n < 2 || sum === 0) return 0;
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * v[i];
  return (2 * cum) / (n * sum) - (n + 1) / n;
}

export function computeHealth(input: HealthInput): HealthReport {
  const factors: HealthFactor[] = [];

  // 1. Participação nas decisões
  if (input.recentProposals.length === 0) {
    factors.push({
      key: "participacao",
      label: "Participação democrática",
      score: input.memberCount <= 2 ? 60 : 30,
      weight: WEIGHTS.participacao,
      explanation: "Nenhuma proposta foi votada nos últimos 90 dias.",
      suggestion: "Abra uma proposta, mesmo pequena (ex.: horário de funcionamento), para manter a assembleia viva.",
    });
  } else {
    const rates = input.recentProposals.map((p) => (p.membersAtTime ? p.voters / p.membersAtTime : 0));
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    factors.push({
      key: "participacao",
      label: "Participação democrática",
      score: clamp(avg * 110),
      weight: WEIGHTS.participacao,
      explanation: `Em média ${Math.round(avg * 100)}% dos membros votaram nas ${rates.length} propostas recentes.`,
      suggestion: avg < 0.5 ? "Menos da metade vota. Experimente prazos maiores e avisar pessoalmente quem não votou." : undefined,
    });
  }

  // 2. Distribuição do trabalho (evita que poucas pessoas carreguem tudo)
  const active = input.hoursByMember.filter((h) => h > 0);
  if (active.length === 0) {
    factors.push({
      key: "distribuicao",
      label: "Divisão do trabalho",
      score: 40,
      weight: WEIGHTS.distribuicao,
      explanation: "Nenhuma hora de trabalho registrada nos últimos 90 dias.",
      suggestion: "Registrar horas é o que permite dividir as sobras de forma justa. Peça a cada membro para registrar.",
    });
  } else {
    const g = gini(input.hoursByMember);
    const engaged = active.length / Math.max(1, input.memberCount);
    const score = clamp((1 - g) * 70 + engaged * 30);
    factors.push({
      key: "distribuicao",
      label: "Divisão do trabalho",
      score,
      weight: WEIGHTS.distribuicao,
      explanation: `${active.length} de ${input.memberCount} membros registraram trabalho; índice de concentração (Gini) ${g.toFixed(2)}.`,
      suggestion:
        g > 0.45
          ? "O trabalho está concentrado em poucas pessoas. Risco de esgotamento: redistribua tarefas e faça rodízio de funções."
          : engaged < 0.5
            ? "Muitos membros não registram atividade. Converse sobre como cada pessoa pode contribuir."
            : undefined,
    });
  }

  // 3. Saúde do caixa
  const { income90d: inc, expense90d: exp } = input;
  if (inc === 0 && exp === 0) {
    factors.push({
      key: "caixa",
      label: "Sustentabilidade financeira",
      score: 50,
      weight: WEIGHTS.caixa,
      explanation: "Sem movimentação financeira registrada nos últimos 90 dias.",
      suggestion: "Cadastre produtos ou serviços no mercado da rede para gerar as primeiras receitas.",
    });
  } else {
    const ratio = exp === 0 ? 2 : inc / exp;
    // ratio 1.0 = empatado (60 pts); 1.3+ = ótimo
    const score = clamp(ratio >= 1 ? 60 + Math.min(40, (ratio - 1) * 133) : ratio * 60);
    factors.push({
      key: "caixa",
      label: "Sustentabilidade financeira",
      score,
      weight: WEIGHTS.caixa,
      explanation: `Receitas cobrem ${Math.round(ratio * 100)}% das despesas nos últimos 90 dias.`,
      suggestion:
        ratio < 1
          ? "As despesas superam as receitas. Revise custos e procure outras cooperativas da rede para compras conjuntas."
          : ratio < 1.15
            ? "Margem apertada. Considere reforçar o fundo de reserva antes de distribuir sobras."
            : undefined,
    });
  }

  // 4. Transparência (o caixa está sendo atualizado?)
  const days = input.lastLedgerAt ? (input.now - input.lastLedgerAt) / DAY : Infinity;
  factors.push({
    key: "transparencia",
    label: "Transparência",
    score: clamp(days <= 7 ? 100 : days <= 30 ? 80 : days <= 60 ? 50 : 20),
    weight: WEIGHTS.transparencia,
    explanation: Number.isFinite(days)
      ? `Último lançamento no livro-caixa há ${Math.round(days)} dia(s).`
      : "O livro-caixa aberto ainda está vazio.",
    suggestion: days > 30 ? "Atualize o livro-caixa: confiança se constrói com contas abertas e em dia." : undefined,
  });

  // 5. Liderança distribuída (quantas pessoas diferentes propõem?)
  const authors = new Set(input.recentProposals.map((p) => p.authorId)).size;
  const leaderScore =
    input.recentProposals.length === 0 ? 50 : clamp((authors / Math.min(input.memberCount, input.recentProposals.length)) * 100);
  factors.push({
    key: "lideranca",
    label: "Liderança distribuída",
    score: leaderScore,
    weight: WEIGHTS.lideranca,
    explanation:
      input.recentProposals.length === 0
        ? "Ainda não há propostas para avaliar quem está puxando as decisões."
        : `${authors} pessoa(s) diferente(s) apresentaram as ${input.recentProposals.length} propostas recentes.`,
    suggestion:
      input.recentProposals.length >= 3 && authors === 1
        ? "Só uma pessoa está propondo. Convide outros membros a facilitar a próxima pauta (veja sugestões de rodízio)."
        : undefined,
  });

  // 6. Crescimento
  const growth = input.memberCount ? input.newMembers90d / input.memberCount : 0;
  factors.push({
    key: "crescimento",
    label: "Crescimento",
    score: clamp(input.memberCount >= 3 ? 50 + growth * 200 : 30 + input.memberCount * 10),
    weight: WEIGHTS.crescimento,
    explanation: `${input.memberCount} membro(s); ${input.newMembers90d} entraram nos últimos 90 dias.`,
    suggestion:
      input.memberCount < 3
        ? "Cooperativas costumam precisar de pelo menos algumas pessoas para dividir o trabalho. Divulgue na rede."
        : growth === 0
          ? "Sem novos membros recentemente. Que tal uma roda de apresentação aberta à comunidade?"
          : undefined,
  });

  const score = clamp(factors.reduce((acc, f) => acc + f.score * f.weight, 0));
  const level = score >= 80 ? "florescendo" : score >= 60 ? "saudável" : score >= 40 ? "atenção" : "frágil";
  return { score, level, factors };
}
