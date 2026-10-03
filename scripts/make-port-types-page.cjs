/**
 * One-shot: derive PortTypesPage.tsx from the proven UnitsPage.tsx
 * via precise string replacements.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'apps', 'web', 'src', 'pages', 'masters', 'UnitsPage.tsx');
const dst = path.join(__dirname, '..', 'apps', 'web', 'src', 'pages', 'masters', 'PortTypesPage.tsx');

let code = fs.readFileSync(src, 'utf8');

const pairs = [
  ['UnitsPage', 'PortTypesPage'],
  ['  Ruler,\n', '  Anchor,\n'],
  ['<Ruler', '<Anchor'],
  ['/masters/libraries/units', '/masters/libraries/port-types'],
  ['وحدات القياس والاحتساب', 'أنواع الموانئ'],
  ['المكتبة الشاملة لوحدات القياس والاحتساب — كل وحدة تضيفها هنا تظهر فوراً في «وحدة الحساب» بنماذج البنود',
   'مكتبة أنواع الموانئ الديناميكية — كل نوع تضيفه هنا يظهر فوراً في نافذة إضافة الميناء وفي أطلس الدول والمدن'],
  ['لا توجد وحدات مطابقة', 'لا توجد أنواع مطابقة'],
  ['إضافة وحدة احتساب جديدة', 'إضافة نوع ميناء جديد'],
  ['تعديل الوحدة', 'تعديل نوع الميناء'],
  ['إضافة وحدة', 'إضافة نوع'],
  ['تمت إضافة الوحدة', 'تمت إضافة نوع الميناء'],
  ['تم تحديث الوحدة', 'تم تحديث نوع الميناء'],
  ['تم حذف الوحدة', 'تم حذف نوع الميناء'],
  ['تعذر حفظ الوحدة', 'تعذر حفظ النوع'],
  ['تعذر تحديث حالة الوحدة', 'تعذر تحديث حالة النوع'],
  ['حذف الوحدة', 'حذف النوع'],
  ['الكود والاسم بالإنجليزية مطلوبان', 'الكود والاسم بالإنجليزية مطلوبان'],
  ['placeholder="container"', 'placeholder="sea"'],
  ['placeholder="Per Container"', 'placeholder="Sea Port"'],
  ['placeholder="بالكاونتينر"', 'placeholder="ميناء بحري"'],
  ['الوحدة تظهر فوراً في قائمة «وحدة الحساب» بنماذج البنود', 'النوع يظهر فوراً في قائمة «نوع الميناء» بنافذة إضافة الميناء وأطلس الدول'],
  ['وحدة احتساب', 'نوع ميناء'],
  ['فعّالة', 'فعّالة'],
];

for (const [from, to] of pairs) {
  code = code.split(from).join(to);
}

// fix any leftover generic unit words in messages
code = code.split('الوحدة').join('النوع').split('وحدة').join('نوع');

fs.writeFileSync(dst, code, 'utf8');
console.log('WROTE', dst, `(${code.length} chars)`);
