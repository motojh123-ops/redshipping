# دليل النشر السحابي — RED SHIPPING / Banna ERP

نشر كامل بضغطات قليلة وبدون أي إعداد يدوي معقّد:

| الطبقة | المنصة | الملف | النتيجة |
|---|---|---|---|
| الفرونت إند (React/Vite) | **Vercel** | `vercel.json` (الجذر) | موقع ثابت + بروكسي `/api` للباك إند |
| قاعدة البيانات (PostgreSQL) | **Neon** — مجانية **للأبد** | (بلا ملفات — رابط واحد) | بلا انتهاء وبلا بطاقة، استيقاظ تلقائي |
| الباك إند (NestJS) | **Render** (أو بديل مجاني — أدناه) | `render.yaml` | API بلا انتهاء + migrations + seed تلقائي |
| بديل Docker (أي مستضيف) | أي Docker Host | `apps/api/Dockerfile` | صورة إنتاج جاهزة للباك إند |

> **لماذا Neon بدلاً من قاعدة بيانات Render؟** قاعدة Postgres المجانية في Render **تُحذف بعد 30 يوماً** — بينما خطة Neon المجانية **بلا حدود زمنية إطلاقاً** (0.5GB، بلا بطاقة ائتمان)، وينام الخادم بعد 5 دقائق خمول ويستيقظ تلقائياً خلال ~ثانية عند أول استعلام.

---

## الخطوة 1 — نشر الباك إند على Render (مع Neon)

