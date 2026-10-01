# تشغيل Almasri Engineering مع MongoDB

هذه النسخة تستخدم MongoDB كقاعدة البيانات الوحيدة. لا تستخدم SQLite أو JSON لحفظ بيانات الموقع.

## قبل التشغيل لأول مرة

1. أنشئ قاعدة MongoDB Atlas واحصل على Connection String.
2. افتح الملف `.dev.vars` وضع الرابط بعد:

`MONGODB_URI=`

مثال للشكل فقط (لا تستخدمه كما هو):

`MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority`

3. من Terminal داخل مجلد المشروع شغّل:

```powershell
npm install
npm run db:check
```

إذا ظهر `MongoDB OK` شغّل:

```powershell
npm run dev
```

ثم افتح:

`http://127.0.0.1:8787`

## إنشاء المدير أول مرة

رمز التهيئة الافتراضي الموجود في `.dev.vars` هو:

`ALMASRI-MONGODB-SETUP-2026-FIRST-OWNER`

بعد إنشاء المدير تبقى بياناته وكل بيانات الموقع داخل MongoDB.

## الحماية والاستقرار

- يعاد استخدام MongoDB connection pool بدل فتح اتصال جديد مع كل طلب.
- يوجد Ping قبل بدء الموقع للتأكد من أن قاعدة البيانات تعمل.
- يتم إنشاء الفهارس المهمة وUnique indexes وTTL indexes تلقائيًا.
- Retry Reads وRetry Writes مفعّلان.
- رسائل الخطأ تفرّق بين مشكلة الرابط، تسجيل الدخول، وعدم الوصول إلى Atlas.
- أسرار الاتصال لا يجب رفعها إلى GitHub؛ `.dev.vars` مضاف إلى `.gitignore`.

## فحص قاعدة البيانات في أي وقت

```powershell
npm run db:check
```
