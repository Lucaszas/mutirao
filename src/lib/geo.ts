/**
 * Localização aproximada com geohash.
 * Precisão 6 ≈ célula de 1,2 km × 0,6 km: suficiente para "quem trabalha perto de mim",
 * insuficiente para descobrir o endereço de alguém. Nunca guardamos coordenadas exatas.
 */
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
export const GEOHASH_PRECISION = 6;

export function encodeGeohash(lat: number, lon: number, precision = GEOHASH_PRECISION) {
  let latR = [-90, 90];
  let lonR = [-180, 180];
  let hash = "";
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < precision) {
    const range = even ? lonR : latR;
    const val = even ? lon : lat;
    const mid = (range[0] + range[1]) / 2;
    if (val >= mid) {
      ch |= 1 << (4 - bit);
      range[0] = mid;
    } else range[1] = mid;
    if (even) lonR = range;
    else latR = range;
    even = !even;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

export function decodeGeohash(hash: string): { lat: number; lon: number } | null {
  if (!hash) return null;
  const latR = [-90, 90];
  const lonR = [-180, 180];
  let even = true;
  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    if (idx < 0) return null;
    for (let b = 4; b >= 0; b--) {
      const range = even ? lonR : latR;
      const mid = (range[0] + range[1]) / 2;
      if ((idx >> b) & 1) range[0] = mid;
      else range[1] = mid;
      even = !even;
    }
  }
  return { lat: (latR[0] + latR[1]) / 2, lon: (lonR[0] + lonR[1]) / 2 };
}

/** Distância aproximada em km entre os centros de duas células (null se faltar localização). */
export function distanceKm(a: string, b: string): number | null {
  const p = decodeGeohash(a);
  const q = decodeGeohash(b);
  if (!p || !q) return null;
  const R = 6371;
  const dLat = ((q.lat - p.lat) * Math.PI) / 180;
  const dLon = ((q.lon - p.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos((p.lat * Math.PI) / 180) * Math.cos((q.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number | null) {
  if (km == null) return null;
  if (km < 1.5) return "no seu pedaço";
  if (km < 10) return `a ~${Math.round(km)} km`;
  return `a ~${Math.round(km / 5) * 5} km`;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export type Place = { bairro: string; city: string; geohash: string };

/**
 * Proximidade entre dois lugares, do mais forte ao mais fraco:
 * mesmo bairro > até 3 km > mesma cidade > longe. Usado pelo Guardião e pela página do bairro.
 */
export function proximity(a: Place, b: Place): { level: "bairro" | "perto" | "cidade" | "longe"; km: number | null } {
  const km = distanceKm(a.geohash, b.geohash);
  const sameCity = !!a.city && norm(a.city) === norm(b.city);
  if (sameCity && a.bairro && norm(a.bairro) === norm(b.bairro)) return { level: "bairro", km };
  if (km != null && km <= 3) return { level: "perto", km };
  if (sameCity) return { level: "cidade", km };
  return { level: "longe", km };
}
