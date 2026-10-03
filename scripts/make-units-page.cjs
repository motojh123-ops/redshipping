/**
 * One-shot: derive UnitsPage.tsx from the proven LogisticsCategoriesPage.tsx
 * via precise string replacements (guarantees a compiling page).
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'apps', 'web', 'src', 'pages', 'masters', 'LogisticsCategoriesPage.tsx');
const dst = path.join(__dirname, '..', 'apps', 'web', 'src', 'pages', 'masters', 'UnitsPage.tsx');

let code = fs.readFileSync(src, 'utf8');

const pairs = [
  ['LogisticsCategoriesPage', 'UnitsPage'],
  [`from 'lucide-react';`, `from 'lucide-react';`],
  ['  Layers,\n', '  Ruler,\n'],
  ['/masters/libraries/logistics-categories', '/masters/libraries/units'],
  ['إدارة تصنيفات البنود العامة — كل تصنيف تضيفه هنا يظهر فوراً في نماذج البنود وجدولها',
   'المكتبة الشاملة لوحدات القياس والاحتساب — كل وحدة تضيفها هنا تظهر فوراً في «وحدة الحساب» بنماذج البنود'],
  ['التصنيف اللوجستي\n            </h1>', 'وحدات القياس والاحتساب\n            </h1>'],
  ['لا توجد تصنيفات مطابقة', 'لا توجد وحدات مطابقة'],
  ['إضافة تصنيف لوجستي جديد', 'إضافة وحدة احتساب جديدة'],
  ['تعديل التصنيف', 'تعديل الوحدة'],
  ['إضافة تصنيف', 'إضافة وحدة'],
  ['تمت إضافة التصنيف', 'تمت إضافة الوحدة'],
  ['تم تحديث التصنيف', 'تم تحديث الوحدة'],
  ['تم حذف التصنيف', 'تم حذف الوحدة'],
  ['تعذر حفظ التصنيف', 'تعذر حفظ الوحدة'],
  ['تعذر تحديث حالة التصنيف', 'تعذر تحديث حالة الوحدة'],
  ["'تعذر حذف التصنيف (قد يكون مستخدماً في بنود)'", "'تعذر حذف الوحدة (قد تكون مستخدمة في بنود)'"],
  ['حذف التصنيف', 'حذف الوحدة'],
  ['الكود والاسم بالإنجليزية مطلوبان', 'الكود والاسم بالإنجليزية مطلوبان'],
  ['placeholder="customs_clearance"', 'placeholder="container"'],
  ['placeholder="Customs Clearance"', 'placeholder="Per Container"'],
  ['placeholder="تخليص جمركي"', 'placeholder="بالكاونتينر"'],
  ['التصنيف يظهر فوراً في نماذج البنود وجدول البنود العامة', 'الوحدة تظهر فوراً في قائمة «وحدة الحساب» بنماذج البنود'],
  ['تصنيف لوجستي', 'وحدة احتساب'],
  ['التصنيف اللوجستي', 'وحدات القياس والاحتساب'],
  ['التصنيف', 'الوحدة'],
  ['تصنيف', 'وحدة'],
];

for (const [from, to] of pairs) {
  code = code.split(from).join(to);
}

fs.writeFileSync(dst, code, 'utf8');
console.log('WROTE', dst, `(${code.length} chars)`);
