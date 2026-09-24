# دليل تشغيل واستخدام Litmus Check مع مشروع Red Shipping ERP

تم دمج وتجهيز منظومة **Litmus Check** للتحقق والاختبارات الآلية بالذكاء الاصطناعي مع مشروع **Red Shipping** عبر محورين:

---

## 1. اختبارات Playwright المتوافقة مع Litmus Agent (داخل المشروع)

تم إعداد المشروع بالكامل ليعمل مع أداة **`litmus-agent`** لتوليد تقارير الـ JSON وجمع الـ Traces عند حدوث أي خطأ، بحيث يقوم الذكاء الاصطناعي بتشخيص المشكلة تلقائياً.

### الأوامر المتوفرة:
```bash
# تشغيل كافة اختبارات E2E بدون واجهة رسومية (Headless)
npm run test:e2e

# تشغيل الاختبارات من خلال واجهة Playwright التفاعلية (UI Mode)
npm run test:e2e:ui

# تشخيص الأخطاء بالذكاء الاصطناعي عبر Litmus Agent CLI
npm run test:e2e:triage
```

### ملفات الاختبارات المنفذة في مجلد `e2e/`:
- `e2e/auth.spec.ts`: التحقق من شاشة تسجيل الدخول والهوية البصرية ودخول المدير العام `admin@redshipping.com`.
- `e2e/shipments.spec.ts`: التحقق من الانتقال لشاشة إدارة الشحنات.
- `e2e/settings-database.spec.ts`: التحقق من شاشة الإعدادات وتبويب قاعدة البيانات وتصفير العمليات التشغيلية.

---

## 2. خادم وواجهة Litmus Check المستضافة ذاتياً (Self-Hosted Stack)

تم استنساخ المستودعات الرسمية في مجلد `tools/litmus/`:

```text
redshipping/
├── tools/
│   └── litmus/
│       ├── lc-server/      # خادم Flask ومحرك الذكاء الاصطناعي (Port 6010)
│       └── lc-frontend/    # واجهة Next.js لكتابة الاختبارات باللغة الطبيعية (Port 3005)
```

### خطوات تشغيل الـ Backend (`lc-server`):
1. الانتقال إلى مجلد الخادم:
   ```powershell
   cd tools/litmus/lc-server
   ```
2. إنشاء وتفعيل البيئة الافتراضية وتثبيت المتطلبات:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. مراجعة ملف الإعدادات `app.env` (تم ربطه تلقائياً بـ PostgreSQL و Redis الموجودين في `docker-compose.yml`):
   - لإتاحة مزايا التحليل بالذكاء الاصطناعي، يتم وضع مفتاح Azure OpenAI في متغيرات `AZURE_OPENAI_*`.
4. تشغيل السيرفر:
   ```powershell
   cd src
   python app.py
   ```
   *يعمل السيرفر على الرابط: `http://localhost:6010`*

---

### خطوات تشغيل الـ Frontend (`lc-frontend`):
1. الانتقال لمجلد الواجهة:
   ```powershell
   cd tools/litmus/lc-frontend
   ```
2. تثبيت الحزم:
   ```powershell
   npm install
   ```
3. تم إعداد ملف `.env.local` ليتصل تلقائياً بالسيرفر على `http://localhost:6010`.
4. تشغيل واجهة التطوير:
   ```powershell
   npm run dev -- -p 3005
   ```
   *تفتح الواجهة على الرابط: `http://localhost:3005`*

---

## 3. ربط الـ CLI بالخادم المستضاف (اختياري)
عند تشغيل خادم Litmus المحلي، يمكنك إنشاء `LITMUS_API_KEY` وإضافته لملف `.env` بالمشروع الرئيسي، وعندها سيقوم أمر:
```bash
npm run test:e2e:triage
```
بإرسال تقرير `reports/report.json` إلى الخادم وتحليله فورياً بواسطة الذكاء الاصطناعي وتقديم حل للمشكلة بالسطر والملف.
