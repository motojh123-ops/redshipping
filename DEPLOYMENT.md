# دليل النشر السحابي — RED SHIPPING / Banna ERP

نشر كامل بضغطات قليلة وبدون أي إعداد يدوي معقّد:

| الطبقة | المنصة | الملف | النتيجة |
|---|---|---|---|
| الفرونت إند (React/Vite) | **Vercel** | `vercel.json` (الجذر) | موقع ثابت + بروكسي `/api` للباك إند |
| قاعدة البيانات (PostgreSQL) | **Neon** — مجانية **للأبد** | (بلا ملفات — رابط واحد) | بلا انتهاء وبلا بطاقة، استيقاظ تلقائي |
| الباك إند (NestJS) | **Cloudflare Workers** — مجاني 100% **بلا بطاقة** | `wrangler.jsonc` + `api/index.ts` | API على edge عالمي — **0ms cold start** |
| بديل Docker (أي مستضيف) | أي Docker Host | `apps/api/Dockerfile` | صورة إنتاج جاهزة للباك إند |

> **لماذا Neon بدلاً من قاعدة بيانات Render؟** قاعدة Postgres المجانية في Render **تُحذف بعد 30 يوماً** — بينما خطة Neon المجانية **بلا حدود زمنية إطلاقاً** (0.5GB، بلا بطاقة ائتمان)، وينام الخادم بعد 5 دقائق خمول ويستيقظ تلقائياً خلال ~ثانية عند أول استعلام.

---

## الخطوة 1 — نشر الباك إند على Cloudflare Workers (مجاني 100%)

> **لماذا Workers وليس Render/HF Spaces؟** Cloudflare Workers يعمل على edge عالمي بـ **0ms cold start** — لا سبات، لا انتظار، ولا حاجة لبطاقة ائتمان. الخطة المجانية تشمل **100,000 طلب/يوم** وهي أكثر من كافية.

