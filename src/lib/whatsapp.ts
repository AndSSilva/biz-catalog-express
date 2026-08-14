import type { CartItem } from "./cart";
import { totalItems } from "./cart";

export function buildOrderMessage(items: CartItem[], greeting: string) {
  const lines = items.map(
    (item) => `• ${item.title} — ${item.quantity} ${item.quantity === 1 ? "unidade" : "unidades"}`,
  );

  return [
    greeting,
    "",
    ...lines,
    "",
    `Total de itens: ${totalItems(items)}`,
    "",
    "Aguardo confirmação. Obrigado!",
  ].join("\n");
}

/** Mantém apenas dígitos do número configurado (formato aceito pelo wa.me). */
export function normalizeWhatsappNumber(raw: string) {
  return raw.replace(/\D/g, "");
}

export function buildWhatsappUrl(number: string, message: string) {
  const digits = normalizeWhatsappNumber(number);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
