import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { useDashboard } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Catálogo" },
      { name: "description", content: "Resumo de pedidos iniciados e produtos mais selecionados." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Dashboard do catálogo" },
      { property: "og:description", content: "Pedidos iniciados e produtos mais selecionados." },
    ],
  }),
  component: DashboardPage,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  return (
    <AdminShell title="Dashboard">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando dados...</p>}
      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os indicadores.</p>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Pedidos iniciados" value={data.totalOrders} />
            <Stat label="Itens selecionados" value={data.totalItems} />
            <Stat label="Produtos ativos" value={data.activeProducts} />
            <Stat label="Mais selecionado" value={data.topProducts[0]?.title ?? "—"} />
          </div>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-lg font-bold">Produtos mais selecionados</h2>
            {data.topProducts.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum pedido registrado ainda.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {data.topProducts.map((product) => (
                  <li
                    key={product.title}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">{product.title}</span>
                    <span className="shrink-0 font-semibold text-primary">
                      {product.quantity} seleções
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-lg font-bold">Últimos pedidos</h2>
            {data.recentOrders.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido ainda.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {data.recentOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("pt-BR")}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {order.total_items} {order.total_items === 1 ? "item" : "itens"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
