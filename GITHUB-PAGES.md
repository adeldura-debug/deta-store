# نشر DETA على GitHub Pages

المستودع الموجود هو `adeldura-debug/deta-store`. يحتفظ المشروع بالصفحات داخل `public/` ويستخدم `.github/workflows/pages.yml` لنشر هذا المجلد تلقائيًا. لا تنقل الملفات ولا تستبدل `home-final.html` بصفحة تجريبية.

1. ارفع الملفات المحدّثة إلى فرع `main` في المستودع الحالي.
2. تأكد أن `.github/workflows/pages.yml` و`public/index.html` موجودان.
3. من تبويب Actions انتظر نجاح `Deploy DETA to GitHub Pages`.
4. انسخ رابط الموقع من Settings → Pages أو من نتيجة الـ workflow.

قبل الرفع شغّل ملفات SQL في `SUPABASE-SETUP.md`، خصوصًا `supabase-storefront-read.sql` لعرض الخصومات العامة. لا ترفع `.env` أو `service_role key`؛ المفتاح الموجود في `public/supabase-config.js` يجب أن يبقى Publishable/anon فقط.
