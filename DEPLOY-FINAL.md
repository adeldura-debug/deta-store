# نشر DETA نهائيًا

المستودع الحالي: `adeldura-debug/deta-store`. النشر مضبوط عبر GitHub Actions من مجلد `public`؛ لا تنشئ مستودعًا جديدًا ولا تغيّر اسم الصفحة الرئيسية.

## قبل الرفع

1. تأكد أن `public/supabase-config.js` يحتوي Project URL وPublishable/anon key فقط.
2. شغّل `supabase-schema.sql` و`supabase-promo.sql` و`supabase-final-security.sql` و`supabase-storefront-read.sql` في Supabase SQL Editor.
3. راجع قائمة الملفات ولا ترفع `.env` أو `node_modules` أو مفاتيح `service_role`.
4. ارفع الملفات إلى فرع `main` مع إبقاء `.github/workflows/pages.yml` في مساره.

## النشر

يبدأ Workflow `Deploy DETA to GitHub Pages` تلقائيًا بعد تحديث `main`. من تبويب Actions تأكد أن التشغيل نجح، ثم افتح رابط GitHub Pages من Settings → Pages أو من ملخص النشر.

GitHub Pages يستضيف واجهة الموقع فقط. قاعدة البيانات والمصادقة والصور تعتمد على Supabase، والواجهة الحالية تحفظ الطلبات والتخصيص في جدول `orders` الموجود.

## الصفحات

- الرئيسية: `home-final.html`
- المتجر والتخصيص والطلب: `supabase-shop.html`
- لوحة المنتجات والطلبات الحالية: `supabase-admin-simple.html`
- إعدادات البراند: `brand-admin.html`
- الخصومات: `discount-admin-fixed.html`

مفتاح Publishable/anon وحده مناسب للواجهة العامة. لا ترفع أبدًا `service_role key`.
