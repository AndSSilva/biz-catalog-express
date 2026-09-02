import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, Tag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [product?.id]);

  if (!product) return null;

  const images = product.image_urls;
  const hasMultipleImages = images.length > 1;

  function goTo(index: number) {
    if (images.length === 0) return;
    setActiveIndex((index + images.length) % images.length);
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 40) return;
    goTo(activeIndex + (deltaX < 0 ? 1 : -1));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 sm:rounded-2xl">
        <div className="max-h-[85vh] overflow-y-auto">
          <div
            className="relative aspect-4/3 w-full touch-pan-y select-none overflow-hidden bg-muted"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {images.length > 0 ? (
              <img
                src={images[activeIndex]}
                alt={`${product.title}${hasMultipleImages ? ` — foto ${activeIndex + 1} de ${images.length}` : ""}`}
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

            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(activeIndex - 1)}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(activeIndex + 1)}
                  aria-label="Próxima foto"
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {images.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => goTo(index)}
                      aria-label={`Ver foto ${index + 1}`}
                      aria-current={index === activeIndex}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        index === activeIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {hasMultipleImages && (
            <div className="flex gap-2 overflow-x-auto p-3 sm:px-6">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Ver foto ${index + 1}`}
                  aria-current={index === activeIndex}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    index === activeIndex ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

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
