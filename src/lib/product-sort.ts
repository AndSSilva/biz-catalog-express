/** Ordenação automática usada no modo "Reorganizar produtos". Gera apenas uma sequência temporária. */

export type SortCriterion = "manual" | "price_asc" | "price_desc" | "name_asc" | "name_desc";
export type PrimaryCriterion = SortCriterion | "category";

export type SortableProduct = {
  id: string;
  title: string;
  price: number | null;
  category_id: string | null;
};

export type SortCategory = { id: string; name: string; sort_order: number };

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

function compareName(a: SortableProduct, b: SortableProduct, dir: 1 | -1) {
  const an = a.title.trim();
  const bn = b.title.trim();
  // Nomes vazios sempre ao final.
  if (!an && !bn) return 0;
  if (!an) return 1;
  if (!bn) return -1;
  return collator.compare(an, bn) * dir;
}

function comparePrice(a: SortableProduct, b: SortableProduct, dir: 1 | -1) {
  // Produtos sem preço ("Sob consulta") sempre ao final.
  if (a.price == null && b.price == null) return 0;
  if (a.price == null) return 1;
  if (b.price == null) return -1;
  return (Number(a.price) - Number(b.price)) * dir;
}

/** Ordena mantendo a ordem anterior como desempate final (estável). */
function sortBy<T extends SortableProduct>(items: T[], criterion: SortCriterion): T[] {
  if (criterion === "manual") return [...items];
  const index = new Map(items.map((item, i) => [item.id, i]));
  const cmp = (a: T, b: T) => {
    let r = 0;
    if (criterion === "price_asc" || criterion === "price_desc") {
      const dir = criterion === "price_asc" ? 1 : -1;
      r = comparePrice(a, b, dir) || compareName(a, b, dir);
    } else {
      r = compareName(a, b, criterion === "name_asc" ? 1 : -1);
    }
    return r || (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0);
  };
  return [...items].sort(cmp);
}

export const UNCATEGORIZED = "__sem_categoria__";

/**
 * Gera a sequência. Com "category" como principal, agrupa pela ordem das categorias
 * (sem categoria ao final) e aplica `secondary` dentro de cada grupo.
 */
export function buildSequence<T extends SortableProduct>(
  items: T[],
  primary: PrimaryCriterion,
  secondary: SortCriterion,
  categories: SortCategory[],
): T[] {
  if (primary !== "category") return sortBy(items, primary);
  const order = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order || collator.compare(a.name, b.name),
  );
  const known = new Set(order.map((c) => c.id));
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.category_id && known.has(item.category_id) ? item.category_id : UNCATEGORIZED;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const keys = [...order.map((c) => c.id), UNCATEGORIZED];
  return keys.flatMap((key) => sortBy(groups.get(key) ?? [], secondary));
}

export function sameOrder(a: { id: string }[], b: { id: string }[]) {
  return a.length === b.length && a.every((item, i) => item.id === b[i]?.id);
}

/** Input is the complete general sequence; category sorting never mutates it. */
export function scopedProductSequence<T extends { category_id: string | null; category_sort_order: number | null }>(
  products: T[], categoryId: string | null,
): T[] {
  if (!categoryId) return [...products];
  return products
    .filter((product) => product.category_id === categoryId)
    .sort((a, b) => (a.category_sort_order ?? Number.MAX_SAFE_INTEGER) - (b.category_sort_order ?? Number.MAX_SAFE_INTEGER));
}
