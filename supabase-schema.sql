-- Run this once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.products (id uuid primary key default gen_random_uuid(), name_ar text not null, name_en text not null, description_ar text default '', description_en text default '', price numeric(10,2) not null, old_price numeric(10,2), discount_percent numeric(5,2) default 0, images text[] default '{}', sizes text[] default '{}', colors text[] default '{}', stock integer default 0, category text default 'general', status text default 'draft' check(status in ('draft','published')), created_at timestamptz default now());
create table if not exists public.orders (id uuid primary key default gen_random_uuid(), customer_name text not null, customer_phone text not null, customer_email text, customer_address text, items jsonb not null default '[]', total numeric(10,2) not null, discount numeric(10,2) default 0, coupon_code text, status text default 'new' check(status in ('new','processing','shipped','completed','cancelled')), created_at timestamptz default now());
create table if not exists public.custom_print_orders (id uuid primary key default gen_random_uuid(), customer_name text not null, customer_phone text not null, customer_email text, garment_type text not null, color text not null, size text not null, quantity integer not null default 1, description text not null, design_image text, status text default 'new' check(status in ('new','reviewing','approved','completed','cancelled')), created_at timestamptz default now());
create table if not exists public.coupons (id uuid primary key default gen_random_uuid(), code text unique not null, type text not null check(type in ('percentage','fixed')), value numeric(10,2) not null, expires_at timestamptz, min_order numeric(10,2) default 0, usage_limit integer, used_count integer default 0, active boolean default true, created_at timestamptz default now());
create table if not exists public.discounts (id uuid primary key default gen_random_uuid(), name text not null, type text not null check(type in ('percentage','fixed')), value numeric(10,2) not null, start_date timestamptz, end_date timestamptz, products uuid[] default '{}', active boolean default true);
create table if not exists public.brand_settings (id boolean primary key default true, hero_title_ar text default 'ملابس تشبهك.', hero_title_en text default 'Clothes that feel like you.', hero_text_ar text default '', hero_text_en text default '', hero_image text, intro_title_ar text default '', intro_title_en text default '', intro_text_ar text default '', intro_text_en text default '');
insert into public.brand_settings(id) values(true) on conflict(id) do nothing;
alter table public.products enable row level security; alter table public.brand_settings enable row level security; alter table public.orders enable row level security; alter table public.custom_print_orders enable row level security; alter table public.coupons enable row level security; alter table public.discounts enable row level security;
create policy "published products are public" on public.products for select using (status='published');
create policy "brand settings are public" on public.brand_settings for select using (true);
create policy "public can create orders" on public.orders for insert with check (true);
create policy "public can create print requests" on public.custom_print_orders for insert with check (true);
-- Admin policies: create an authenticated user in Supabase Auth and add the user id to app_metadata.role = 'admin'.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select coalesce((auth.jwt()->'app_metadata'->>'role')='admin',false) $$;
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage orders" on public.orders for select using (public.is_admin());
create policy "admins update orders" on public.orders for update using (public.is_admin());
create policy "admins manage prints" on public.custom_print_orders for select using (public.is_admin());
create policy "admins update prints" on public.custom_print_orders for update using (public.is_admin());
create policy "admins manage brand" on public.brand_settings for update using (public.is_admin());
create policy "admins manage coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage discounts" on public.discounts for all using (public.is_admin()) with check (public.is_admin());
insert into storage.buckets(id,name,public) values('product-images','product-images',true),('print-designs','print-designs',false) on conflict(id) do nothing;
alter table public.brand_settings add column if not exists collection_title_ar text default 'منتجاتنا الأخيرة';
alter table public.brand_settings add column if not exists custom_title_ar text default 'فكرتك، على قطعة.';
alter table public.brand_settings add column if not exists custom_text_ar text default '';
alter table public.brand_settings add column if not exists footer_text_ar text default '© DETA — ملابس تصنعها أنت';
