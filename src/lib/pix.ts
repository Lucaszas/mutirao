/**
 * Gera o "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central).
 * O dinheiro vai direto da conta de quem compra para a chave Pix de quem vende:
 * a plataforma não toca no dinheiro, não precisa ser banco nem instituição de pagamento.
 */

function tlv(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

export function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const ascii = (s: string, max: number) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();

export type PixInput = {
  key: string;
  name: string;
  city: string;
  amountCents?: number;
  /** Identificador do pedido (até 25 caracteres alfanuméricos) */
  txid?: string;
};

export function pixPayload({ key, name, city, amountCents, txid }: PixInput) {
  const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", key.trim());
  let payload =
    tlv("00", "01") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986") + // BRL
    (amountCents ? tlv("54", (amountCents / 100).toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", ascii(name, 25) || "COOPERATIVA") +
    tlv("60", ascii(city, 15) || "BRASIL") +
    tlv("62", tlv("05", (txid ?? "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***"));
  payload += "6304";
  return payload + crc16(payload);
}

/** Validação básica de formato de chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória). */
export function isValidPixKey(key: string) {
  const k = key.trim();
  return (
    /^\d{11}$/.test(k) || // CPF
    /^\d{14}$/.test(k) || // CNPJ
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(k) || // e-mail
    /^\+55\d{10,11}$/.test(k) || // telefone
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k) // aleatória
  );
}

/** Mostra só parte da chave (ex.: CPF ***.456.789-**) para conferência sem expor tudo. */
export function maskPixKey(key: string) {
  if (key.length <= 6) return key;
  return key.slice(0, 3) + "•".repeat(Math.max(3, key.length - 6)) + key.slice(-3);
}
