# RedShipping — Clients & Operations (CRM & Operations) — Requirements

> Sources: `وثيقة_متطلبات_وحدة_العملاء_والعمليات.pdf` (2p, 2026-09, via `fitz` → `docs/clients_ops_raw.txt`) + `ghh.mp4` (673s, `docs/ghh.wav` @16k mono). Whisper `small` ar transcription running 2026-10-04 04:07 — PDF is authoritative; transcript will amend if divergent.

## 1. Vision — الغاء النموذج القديم (سريع ليد vs رسمي عميل)

- Simplify initial capture + clear separation Prospects vs Actual Clients.
- Prospects = every potential partner, quick light entry without CR/tax formalities.
- Actual Clients = prospects with >=1 accepted Offer.
- Accept on Offer auto-migrates client to Actual + into Master Data (single source for Operations).
- Eliminate heavy upfront validation; CR/Tax staged later in Master file.

## 2. Directory Architecture (p1, §1)

### 2.1 Prospects / Leads (§1.1)
- Screen lists all potential partners.
- Unified "New Client / Lead" button — fast, bilingual, no formalities.
- Core action: `New Offer` directly inside client file + traceability.

### 2.2 Actual Clients (§1.2)
- Criterion: confirmed acceptance of at least one offer.
- Conversion: automatic immediate on Offer Accept.
- Integration: auto-relocation to Master Data for legal/operational completion.

## 3. Quick Entry & Lookups (p1, §2)

| Field | Type | Lookup | Notes |
|---|---|---|---|
| اسم المنشأة / الشركة (عربي/انجليزي) | text | — | Mandatory at quick entry; CR + Tax NOT required at this stage (مرحلي). Bilingual `name` + `nameAr`. |
| نوع الشركة `companyType` | dropdown | `Company Types` | مصنع/تاجر/موزع/مستورد... dynamic |
| نوع النشاط / التصنيف `industrySector` | dropdown | `Industry Sectors` | مواد غذائية/هندسي/كيميائي... dynamic |
| الموقع الدولة+المحافظة/المدينة | combo | `countries` + `cities` + `ports` | ISO2 `countryCode` + `cityId` FK |
| بيانات الاتصال السريعة | group | — | phone/email/Person in Charge + website |

> Programmer note (p1 footer): `companyType` != `industrySector` (e.g. factory and distributor both in foods). Each lookup MUST have independent management screen in Masters.

## 4. Offer Workflow — دورة حياة طلب السعر (§3, p2)

```
[Prospect file] --(1) New Offer Request--> [Pricing Desk queue]
                                      --(2) Pricing & PDF --> Completed
                                      --(3) Accepted --> client=>Active + Operation Job auto-created
```

1. New Offer Request inside prospect — fill operational data (§5).
2. Pricing & PDF: pricing team prices, status -> Completed, PDF issued.
3. Acceptance & Launch: on Accepted, client upgraded + Shipment/Operation Job row linked to quotation.

## 5. Offer Parameters — حقول وشروط نموذج العرض (§4, p2)

| Element | Options / Mechanism | Programmatic Condition |
|---|---|---|
| Service Type نوع الشحنة | شحن / تخليص / نقل — any 1–3 combo | selecting services opens dynamic fields |
| POL / POD موانئ الشحن والتفريغ | auto-suggest from ports registry | — |
| Clearance port + pickup address | manual entry or pick from client addresses | appears when "التخليص" or "النقل الداخلي" selected |
| Goods / Container / Qty | Description of Goods, Container Type (…40ft, 20ft), Quantity | — |
| Pricing Notes | advanced text (Special Requirements) | routed directly to Pricing Team |

Dashboard line summary per offer: `1x40' | From: Alexandria -> To: Mersin | Service: Transport & Freight | Qty: 3 | [Offer #1024] View PDF | Status: Completed`.

## 6. Master Files Requirements — استكمال بيانات العميل الفعلي (§5, p2)

- **أ) Official documents & expiry alerts:** Commercial Register / Tax Card / Importer-Exporter registry — attachment + expiry date per document; automatic Alert/Alarm before expiry.
- **ب) Branches & addresses:** several branches (المقر الرئيسي / المخازن / أماكن التحميل) + multiple Persons in Charge (title + phone). Addresses are called directly in the Pickup/Dispatch order (أمر التحميل) from the Operations module.

## 7. Implementation Map (Session 3 — 2026-10-04)

- **Prisma** (migrations `20261004090000_clients_ops_directory` + `20261004093000_quotation_completed_status`, applied to Neon): new `CompanyType`, `IndustrySector`, `ClientBranch` models; `Client` extended (`nameAr`, `companyTypeId`/`industrySectorId`/`cityId`/`countryCode`, `taxCardNumber`, `importerRegistryNumber` + 3 expiry dates, `phone`/`email`/`website`/`personInCharge`, `convertedAt`, `convertedFromQuotationId`); `Quotation` extended (`serviceTypes[]`, `clearancePortId`, `pickupBranchId`+`pickupAddressText`, `goodsDescription`, `containerType/Qty`, `pricingNotes`, `specialRequirements`, `pdfUrl`, status `completed`); `DocumentCategory` + `importer_registry`/`exporter_registry`.
- **API:** masters dynamic libraries `company-types` + `industry-sectors` (self-healing seeds: 6 + 11 defaults, mirroring units pattern); entity-documents now support `entityType=client`; expiry-alerts feed extended with client registries + client document expiries; clients module: quick-entry (default `prospect`), `PATCH /clients/:id`, branches CRUD (`/clients/:id/branches`), contacts CRUD with optional branch link; quotations: §4 offer params with port-code/UUID resolution + pickup-branch tenant validation, `POST /quotations/:id/accept` → Shipment Job File + **auto-promotion prospect→active** (`convertedAt` + `convertedFromQuotationId`).
- **Web:** `CompanyTypesPage` + `IndustrySectorsPage` in Masters portal (Sidebar + routes); unified quick-entry `CreateClientModal` (bilingual name, type/sector dropdowns, country→city, person in charge); `ClientList` tabs فعليون/مستهدفون by status; `ClientDetails` — prospect banner, offers tab (line summary, service badges, View PDF, accept button), branches tab (loading addresses); `NewOfferModal` (§4: service combo, POL/POD via PortOptions, conditional clearance port + pickup from branches, goods/container/qty, pricing notes).

## 8. Verification

`scripts/verify-clients-ops.cjs` — live end-to-end: login → library seeds (6/11) → expiry-alerts feed → quick-entry prospect → branch (loading address) → offer (shipping+clearance+transport combo, EGALY→TRMRS, 3x40HQ) → accept → Job File (`BAN-…`) → client auto-promoted `active` with `convertedAt`.

## 9. Deployment state (2026-10-04)

- **Web:** `vercel deploy --prod` → https://redshipping-lake.vercel.app ✅
- **API worker:** `wrangler deploy` blocked on Cloudflare auth — the current wrangler OAuth token belongs to a different Cloudflare account than the one hosting `redshipping-api` (account `20ccaff…`, subdomain `omarabdelfattah460`). Needs `wrangler login` with the owning account or a `CLOUDFLARE_API_TOKEN`. DB migrations ARE applied — the new endpoints go live with the next successful worker deploy.


