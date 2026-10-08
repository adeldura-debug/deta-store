# نشر DETA على GitHub Pages

1. ضع مجلد `public` داخل مستودع GitHub.
2. اجعل `home-final.html` اسم `index.html` في نسخة النشر.
3. ارفع `formal.css` و`store.css` وملفات JavaScript و`supabase-config.js` معه.
4. من GitHub افتح Settings → Pages.
5. اختر Deploy from branch ثم main و`/root`.
6. افتح رابط GitHub Pages الناتج.

تنبيه: لا ترفع `service_role key`. المفتاح الموجود في `supabase-config.js` يجب أن يكون Publishable/anon فقط. GitHub Pages يشغّل الواجهة فقط، بينما قاعدة البيانات والرفع يعملان على Supabase.
