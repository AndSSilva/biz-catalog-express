const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata um valor em reais para exibição. Retorna null se não houver preço definido. */
export function formatPrice(price: number | null | undefined) {
  if (price === null || price === undefined) return null;
  return currencyFormatter.format(price);
}

export const AVAILABILITY_LABEL = {
  pronta_entrega: "Pronta entrega",
  sob_encomenda: "Sob encomenda",
} as const;

/** Rótulo de estoque para o catálogo público, ou null se não deve ser exibido. */
export function stockLabel(product: { show_stock_in_catalog: boolean; stock_quantity: number }) {
  if (!product.show_stock_in_catalog) return null;
  if (product.stock_quantity <= 0) return "Esgotado";
  return `${product.stock_quantity} em estoque`;
}
