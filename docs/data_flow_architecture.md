# 🏗️ معمارية تدفق البيانات — Red Shipping ERP

> تم التحقق من هذه الوثيقة مقابل الكود الفعلي (schema.prisma + services + e2e specs) بتاريخ 2026-09-22.
> التصحيحات عن النسخة السابقة موسومة بـ ⚠️.

## من أول عميل محتمل لآخر فاتورة

---

## 🔗 الجذر المشترك: `companyId` (Tenant)

**كل شيء في النظام مرتبط بـ `Company`** — النظام multi-tenant وكل record يحمل `companyId`.
الـ JWT token يحمل `companyId` → API يستخرجه عبر `@TenantId()` decorator → يُضاف تلقائياً لكل query.

---

## 🔄 الرحلة الكاملة من البداية للنهاية

```
PROSPECT → CLIENT → QUOTATION → SHIPMENT → CUSTOMS → INVOICE
```

---

## 1️⃣ العميل (Client)

### قاعدة البيانات
```
Client {
  id, companyId, name, tradeName
  status: prospect | active | inactive | blacklisted  ← يبدأ prospect
  salesRepId → User    ← مرتبط بموظف المبيعات

  contacts      → ClientContact[]   ← جهات الاتصال
  quotations    → Quotation[]       ← عروض الأسعار
  shipments     → Shipment[]        ← الشحنات
  invoices      → Invoice[]         ← الفواتير
  crmActivities → CrmActivity[]     ← سجل التواصل
}
```

### تدفق البيانات في الواجهة
```
ClientList.tsx
  └── useClients()              ← GET /api/v1/clients
        └── api.ts (axios)
              └── interceptor: response.data.data   ← يفك الـ {success,data} wrapper
                    └── ClientsService.findAll(tenantId)
                          └── prisma.client.findMany({ where: { companyId } })
```

### إنشاء عميل جديد
```
CreateClientModal → useCreateClient() → POST /api/v1/clients
  → prisma.client.create({ companyId: tenantId, ...data })
  → queryClient.invalidateQueries(['clients'])   ← يحدث القائمة تلقائياً
```

---

## 2️⃣ CRM Pipeline

### الهدف: تحويل prospect → active
```
LeadsPipelinePage
  └── GET /api/v1/clients?status=prospect
  └── POST /api/v1/clients/:id/activities   ← تسجيل مكالمة/اجتماع

حالات العميل:
  prospect → active      (بعد الاتفاق على أول شحنة)
  active   → inactive    (توقف التعامل)
  active   → blacklisted (ديون/مشاكل)
```

---

## 3️⃣ التسعير وعروض الأسعار (Quotation)

```
Quotation {
  clientId          → Client      ← لأي عميل؟
  salesRepId        → User        ← من أصدره؟ (REQUIRED)
  originPortId      → Port?       ← ميناء الشحن (UUID، اختياري)
  destinationPortId → Port?       ← ميناء الوصول (UUID، اختياري)
  shipmentType: fcl | lcl | air | land   ← lowercase
  status: draft → sent → accepted | rejected | expired

  items → QuotationItem[]
    └── chargeItemId → ChargeItem?   ← مرتبط بـ Masters (اختياري)
    └── costRate, sellRate, quantity → totalCost, totalSell, profit
```

> ملاحظة: `Quotation` يملك أيضاً `quotationNumber` + `versionNumber` + `parentQuotationId`
> لدعم نسخ متعددة من العرض (QuotationVersions).

---

## 4️⃣ الشحنة (Shipment) — قلب النظام

```
Shipment {
  jobFileNumber     ← مولّد تلقائياً بصيغة BAN-YYYY-NNNN (unique لكل tenant)
  clientId          → Client           ← REQUIRED (لازم عميل موجود أولاً)
  quotationId       → Quotation?       ← عرض السعر (اختياري)
  salesRepId, opsOfficerId → User?     ← يُعبّآن تلقائياً من userId الحالي
  shippingLineId    → ShippingLine?    ← الخط الملاحي
  overseasAgentId   → OverseasAgent?   ← الوكيل الخارجي
  originPortId      → Port? (UUID)     ← مش اسم الميناء! (لكن API يقبل اسم/كود ويحوّله)
  destinationPortId → Port? (UUID)

  shipmentType: fcl | lcl | air | land | clearance_only  ← lowercase!
  incoterm: EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF  ← uppercase!
  currentStage: booking_confirmed → ... → delivered

  containers     → ShipmentContainer[]   ← الحاويات
  events         → ShipmentEvent[]       ← timeline المراحل (changedById REQUIRED)
  costs          → ShipmentCost[]        ← تكاليف الموردين
  customsDossier → CustomsDossier?       ← ملف الجمارك (1:1)
  invoices       → Invoice[]
}
```

