
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.company_of(_user_id uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select company_id from public.company_members where user_id = _user_id limit 1 $$;

create or replace function private.is_master(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = 'master'::app_role) $$;

create or replace function private.company_is_active(_company_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.companies where id = _company_id and is_active) $$;

grant execute on function private.company_of(uuid), private.is_master(uuid), private.company_is_active(uuid) to anon, authenticated, service_role;

-- products
drop policy if exists "public reads active products" on public.products;
create policy "public reads active products" on public.products for select to anon, authenticated
  using (is_active and private.company_is_active(company_id));
drop policy if exists "company admins read products" on public.products;
create policy "company admins read products" on public.products for select to authenticated
  using ((company_id = private.company_of(auth.uid())) or private.is_master(auth.uid()));
drop policy if exists "company admins insert products" on public.products;
create policy "company admins insert products" on public.products for insert to authenticated
  with check ((company_id = private.company_of(auth.uid())) and public.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "company admins update products" on public.products;
create policy "company admins update products" on public.products for update to authenticated
  using ((company_id = private.company_of(auth.uid())) and public.has_role(auth.uid(), 'admin'::app_role))
  with check (company_id = private.company_of(auth.uid()));
drop policy if exists "company admins delete products" on public.products;
create policy "company admins delete products" on public.products for delete to authenticated
  using ((company_id = private.company_of(auth.uid())) and public.has_role(auth.uid(), 'admin'::app_role));

-- companies
drop policy if exists "public reads active companies" on public.companies;
create policy "public reads active companies" on public.companies for select to anon, authenticated
  using (is_active or private.is_master(auth.uid()) or (id = private.company_of(auth.uid())));
drop policy if exists "master inserts companies" on public.companies;
create policy "master inserts companies" on public.companies for insert to authenticated
  with check (private.is_master(auth.uid()));
drop policy if exists "master updates companies" on public.companies;
create policy "master updates companies" on public.companies for update to authenticated
  using (private.is_master(auth.uid())) with check (private.is_master(auth.uid()));

-- company_members
drop policy if exists "members read own link" on public.company_members;
create policy "members read own link" on public.company_members for select to authenticated
  using ((user_id = auth.uid()) or private.is_master(auth.uid()));

-- categories
drop policy if exists "public reads categories" on public.categories;
create policy "public reads categories" on public.categories for select to anon, authenticated
  using (private.company_is_active(company_id) or (company_id = private.company_of(auth.uid())) or private.is_master(auth.uid()));
drop policy if exists "company admins insert categories" on public.categories;
create policy "company admins insert categories" on public.categories for insert to authenticated
  with check ((company_id = private.company_of(auth.uid())) and public.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "company admins update categories" on public.categories;
create policy "company admins update categories" on public.categories for update to authenticated
  using ((company_id = private.company_of(auth.uid())) and public.has_role(auth.uid(), 'admin'::app_role))
  with check (company_id = private.company_of(auth.uid()));
drop policy if exists "company admins delete categories" on public.categories;
create policy "company admins delete categories" on public.categories for delete to authenticated
  using ((company_id = private.company_of(auth.uid())) and public.has_role(auth.uid(), 'admin'::app_role));

-- settings
drop policy if exists "public reads settings" on public.settings;
create policy "public reads settings" on public.settings for select to anon, authenticated
  using (private.company_is_active(company_id) or (company_id = private.company_of(auth.uid())) or private.is_master(auth.uid()));
drop policy if exists "company admins insert settings" on public.settings;
create policy "company admins insert settings" on public.settings for insert to authenticated
  with check ((company_id = private.company_of(auth.uid())) and public.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "company admins update settings" on public.settings;
create policy "company admins update settings" on public.settings for update to authenticated
  using ((company_id = private.company_of(auth.uid())) and public.has_role(auth.uid(), 'admin'::app_role))
  with check (company_id = private.company_of(auth.uid()));

-- orders
drop policy if exists "anyone can start an order" on public.orders;
create policy "anyone can start an order" on public.orders for insert to anon, authenticated
  with check (private.company_is_active(company_id));
drop policy if exists "company admins read orders" on public.orders;
create policy "company admins read orders" on public.orders for select to authenticated
  using ((company_id = private.company_of(auth.uid())) or private.is_master(auth.uid()));

-- order_items
drop policy if exists "anyone can add order items" on public.order_items;
create policy "anyone can add order items" on public.order_items for insert to anon, authenticated
  with check (exists (select 1 from public.orders o where o.id = order_items.order_id and private.company_is_active(o.company_id)));
drop policy if exists "company admins read order items" on public.order_items;
create policy "company admins read order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and ((o.company_id = private.company_of(auth.uid())) or private.is_master(auth.uid()))));

-- storage policy for product images
drop policy if exists "company admins manage product images" on storage.objects;
create policy "company admins manage product images" on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and (private.is_master(auth.uid()) or (storage.foldername(name))[1] = (private.company_of(auth.uid()))::text))
  with check (bucket_id = 'product-images' and (private.is_master(auth.uid()) or (storage.foldername(name))[1] = (private.company_of(auth.uid()))::text));

-- remove public API exposure of the definer helpers
drop function if exists public.company_of(uuid);
drop function if exists public.company_is_active(uuid);
drop function if exists public.is_master(uuid);

-- keep is_master callable via API for signed-in users only
create or replace function public.is_master(_user_id uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select private.is_master(_user_id) $$;
revoke all on function public.is_master(uuid) from public;
grant execute on function public.is_master(uuid) to authenticated, service_role;
