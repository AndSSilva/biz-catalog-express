import { useEffect, useState } from "react";
import { MapPin, Store, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readSavedCheckoutInfo } from "@/lib/checkout-info";

export type DeliveryMethod = "retirada" | "tele_entrega";

export type CheckoutSubmission = {
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod | null;
  deliveryAddress: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (info: CheckoutSubmission) => void;
  submitting: boolean;
  enableDeliverySelection: boolean;
  storeAddress: string;
};

export function CheckoutDialog({
  open,
  onClose,
  onConfirm,
  submitting,
  enableDeliverySelection,
  storeAddress,
}: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Preenche com o que a pessoa informou da última vez, quando o diálogo abre.
  useEffect(() => {
    if (!open) return;
    const saved = readSavedCheckoutInfo();
    setCustomerName(saved.customerName);
    setCustomerPhone(saved.customerPhone);
    setDeliveryMethod(null);
    setDeliveryAddress("");
  }, [open]);

  const nameValid = customerName.trim().length >= 2;
  const phoneValid = customerPhone.replace(/\D/g, "").length >= 8;
  const deliveryValid =
    !enableDeliverySelection ||
    deliveryMethod === "retirada" ||
    (deliveryMethod === "tele_entrega" && deliveryAddress.trim().length >= 5);
  const canSubmit = nameValid && phoneValid && deliveryValid && !submitting;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    onConfirm({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryMethod: enableDeliverySelection ? deliveryMethod : null,
      deliveryAddress: deliveryMethod === "tele_entrega" ? deliveryAddress.trim() : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Finalizar pedido</DialogTitle>
          <DialogDescription>Só mais alguns dados antes de abrir o WhatsApp.</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="checkout-name">Nome</Label>
            <Input
              id="checkout-name"
              className="h-12"
              autoComplete="name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="checkout-phone">Telefone</Label>
            <Input
              id="checkout-phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              className="h-12"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
          </div>

          {enableDeliverySelection && (
            <div className="flex flex-col gap-2">
              <Label>Forma de entrega</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("retirada")}
                  className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors ${
                    deliveryMethod === "retirada"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  <Store className="h-4 w-4" aria-hidden />
                  Retirada na loja
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("tele_entrega")}
                  className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors ${
                    deliveryMethod === "tele_entrega"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  <Truck className="h-4 w-4" aria-hidden />
                  Tele-entrega
                </button>
              </div>

              {deliveryMethod === "retirada" && storeAddress && (
                <p className="flex items-start gap-1.5 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {storeAddress}
                </p>
              )}

              {deliveryMethod === "tele_entrega" && (
                <Input
                  id="checkout-address"
                  placeholder="CEP ou endereço completo para entrega"
                  className="h-12"
                  autoComplete="street-address"
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                />
              )}
            </div>
          )}

          <Button
            type="submit"
            className="h-12 rounded-full text-sm font-semibold"
            disabled={!canSubmit}
          >
            {submitting ? "Abrindo WhatsApp..." : "Continuar para o WhatsApp"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
