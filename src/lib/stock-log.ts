import { supabase } from "@/integrations/supabase/client";

/** Registra um evento na aba Estoque > Logs. Nunca lança erro — um log que falha não deve derrubar a ação principal. */
export async function insertStockLog(params: {
  companyId: string;
  actorId: string | null;
  action: string;
  productId?: string | null;
  productTitle?: string | null;
  details?: string | null;
}) {
  const { error } = await supabase.from("stock_logs").insert({
    company_id: params.companyId,
    actor_id: params.actorId,
    action: params.action,
    product_id: params.productId ?? null,
    product_title: params.productTitle ?? null,
    details: params.details ?? null,
  });
  if (error) console.error("insertStockLog", error);
}

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
