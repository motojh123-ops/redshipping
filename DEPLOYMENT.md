# دليل النشر السحابي — RED SHIPPING / Banna ERP

نشر كامل بضغطات قليلة وبدون أي إعداد يدوي معقّد:

| الطبقة | المنصة | الملف | النتيجة |
|---|---|---|---|
| الفرونت إند (React/Vite) | **Vercel** | `apps/web/vercel.json` | موقع ثابت + بروكسي `/api` للباك إند |
| الباك إند (NestJS) + PostgreSQL | **Render** | `render.yaml` | API + قاعدة بيانات + migrations + seed تلقائي |
| بديل Docker (أي مستضيف) | أي Docker Host | `apps/api/Dockerfile` | صورة إنتاج جاهزة للباك إند |

---

## الخطوة 1 — نشر الباك إند على Render (ضغطة واحدة)

1. ادخل إلى [dashboard.render.com](https://dashboard.render.com)
2. اضغط **New → Blueprint** واختر مستودع GitHub الخاص بالمشروع
3. سيتعرف Render تلقائياً على ملف `render.yaml` — اضغط **Apply** فقط
4. سيتم إنشاء وتهيئة كل شيء تلقائياً:
   - قاعدة بيانات **PostgreSQL 16** (`banna-redshipping-db`)
   - خدمة الـ API (`banna-redshipping-api`) مع البناء: `npm ci → prisma generate → nest build`
   - تشغيل **migrations** تلقائياً عند كل إقلاع (`prisma migrate deploy`)
   - تشغيل **الـ seed** تلقائياً (يُتجاهَل إن كان موجوداً — آمن للتكرار)
   - توليد أسرار JWT تلقائياً — **لا تحتاج ضبط أي متغير يدوياً**
   - فحص صحة دوري على `/api/v1/health`
5. بعد اكتمال النشر انسخ رابط الـ API من صفحة الخدمة، مثال:
   ```
   https://banna-redshipping-api.onrender.com
   ```

**بيانات الدخول بعد الـ seed التلقائي** (غيّر كلمة المرور فوراً من صفحة الملف الشخصي):

| المستخدم | البريد | كلمة المرور | الدور |
|---|---|---|---|
| المدير العام | `admin@banna-logistics.com` | `password123` | company_admin |
| مبيعات | `sales@banna-logistics.com` | `password123` | sales_rep |
| عمليات/تخليص | `ops@banna-logistics.com` | `password123` | ops_officer |
| حسابات | `accountant@banna-logistics.com` | `password123` | accountant |

> **ملاحظات الخطة المجانية:** الخدمة "تنام" بعد 15 دقيقة من عدم الاستخدام (أول طلب بعدها يستغرق ~50 ثانية)، وقاعدة البيانات المجانية تُحذف بعد 30 يوماً — للإنتاج الجاد رقِّ الخطة إلى `starter` من لوحة Render (غيّر `plan: free` إلى `plan: starter` في `render.yaml`).

---

## الخطوة 2 — نشر الفرونت إند على Vercel

1. ادخل إلى [vercel.com](https://vercel.com) → **Add New → Project** → اختر نفس المستودع
2. اضغط **Deploy** — لا تحتاج أي إعداد آخر، ويوجد ملفان جاهزان يغطيان طريقتي الإعداد:
   - **جذر المستودع (الافتراضي والأسهل):** `vercel.json` في الجذر يتولى كل شيء — يبني الويب فقط عبر Turbo (`--filter=@banna/web`) ويستخرج الناتج من `apps/web/dist`
   - **Root Directory = `apps/web`:** في هذه الحالة يستخدم Vercel ملف `apps/web/vercel.json` بنفس الإعدادات
3. **بعد أول نشر** — أضف متغير بيئة واحداً من *Settings → Environment Variables*:
   - **Name:** `API_URL`
   - **Value:** رابط الـ API من الخطوة 1 (مثال: `https://banna-redshipping-api.onrender.com` — **بدون** `/` في النهاية)
   - ثم أعد النشر (Redeploy)
4. يقوم `vercel.json` تلقائياً بـ:
   - بناء الويب عبر Turbo (يشمل `@banna/shared-types`)
   - توجيه كل الطلبات من `/api/*` إلى الباك إند على Render (بروكسي مخفي — لا CORS ولا تعديلات)
   - إرجاع `index.html` لأي مسار آخر (SPA routing)
   - تخزين مؤقت دائم لملفات `/assets` المُوقّعة

### كيف يتصل الفرونت إند بالـ API؟
- **الوضع الافتراضي (الموصى به):** الفرونت إند يطلب `/api/v1/...` من نفس النطاق، وVercel يمرر الطلب داخلياً إلى Render — المتصفح لا يرى إلا نطاق واحد ولا يحتاج أي CORS.
- **الوضع المباشر (اختياري):** عيّن `VITE_API_URL=https://<رابط-ال-api>` في Vercel بدلاً من الـ rewrite، وفي هذه الحالة أضف نطاق موقعك في متغير `ALLOWED_ORIGINS` على Render.
- نطاقات `*.vercel.app` مسموحة تلقائياً في الـ API (للنشر الإنتاجي والمعاينة) — صفر إعداد.

---

## بديل Docker — صورة الباك إند لأي مستضيف

```bash
# البناء من جذر المستودع
docker build -f apps/api/Dockerfile -t banna-api .

# التشغيل (يعمل migrations + seed ثم يشغل الـ API تلقائياً)
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/banna_redshipping" \
  -e JWT_SECRET="change_me_min_32_chars_production!!" \
  -e JWT_REFRESH_SECRET="change_me_too_min_32_chars!!!!!!" \
  banna-api
```

- الصورة متعددة المراحل (build + runtime) بحيث تكون خفيفة وتحمل تبعيات الإنتاج فقط + عميل Prisma المولّد
- `-e SEED_DB=false` لتعطيل الـ seed عند الإقلاع
- الـ API يستمع على `PORT` (افتراضي 4000) — يوافق أي منصة (Render/Railway/Fly/VPS)

---

## المتغيرات الاختيارية (كلها تُضبط لاحقاً من لوحة التحكم بدون أي خطوة الآن)

| المتغير | الغرض |
|---|---|
| `ETA_ENV` / `ETA_CLIENT_ID` / `ETA_CLIENT_SECRET` | تفعيل الإرسال الحقيقي لفاتورات منظومة الضرائب المصرية (ETA) — قبل تفعيلها الـ API يرفض بصدق ووضوح |
| `WHATSAPP_API_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | تفعيل إرسال رسائل واتساب عبر Meta Cloud API |
| `REDIS_URL` | تفعيل طوابير التنبيهات (BullMQ) — أنشئ **Key Value** instance في render.yaml (الكتلة المُعلّقة جاهزة) وفعّل متغير `REDIS_URL` المُعلّق |
| `ALLOWED_ORIGINS` | عند استخدام نطاق مخصص للفرونت إند: `https://redshipping.com,https://www.redshipping.com` |

## ماذا عن خدمة الـ Workers (PDF/تنبيهات)؟
تطلب خدمة `apps/workers` خدمة Gotenberg لتوليد الـ PDF وRedis للطوابير — لم تُشمل في `render.yaml` عمداً حتى يبقى النشر الأساسي بضغطة واحدة. الـ API يعمل كاملاً بدونها (الطوابير في وضع آمن "معطّل"). عند الحاجة: أضف Render Worker service بنفس نمط الخدمة الرئيسية + Gotenberg كـ Docker service.

## اختبار سريع بعد النشر
```bash
# فحص الصحة (بدون توكن)
curl https://<رابط-ال-api>/api/v1/health
# تسجيل دخول
curl -X POST https://<رابط-ال-api>/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@banna-logistics.com","password":"password123"}'
```
ثم افتح رابط Vercel وسجّل الدخول بنفس البيانات. 🚢
