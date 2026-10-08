-- Run once in the Supabase SQL editor to let the public storefront read current promotions.
-- Admin policies remain in place and continue to expose inactive/future discounts to admins.
drop policy if exists "public can read active discounts" on public.discounts;
create policy "public can read active discounts"
  on public.discounts
  for select
  to anon, authenticated
  using (
    active = true
    and (start_date is null or start_date <= now())
    and (end_date is null or end_date >= now())
  );

grant select on public.discounts to anon, authenticated;
