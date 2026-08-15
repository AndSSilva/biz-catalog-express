import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/_authenticated/admin/produtos/novo")({
  head: () => ({
    meta: [
      { title: "Novo produto — Catálogo" },
      { name: "description", content: "Cadastre um novo produto no catálogo." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Novo produto" },
      { property: "og:description", content: "Cadastre um novo produto no catálogo." },
    ],
  }),
  component: () => (
    <AdminShell title="Novo produto">
      <ProductForm />
    </AdminShell>
  ),
});
