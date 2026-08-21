import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { brandingStyle } from "@/lib/branding";
import { clearCart, removeFromCart, setQuantity, totalItems, useCart } from "@/lib/cart";
import { catalogQueryOptions } from "@/lib/catalog-queries";
import { recordOrder } from "@/lib/catalog.functions";
import { buildOrderMessage, buildWhatsappUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/$slug/carrinho")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(catalogQueryOptions(params.slug)),
  head: ({ loaderData }) => {
    const name = loaderData?.settings.storeName ?? "Catálogo";
    const title = `Seu carrinho — ${name}`;
    const description =
      "Confira os produtos escolhidos, ajuste as quantidades e finalize o pedido pelo WhatsApp.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CartPage,
});

function CartPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(catalogQueryOptions(slug));
  const items = useCart(slug);
  const count = totalItems(items);
  const submitOrder = useServerFn(recordOrder);

  const [confirmClear, setConfirmClear] = useState(false);
  const [finishing, setFinishing] = useState(false);


  function handleFinish() {
    if (items.length === 0 || finishing) return;
    const number = data.settings.whatsappNumber;
    if (!number) {
      toast.error("O número de WhatsApp da loja ainda não foi configurado.");
      return;
    }

    setFinishing(true);
    const message = buildOrderMessage(items, data.settings.greeting);
    const url = buildWhatsappUrl(number, message);
    const payload = {
      slug,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
      })),
    };

    // Abre o WhatsApp de forma sincrona (dentro do gesto do usuário),
    // senão o navegador bloqueia como popup.
    let opened: Window | null = null;
    try {
      opened = window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      opened = null;
    }
    if (!opened) {
      try {
        (window.top ?? window).location.href = url;
      } catch {
        window.location.href = url;
      }
    }

    // Registra a conversão em background.
    void submitOrder({ data: payload }).catch((error) => {
      console.error("recordOrder", error);
    });

    clearCart();
    setFinishing(false);
    toast.success("Pedido enviado para o WhatsApp");
  }


  return (
    <div className="min-h-screen bg-background pb-32" style={brandingStyle(data.company)}>
      <header className="border-b border-border bg-card/70">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <Link
            to="/$slug"
            params={{ slug }}
            aria-label="Voltar ao catálogo"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold">Seu carrinho</h1>
            <p className="text-sm text-muted-foreground">
              {count} {count === 1 ? "item selecionado" : "itens selecionados"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold">Seu carrinho está vazio</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha os produtos no catálogo para montar seu pedido.
            </p>
            <Button asChild className="mt-6 h-12 rounded-full px-6">
              <Link to="/$slug" params={{ slug }}>
                Ver produtos
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        aria-label={`Diminuir quantidade de ${item.title}`}
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" aria-hidden />
                      </Button>
                      <span className="min-w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        aria-label={`Aumentar quantidade de ${item.title}`}
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full text-muted-foreground"
                    aria-label={`Remover ${item.title}`}
                    onClick={() => {
                      removeFromCart(item.id);
                      toast("Produto removido");
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">
                Total de itens: <span className="text-primary">{count}</span>
              </p>
              <Button
                variant="ghost"
                className="h-11 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (items.length > 1) {
                    setConfirmClear(true);
                    return;
                  }
                  clearCart();
                  toast("Carrinho limpo");
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" aria-hidden />
                Limpar carrinho
              </Button>
            </div>
          </>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            <Button
              className="h-14 w-full rounded-full text-base font-bold"
              disabled={finishing}
              onClick={handleFinish}
            >
              {finishing ? "Abrindo WhatsApp..." : "Finalizar pedido no WhatsApp"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Você continua a conversa no WhatsApp para confirmar o pedido.
            </p>
          </div>
        </div>
      )}

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar o carrinho?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os {items.length} produtos selecionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearCart();
                toast("Carrinho limpo");
              }}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
