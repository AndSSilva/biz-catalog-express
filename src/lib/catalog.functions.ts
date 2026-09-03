import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";

import { createPublicClient } from "./supabase-public.server";

export type ProductAvailability = "pronta_entrega" | "sob_encomenda";

export type CatalogProduct = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  image_urls: string[];
  category_id: string | null;
  price: number | null;
  on_sale: boolean;
  availability: ProductAvailability;
  stock_quantity: number;
  show_stock_in_catalog: boolean;
};

export type CatalogCategory = {
  id: string;
  name: string;
};

export type StoreSettings = {
  whatsappNumber: string;
  greeting: string;
  storeName: string;
  storeTagline: string;
  enableDeliverySelection: boolean;
  storeAddress: string;
  storeMapsUrl: string;
};

export type CatalogCompany = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
};

const DEFAULT_SETTINGS: StoreSettings = {
  whatsappNumber: "",
  greeting: "Olá! Gostaria de fazer um pedido:",
  storeName: "Catálogo",
  storeTagline: "Escolha os produtos e finalize pelo WhatsApp",
  enableDeliverySelection: false,
  storeAddress: "",
  storeMapsUrl: "",
};

const slugSchema = z.object({ slug: z.string().min(1).max(80) });

export const getCatalog = createServerFn({ method: "GET" })
  .inputValidator((input) => slugSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createPublicClient();

    // A empresa é resolvida no servidor a partir do endereço público (slug).
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, slug, logo_url, primary_color, secondary_color")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (companyError) {
      console.error("getCatalog company", companyError);
      throw new Error("Não foi possível carregar o catálogo.");
    }
    if (!company) throw notFound();

    const [productsResult, settingsResult, categoriesResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, title, description, image_url, category_id, price, on_sale, availability, stock_quantity, show_stock_in_catalog",
        )
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("settings").select("key, value").eq("company_id", company.id),
      supabase
        .from("categories")
        .select("id, name")
        .eq("company_id", company.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (productsResult.error) {
      console.error("getCatalog products", productsResult.error);
      throw new Error("Não foi possível carregar o catálogo.");
    }

    const productIds = (productsResult.data ?? []).map((product) => product.id);
    const imagesByProduct = new Map<string, string[]>();
    if (productIds.length > 0) {
      const { data: imageRows, error: imagesError } = await supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true });
      if (imagesError) {
        console.error("getCatalog product_images", imagesError);
      } else {
        for (const row of imageRows ?? []) {
          const list = imagesByProduct.get(row.product_id) ?? [];
          list.push(row.image_url);
          imagesByProduct.set(row.product_id, list);
        }
      }
    }

    const map = new Map((settingsResult.data ?? []).map((row) => [row.key, row.value]));
    const settings: StoreSettings = {
      whatsappNumber: map.get("whatsapp_number") ?? DEFAULT_SETTINGS.whatsappNumber,
      greeting: map.get("greeting") || DEFAULT_SETTINGS.greeting,
      storeName: map.get("store_name") || company.name,
      storeTagline: map.get("store_tagline") || DEFAULT_SETTINGS.storeTagline,
      enableDeliverySelection: map.get("enable_delivery_selection") === "true",
      storeAddress: map.get("store_address") ?? DEFAULT_SETTINGS.storeAddress,
      storeMapsUrl: map.get("store_maps_url") ?? DEFAULT_SETTINGS.storeMapsUrl,
    };

    const products: CatalogProduct[] = (productsResult.data ?? []).map((product) => {
      const imageUrls = imagesByProduct.get(product.id) ?? [];
      return {
        ...product,
        // Segurança extra para produtos antigos cuja galeria não tenha sido migrada.
        image_urls: imageUrls.length > 0 ? imageUrls : product.image_url ? [product.image_url] : [],
      };
    });

    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logo_url,
        primaryColor: company.primary_color,
        secondaryColor: company.secondary_color,
      } satisfies CatalogCompany,
      products,
      categories: (categoriesResult.data ?? []) as CatalogCategory[],
      settings,
    };
  });

/** Usado na raiz do site: se existe apenas uma empresa ativa, ela é o catálogo padrão. */
export const getDefaultCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("companies")
    .select("slug, name")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(2);

  if (error) {
    console.error("getDefaultCatalog", error);
    return { slug: null as string | null, count: 0 };
  }

  return {
    slug: (data ?? []).length === 1 ? (data![0]!.slug as string) : null,
    count: (data ?? []).length,
  };
});

const orderSchema = z.object({
  slug: z.string().min(1).max(80),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(100),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(8).max(30),
  deliveryMethod: z.enum(["retirada", "tele_entrega"]).nullable(),
  deliveryAddress: z.string().trim().max(300).nullable(),
});

/** Registra a conversão no momento em que o cliente finaliza o pedido. */
export const recordOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createPublicClient();

    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (!company) return { ok: false as const };

    // Só produtos ativos da própria empresa entram no registro do pedido.
    const { data: valid } = await supabase
      .from("products")
      .select("id, title")
      .eq("company_id", company.id)
      .in(
        "id",
        data.items.map((item) => item.id),
      );

    const allowed = new Map((valid ?? []).map((row) => [row.id, row.title]));
    const items = data.items.filter((item) => allowed.has(item.id));
    if (items.length === 0) return { ok: false as const };

    const total = items.reduce((sum, item) => sum + item.quantity, 0);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        total_items: total,
        company_id: company.id,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        delivery_method: data.deliveryMethod,
        delivery_address: data.deliveryMethod === "tele_entrega" ? data.deliveryAddress : null,
      })
      .select("id")
      .single();

    if (error || !order) {
      console.error("recordOrder order", error);
      return { ok: false as const };
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_title: allowed.get(item.id) ?? item.title,
        quantity: item.quantity,
      })),
    );

    if (itemsError) {
      console.error("recordOrder items", itemsError);
      return { ok: false as const };
    }

    return { ok: true as const };
  });
