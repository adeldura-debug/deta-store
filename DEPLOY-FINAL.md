# نشر DETA نهائيًا

## قبل الرفع

1. في `public/supabase-config.js` ضع Project URL وPublishable key فقط.
2. شغّل `supabase-schema.sql` و`supabase-promo.sql` داخل Supabase.
3. أنشئ المستخدم والمدير وBuckets الصور.
4. استخدم `index-live.html` كصفحة `index.html` عند الرفع، أو اجعل GitHub Pages يبدأ من هذا الملف عبر إعادة تسميته إلى `index.html`.

## GitHub Pages

1. أنشئ Repository جديدًا على GitHub.
2. ارفع المشروع كاملًا كما هو.
3. من Settings → Pages اختر GitHub Actions.
4. انتظر انتهاء Workflow باسم `Deploy DETA to GitHub Pages`.
5. افتح الرابط الذي يظهر في Deployments.

GitHub Pages يستضيف الواجهة فقط. Supabase يستضيف قاعدة البيانات والمصادقة والصور، لذلك لا تحتاج Node.js عند الزوار.

## الصفحات

- الرئيسية: `home-final.html`
- المتجر والطلب المباشر: `supabase-shop.html`
- المتجر مع الخصم: `supabase-shop-discount.html`
- إدارة المنتجات: `supabase-admin-simple.html`
- إعدادات البراند: `brand-admin.html`
- إعدادات الخصومات: `discount-admin-fixed.html`

لا ترفع `service_role key` إلى GitHub. المفتاح المسموح في الواجهة هو Publishable/anon فقط.
