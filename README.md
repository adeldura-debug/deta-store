# DETA Clothing & Custom Print

Full-stack متجر ملابس وطباعة مخصصة، مبني بـ Node.js وExpress وMongoDB وواجهة HTML/CSS/JavaScript.

## التشغيل
1. ثبّت Node.js إصدار 18 أو أحدث وMongoDB.
2. افتح PowerShell داخل مجلد المشروع `F:\DETA`.
3. نفّذ `npm install`.
4. انسخ `.env.example` إلى `.env`، ثم عدّل `JWT_SECRET` و`WHATSAPP_NUMBER` وبيانات MongoDB عند الحاجة.
5. شغّل `npm start`، أو افتح `start.bat` بنقرتين.

## فتح الموقع
- المستخدم: افتح `http://localhost:3000/`.
- المدير: افتح `http://localhost:3000/admin-final.html`.

## إنشاء حساب المدير أول مرة
بعد تشغيل الخادم نفّذ الأمر التالي في PowerShell، مع تعديل البريد وكلمة المرور:

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/auth/setup -ContentType 'application/json' -Body '{"email":"admin@deta.store","password":"change-this-password"}'
```

بعدها افتح `/admin-final.html` وسجّل الدخول بنفس البيانات. لا تضع البريد أو كلمة المرور في رابط الصفحة.

## المسارات المهمة
- واجهة المستخدم: `/`
- لوحة المدير: `/admin-final.html`
- فحص الخادم: `/api/health`
- المنتجات: `/api/products`
- الطلبات: `/api/orders`
- الطباعة المخصصة: `/api/print`
- إعدادات البراند: `/api/brand`
- الكوبونات: `/api/coupons`

## API
المنتجات: `GET/POST /api/products`، الطلبات: `POST /api/orders` و`GET /api/orders`، الطباعة المخصصة: `POST /api/print`، إعدادات البراند: `GET/PUT /api/brand`، الكوبونات: `/api/coupons`.

النماذج موجودة في `models/`: User, Product, Order, CustomPrintOrder, Discount, Coupon, BrandSettings.
