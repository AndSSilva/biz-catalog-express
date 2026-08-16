import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AdminProduct = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const IMAGE_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 anos

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return false;

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (error) throw error;
      if (data) return true;

      // Primeiro acesso: o primeiro usuário cadastrado se torna administrador.
      const { data: claimed } = await supabase.rpc("claim_admin");
      return Boolean(claimed);
    },
    staleTime: 30_000,
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: ["admin-products"],
    queryFn: async (): Promise<AdminProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, description, image_url, is_active, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: async (): Promise<AdminProduct> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, description, image_url, is_active, sort_order")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
}

export function useSaveProduct() {
  const invalidate = useInvalidateCatalog();

  return useMutation({
    mutationFn: async (input: {
      id?: string | undefined;
      title: string;
      description: string;
      image_url: string | null;
      is_active: boolean;
      sort_order: number;
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("products")
          .update({
            title: input.title,
            description: input.description,
            image_url: input.image_url,
            is_active: input.is_active,
            sort_order: input.sort_order,
          })
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }

      const { data, error } = await supabase
        .from("products")
        .insert({
          title: input.title,
          description: input.description,
          image_url: input.image_url,
          is_active: input.is_active,
          sort_order: input.sort_order,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useToggleActive() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useReorderProducts() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async (ordered: { id: string; sort_order: number }[]) => {
      for (const row of ordered) {
        const { error } = await supabase
          .from("products")
          .update({ sort_order: row.sort_order })
          .eq("id", row.id);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

/** Envia a foto para o armazenamento e devolve uma URL de leitura de longa duração. */
export async function uploadProductImage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, IMAGE_URL_TTL);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Falha ao gerar a URL da imagem");

  return data.signedUrl;
}

export type DashboardData = {
  totalOrders: number;
  totalItems: number;
  activeProducts: number;
  topProducts: { title: string; quantity: number }[];
  recentOrders: { id: string; created_at: string; total_items: number }[];
};

export function useDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const [orders, items, activeCount] = await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at, total_items")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("order_items").select("product_title, quantity").limit(5000),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      if (orders.error) throw orders.error;
      if (items.error) throw items.error;

      const totals = new Map<string, number>();
      let totalItems = 0;
      for (const row of items.data ?? []) {
        totals.set(row.product_title, (totals.get(row.product_title) ?? 0) + row.quantity);
        totalItems += row.quantity;
      }

      return {
        totalOrders: orders.data?.length ?? 0,
        totalItems,
        activeProducts: activeCount.count ?? 0,
        topProducts: [...totals.entries()]
          .map(([title, quantity]) => ({ title, quantity }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10),
        recentOrders: (orders.data ?? []).slice(0, 8),
      };
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("key, value");
      if (error) throw error;
      return new Map((data ?? []).map((row) => [row.key, row.value]));
    },
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
      const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}
