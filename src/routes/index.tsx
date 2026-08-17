import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { CartBar } from "@/components/catalog/CartBar";
import { ProductCard } from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/button";
import { addToCart, setQuantity, totalItems, useCart } from "@/lib/cart";
import { catalogQueryOptions } from "@/lib/catalog-queries";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  head: () => ({
    meta: [
      { title: "Catálogo de produtos — pedido rápido pelo WhatsApp" },
      {
        name: "description",
        content:
          "Veja os produtos disponíveis, monte seu pedido em segundos e finalize a compra direto no WhatsApp.",
      },
      { property: "og:title", content: "Catálogo de produtos — pedido pelo WhatsApp" },
      {
        property: "og:description",
        content:
          "Escolha os produtos, ajuste as quantidades e finalize o pedido conversando no WhatsApp.",
      },
      { name: "twitter:title", content: "Catálogo de produtos — pedido pelo WhatsApp" },
      {
        name: "twitter:description",
        content: "Monte seu pedido em segundos e finalize no WhatsApp.",
      },
    ],
  }),
  errorComponent: CatalogError,
  component: CatalogPage,
});

function CatalogError() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-2xl font-bold">Não conseguimos carregar o catálogo</h1>
      <p className="text-sm text-muted-foreground">
        Verifique sua conexão e tente novamente em alguns segundos.
      </p>
      <Button className="h-12 rounded-full px-6" onClick={() => window.location.reload()}>
        Tentar novamente
      </Button>
    </main>
  );
}

function CatalogPage() {
  const { data } = useSuspenseQuery(catalogQueryOptions);
  const cart = useCart();
  const count = totalItems(cart);
  const [categoryId, setCategoryId] = useState<string>("all");

  const categories = data.categories ?? [];
  const visibleProducts = useMemo(
    () =>
      categoryId === "all"
        ? data.products
        : data.products.filter((product) => product.category_id === categoryId),
    [data.products, categoryId],
  );

  const quantityOf = (id: string) => cart.find((item) => item.id === id)?.quantity ?? 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border bg-card/70">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold sm:text-2xl">
              {data.settings.storeName}
            </h1>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {data.settings.storeTagline}
            </p>
          </div>
          <Link
            to="/carrinho"
            aria-label={`Abrir carrinho com ${count} ${count === 1 ? "item" : "itens"}`}
            className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        {categories.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Categoria
            </p>
            <div
              role="group"
              aria-label="Filtrar por categoria"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              {[{ id: "all", name: "Todas" }, ...categories].map((category) => {
                const active = categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategoryId(category.id)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-accent"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <h2 className="text-lg font-semibold">Nenhum produto disponível</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {categoryId === "all"
                ? "Volte em breve: o catálogo está sendo atualizado."
                : "Nenhum produto nesta categoria. Escolha \u201cTodas\u201d para ver tudo."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={quantityOf(product.id)}
                onAdd={() => {
                  addToCart({
                    id: product.id,
                    title: product.title,
                    imageUrl: product.image_url,
                  });
                  toast.success("Adicionado ao carrinho");
                }}
                onIncrement={() => setQuantity(product.id, quantityOf(product.id) + 1)}
                onDecrement={() => {
                  const next = quantityOf(product.id) - 1;
                  setQuantity(product.id, next);
                  if (next <= 0) toast("Produto removido do carrinho");
                }}
              />
            ))}
          </div>
        )}
      </main>

      <CartBar count={count} />
    </div>
  );
}
