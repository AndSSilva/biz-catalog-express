import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

import { getDefaultCatalog } from "@/lib/catalog.functions";

export const Route = createFileRoute("/")({
  loader: async () => {
    const result = await getDefaultCatalog();
    // Com uma única empresa ativa, a raiz é o catálogo dela.
    if (result.slug) throw redirect({ to: "/$slug", params: { slug: result.slug } });
    return result;
  },
  head: () => ({
    meta: [
      { title: "Catálogos com pedido pelo WhatsApp" },
      {
        name: "description",
        content:
          "Plataforma de catálogos digitais: cada empresa tem seu catálogo e recebe pedidos direto no WhatsApp.",
      },
      { property: "og:title", content: "Catálogos com pedido pelo WhatsApp" },
      {
        property: "og:description",
        content: "Cada empresa tem seu catálogo digital e recebe pedidos direto no WhatsApp.",
      },
    ],
  }),
  errorComponent: LandingFallback,
  component: LandingPage,
});

function LandingFallback() {
  return <LandingShell />;
}

function LandingPage() {
  return <LandingShell />;
}

function LandingShell() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <ShoppingBag className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight">Catálogos com pedido no WhatsApp</h1>
      <p className="text-sm text-muted-foreground">
        Cada empresa da plataforma tem seu próprio endereço de catálogo. Abra o link que você
        recebeu para ver os produtos e montar seu pedido.
      </p>
    </main>
  );
}
