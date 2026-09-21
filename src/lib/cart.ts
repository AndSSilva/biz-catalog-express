import { useEffect, useSyncExternalStore } from "react";

export type CartItem = {
  lineId: string;
  id: string;
  title: string;
  imageUrl: string | null;
  quantity: number;
  measurementId: string | null;
  measurementLabel: string | null;
};

const PREFIX = "catalogo.cart.v2";
const EMPTY: CartItem[] = [];

/** O carrinho é isolado por empresa (cada catálogo tem o seu). */
let scope: string | null = null;
let items: CartItem[] = EMPTY;
const listeners = new Set<() => void>();

function storageKey(slug: string) {
  return `${PREFIX}:${slug}`;
}

function emit() {
  for (const listener of listeners) listener();
}

function read(slug: string): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Array<Partial<CartItem>>;
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          Number(item.quantity) > 0,
      )
      .map((item) => ({
        lineId: item.lineId ?? `${item.id}:sem-medida`,
        id: item.id ?? "",
        title: item.title ?? "",
        imageUrl: item.imageUrl ?? null,
        quantity: Number(item.quantity),
        measurementId: item.measurementId ?? null,
        measurementLabel: item.measurementLabel ?? null,
      }));
  } catch {
    return EMPTY;
  }
}

function persist() {
  if (!scope) return;
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(items));
  } catch {
    // storage indisponível (modo privado) — carrinho segue funcionando em memória
  }
}

function commit(next: CartItem[]) {
  items = next;
  persist();
  emit();
}

/** Define de qual empresa é o carrinho e carrega o que estava salvo no navegador. */
export function setCartScope(slug: string) {
  if (scope === slug) return;
  scope = slug;
  items = read(slug);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return items;
}

function getServerSnapshot() {
  return EMPTY;
}

export function useCart(slug: string) {
  useEffect(() => {
    setCartScope(slug);
  }, [slug]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addToCart(product: {
  id: string;
  title: string;
  imageUrl: string | null;
  measurementId?: string | null;
  measurementLabel?: string | null;
}) {
  const measurementId = product.measurementId ?? null;
  const measurementLabel = product.measurementLabel ?? null;
  const lineId = `${product.id}:${measurementId ?? "sem-medida"}`;
  const existing = items.find((item) => item.lineId === lineId);
  if (existing) {
    commit(
      items.map((item) =>
        item.lineId === lineId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
    return;
  }
  commit([...items, { ...product, lineId, measurementId, measurementLabel, quantity: 1 }]);
}

export function setQuantity(lineId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(lineId);
    return;
  }
  commit(items.map((item) => (item.lineId === lineId ? { ...item, quantity } : item)));
}

export function removeFromCart(lineId: string) {
  commit(items.filter((item) => item.lineId !== lineId));
}

export function clearCart() {
  commit([]);
}

export function totalItems(list: CartItem[]) {
  return list.reduce((sum, item) => sum + item.quantity, 0);
}
