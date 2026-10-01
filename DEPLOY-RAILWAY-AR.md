# نشر ALMASRI Engineering على Railway

هذه النسخة مجهزة للنشر السحابي. لا ترفع ملف `.dev.vars` إلى GitHub؛ هو موجود في `.gitignore`.

## متغيرات Railway
أضف القيم التالية من تبويب Variables:

- `MONGODB_URI` = رابط MongoDB Atlas الكامل
- `MONGODB_DB` = `almasri_engineering`
- `SETUP_TOKEN` = رمز طويل وعشوائي خاص بك

لا تضف `PORT` يدويًا؛ Railway يمرره تلقائيًا.

## Start command
Railway سيستخدم `npm start` الموجود في `package.json`.

## Health check
يمكن استخدام المسار `/api/status`.

## MongoDB Atlas Network Access
خدمة Railway تحتاج أن تكون عناوين الخروج الخاصة بها مسموحة في Atlas. إذا لم تكن لديك Static Outbound IPs، ستحتاج إعداد شبكة مناسب في Atlas. لا تضع أسرار قاعدة البيانات داخل GitHub.
