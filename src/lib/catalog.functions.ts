import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createPublicClient } from "./supabase-public.server";

export type CatalogProduct = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  category_id: string | null;
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
};

const DEFAULT_SETTINGS: StoreSettings = {
  whatsappNumber: "",
  greeting: "Olá! Gostaria de fazer um pedido:",
  storeName: "Catálogo",
  storeTagline: "Escolha os produtos e finalize pelo WhatsApp",
};

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();

  const [productsResult, settingsResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, title, description, image_url, category_id")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("settings").select("key, value"),
    supabase.from("categories").select("id, name").order("sort_order", { ascending: true }).order("name", { ascending: true }),
  ]);

  if (productsResult.error) {
    console.error("getCatalog products", productsResult.error);
    throw new Error("Não foi possível carregar o catálogo.");
  }

  const map = new Map((settingsResult.data ?? []).map((row) => [row.key, row.value]));
  const settings: StoreSettings = {
    whatsappNumber: map.get("whatsapp_number") ?? DEFAULT_SETTINGS.whatsappNumber,
    greeting: map.get("greeting") || DEFAULT_SETTINGS.greeting,
    storeName: map.get("store_name") || DEFAULT_SETTINGS.storeName,
    storeTagline: map.get("store_tagline") || DEFAULT_SETTINGS.storeTagline,
  };

  return {
    products: (productsResult.data ?? []) as CatalogProduct[],
    categories: (categoriesResult.data ?? []) as CatalogCategory[],
    settings,
  };
});

const orderSchema = z.object({
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
});

/** Registra a conversão no momento em que o cliente finaliza o pedido. */
export const recordOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const total = data.items.reduce((sum, item) => sum + item.quantity, 0);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({ total_items: total })
      .select("id")
      .single();

    if (error || !order) {
      console.error("recordOrder order", error);
      return { ok: false as const };
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      data.items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_title: item.title,
        quantity: item.quantity,
      })),
    );

    if (itemsError) {
      console.error("recordOrder items", itemsError);
      return { ok: false as const };
    }

    return { ok: true as const };
  });
