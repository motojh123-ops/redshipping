# دليل النشر السحابي — RED SHIPPING / Banna ERP

نشر كامل بضغطات قليلة وبدون أي إعداد يدوي معقّد:

| الطبقة | المنصة | الملف | النتيجة |
|---|---|---|---|
| الفرونت إند (React/Vite) | **Vercel** | `vercel.json` (الجذر) | موقع ثابت + بروكسي `/api` للباك إند |
| قاعدة البيانات (PostgreSQL) | **Neon** — مجانية **للأبد** | (بلا ملفات — رابط واحد) | بلا انتهاء وبلا بطاقة، استيقاظ تلقائي |
| الباك إند (NestJS) | **Hugging Face Spaces** — مجاني 100% **بلا بطاقة** | `.github/workflows/deploy-api-hf-space.yml` + `apps/api/Dockerfile` | API مع **16GB RAM** + نشر تلقائي + migrations + seed |
| بديل Docker (أي مستضيف) | أي Docker Host | `apps/api/Dockerfile` | صورة إنتاج جاهزة للباك إند |

> **لماذا Neon بدلاً من قاعدة بيانات Render؟** قاعدة Postgres المجانية في Render **تُحذف بعد 30 يوماً** — بينما خطة Neon المجانية **بلا حدود زمنية إطلاقاً** (0.5GB، بلا بطاقة ائتمان)، وينام الخادم بعد 5 دقائق خمول ويستيقظ تلقائياً خلال ~ثانية عند أول استعلام.

---

## الخطوة 1 — نشر الباك إند مجاناً 100%: Hugging Face Spaces (16GB RAM)

> **لماذا HF وليس Render؟** Render لم يعد مجانياً فعلياً: خطة Hobby المجانية تضم **5GB باندويذ فقط شهرياً ثم محاسبة** + **تحقق بطاقة بـ $1** — عملياً يتطلب بطاقة. Hugging Face Spaces يمنحك **2 vCPU + 16GB RAM** مجاناً تماماً بلا أي بطاقة — وهي أضعاف ما يعطيه Render حتى في خطته المدفوعة الأساسية!

