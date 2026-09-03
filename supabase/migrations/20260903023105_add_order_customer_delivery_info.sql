-- Dados coletados na finalização do pedido (antes de ir para o WhatsApp).
-- delivery_method/delivery_address ficam nulos quando a empresa não habilita
-- a escolha de forma de entrega em Configurações.

ALTER TABLE public.orders
  ADD COLUMN customer_name text,
  ADD COLUMN customer_phone text,
  ADD COLUMN delivery_method text CHECK (delivery_method IN ('retirada', 'tele_entrega')),
  ADD COLUMN delivery_address text;
