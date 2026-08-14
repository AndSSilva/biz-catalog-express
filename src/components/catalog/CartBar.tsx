import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";

type Props = { count: number };

export function CartBar({ count }: Props) {
  if (count <= 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <Link
        to="/carrinho"
        className="mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-primary px-5 py-4 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
      >
        <span className="flex min-w-0 items-center gap-2 font-semibold">
          <ShoppingCart className="h-5 w-5 shrink-0" aria-hidden />
          <span className="truncate">Carrinho</span>
        </span>
        <span className="shrink-0 rounded-full bg-primary-foreground/15 px-3 py-1 text-sm font-semibold">
          {count} {count === 1 ? "item" : "itens"}
        </span>
      </Link>
    </div>
  );
}
