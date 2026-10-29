/**
 * One-shot (جلسة 3 — وثيقة العملاء والعمليات §2):
 * derive CompanyTypesPage.tsx + IndustrySectorsPage.tsx from the proven
 * PortTypesPage.tsx via precise string replacements (repo convention).
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'apps', 'web', 'src', 'pages', 'masters', 'PortTypesPage.tsx');

function derive(dstName, pairs, sweeps) {
  let code = fs.readFileSync(src, 'utf8');
  for (const [from, to] of pairs) code = code.split(from).join(to);
  for (const [from, to] of sweeps) code = code.split(from).join(to);
  const dst = path.join(__dirname, '..', 'apps', 'web', 'src', 'pages', 'masters', dstName);
  fs.writeFileSync(dst, code, 'utf8');
  console.log('WROTE', dst, `(${code.length} chars)`);
}

const SUBTITLE = 'مكتبة أنواع الموانئ الديناميكية — كل نوع تضيفه هنا يظهر فوراً في نافذة إضافة الميناء وفي أطلس الدول والمدن';
const MODAL_SUB = 'النوع يظهر فوراً في قائمة «نوع الميناء» بنافذة إضافة الميناء وأطلس الدول';

derive('CompanyTypesPage.tsx', [
  ['PortTypesPage', 'CompanyTypesPage'],
  ['  Anchor,\n', '  Briefcase,\n'],
  ['<Anchor', '<Briefcase'],
  ['port-types', 'company-types'],
  ['أنواع الموانئ', 'أنواع الشركات'],
  [SUBTITLE, 'مكتبة أنواع الشركات (تصنيف الكيان) — كل نوع تضيفه هنا يظهر فوراً في قائمة «نوع الشركة» بنافذة إضافة العميل السريعة (مصنع / تاجر / موزع / مستورد)'],
  ['نوع ميناء جديد', 'نوع شركة جديد'],
  ['تعديل نوع الميناء', 'تعديل نوع الشركة'],
  ['تمت إضافة نوع الميناء', 'تمت إضافة نوع الشركة'],
  ['تم تحديث نوع الميناء', 'تم تحديث نوع الشركة'],
  ['تم حذف نوع الميناء', 'تم حذف نوع الشركة'],
  [MODAL_SUB, 'النوع يظهر فوراً في قائمة «نوع الشركة» بنافذة إضافة العميل السريعة'],
  ['placeholder="sea"', 'placeholder="factory"'],
  ['placeholder="Sea Port"', 'placeholder="Factory"'],
  ['placeholder="ميناء بحري"', 'placeholder="مصنع"'],
], [
  ['نوع الميناء', 'نوع الشركة'],
  ['الميناء', 'الشركة'],
]);

derive('IndustrySectorsPage.tsx', [
  ['PortTypesPage', 'IndustrySectorsPage'],
  ['  Anchor,\n', '  Factory,\n'],
  ['<Anchor', '<Factory'],
  ['port-types', 'industry-sectors'],
  ['أنواع الموانئ', 'قطاعات النشاط'],
  [SUBTITLE, 'مكتبة قطاعات النشاط (تصنيف المجال) — كل قطاع تضيفه هنا يظهر فوراً في قائمة «نوع النشاط» بنافذة إضافة العميل السريعة (غذائية / هندسي / كيميائي)'],
  ['نوع ميناء جديد', 'قطاع نشاط جديد'],
  ['تعديل نوع الميناء', 'تعديل قطاع النشاط'],
  ['تمت إضافة نوع الميناء', 'تمت إضافة قطاع النشاط'],
  ['تم تحديث نوع الميناء', 'تم تحديث قطاع النشاط'],
  ['تم حذف نوع الميناء', 'تم حذف قطاع النشاط'],
  [MODAL_SUB, 'القطاع يظهر فوراً في قائمة «نوع النشاط» بنافذة إضافة العميل السريعة'],
  ['placeholder="sea"', 'placeholder="food"'],
  ['placeholder="Sea Port"', 'placeholder="Food & Beverages"'],
  ['placeholder="ميناء بحري"', 'placeholder="مواد غذائية"'],
], [
  ['نوع الميناء', 'قطاع النشاط'],
  ['النوع', 'القطاع'],
  ['أنواع', 'قطاعات'],
  ['نوع', 'قطاع'],
]);
