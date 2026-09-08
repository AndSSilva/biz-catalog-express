CREATE POLICY "checkout can log stock failures"
ON public.stock_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (
  private.company_stock_control_enabled(company_id)
  AND actor_id IS NULL
  AND action IN ('pedido_falhou', 'baixa_pendente_falhou')
);
GRANT INSERT ON public.stock_logs TO anon;