> ⚠️ **أمان أولاً:** كلمة سر Neon نُشرت سابقاً في ملف على GitHub. اذهب فوراً إلى لوحة [neon.com](https://neon.com) → مشروعك → **Reset password**، ثم استخدم الرابط الجديد في الخطوات أدناه.

**الإعداد مرة واحدة (~5 دقائق):**

1. ثبّت Wrangler CLI (إن لم يكن مثبتاً):
   ```bash
   npm install -g wrangler
   wrangler login
   ```
2. أضف الأسرار (secrets) — تُخزّن مشفّرة في Cloudflare ولا تظهر في الكود:
   ```bash
   # رابط Neon المُجمَّع (pooler) — للاتصال عبر WebSocket
   wrangler secret put DATABASE_URL
   # رابط Neon المباشر — للـ migrations
   wrangler secret put DIRECT_DATABASE_URL
   # أسرار JWT
   wrangler secret put JWT_SECRET
   wrangler secret put JWT_REFRESH_SECRET
   ```
3. ابنِ وانشر:
   ```bash
   # من جذر المستودع
   npm run build --workspace=@banna/api
   npx wrangler deploy
   ```
4. بعد اكتمال النشر (~30 ثانية) يعمل الـ API على:
   ```
   https://redshipping-api.<username>.workers.dev
   ```
   اختبر: `curl https://redshipping-api.<username>.workers.dev/api/v1/health` → يجب أن ترى `{"status":"ok",...}`

### كيف يعمل تقنياً؟

ملف `api/index.ts` هو نقطة الدخول للـ Worker — يستقبل طلبات `fetch()` من Cloudflare ويحولها إلى طلبات Express/NestJS عبر:
- **CORS preflight** سريع بدون تحميل NestJS
- **Mock HTTP socket** لأن Workers لا تدعم TCP مباشرة
- **Neon serverless adapter** — Prisma تتصل بقاعدة البيانات عبر WebSocket/HTTP بدلاً من TCP التقليدي (مطلوب في بيئة Workers)

### إعداد الـ Migrations وSeed

بما أن Workers بيئة serverless بدون filesystem دائم، شغّل migrations من جهازك المحلي:
```bash
# تطبيق migrations
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# تشغيل seed (مرة واحدة)
npx prisma db seed --schema=apps/api/prisma/schema.prisma
```

**بيانات الدخول بعد الـ seed التلقائي** (غيّر كلمة المرور فوراً من صفحة الملف الشخصي):

| المستخدم | البريد | كلمة المرور | الدور |
|---|---|---|---|
| المدير العام | `admin@banna-logistics.com` | `password123` | company_admin |
| مبيعات | `sales@banna-logistics.com` | `password123` | sales_rep |
| عمليات/تخليص | `ops@banna-logistics.com` | `password123` | ops_officer |
| حسابات | `accountant@banna-logistics.com` | `password123` | accountant |

---

## الخطوة 2 — نشر الفرونت إند على Vercel

1. ادخل إلى [vercel.com](https://vercel.com) → **Add New → Project** → اختر نفس المستودع
2. اضغط **Deploy** — لا تحتاج أي إعداد آخر، ويوجد ملفان جاهزان يغطيان طريقتي الإعداد:
   - **جذر المستودع (الافتراضي والأسهل):** `vercel.json` في الجذر يتولى كل شيء — يبني الويب فقط عبر Turbo (`--filter=@banna/web`) ويستخرج الناتج من `apps/web/dist`
   - **Root Directory = `apps/web`:** في هذه الحالة يستخدم Vercel ملف `apps/web/vercel.json` بنفس الإعدادات
3. **بعد أول نشر** — أضف متغير بيئة واحداً من *Settings → Environment Variables*:
   - **Name:** `API_URL`
   - **Value:** رابط الـ API من الخطوة 1 (مثال: `https://redshipping-api.<username>.workers.dev` — **بدون** `/` في النهاية)
   - ثم أعد النشر (Redeploy)
4. يقوم `vercel.json` تلقائياً بـ:
   - بناء الويب عبر Turbo (يشمل `@banna/shared-types`)
   - توجيه كل الطلبات من `/api/*` إلى الباك إند على Workers (بروكسي مخفي — لا CORS ولا تعديلات)
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
| **Cloudflare Workers** | ✅ نعم، **بلا بطاقة** | ❌ لا سبات (0ms cold start) | **الخيار الأساسي أعلاه — 100K طلب/يوم مجاناً** |
| **Neon** (قاعدة البيانات) | ✅ نعم، بلا بطاقة | 5 دقائق (استيقاظ ~ثانية) | الأفضل للـ DB — مستخدم فعلاً في هذا المشروع |
| **Hugging Face Spaces** (Docker) | ✅ نعم، بلا بطاقة | بعد فترة خمول طويلة | 16GB RAM / 2 vCPU — بديل جيد لو احتجت بيئة Docker كاملة |
| **Render** | ⚠️ شبه مجاني | بعد 15 دقيقة | خطة Hobby = 5GB باندويذ فقط ثم محاسبة + تحقق بطاقة $1 |
| **Back4App Containers** | ✅ نعم | نعم | 256MB فقط — ضيّقة لـ Prisma |
| Koyeb | ❌ صار Pro $29/شهر | — | لم يعد مجانياً |
| Fly.io / Railway / Zeabur | ❌ يتطلب بطاقة/دفع | — | لا free tier سحابي دائم |

### خيار HF Spaces (بديل Docker — 16GB RAM مجاناً)
ملف `apps/api/Dockerfile` + workflow `.github/workflows/deploy-api-hf-space.yml` جاهزان للنشر على Hugging Face Spaces كبديل لـ Workers إذا احتجت بيئة Docker كاملة (مثلاً لتشغيل Gotenberg لتوليد PDF). راجع تاريخ Git للتعليمات التفصيلية.

### خيار Render (شبه مجاني — إذا كانت لديك بطاقة)
ملف `render.yaml` جاهز للإطلاق بضغطة واحدة (Dashboard → **New → Blueprint** → اختر المستودع → **Apply**) — سيسألك مرة واحدة عن لصق رابطي Neon (`DATABASE_URL` المُجمَّع و`DIRECT_DATABASE_URL` المباشر) ثم يتولى كل شيء: بناء، migrations + seed عند الإقلاع، توليد أسرار JWT، وفحص صحة على `/api/v1/health`. تذكّر فقط: 5GB باندويذ شهرياً ثم محاسبة، والخدمة تنام بعد 15 دقيقة.

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
