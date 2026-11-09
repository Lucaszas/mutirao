/**
 * Guardião — Conexões (ajuda mútua e intercooperação)
 *
 * Em vez de um feed que maximiza tempo de tela, o Guardião aproxima
 * NECESSIDADES de CAPACIDADES. A pontuação é simples e sempre explicada:
 *  - palavras em comum entre o pedido e a oferta/habilidades (Jaccard)
 *  - proximidade: mesmo bairro > até 3 km > mesma cidade (economia local, laços de vizinhança)
 *  - quem oferece é uma cooperativa (intercooperação, 6º princípio)
 */

import { proximity, formatDistance } from "../lib/geo";

const STOPWORDS = new Set(
  "a o as os de da do das dos e em no na nos nas um uma uns umas para por com sem que se ao à às é ou mais muito pouco sobre como pra pro meu minha nosso nossa eu voce você ele ela isso esta este essa esse".split(
    " ",
  ),
);

export function tokens(text: string): Set<string> {
  return new Set(
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      // radical simples: "costureira" ~ "costura", "marceneiro" ~ "marcenaria"
      .map((w) => (w.length > 6 ? w.slice(0, 6) : w)),
  );
}

export type Need = { id: number; title: string; description: string; city: string; bairro: string; geohash: string; userId: number; urgent?: boolean };
export type Capacity = {
  kind: "oferta" | "pessoa";
  id: number;
  title: string;
  text: string;
  city: string;
  bairro: string;
  geohash: string;
  ownerId: number;
  isCoop: boolean;
  href: string;
};

export type Match = { need: Need; capacity: Capacity; score: number; reasons: string[] };

export function matchNeeds(needs: Need[], capacities: Capacity[], limitPerNeed = 3): Match[] {
  const out: Match[] = [];
  const needTokens = needs.map((n) => tokens(`${n.title} ${n.description}`));
  const capTokens = capacities.map((c) => tokens(`${c.title} ${c.text}`));

  // Palavras raras valem mais que palavras comuns (IDF): "marcenaria" diz mais que "produto".
  const df = new Map<string, number>();
  [...needTokens, ...capTokens].forEach((set) => set.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const N = needTokens.length + capTokens.length;
  const idf = (t: string) => Math.log(1 + N / (df.get(t) ?? 1));
  // Uma palavra presente em até ~2 documentos tem idf >= MIN_SIGNAL
  const MIN_SIGNAL = Math.log(1 + N / 2);

  needs.forEach((need, ni) => {
    const nt = needTokens[ni];
    if (nt.size === 0) return;
    const scored: Match[] = [];
    capacities.forEach((cap, ci) => {
      if (cap.ownerId === need.userId) return;
      const ct = capTokens[ci];
      const common = [...nt].filter((t) => ct.has(t)).sort((a, b) => idf(b) - idf(a));
      // Exige um sinal mínimo: duas palavras em comum ou uma palavra rara
      if (common.length === 0 || (common.length < 2 && idf(common[0]) < MIN_SIGNAL)) return;
      const jaccard = common.length / (nt.size + ct.size - common.length);
      let score = common.reduce((a, t) => a + idf(t), 0) * 10 + jaccard * 50;
      const reasons = [`palavras em comum: ${common.slice(0, 4).join(", ")}`];
      const near = proximity(need, cap);
      if (near.level === "bairro") {
        score *= 1.8;
        reasons.push(`mesmo bairro (${cap.bairro})`);
      } else if (near.level === "perto") {
        score *= 1.6;
        reasons.push(`perto (${formatDistance(near.km)})`);
      } else if (near.level === "cidade") {
        score *= 1.3;
        reasons.push(`mesma cidade (${cap.city})`);
      }
      if (need.urgent) score *= 1.5;
      if (cap.isCoop) {
        score *= 1.2;
        reasons.push("oferecido por uma cooperativa");
      }
      scored.push({ need, capacity: cap, score: Math.round(score), reasons });
    });
    out.push(...scored.sort((a, b) => b.score - a.score).slice(0, limitPerNeed));
  });
  return out.sort((a, b) => b.score - a.score);
}
