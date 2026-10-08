# تشغيل DETA بدون Node.js

هذه هي نسخة Supabase. لا تحتاج Node.js أو MongoDB على جهازك، لكنها تحتاج اتصال إنترنت.

1. أنشئ مشروعًا مجانيًا في Supabase.
2. افتح SQL Editor والصق محتوى `supabase-schema.sql` ثم Run.
3. من Settings > API انسخ Project URL وanon public key إلى `public/supabase-config.js`.
4. من Authentication > Users أنشئ حساب المدير، ثم اجعل `app_metadata.role` مساويًا لـ `admin` من لوحة Supabase أو عبر Edge Function آمنة.
5. ارفع مجلد `public` إلى GitHub Pages أو Netlify.

الجداول الأساسية: products, orders, custom_print_orders, coupons, discounts, brand_settings. الصور تحفظ في Storage buckets باسم product-images وprint-designs.

مهم: لا تضع service_role key في الواجهة. المفتاح المسموح للمتصفح هو anon key فقط، والحماية تعتمد على RLS والسياسات الموجودة في SQL.
