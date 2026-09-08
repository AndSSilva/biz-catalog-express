import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompany } from "./admin-data";
import { currentUserId, insertStockLog } from "./stock-log";

function useCompanyScope() {
  const { data: company, isPending } = useMyCompany();
  return { companyId: company?.id ?? null, isPending };
}

// ---------- Operação de estoque (baixas pendentes do checkout) ----------

export type StockOperationStatus = "pendente" | "aprovado" | "cancelado";

export type StockPendingOperation = {
  id: string;
  order_id: string | null;
  product_id: string | null;
  product_title: string;
  quantity: number;
  status: StockOperationStatus;
  created_at: string;
  resolved_at: string | null;
};

export function useStockPendingOperations() {
  const { companyId } = useCompanyScope();
  return useQuery({
    queryKey: ["stock-pending-operations", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<StockPendingOperation[]> => {
      const { data, error } = await supabase
        .from("stock_pending_operations")
        .select(
          "id, order_id, product_id, product_title, quantity, status, created_at, resolved_at",
        )
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as StockPendingOperation[];
    },
  });
}

export function useResolveStockOperation() {
  const { companyId } = useCompanyScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { operation: StockPendingOperation; approve: boolean }) => {
      const company = companyId;
      if (!company) throw new Error("Sua conta não está vinculada a nenhuma empresa.");
      const userId = await currentUserId();
      const nextStatus: StockOperationStatus = input.approve ? "aprovado" : "cancelado";

      const { error: updateError, count } = await supabase
        .from("stock_pending_operations")
        .update(
          { status: nextStatus, resolved_at: new Date().toISOString(), resolved_by: userId },
          { count: "exact" },
        )
        .eq("id", input.operation.id)
        .eq("company_id", company)
        .eq("status", "pendente");
      if (updateError) throw updateError;
      if (!count) throw new Error("Essa operação já foi resolvida por outra pessoa.");

      if (input.approve && input.operation.product_id) {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", input.operation.product_id)
          .eq("company_id", company)
          .maybeSingle();
        if (productError) throw productError;

        if (product) {
          const nextQuantity = Math.max(0, product.stock_quantity - input.operation.quantity);
          const { error: stockError } = await supabase
            .from("products")
            .update({ stock_quantity: nextQuantity })
            .eq("id", input.operation.product_id)
            .eq("company_id", company);
          if (stockError) throw stockError;
        }
      }

      await insertStockLog({
        companyId: company,
        actorId: userId,
        action: input.approve ? "operacao_aprovada" : "operacao_cancelada",
        productId: input.operation.product_id,
        productTitle: input.operation.product_title,
        details: input.approve
          ? `Baixa de ${input.operation.quantity} unidade(s) aplicada ao estoque.`
          : `Baixa de ${input.operation.quantity} unidade(s) cancelada — estoque não alterado.`,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stock-pending-operations"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
    },
  });
}

// ---------- Inventário (contagem manual) ----------

export type InventoryCountStatus = "em_andamento" | "finalizado";

export type InventoryCount = {
  id: string;
  status: InventoryCountStatus;
  started_at: string;
  finished_at: string | null;
};

export type InventoryCountItem = {
  id: string;
  product_id: string | null;
  product_title: string;
  previous_quantity: number;
  counted_quantity: number | null;
  sort_order: number;
};

