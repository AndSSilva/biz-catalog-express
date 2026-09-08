-- Até aqui, quando o pedido do catálogo falhava em registrar o pedido em si
-- (orders) ou a baixa pendente (stock_pending_operations), o erro só ficava
-- visível nos logs internos do servidor (Lovable Cloud > Logs) — invisível
-- para o lojista. Agora o checkout também pode registrar esses erros na
-- própria tabela stock_logs, para aparecerem em Estoque > Logs no admin.
CREATE POLICY "checkout logs stock/order failures" ON public.stock_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (private.company_stock_control_enabled(company_id));