> ⚠️ **أمان أولاً:** كلمة سر Neon نُشرت سابقاً في ملف على GitHub. اذهب فوراً إلى لوحة [neon.com](https://neon.com) → مشروعك → **Reset password**، ثم استخدم الرابط الجديد في الخطوات أدناه.

**الإعداد مرة واحدة (~5 دقائق):**

1. أنشئ الـ Space: [huggingface.co/spaces](https://huggingface.co/spaces) → **Create new Space**
   - الاسم: `red-shipping-api` — SDK: **Docker** — Visibility: **Public** → **Create Space**
2. من لوحة Neon انسخ رابطين (Dashboard → Project → Connection string)، ثم أضفهما في إعدادات الـ Space → **Variables and secrets**:
   - `PORT` = `7860` ← **إلزامي** في HF
   - `NODE_ENV` = `production`
   - `SEED_DB` = `true`
   - `DATABASE_URL` = رابط Neon **المُجمَّع** (المضيف يحتوي `-pooler`) لكن **بالمنفذ 443** — لأن HF يحجب المنافذ الصادرة عدا 80/443/8080 وNeon يدعم الاتصال عبر 443: غيّر في الرابط `neon.tech:5432` (أو ما بعده مباشرة) إلى `neon.tech:443` مع إبقاء `?sslmode=require`
   - `DIRECT_DATABASE_URL` = رابط Neon **المباشر** (نفس الرابط بدون `-pooler`) على المنفذ الافتراضي 5432 — عبره تعمل migrations والـ seed عند الإقلاع
   - `JWT_SECRET` و`JWT_REFRESH_SECRET` = قيمتان عشوائيتان طويلتان (32+ حرفاً لكل منهما)
3. أنشئ توكن كتابة: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → **New token** → role: **write** → انسخه
4. في GitHub → **Settings → Secrets and variables → Actions** أضف سرّين فقط:
   - `HF_TOKEN` = التوكن من الخطوة السابقة
   - `HF_SPACE` = `<اسم-مستخدم-هيوكنج-فيس>/red-shipping-api`
5. شغّل النشر: تبويب **Actions** → **Deploy API to Hugging Face Space** → **Run workflow** (ومن الآن يعمل تلقائياً مع كل تعديل على `apps/api/**`)
6. بعد اكتمال البناء (~5 دقائق) يعيد الـ Space تشغيل نفسه بالصورة الجديدة، وفيها تُطبَّق migrations والـ seed تلقائياً ثم يستمع الـ API على:
   ```
   https://<username>-red-shipping-api.hf.space
   ```
   اختبر: افتح `https://<username>-red-shipping-api.hf.space/api/v1/health` → يجب أن ترى `{"status":"ok",...}`

**بيانات الدخول بعد الـ seed التلقائي** (غيّر كلمة المرور فوراً من صفحة الملف الشخصي):

| المستخدم | البريد | كلمة المرور | الدور |
|---|---|---|---|
| المدير العام | `admin@banna-logistics.com` | `password123` | company_admin |
| مبيعات | `sales@banna-logistics.com` | `password123` | sales_rep |
| عمليات/تخليص | `ops@banna-logistics.com` | `password123` | ops_officer |
| حسابات | `accountant@banna-logistics.com` | `password123` | accountant |

> **ملاحظات:** الـ Space على HF ينام بعد فترة خمول طويلة (وليس 15 دقيقة كـ Render) — ومع keep-alive المجاني أدناه لا ينام أبداً. قاعدة Neon **لا تُحذف أبداً** (تستيقظ خلال ~ثانية).

---

## الخطوة 2 — نشر الفرونت إند على Vercel

1. ادخل إلى [vercel.com](https://vercel.com) → **Add New → Project** → اختر نفس المستودع
2. اضغط **Deploy** — لا تحتاج أي إعداد آخر، ويوجد ملفان جاهزان يغطيان طريقتي الإعداد:
   - **جذر المستودع (الافتراضي والأسهل):** `vercel.json` في الجذر يتولى كل شيء — يبني الويب فقط عبر Turbo (`--filter=@banna/web`) ويستخرج الناتج من `apps/web/dist`
   - **Root Directory = `apps/web`:** في هذه الحالة يستخدم Vercel ملف `apps/web/vercel.json` بنفس الإعدادات
3. **بعد أول نشر** — أضف متغير بيئة واحداً من *Settings → Environment Variables*:
   - **Name:** `API_URL`
   - **Value:** رابط الـ API من الخطوة 1 (مثال: `https://<username>-red-shipping-api.hf.space` — **بدون** `/` في النهاية)
   - ثم أعد النشر (Redeploy)
4. يقوم `vercel.json` تلقائياً بـ:
   - بناء الويب عبر Turbo (يشمل `@banna/shared-types`)
   - توجيه كل الطلبات من `/api/*` إلى الباك إند على الـ Space (بروكسي مخفي — لا CORS ولا تعديلات)
   - إرجاع `index.html` لأي مسار آخر (SPA routing)
   - تخزين مؤقت دائم لملفات `/assets` المُوقّعة

### كيف يتصل الفرونت إند بالـ API؟
- **الوضع الافتراضي (الموصى به):** الفرونت إند يطلب `/api/v1/...` من نفس النطاق، وVercel يمرر الطلب داخلياً إلى الباك إند — المتصفح لا يرى إلا نطاقاً واحداً ولا يحتاج أي CORS.
- **الوضع المباشر (اختياري):** عيّن `VITE_API_URL=https://<رابط-ال-api>` في Vercel بدلاً من الـ rewrite، وفي هذه الحالة أضف نطاق موقعك في متغير `ALLOWED_ORIGINS` على الباك إند.
- نطاقات `*.vercel.app` مسموحة تلقائياً في الـ API (للنشر الإنتاجي والمعاينة) — صفر إعداد.

---

## خيارات الاستضافة — المقارنة (محدّثة 2026 بعد فحص فعلي)

| المنصة | مجاني فعلاً؟ | السبات | ملاحظات |
|---|---|---|---|
| **Hugging Face Spaces** (Docker) | ✅ نعم، **بلا بطاقة** | بعد فترة خمول طويلة | **الخيار الأساسي أعلاه — 16GB RAM / 2 vCPU** |
| **Neon** (قاعدة البيانات) | ✅ نعم، بلا بطاقة | 5 دقائق (استيقاظ ~ثانية) | الأفضل للـ DB — مستخدم فعلاً في هذا المشروع |
| **Render** | ⚠️ شبه مجاني | بعد 15 دقيقة | خطة Hobby = 5GB باندويذ فقط ثم محاسبة + تحقق بطاقة $1 |
| **Back4App Containers** | ✅ نعم | نعم | 256MB فقط — ضيّقة لـ Prisma |
| Koyeb | ❌ صار Pro $29/شهر | — | لم يعد مجانياً |
| Fly.io / Railway / Zeabur | ❌ يتطلب بطاقة/دفع (Zeabur Free يدير سيرفرك الخاص فقط) | — | لا free tier سحابي دائم |

### خيار Render (شبه مجاني — إذا كانت لديك بطاقة)
ملف `render.yaml` جاهز للإطلاق بضغطة واحدة (Dashboard → **New → Blueprint** → اختر المستودع → **Apply**) — سيسألك مرة واحدة عن لصق رابطي Neon (`DATABASE_URL` المُجمَّع و`DIRECT_DATABASE_URL` المباشر) ثم يتولى كل شيء: بناء، migrations + seed عند الإقلاع، توليد أسرار JWT، وفحص صحة على `/api/v1/health`. تذكّر فقط: 5GB باندويذ شهرياً ثم محاسبة، والخدمة تنام بعد 15 دقيقة.

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
| `REDIS_URL` | تفعيل طوابير التنبيهات (BullMQ) — مجاناً عبر [Upstash](https://upstash.com) (رابط `rediss://...` يعمل مباشرة)، أو كتلة **Key Value** المعلّقة في `render.yaml` لخيار Render |
| `ALLOWED_ORIGINS` | عند استخدام نطاق مخصص للفرونت إند: `https://redshipping.com,https://www.redshipping.com` |

## ماذا عن خدمة الـ Workers (PDF/تنبيهات)؟
تطلب خدمة `apps/workers` خدمة Gotenberg لتوليد الـ PDF وRedis للطوابير — لم تُشمل في النشر الأساسي عمداً حتى يبقى بضغطات قليلة. الـ API يعمل كاملاً بدونها (الطوابير في وضع آمن "معطّل"). عند الحاجة على أي مستضيف Docker: شغّل `apps/workers` كحاوية ثانية + Gotenberg كحاوية جانبية.

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
