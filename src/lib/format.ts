export function brl(cents: number | null | undefined) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function toCents(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const s = String(value).trim().replace(/\s/g, "").replace("R$", "");
  if (!s) return null;
  // aceita "1.234,56", "1234,56" e "1234.56"
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function dateBR(ms: number) {
  return new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function str(form: FormData, key: string, max = 2000) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}
