import type { CartItem } from "./cart";
import { totalItems } from "./cart";

export type CheckoutInfo = {
  customerName: string;
  deliveryMethod: "retirada" | "tele_entrega" | null;
  deliveryAddress: string | null;
};

export function buildOrderMessage(items: CartItem[], greeting: string, checkout: CheckoutInfo) {
  const lines = items.map(
    (item) => `• ${item.title} — ${item.quantity} ${item.quantity === 1 ? "unidade" : "unidades"}`,
  );

  const deliveryLines: string[] = [];
  if (checkout.deliveryMethod === "retirada") {
    deliveryLines.push("", "Forma de entrega: Retirada na loja");
  } else if (checkout.deliveryMethod === "tele_entrega") {
    deliveryLines.push(
      "",
      "Forma de entrega: Tele-entrega",
      `Endereço: ${checkout.deliveryAddress}`,
    );
  }

  return [
    greeting,
    "",
    `Nome: ${checkout.customerName}`,
    "",
    ...lines,
    "",
    `Total de itens: ${totalItems(items)}`,
    ...deliveryLines,
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
