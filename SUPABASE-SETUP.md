# تشغيل DETA بدون Node.js

هذه هي نسخة Supabase. لا تحتاج Node.js أو MongoDB على جهازك، لكنها تحتاج اتصال إنترنت.

1. استخدم مشروع Supabase المرتبط بالمتجر.
2. افتح SQL Editor وشغّل `supabase-schema.sql`، ثم `supabase-promo.sql` و`supabase-final-security.sql` و`supabase-storefront-read.sql`.
3. تحقّق من Project URL وPublishable/anon key في `public/supabase-config.js`.
4. أنشئ حساب المدير واضبط `app_metadata.role` إلى `admin` من لوحة Supabase أو عبر Edge Function آمنة.
5. ارفع نسخة الواجهة `public/` إلى مستودع GitHub الحالي؛ يتولى GitHub Actions نشرها.

الجداول الأساسية: products, orders, custom_print_orders, coupons, discounts, brand_settings. الصور تحفظ في Storage buckets باسم product-images وprint-designs.

مهم: لا تضع service_role key في الواجهة. المفتاح المسموح للمتصفح هو Publishable/anon فقط، والحماية تعتمد على RLS والسياسات الموجودة في SQL. `supabase-storefront-read.sql` يتيح قراءة الخصومات السارية للزوار فقط.
