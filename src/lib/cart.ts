import { useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  quantity: number;
};

const STORAGE_KEY = "catalogo.cart.v1";
const EMPTY: CartItem[] = [];

let items: CartItem[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage indisponível (modo privado) — carrinho segue funcionando em memória
  }
}

function commit(next: CartItem[]) {
  items = next;
  persist();
  emit();
}

/** Lê o carrinho salvo no navegador. Chamar apenas no cliente (useEffect). */
export function hydrateCart() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        items = parsed.filter(
          (item) => item && typeof item.id === "string" && Number(item.quantity) > 0,
        );
      }
    }
  } catch {
    items = EMPTY;
  }
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

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addToCart(product: { id: string; title: string; imageUrl: string | null }) {
  const existing = items.find((item) => item.id === product.id);
  if (existing) {
    commit(
      items.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
    return;
  }
  commit([...items, { ...product, quantity: 1 }]);
}

export function setQuantity(id: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }
  commit(items.map((item) => (item.id === id ? { ...item, quantity } : item)));
}

export function removeFromCart(id: string) {
  commit(items.filter((item) => item.id !== id));
}

export function clearCart() {
  commit([]);
}

export function totalItems(list: CartItem[]) {
  return list.reduce((sum, item) => sum + item.quantity, 0);
}
