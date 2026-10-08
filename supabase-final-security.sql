-- نفّذ هذا بعد إنشاء مستخدم المدير. غيّر البريد إلى بريد المدير الحقيقي.
-- لا تضع service_role key في الواجهة.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select coalesce((auth.jwt()->'app_metadata'->>'role')='admin',false) $$;
drop policy if exists "published products are public" on public.products;
create policy "published products are public" on public.products for select using (status='published' or public.is_admin());
drop policy if exists "brand settings are public" on public.brand_settings;
create policy "brand settings are public" on public.brand_settings for select using (true);
drop policy if exists "public can create orders" on public.orders;
create policy "public can create orders" on public.orders for insert with check (true);
drop policy if exists "public can create print requests" on public.custom_print_orders;
create policy "public can create print requests" on public.custom_print_orders for insert with check (true);
