/**
 * One-shot: replace the LIBRARY_DEFAULTS.units block in masters.service.ts
 * with a comprehensive units library (~33 units). Matches the block by its
 * ASCII boundaries — no Arabic matching needed.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'apps', 'api', 'src', 'modules', 'masters', 'masters.service.ts');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const start = lines.findIndex((l) => l.trim() === 'units: [');
if (start === -1) {
  console.error('units block not found');
  process.exit(1);
}
let end = -1;
for (let i = start + 1; i < lines.length; i++) {
  if (lines[i].trim() === '],') {
    end = i;
    break;
  }
}
if (end === -1) {
  console.error('units block end not found');
  process.exit(1);
}

const NEW_UNITS = `    units: [
      { code: 'container', nameEn: 'Per Container', nameAr: 'بالكاونتينر' },
      { code: 'shipment', nameEn: 'Per Shipment', nameAr: 'بالشحنة' },
      { code: 'ton', nameEn: 'Per Ton', nameAr: 'بالطن' },
      { code: 'cbm', nameEn: 'Per CBM', nameAr: 'بالمتر المكعب' },
      { code: 'bl', nameEn: 'Per B/L', nameAr: 'بالبوليصة' },
      { code: 'cube', nameEn: 'Per Cube', nameAr: 'بالكيوب' },
      { code: 'set', nameEn: 'Per Set', nameAr: 'بالعدة' },
      { code: 'hour', nameEn: 'Per Hour', nameAr: 'بالساعة' },
      { code: 'kg', nameEn: 'Per KG', nameAr: 'بالكيلوجرام' },
      { code: 'day', nameEn: 'Per Day', nameAr: 'باليوم' },
      { code: 'package', nameEn: 'Per Package', nameAr: 'بالكرتونة / الباكجة' },
      { code: 'piece', nameEn: 'Per Piece', nameAr: 'بالقطعة' },
      { code: 'pallet', nameEn: 'Per Pallet', nameAr: 'بالطبلية (البليتة)' },
      { code: 'teu', nameEn: 'Per TEU (20ft)', nameAr: 'بوحدة مكافئة 20 قدم' },
      { code: 'wm', nameEn: 'Per W/M (Weight or Measurement)', nameAr: 'وزن أو قياس (W/M)' },
      { code: 'truckload', nameEn: 'Per Truck Load (FTL)', nameAr: 'بحمل شاحنة كامل' },
      { code: 'trip', nameEn: 'Per Trip', nameAr: 'بالرحلة' },
      { code: 'km', nameEn: 'Per Kilometer', nameAr: 'بالكيلومتر' },
      { code: 'mile', nameEn: 'Per Mile', nameAr: 'بالميل' },
      { code: 'sqm', nameEn: 'Per Square Meter', nameAr: 'بالمتر المسطح' },
      { code: 'ltm', nameEn: 'Per Linear Meter', nameAr: 'بالمتر الطولي' },
      { code: 'lift', nameEn: 'Per Lift', nameAr: 'بالرفعة' },
      { code: 'move', nameEn: 'Per Container Move', nameAr: 'بحركة كونتينر' },
      { code: 'document', nameEn: 'Per Document', nameAr: 'بالمستند' },
      { code: 'declaration', nameEn: 'Per Customs Declaration', nameAr: 'بالبيان الجمركي' },
      { code: 'form', nameEn: 'Per Form', nameAr: 'بالاستمارة' },
      { code: 'manifest', nameEn: 'Per Manifest', nameAr: 'بالمانيفست' },
      { code: 'telex_release', nameEn: 'Per Telex Release', nameAr: 'بإشعار التيكس ريليز' },
      { code: 'amendment', nameEn: 'Per Amendment', nameAr: 'بالتعديل' },
      { code: 'visit', nameEn: 'Per Visit', nameAr: 'بالزيارة' },
      { code: 'lumpsum', nameEn: 'Lump Sum', nameAr: 'مقطوع (دفعة واحدة)' },
      { code: 'percent', nameEn: 'Percentage (%)', nameAr: 'بالنسبة المئوية' },
      { code: 'month', nameEn: 'Per Month', nameAr: 'بالشهر' },
    ],`;

const patched = [...lines.slice(0, start), NEW_UNITS, ...lines.slice(end + 1)].join('\n');
fs.writeFileSync(file, patched, 'utf8');
console.log(`PATCHED: units block (lines ${start + 1}..${end + 1}) → 33 comprehensive units`);
