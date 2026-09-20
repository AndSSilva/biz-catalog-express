import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompany } from "./admin-data";

export type CompanyMeasurement = {
  id: string;
  company_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductMeasurement = {
  measurement_id: string;
  sort_order: number;
  measurement: CompanyMeasurement;
};

/**
 * Reaproveita useMyCompany (admin-data.ts) em vez de ter sua própria consulta
 * com queryKey própria — as duas já chegaram a colidir sob a mesma chave
 * "my-company" no cache do React Query (um lado guardando a empresa inteira,
 * o outro esperando só o id), causando o id vir como objeto em vez de texto
 * ao gravar no banco.
 */
function useCompanyId() {
  const { data: company } = useMyCompany();
  return company?.id ?? null;
}

export function useCompanyMeasurements() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["company-measurements", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyMeasurement[]> => {
      const { data, error } = await supabase
        .from("company_measurements")
        .select("id, company_id, label, sort_order, is_active, created_at, updated_at")
        .eq("company_id", companyId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useInvalidateMeasurements() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["company-measurements"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    void queryClient.invalidateQueries({ queryKey: ["product-measurements"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };
}

export function useSaveCompanyMeasurement() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateMeasurements();
  return useMutation({
    mutationFn: async (input: { id?: string; label: string; sort_order: number }) => {
      if (!companyId) throw new Error("Sua conta não está vinculada a nenhuma empresa.");
      const label = input.label.trim();
      if (!label) throw new Error("Informe uma medida.");

      const { data: duplicate, error: duplicateError } = await supabase
        .from("company_measurements")
        .select("id")
        .eq("company_id", companyId)
        .ilike("label", label)
        .limit(5);
      if (duplicateError) throw duplicateError;
      if (duplicate?.some((row) => row.id !== input.id)) {
        throw new Error("Essa medida já foi cadastrada.");
      }

      if (input.id) {
        const { error } = await supabase
          .from("company_measurements")
          .update({ label, sort_order: input.sort_order })
          .eq("id", input.id)
          .eq("company_id", companyId);
        if (error) throw error;
        return input.id;
      }

      const { data, error } = await supabase
        .from("company_measurements")
        .insert({ company_id: companyId, label, sort_order: input.sort_order })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteCompanyMeasurement() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateMeasurements();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error("Sua conta não está vinculada a nenhuma empresa.");
      const { error } = await supabase
        .from("company_measurements")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Medidas hoje vinculadas a um produto (só os ids, na ordem salva). */
export function useProductMeasurements(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-measurements", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("product_measurements")
        .select("measurement_id, sort_order")
        .eq("product_id", productId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => row.measurement_id);
    },
  });
}

/**
 * Substitui a lista de medidas vinculadas a um produto pela informada,
 * preservando a ordem. Mesmo padrão "apaga tudo e recria" já usado para
 * as fotos do produto — o volume de medidas por produto é pequeno.
 */
export async function replaceProductMeasurements(productId: string, measurementIds: string[]) {
  const { error: deleteError } = await supabase
    .from("product_measurements")
    .delete()
    .eq("product_id", productId);
  if (deleteError) throw deleteError;

  if (measurementIds.length === 0) return;

  const { error } = await supabase.from("product_measurements").insert(
    measurementIds.map((measurementId, index) => ({
      product_id: productId,
      measurement_id: measurementId,
      sort_order: index,
    })),
  );
  if (error) throw error;
}