### مراحل الشحنة (ShipmentStage)
```
booking_confirmed → cargo_received → customs_submitted → acid_issued
  → in_transit → arrived_destination → clearance_in_progress
  → release_issued → out_for_delivery → delivered → closed
(+ cancelled كحالة استثنائية)
```

### سلوك الـ API عند الإنشاء (shipments.service.ts)
- `shipmentType` و `incoterm` و `currentStage` يُطبَّعون تلقائياً (lowercase/uppercase)
- `originPortId/destinationPortId` يقبلون UUID أو كود UNLOCODE أو اسم الميناء (مثل `Alexandria (EGALY)`) ويُحوَّلون لـ UUID
- بيانات FK غير صالحة → خطأ P2003 من Prisma يُترجم لـ `400 BadRequest` برسالة واضحة
- عند إنشاء شحنة يُسجَّل `ShipmentEvent` تلقائياً بالمرحلة الابتدائية

---

## 5️⃣ الجمارك (CustomsDossier) — 1:1 مع الشحنة

```
CustomsDossier {
  shipmentId (UNIQUE) → Shipment
  acidNumber, acidIssueDate, acidExpiryDate
  customsBrokerId → User?
  dutiesPaid, vatPaid, customsValueDeclared
  nafezaVerifiedAt                    ← تكامل Nafeza
  status: acid_requested → acid_issued → customs_cleared → released
}
```

---

## 6️⃣ الفاتورة (Invoice)

```
Invoice {
  clientId   → Client      ← REQUIRED
  shipmentId → Shipment?   ← اختياري
  invoiceNumber (unique لكل tenant)

  ⚠️ invoiceType (القيم الفعلية في الـ schema):
    client_freight        ← فاتورة شحن للعميل
    client_clearance      ← فاتورة تخليص للعميل
    vendor_disbursement   ← مصروفات/مورد

  ⚠️ status (القيم الفعلية):
    draft → issued → partially_paid | paid | overdue | cancelled

  items → InvoiceItem[]
    └── chargeItemId → ChargeItem?   ← نفس بنود المرجيات
    └── quantity × unitPrice = totalPrice
  exchangeRate Decimal(10,4)       ← للعملات المتعددة
}
```

> ملاحظة: هناك أيضاً endpoint منفصل للمصروفات (`/disbursements`) يرجع 404 حالياً —
> انظر قسم "مشاكل مكتشفة" أدناه.

---

## 🏗️ Masters — البيانات المرجعية

| Master | يُستخدم في |
|--------|-----------|
| `ChargeItem` | QuotationItem, InvoiceItem, ShipmentCost |
| `Port` | Quotation, Shipment |
| `ShippingLine` | Shipment |
| `OverseasAgent` | Shipment |
| `Vendor` | ShipmentCost |

---

## 📡 تدفق البيانات التقني

```
React Component
  → useQuery/useMutation (React Query + cache)
  → api.ts axios (Bearer token تلقائي، يفك response wrapper)
  → Vite Proxy /api/v1 → localhost:4000
  → NestJS Controller (@JwtAuthGuard, @TenantId())
  → Service (tenantId معزول)
  → Prisma ORM
  → PostgreSQL (RLS multi-tenant)
  ← Response { success: true, data: {...} }
  ← TransformInterceptor يلف كل responses
```

> ⚠️ Fallback مهم: كل الـ services تحتوي try/catch مع `DataStoreService` —
> لو قاعدة البيانات غير متاحة، يرجع النظام بيانات in-memory (demo data) بدل الفشل.
> هذا يعني أن صفحات الداشبورد ممكن تعرض بيانات حتى بدون DB!

