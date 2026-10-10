-- بعد إنشاء مستخدم المدير، استبدل البريد بين القوسين ثم شغّل هذا الملف.
create table if not exists public.admin_users (email text primary key, active boolean default true);
alter table public.admin_users enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_users a where lower(a.email)=lower(auth.jwt()->>'email') and a.active=true)
$$;
insert into public.admin_users(email) values('YOUR_ADMIN_EMAIL_HERE') on conflict(email) do update set active=true;
drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders" on public.orders for select using (public.is_admin());
drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage prints" on public.custom_print_orders;
create policy "admins manage prints" on public.custom_print_orders for select using (public.is_admin());
drop policy if exists "admins update prints" on public.custom_print_orders;
create policy "admins update prints" on public.custom_print_orders for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage brand" on public.brand_settings;
create policy "admins manage brand" on public.brand_settings for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage discounts" on public.discounts;
create policy "admins manage discounts" on public.discounts for all using (public.is_admin()) with check (public.is_admin());
