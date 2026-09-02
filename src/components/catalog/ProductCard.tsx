import { Check, Images, Minus, Plus, ShoppingBag, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CatalogProduct } from "@/lib/catalog.functions";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/price";

type Props = {
  product: CatalogProduct;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onClick: () => void;
};

export function ProductCard({
  product,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  onClick,
}: Props) {
  const inCart = quantity > 0;

  return (
    <article
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md cursor-pointer"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            decoding="async"
            width={800}
            height={600}
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8" aria-hidden />
          </div>
        )}
        {inCart && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.6875rem] font-semibold text-primary-foreground shadow-sm sm:left-3 sm:top-3 sm:text-xs">
            <Check className="h-3.5 w-3.5" aria-hidden />
            No carrinho
          </span>
        )}
        {product.on_sale && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-[0.6875rem] font-semibold text-destructive-foreground shadow-sm sm:right-3 sm:top-3 sm:text-xs">
            <Tag className="h-3.5 w-3.5" aria-hidden />
            Promoção
          </span>
        )}
        {product.image_urls.length > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.6875rem] font-semibold text-white sm:bottom-3 sm:right-3">
            <Images className="h-3.5 w-3.5" aria-hidden />
            {product.image_urls.length}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
        <h2 className="text-base leading-snug font-semibold text-foreground sm:text-lg">
          {product.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-foreground">
            {formatPrice(product.price) ?? "Sob consulta"}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
            {AVAILABILITY_LABEL[product.availability]}
          </span>
        </div>
        <p className="line-clamp-2 text-sm sm:line-clamp-3 leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        <div className="mt-auto pt-3">
          {inCart ? (
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-full border border-border bg-secondary/60 p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                aria-label={`Diminuir quantidade de ${product.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDecrement();
                }}
              >
                <Minus className="h-4 w-4" aria-hidden />
              </Button>
              <span className="text-center text-sm font-semibold" aria-live="polite">
                {quantity} {quantity === 1 ? "unidade" : "unidades"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                aria-label={`Aumentar quantidade de ${product.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onIncrement();
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="h-11 w-full rounded-full text-sm sm:h-12 font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Adicionar
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
