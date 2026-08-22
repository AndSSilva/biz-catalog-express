import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AdminProduct = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  category_id: string | null;
  categories?: { id: string; name: string } | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type AdminCompany = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
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
      return Boolean(data);
    },
    staleTime: 30_000,
  });
}

export function useIsMaster() {
  return useQuery({
    queryKey: ["is-master"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return false;
      const { data, error } = await supabase.rpc("is_master", { _user_id: userId });
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 30_000,
  });
}

/** Empresa à qual o administrador logado está vinculado (definida pelo Admin Master). */
export function useMyCompany() {
  return useQuery({
    queryKey: ["my-company"],
    queryFn: async (): Promise<AdminCompany | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;

      const { data: member, error: memberError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (memberError) throw memberError;
      if (!member) return null;

      const { data: company, error } = await supabase
        .from("companies")
        .select("id, name, slug, logo_url, primary_color, secondary_color, is_active")
        .eq("id", member.company_id)
        .maybeSingle();
      if (error) throw error;
      if (!company) return null;

      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logo_url,
        primaryColor: company.primary_color,
        secondaryColor: company.secondary_color,
        isActive: company.is_active,
      };
    },
    staleTime: 60_000,
  });
}

function useCompanyId() {
  const { data: company } = useMyCompany();
  return () => {
    if (!company) throw new Error("Sua conta não está vinculada a nenhuma empresa.");
    return company.id;
  };
}

/**
 * Empresa do administrador logado. Toda consulta do /admin passa por aqui:
 * sem vínculo empresa↔admin a query nem roda (nunca cai para "sem filtro").
 */
function useCompanyScope() {
  const { data: company, isPending } = useMyCompany();
  return { companyId: company?.id ?? null, isPending };
}

export function useAdminProducts() {
  const { companyId } = useCompanyScope();
  return useQuery({
    queryKey: ["admin-products", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<AdminProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, title, description, image_url, is_active, sort_order, category_id, categories(id, name)",
        )
        .eq("company_id", companyId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminProduct(id: string) {
  const { companyId } = useCompanyScope();
  return useQuery({
    queryKey: ["admin-product", companyId, id],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<AdminProduct> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, title, description, image_url, is_active, sort_order, category_id, categories(id, name)",
        )
        .eq("id", id)
        .eq("company_id", companyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCategories() {
  const { companyId } = useCompanyScope();
  return useQuery({
    queryKey: ["admin-categories", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, sort_order")
        .eq("company_id", companyId!)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Quantidade de produtos vinculados a cada categoria (somente da própria empresa). */
export function useCategoryProductCounts() {
  const { companyId } = useCompanyScope();
  return useQuery({
    queryKey: ["admin-category-counts", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category_id")
        .eq("company_id", companyId!);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        if (!row.category_id) continue;
        counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
      }
      return counts;
    },
  });
}


export function slugifyCategory(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-category-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };
}

export function useSaveCategory() {
  const invalidate = useInvalidateCategories();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (input: { id?: string | undefined; name: string; sort_order: number }) => {
      const id = companyId();
      const payload = {
        name: input.name,
        slug: slugifyCategory(input.name) || crypto.randomUUID().slice(0, 8),
        sort_order: input.sort_order,
      };
      if (input.id) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", input.id)
          .eq("company_id", id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("categories")
        .insert({ ...payload, company_id: id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (id: string) => {
      const company = companyId();
      const { count, error: countError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id)
        .eq("company_id", company);
      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        throw new Error(
          "Esta categoria possui produtos vinculados. Mova os produtos para outra categoria antes de excluir.",
        );
      }
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("company_id", company);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Move todos os produtos de uma categoria para outra (dentro da própria empresa). */
export function useMoveCategoryProducts() {
  const invalidate = useInvalidateCategories();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: string; toId: string }) => {
      const { error } = await supabase
        .from("products")
        .update({ category_id: toId })
        .eq("category_id", fromId)
        .eq("company_id", companyId());
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}


/** Move todos os produtos de uma categoria para outra. */
export function useMoveCategoryProducts() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: string; toId: string }) => {
      const { error } = await supabase
        .from("products")
        .update({ category_id: toId })
        .eq("category_id", fromId);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (input: {
      id?: string | undefined;
      title: string;
      description: string;
      image_url: string | null;
      is_active: boolean;
      sort_order: number;
      category_id: string;
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
            category_id: input.category_id,
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
          category_id: input.category_id,
          company_id: companyId(),
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

/**
 * Envia a foto para o armazenamento e devolve uma URL de leitura de longa duração.
 * O arquivo fica na pasta da própria empresa (isolamento garantido pelo banco).
 */
export async function uploadProductImage(file: File, companyId: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${companyId}/${crypto.randomUUID()}.${extension}`;

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
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const id = companyId();
      const rows = Object.entries(values).map(([key, value]) => ({
        key,
        value,
        company_id: id,
      }));
      const { error } = await supabase
        .from("settings")
        .upsert(rows, { onConflict: "company_id,key" });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}
