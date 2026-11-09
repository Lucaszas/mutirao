/**
 * Guardião — Rodízio de liderança
 *
 * Ninguém deveria liderar sempre. Sugerimos quem pode facilitar a próxima
 * assembleia: pessoas que participam (votam, trabalham) mas que ainda não
 * conduziram pautas recentemente. É só uma sugestão — quem decide é o coletivo.
 */

export type MemberActivity = {
  userId: number;
  name: string;
  proposalsAuthored: number;
  votesCast: number;
  hours: number;
};

export function suggestFacilitators(members: MemberActivity[], take = 3) {
  return members
    .map((m) => {
      const engagement = Math.min(1, m.votesCast / 3) * 0.5 + Math.min(1, m.hours / 20) * 0.5;
      const freshness = 1 / (1 + m.proposalsAuthored); // quem já propôs muito perde prioridade
      const reasons: string[] = [];
      if (m.proposalsAuthored === 0) reasons.push("ainda não facilitou nenhuma pauta");
      if (m.votesCast > 0) reasons.push(`votou ${m.votesCast} vez(es)`);
      if (m.hours > 0) reasons.push(`${m.hours.toFixed(0)}h de trabalho registradas`);
      return { ...m, score: engagement * 0.5 + freshness * 0.5, reasons };
    })
    .filter((m) => m.votesCast + m.hours > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take);
}
