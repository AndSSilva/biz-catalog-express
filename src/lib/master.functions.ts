import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOGO_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 anos

export type MasterCompany = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
  createdAt: string;
  admins: { userId: string; fullName: string; email: string }[];
};

/** Toda ação do Admin Master exige o papel `master` verificado no banco. */
async function assertMaster(context: { supabase: { rpc: Function }; userId: string }) {
  const { data, error } = await (context.supabase as any).rpc("is_master", {
    _user_id: context.userId,
  });
  if (error) throw new Error("Não foi possível validar a permissão.");
  if (!data) throw new Error("Acesso restrito.");
}

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MasterCompany[]> => {
    await assertMaster(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: companies, error }, { data: members }, { data: usersData }] = await Promise.all([
      supabaseAdmin
        .from("companies")
        .select("id, name, slug, logo_url, primary_color, secondary_color, is_active, created_at")
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("company_members").select("user_id, company_id, full_name"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (error) throw new Error("Não foi possível carregar as empresas.");

    const emails = new Map((usersData?.users ?? []).map((user) => [user.id, user.email ?? ""]));

    return (companies ?? []).map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logo_url,
      primaryColor: company.primary_color,
      secondaryColor: company.secondary_color,
      isActive: company.is_active,
      createdAt: company.created_at,
      admins: (members ?? [])
        .filter((member) => member.company_id === company.id)
        .map((member) => ({
          userId: member.user_id,
          fullName: member.full_name,
          email: emails.get(member.user_id) ?? "",
        })),
    }));
  });

const hex = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida");

const companySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Endereço inválido")
    .min(2)
    .max(60),
  primaryColor: hex,
  secondaryColor: hex,
  isActive: z.boolean(),
  logo: z
    .object({
      base64: z.string().min(10).max(4_000_000),
      contentType: z.string().min(3).max(80),
      extension: z.string().min(2).max(6),
    })
    .nullable()
    .optional(),
});

const RESERVED_SLUGS = new Set(["admin", "master", "api", "carrinho", "_authenticated"]);

export const saveCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => companySchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertMaster(context);
    if (RESERVED_SLUGS.has(data.slug)) throw new Error("Este endereço é reservado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let logoUrl: string | null = null;
    if (data.logo) {
      const bytes = Uint8Array.from(atob(data.logo.base64), (char) => char.charCodeAt(0));
      const path = `logos/${crypto.randomUUID()}.${data.logo.extension}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("product-images")
        .upload(path, bytes, { contentType: data.logo.contentType, cacheControl: "31536000" });
      if (uploadError) throw new Error("Falha ao enviar a logo.");
      const { data: signed } = await supabaseAdmin.storage
        .from("product-images")
        .createSignedUrl(path, LOGO_URL_TTL);
      logoUrl = signed?.signedUrl ?? null;
    }

    const payload = {
      name: data.name,
      slug: data.slug,
      primary_color: data.primaryColor,
      secondary_color: data.secondaryColor,
      is_active: data.isActive,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("companies").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("companies")
      .insert(payload)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Falha ao criar a empresa.");

    // Cada empresa começa com os textos padrão do próprio catálogo.
    await supabaseAdmin.from("settings").insert([
      { company_id: created.id, key: "store_name", value: data.name },
      { company_id: created.id, key: "whatsapp_number", value: "" },
      { company_id: created.id, key: "greeting", value: "Olá! Gostaria de fazer um pedido:" },
      {
        company_id: created.id,
        key: "store_tagline",
        value: "Escolha os produtos e finalize pelo WhatsApp",
      },
    ]);

    return { id: created.id };
  });

export const setCompanyActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertMaster(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Exclusão definitiva: apaga produtos, pedidos, configurações e contas de admin da empresa. */
export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), confirmSlug: z.string().trim().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMaster(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: company, error: loadError } = await supabaseAdmin
      .from("companies")
      .select("id, slug")
      .eq("id", data.id)
      .single();
    if (loadError || !company) throw new Error("Empresa não encontrada.");
    if (company.slug !== data.confirmSlug) throw new Error("Confirmação não corresponde ao endereço da empresa.");

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("company_id", company.id);
    const orderIds = (orders ?? []).map((order) => order.id);
    if (orderIds.length > 0) {
      await supabaseAdmin.from("order_items").delete().in("order_id", orderIds);
      await supabaseAdmin.from("orders").delete().eq("company_id", company.id);
    }

    await supabaseAdmin.from("products").delete().eq("company_id", company.id);
    await supabaseAdmin.from("categories").delete().eq("company_id", company.id);
    await supabaseAdmin.from("settings").delete().eq("company_id", company.id);

    const { data: members } = await supabaseAdmin
      .from("company_members")
      .select("user_id")
      .eq("company_id", company.id);
    await supabaseAdmin.from("company_members").delete().eq("company_id", company.id);

    for (const member of members ?? []) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", member.user_id);
      await supabaseAdmin.auth.admin.deleteUser(member.user_id);
    }

    const { error } = await supabaseAdmin.from("companies").delete().eq("id", company.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });


export const createCompanyAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        companyId: z.string().uuid(),
        fullName: z.string().trim().min(2).max(120),
        email: z.string().trim().email(),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMaster(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar o usuário.");

    const userId = created.user.id;

    const { error: memberError } = await supabaseAdmin
      .from("company_members")
      .insert({ user_id: userId, company_id: data.companyId, full_name: data.fullName });
    if (memberError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Falha ao vincular o administrador à empresa.");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleError) throw new Error("Falha ao conceder o acesso de administrador.");

    return { ok: true as const };
  });
