import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CatalogMeasurement, CatalogProduct } from "@/lib/catalog.functions";

type Props = {
  product: CatalogProduct | null;
  open: boolean;
  onClose: () => void;
  onSelect: (measurement: CatalogMeasurement) => void;
};

export function MeasurementDialog({ product, open, onClose, onSelect }: Props) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl p-5 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Escolha a medida</DialogTitle>
          <DialogDescription>
            Selecione a medida de {product.title} para adicionar ao carrinho.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Medidas disponíveis">
          {product.measurements.map((measurement) => (
            <Button
              key={measurement.id}
              type="button"
              variant="outline"
              className="h-12 justify-between rounded-lg px-4 text-base"
              onClick={() => onSelect(measurement)}
            >
              <span className="truncate">{measurement.label}</span>
              <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}