> ⚠️ **أمان أولاً:** كلمة سر Neon نُشرت سابقاً في ملف على GitHub. اذهب فوراً إلى لوحة [neon.com](https://neon.com) → مشروعك → **Reset password**، ثم استخدم الرابط الجديد في الخطوات أدناه. (الرابط القديم في `render.yaml` أُزيل وصار يُطلب منك عند النشر — `sync: false`).

1. انسخ رابطين من لوحة Neon (Dashboard → Project → **Connection string**):
   - **Pooled** (المضيف يحتوي `-pooler`) → سيكون `DATABASE_URL` للتشغيل
   - **Direct** (نفس الرابط بدون `-pooler`) → سيكون `DIRECT_DATABASE_URL` للـ migrations/seed
2. ادخل إلى [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint** → اختر المستودع → **Apply**
3. سيسألك معالج Blueprint مرة واحدة عن المتغيرين (`DATABASE_URL` و`DIRECT_DATABASE_URL`) — الصق الرابطين. كل الباقي تلقائي:
   - البناء: `npm ci → prisma generate → turbo build`
   - عند الإقلاع: **migrations** ثم **seed** (متطابقان/آمنان للتكرار) ثم تشغيل الـ API
   - توليد أسرار JWT تلقائياً + فحص صحة دوري على `/api/v1/health`
4. انسخ رابط الـ API من صفحة الخدمة، مثال:
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

> **ملاحظات الخطة المجانية:** الخدمة على Render "تنام" بعد 15 دقيقة من عدم الاستخدام (أول طلب بعدها يستغرق ~50 ثانية) — تُحل بـ keep-alive أدناه. قاعدة Neon **لا تُحذف أبداً** (تستيقظ خلال ~ثانية). للإنتاج الجاد رقِّ خطة Render إلى `starter` (غيّر `plan: free` إلى `plan: starter`).

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

## بدائل مجانية لاستضافة الباك إند (محدّث 2026)

فحصنا العروض فعلياً — الواقع الحالي للخطط المجانية:

| المنصة | مجاني للأبد؟ | السبات | ملاحظات |
|---|---|---|---|
| **Render** (خدمة الويب فقط) | ✅ نعم | بعد 15 دقيقة | لا ينتهي — مع Neon للـ DB هو الخيار الموصى به أعلاه |
| **Neon** (قاعدة البيانات) | ✅ نعم، بلا بطاقة | 5 دقائق (استيقاظ ~ثانية) | الأفضل للـ DB — مستخدم فعلاً في هذا المشروع |
| **Hugging Face Spaces** (Docker) | ✅ نعم | بعد فترة خمول طويلة | **16GB RAM / 2 vCPU** مجاناً! أقوى خيار بديل — أدناه |
| **Back4App Containers** | ✅ نعم | نعم | 256MB فقط — ضيّقة لـ Prisma |
| Koyeb | ❌ صار Pro $29/شهر | — | لم يعد مجانياً |
| Fly.io / Railway | ❌ يتطلبان بطاقة/دفع | — | لا free tier دائم |

### البديل الموصى به عن Render: Hugging Face Spaces (مجاني 100% — 16GB RAM!)

المشروع جاهز له بالكامل: workflow النشر موجود في `.github/workflows/deploy-api-hf-space.yml` ويبني `apps/api/Dockerfile` ويدفعه تلقائياً عند كل push إلى main.

**الإعداد مرة واحدة (~5 دقائق):**
1. أنشئ Space جديداً في [huggingface.co/spaces](https://huggingface.co/spaces) → **Create new Space** → SDK: **Docker** → الاسم: `red-shipping-api`
2. في **إعدادات الـ Space → Variables and secrets** أضف:
   - `PORT=7860` ← إلزامي في HF Spaces
   - `NODE_ENV=production`
   - `DATABASE_URL` = رابط Neon **المُجمَّع** لكن **بالمنفذ 443** (HF يحجب المنافذ الصادرة عدا 80/443/8080 — وNeon يدعم الاتصال عبر 443): غيّر في الرابط `neon.tech:5432` إلى `neon.tech:443` مع إبقاء `?sslmode=require`
   - `DIRECT_DATABASE_URL` = رابط Neon المباشر (بدون `-pooler`) — للـ migrations عند الإقلاع
   - `JWT_SECRET` و`JWT_REFRESH_SECRET` = قيم عشوائية طويلة (32+ حرفاً)
   - `SEED_DB=true`
3. أنشئ توكن كتابة: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → New token → **role: write**
4. في GitHub → Settings → Secrets and variables → Actions أضف ثلاثة:
   - `HF_TOKEN` = التوكن
   - `HF_USERNAME` = اسم مستخدم HF
   - `HF_SPACE` = `<username>/red-shipping-api`
5. push أي تعديل على `apps/api/**` (أو شغّل الـ workflow يدوياً) — الصورة تُبنى وتُدفع والـ Space **يعيد تشغيل نفسه تلقائياً** بالصورة الجديدة

رابط الـ API سيصبح: `https://<username>-red-shipping-api.hf.space` → **حدّث `API_URL` في Vercel بهذا الرابط**.

> ملاحظات HF: الصورة تعمل migrations + seed عند الإقلاع تلقائياً ✓ — وHF يشغّل الحاوية بمستخدم uid 1000 (تطبيقنا لا يكتب ملفات على القرص فلا مشكلة).

### منع السبات نهائياً — Keep-alive مجاني (لـ Render وHF معاً)

1. سجّل في [cron-job.org](https://cron-job.org) (مجاني)
2. أنشئ مهمة: **GET** `https://<رابط-ال-api>/api/v1/health` كل **14 دقيقة**
3. النتيجة: الخدمة لا تنام أبداً — استجابة فورية دائماً

### للمحترفين: Oracle Cloud Always Free + Coolify
أقوى خيار مجاني دائم على الإطلاق: VM بـ **4 أنوية ARM + 24GB RAM** (Always Free، لا سبات ولا انتهاء — مع استخدام دوري). ثبّت [Coolify](https://coolify.io) بسكربت واحد فتحصل على لوحة نشر بـ Git Deploy مثل Render تماماً وتشغّل صورة `apps/api/Dockerfile`. يحتاج ~30 دقيقة إعداد يدوي — كخطة نمو طويلة المدى.

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

# مع Neon (موصى به): أضف الرابط المباشر حتى تعمل migrations عبره
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://...neon.tech:443/db?sslmode=require" \
  -e DIRECT_DATABASE_URL="postgresql://...neon.tech:5432/db?sslmode=require" \
  -e JWT_SECRET="..." -e JWT_REFRESH_SECRET="..." \
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
