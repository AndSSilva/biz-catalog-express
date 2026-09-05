import { createFileRoute } from "@tanstack/react-router";
import { Check, CheckCircle2, History, ListChecks, PackageSearch, XCircle } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyCompany } from "@/lib/admin-data";
import {
  STOCK_LOG_ACTION_LABEL,
  useFinishInventoryCount,
  useInventoryCountItems,
  useInventoryCounts,
  useResolveStockOperation,
  useSaveInventoryCountItem,
  useStartInventoryCount,
  useStockLogs,
  useStockPendingOperations,
  type InventoryCountItem,
  type StockPendingOperation,
} from "@/lib/stock-data";

export const Route = createFileRoute("/_authenticated/admin/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Catálogo" },
      { name: "description", content: "Inventário, baixas de estoque e histórico de alterações." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockPage,
});

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function StockPage() {
  const { data: company, isLoading: loadingCompany } = useMyCompany();

  return (
    <AdminShell title="Estoque">
      {loadingCompany ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !company?.stockControlEnabled ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Controle de estoque não habilitado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fale com o responsável pela plataforma para habilitar essa funcionalidade para a sua
            empresa.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="inventario">
          <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
            <TabsTrigger
              value="inventario"
              className="h-11 rounded-full border border-border data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <ListChecks className="mr-1.5 h-4 w-4" aria-hidden />
              Inventário
            </TabsTrigger>
            <TabsTrigger
              value="operacoes"
              className="h-11 rounded-full border border-border data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <PackageSearch className="mr-1.5 h-4 w-4" aria-hidden />
              Operação de estoque
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="h-11 rounded-full border border-border data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <History className="mr-1.5 h-4 w-4" aria-hidden />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventario" className="mt-4">
            <InventoryTab />
          </TabsContent>
          <TabsContent value="operacoes" className="mt-4">
            <OperationsTab />
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <LogsTab />
          </TabsContent>
        </Tabs>
      )}
    </AdminShell>
  );
}

// ---------------------------------------------------------------------------
// Inventário
// ---------------------------------------------------------------------------

