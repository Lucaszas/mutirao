/**
 * Guardião — Divisão das sobras (o "lucro" coletivo)
 *
 * Regra padrão, inspirada nos princípios cooperativistas:
 *  1. Uma parte vai para o fundo de reserva indivisível (protege a cooperativa).
 *  2. Uma parte vai para o fundo social (expansão, formação, ajudar novas cooperativas).
 *  3. O restante é dividido entre os membros proporcionalmente ao trabalho
 *     registrado — não ao capital investido.
 */

export type SurplusInput = {
  incomeCents: number;
  expenseCents: number;
  reservePct: number;
  socialPct: number;
  hoursByMember: { userId: number; name: string; hours: number }[];
};

export type SurplusResult = {
  surplusCents: number;
  reserveCents: number;
  socialCents: number;
  distributableCents: number;
  shares: { userId: number; name: string; hours: number; pct: number; cents: number }[];
  note: string;
};

export function distributeSurplus(input: SurplusInput): SurplusResult {
  const surplus = input.incomeCents - input.expenseCents;
  if (surplus <= 0) {
    return {
      surplusCents: surplus,
      reserveCents: 0,
      socialCents: 0,
      distributableCents: 0,
      shares: [],
      note:
        surplus === 0
          ? "Ainda não há sobras para dividir."
          : "O período fechou no negativo. Nada é distribuído; a perda deve ser coberta pelo fundo de reserva ou decidida em assembleia.",
    };
  }
  const reserve = Math.floor((surplus * input.reservePct) / 100);
  const social = Math.floor((surplus * input.socialPct) / 100);
  const distributable = surplus - reserve - social;
  const totalHours = input.hoursByMember.reduce((a, m) => a + m.hours, 0);

  let shares: SurplusResult["shares"] = [];
  if (totalHours > 0) {
    shares = input.hoursByMember
      .filter((m) => m.hours > 0)
      .map((m) => ({ ...m, pct: m.hours / totalHours, cents: Math.floor((distributable * m.hours) / totalHours) }))
      .sort((a, b) => b.cents - a.cents);
    // centavos que sobraram do arredondamento vão para a reserva
    const rounding = distributable - shares.reduce((a, s) => a + s.cents, 0);
    return {
      surplusCents: surplus,
      reserveCents: reserve + rounding,
      socialCents: social,
      distributableCents: distributable - rounding,
      shares,
      note: "Proporcional às horas registradas. Esta é uma simulação: a distribuição real deve ser aprovada em assembleia.",
    };
  }
  return {
    surplusCents: surplus,
    reserveCents: reserve,
    socialCents: social,
    distributableCents: distributable,
    shares,
    note: "Há sobras, mas nenhuma hora registrada. Registre o trabalho para que a divisão seja justa.",
  };
}
