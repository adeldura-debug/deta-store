alter table public.brand_settings add column if not exists promo_active boolean default false;
alter table public.brand_settings add column if not exists promo_text_ar text default 'خصم خاص لفترة محدودة';
alter table public.brand_settings add column if not exists promo_text_en text default 'Limited time offer';
alter table public.brand_settings add column if not exists promo_percent integer default 0;