function InventoryTab() {
  const { data: counts, isLoading, isError } = useInventoryCounts();
  const start = useStartInventoryCount();

  const activeCount = counts?.find((count) => count.status === "em_andamento") ?? null;
  const history = (counts ?? []).filter((count) => count.status === "finalizado");

  async function handleStart() {
    try {
      await start.mutateAsync();
      toast.success("Contagem iniciada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a contagem");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (isError) return <p className="text-sm text-destructive">Erro ao carregar o inventário.</p>;

  if (activeCount) {
    return <InventoryCountRunner countId={activeCount.id} startedAt={activeCount.started_at} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Nova contagem</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Lista todos os produtos de pronta entrega com o estoque atual, para você conferir um a um
          e informar a quantidade real.
        </p>
        <Button className="mt-3 h-11 rounded-full" disabled={start.isPending} onClick={handleStart}>
          {start.isPending ? "Iniciando..." : "Iniciar contagem"}
        </Button>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Contagens anteriores</h2>
          <ul className="mt-2 divide-y divide-border">
            {history.map((count) => (
              <li key={count.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  Iniciada em {formatDateTime(count.started_at)}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Finalizada {count.finished_at ? formatDateTime(count.finished_at) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InventoryCountRunner({ countId, startedAt }: { countId: string; startedAt: string }) {
  const { data: items, isLoading } = useInventoryCountItems(countId);
  const saveItem = useSaveInventoryCountItem();
  const finish = useFinishInventoryCount();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  async function commit(item: InventoryCountItem, rawValue: string) {
    const trimmed = rawValue.trim();
    if (trimmed === "") return;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Informe uma quantidade válida (0 ou mais)");
      return;
    }
    try {
      await saveItem.mutateAsync({
        id: item.id,
        inventoryCountId: countId,
        countedQuantity: Math.round(parsed),
      });
    } catch {
      toast.error(`Não foi possível salvar a contagem de "${item.product_title}"`);
    }
  }

  function focusNext(index: number) {
    const next = inputRefs.current[index + 1];
    if (next) {
      next.focus();
      next.select();
    }
  }

  async function handleFinish() {
    try {
      await finish.mutateAsync(countId);
      toast.success("Inventário finalizado — estoque atualizado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível finalizar o inventário",
      );
    }
  }

  const pending = (items ?? []).filter((item) => item.counted_quantity === null).length;
  const allCounted = (items ?? []).length > 0 && pending === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Contagem em andamento</h2>
            <p className="text-xs text-muted-foreground">
              Iniciada em {formatDateTime(startedAt)} ·{" "}
              {pending > 0 ? `${pending} item(ns) sem contagem` : "todos os itens contados"}
            </p>
          </div>
          <Button
            className="h-11 rounded-full"
            disabled={!allCounted || finish.isPending}
            onClick={handleFinish}
          >
            {finish.isPending ? "Finalizando..." : "Finalizar inventário"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando itens...</p>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {(items ?? []).map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 p-3.5">
              {item.counted_quantity !== null ? (
                <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <span className="h-4 w-4 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.product_title}</p>
                <p className="text-xs text-muted-foreground">
                  Estoque atual: {item.previous_quantity}
                </p>
              </div>
              <Input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Nova qtd."
                defaultValue={item.counted_quantity ?? ""}
                className="h-11 w-24 text-center"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void commit(item, event.currentTarget.value).then(() => focusNext(index));
                }}
                onBlur={(event) => void commit(item, event.currentTarget.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Operação de estoque
// ---------------------------------------------------------------------------

const OPERATION_STATUS_LABEL: Record<StockPendingOperation["status"], string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  cancelado: "Cancelado",
};

function OperationsTab() {
  const { data: operations, isLoading, isError } = useStockPendingOperations();
  const resolve = useResolveStockOperation();

  async function handleResolve(operation: StockPendingOperation, approve: boolean) {
    try {
      await resolve.mutateAsync({ operation, approve });
      toast.success(approve ? "Baixa aprovada" : "Operação cancelada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (isError) return <p className="text-sm text-destructive">Erro ao carregar as operações.</p>;

  if (!operations || operations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <h2 className="text-sm font-semibold">Nenhuma operação ainda</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Toda venda finalizada no catálogo aparece aqui como baixa pendente de estoque.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card">
      {operations.map((operation) => (
        <div key={operation.id} className="flex flex-wrap items-center gap-3 p-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{operation.product_title}</p>
            <p className="text-xs text-muted-foreground">
              {operation.quantity} unidade(s) · {formatDateTime(operation.created_at)}
            </p>
          </div>

          {operation.status === "pendente" ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-10 rounded-full border-border bg-card text-foreground hover:bg-accent"
                disabled={resolve.isPending}
                onClick={() => void handleResolve(operation, false)}
              >
                <XCircle className="mr-1.5 h-4 w-4" aria-hidden />
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-10 rounded-full"
                disabled={resolve.isPending}
                onClick={() => void handleResolve(operation, true)}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                Aprovar
              </Button>
            </div>
          ) : (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                operation.status === "aprovado"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {OPERATION_STATUS_LABEL[operation.status]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

function LogsTab() {
  const { data: logs, isLoading, isError } = useStockLogs();

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (isError) return <p className="text-sm text-destructive">Erro ao carregar os logs.</p>;

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <h2 className="text-sm font-semibold">Nenhum evento registrado ainda</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Toda alteração feita no inventário ou nas operações de estoque aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card">
      {logs.map((log) => (
        <div key={log.id} className="flex flex-col gap-0.5 p-3.5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{STOCK_LOG_ACTION_LABEL[log.action] ?? log.action}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
          </div>
          {log.product_title && (
            <p className="text-xs text-muted-foreground">Produto: {log.product_title}</p>
          )}
          {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
        </div>
      ))}
    </div>
  );
}