export function useInventoryCounts() {
  const { companyId } = useCompanyScope();
  return useQuery({
    queryKey: ["inventory-counts", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<InventoryCount[]> => {
      const { data, error } = await supabase
        .from("stock_inventory_counts")
        .select("id, status, started_at, finished_at")
        .eq("company_id", companyId!)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as InventoryCount[];
    },
  });
}

export function useInventoryCountItems(inventoryCountId: string | null) {
  return useQuery({
    queryKey: ["inventory-count-items", inventoryCountId],
    enabled: Boolean(inventoryCountId),
    queryFn: async (): Promise<InventoryCountItem[]> => {
      const { data, error } = await supabase
        .from("stock_inventory_count_items")
        .select("id, product_id, product_title, previous_quantity, counted_quantity, sort_order")
        .eq("inventory_count_id", inventoryCountId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStartInventoryCount() {
  const { companyId } = useCompanyScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<string> => {
      const company = companyId;
      if (!company) throw new Error("Sua conta não está vinculada a nenhuma empresa.");
      const userId = await currentUserId();

      // Só produtos de "pronta entrega" controlam estoque (sob encomenda fica sempre em 0).
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, title, stock_quantity")
        .eq("company_id", company)
        .eq("availability", "pronta_entrega")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (productsError) throw productsError;
      if (!products || products.length === 0) {
        throw new Error("Nenhum produto de pronta entrega cadastrado para contar.");
      }

      const { data: count, error: countError } = await supabase
        .from("stock_inventory_counts")
        .insert({ company_id: company, started_by: userId })
        .select("id")
        .single();
      if (countError || !count) {
        throw countError ?? new Error("Não foi possível iniciar a contagem.");
      }

      const { error: itemsError } = await supabase.from("stock_inventory_count_items").insert(
        products.map((product, index) => ({
          inventory_count_id: count.id,
          company_id: company,
          product_id: product.id,
          product_title: product.title,
          previous_quantity: product.stock_quantity,
          sort_order: index,
        })),
      );
      if (itemsError) throw itemsError;

      await insertStockLog({
        companyId: company,
        actorId: userId,
        action: "inventario_iniciado",
        details: `Contagem iniciada com ${products.length} produto(s) de pronta entrega.`,
      });

      return count.id as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
    },
  });
}

export function useSaveInventoryCountItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      inventoryCountId: string;
      countedQuantity: number;
    }) => {
      const { error } = await supabase
        .from("stock_inventory_count_items")
        .update({ counted_quantity: input.countedQuantity, counted_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["inventory-count-items", variables.inventoryCountId],
      });
    },
  });
}

export function useFinishInventoryCount() {
  const { companyId } = useCompanyScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inventoryCountId: string) => {
      const company = companyId;
      if (!company) throw new Error("Sua conta não está vinculada a nenhuma empresa.");
      const userId = await currentUserId();

      const { data: items, error: itemsError } = await supabase
        .from("stock_inventory_count_items")
        .select("id, product_id, product_title, previous_quantity, counted_quantity")
        .eq("inventory_count_id", inventoryCountId);
      if (itemsError) throw itemsError;
      if (!items || items.length === 0) throw new Error("Essa contagem não tem itens.");

      const missing = items.filter((item) => item.counted_quantity === null);
      if (missing.length > 0) {
        throw new Error(`Ainda faltam ${missing.length} item(ns) sem contagem informada.`);
      }

      const changed = items.filter((item) => item.counted_quantity !== item.previous_quantity);

      for (const item of changed) {
        if (!item.product_id) continue;
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_quantity: item.counted_quantity! })
          .eq("id", item.product_id)
          .eq("company_id", company);
        if (updateError) throw updateError;

        await insertStockLog({
          companyId: company,
          actorId: userId,
          action: "inventario_contagem",
          productId: item.product_id,
          productTitle: item.product_title,
          details: `De ${item.previous_quantity} para ${item.counted_quantity} unidade(s).`,
        });
      }

      const { error: finishError } = await supabase
        .from("stock_inventory_counts")
        .update({
          status: "finalizado",
          finished_at: new Date().toISOString(),
          finished_by: userId,
        })
        .eq("id", inventoryCountId)
        .eq("company_id", company);
      if (finishError) throw finishError;

      await insertStockLog({
        companyId: company,
        actorId: userId,
        action: "inventario_finalizado",
        details: `Contagem finalizada: ${changed.length} de ${items.length} produto(s) tiveram o estoque atualizado.`,
      });
    },
    onSuccess: (_data, inventoryCountId) => {
      void queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-count-items", inventoryCountId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
    },
  });
}

// ---------- Logs ----------

export type StockLog = {
  id: string;
  action: string;
  product_id: string | null;
  product_title: string | null;
  details: string | null;
  created_at: string;
};

export const STOCK_LOG_ACTION_LABEL: Record<string, string> = {
  inventario_iniciado: "Inventário iniciado",
  inventario_contagem: "Item contado",
  inventario_finalizado: "Inventário finalizado",
  operacao_aprovada: "Baixa aprovada",
  operacao_cancelada: "Baixa cancelada",
  alteracao_manual: "Estoque alterado manualmente",
  pedido_falhou: "⚠️ Falha ao registrar pedido",
  baixa_pendente_falhou: "⚠️ Falha ao registrar baixa de estoque",
};

export function useStockLogs() {
  const { companyId } = useCompanyScope();
  return useQuery({
    queryKey: ["stock-logs", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<StockLog[]> => {
      const { data, error } = await supabase
        .from("stock_logs")
        .select("id, action, product_id, product_title, details, created_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
}