---

## 🔄 Cache Invalidation (كيف تتحدث البيانات تلقائياً)

```typescript
// بعد إنشاء شحنة → يجدد القائمة والداشبورد
queryClient.invalidateQueries(['shipments'])

// بعد تحديث مرحلة شحنة → يجدد التفاصيل والقائمة
queryClient.invalidateQueries(['shipments', 'detail', id])
queryClient.invalidateQueries(['shipments', 'list'])
```

---

## 🧪 الاختبارات (e2e/) — الوضع الحالي

| الاختبار | يغطي | الحالة |
|----------|------|--------|
| `smoke.spec.ts` | دخول + تنقل أساسي | ✅ يعمل |
| `real-data.spec.ts` | API حقيقي: auth, shipments, clients, invoices, masters | ✅ مُصحح (يجلب clientId قبل POST /shipments) |
| `shipments.spec.ts` | واجهة الشحنات | ✅ تم إصلاح الـ modal selector |
| باقي الـ specs | clients/crm, customs, financials, masters, operations, quotations | UI-level tests |

### قواعد مهمة لكتابة e2e tests
```
1. الـ Modal يُرندر inline (مش React Portal) بناتج role="dialog"
   → استخدم page.locator('[role="dialog"]') بدل [class*="modal"]

2. أزرار الإنشاء داخل main content:
   → page.locator('main button', { hasText: 'فتح ملف شحنة جديد' })
   (الـ sidebar/navbar فيها أزرار مشابهة)

3. الـ API يلف responses في { success, data }
   → const data = json.data ?? json

4. قبل POST /shipments لازم تجيب clientId من GET /clients
   (fallback لـ user.companyId ممكن يفشل لأنه مش UUID لعميل)

5. Enums: shipmentType/currentStage lowercase — incoterm uppercase
```

---

## ⚠️ مشاكل مكتشفة من Real Tests — الوضع المحدّث

| المشكلة | السبب | الحل | الحالة |
|---------|-------|------|--------|
| POST /shipments → 400 | `clientId` مطلوب + `shipmentType` لازم lowercase | تعديل التيست ليجلب clientId أولاً | ✅ تم الإصلاح في real-data.spec.ts |
| Dashboard spinner | الـ API كان واقفاً أصلاً (connection refused) | تشغيل `npm run dev` في apps/api | ✅ تم التحقق — البيانات موجودة في DB (لا حاجة لـ seed) |
| Modal selector خطأ | Modal inline بـ role="dialog" (وليس Portal) | استخدم `[role="dialog"]` | ✅ تم الإصلاح في real-data.spec.ts و shipments.spec.ts |
| GET /disbursements → 404 | الـ API كان واقفاً — الـ DisbursementsController موجود فعلاً | — | ✅ تم التحقق — يعمل |
| ترقيم RED vs BAN | in-memory fallback يستخدم `RED-` بينما DB يستخدم `BAN-` | توحيد الترقيم | ❌ مفتوحة (منخفضة الأولوية — fallback فقط) |

### نتائج التحقق النهائية (2026-09-22)
```
npx playwright test  →  101 passed (7.2m)
```
ملاحظة: أول تشغيل بعد إعادة تشغيل Vite قد يفشل في loginAsAdmin بسبب
"Re-optimizing dependencies" — أعد تشغيل التيست فقط وسينجح (flake وليس bug).

---

## 📊 ملخص الفروقات المهمة عن النسخة القديمة

1. **invoiceType**: `freight_invoice | disbursement | proforma | credit_note` ❌
   → الصحيح: `client_freight | client_clearance | vendor_disbursement` ✅
2. **InvoiceStatus**: أضِفت `partially_paid`
3. **ترقيم الشحنات**: `BAN-YYYY-NNNN` في DB (وليس `RED-` — ذاك fallback فقط)
4. **salesRepId في Quotation**: REQUIRED (وليس اختياري)
5. **changedById في ShipmentEvent**: REQUIRED — الـ API يعالجها بجلب أول user في الـ tenant
6. **Ports في Quotation**: اختيارية (`Port?`) وليست إجبارية
