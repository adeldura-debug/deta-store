# DETA Final Delivery

النسخة الرئيسية للموقع: `public/home-final.html`.
المتجر: `public/supabase-shop.html`.
لوحة المنتجات والصور: `public/supabase-admin-simple.html`.
لوحة إعداد البراند: `public/brand-admin.html`.
لوحة الخصومات: `public/discount-admin-fixed.html`.

قبل النشر: شغّل `supabase-schema.sql` و`supabase-promo.sql` و`supabase-final-security.sql` و`supabase-storefront-read.sql` في Supabase، ثم ارفع مجلد `public` عبر GitHub Pages. ملف `supabase-storefront-read.sql` يتيح للواجهة قراءة الخصومات السارية فقط مع إبقاء إدارة الخصومات محمية. استخدم Publishable/anon key فقط.

خيارات القطعة المخصصة والصورة المصغرة المضغوطة تُحفظ داخل `orders.items`، لذلك تظهر مع الطلب نفسه في لوحة الطلبات الحالية. لم تتمكن بيئة التنفيذ من تطبيق SQL على مشروع Supabase البعيد؛ شغّل ملفات SQL المذكورة في محرر SQL لمشروعك كي يعمل عرض الخصومات على الواجهة العامة.
