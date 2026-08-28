import { Minus, Plus, ShoppingBag, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { CatalogProduct } from "@/lib/catalog.functions";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/price";

type Props = {
  product: CatalogProduct | null;
  open: boolean;
  onClose: () => void;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function ProductDetailModal({
  product,
  open,
  onClose,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
}: Props) {
  const inCart = quantity > 0;

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 sm:rounded-2xl">
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="h-16 w-16" aria-hidden />
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes do produto"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            {product.on_sale && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground shadow-sm">
                <Tag className="h-3.5 w-3.5" aria-hidden />
                Promoção
              </span>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-bold sm:text-2xl">{product.title}</DialogTitle>
              {product.description && (
                <DialogDescription className="sr-only">{product.description}</DialogDescription>
              )}
            </DialogHeader>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {formatPrice(product.price) ?? "Sob consulta"}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {AVAILABILITY_LABEL[product.availability]}
              </span>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground sm:text-base">
              {product.description || "Sem descrição."}
            </p>

            <div className="mt-6">
              {inCart ? (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-full border border-border bg-secondary/60 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 shrink-0 rounded-full"
                    aria-label={`Diminuir quantidade de ${product.title}`}
                    onClick={onDecrement}
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
                    className="h-12 w-12 shrink-0 rounded-full"
                    aria-label={`Aumentar quantidade de ${product.title}`}
                    onClick={onIncrement}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  className="h-12 w-full rounded-full text-sm font-semibold"
                  onClick={onAdd}
                >
                  <Plus className="mr-1 h-4 w-4" aria-hidden />
                  Adicionar ao carrinho
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
