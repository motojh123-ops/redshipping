import { Injectable } from '@nestjs/common';
import {
  PortDefinition,
  TradeCorridor,
  CountryDefinition,
  ContainerIsoValidationResult,
  CurrencyDefinition,
} from '@banna/shared-types';
import { getDistance } from 'geolib';
import { GLOBAL_PORTS_MAP } from '../common/data/world-ports.data';

// Lazy-require or require world-countries and i18n
const worldCountries = require('world-countries');
const i18nIso = require('i18n-iso-countries');
try {
  i18nIso.registerLocale(require('i18n-iso-countries/langs/ar.json'));
  i18nIso.registerLocale(require('i18n-iso-countries/langs/en.json'));
} catch (err) {
  // Locale already registered or loaded
}

@Injectable()
export class MaritimeService {
  private cachedCountries: CountryDefinition[] | null = null;

  /* ====================================================================
     1. GLOBAL & REGIONAL PORTS, DRY PORTS, AND LAND BORDER CROSSINGS
     ==================================================================== */
  private readonly ports: Record<string, PortDefinition> = {
    // ─── EGYPT SEAPORTS ───
    EGALY: {
      unlocode: 'EGALY',
      name: 'Port of Alexandria',
      nameAr: 'ميناء الإسكندرية البحري',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Alexandria',
      region: 'North Africa',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 31.1873, lng: 29.8654 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['Alexandria Container Terminal (ACHT)', 'Tahya Misr Multipurpose Terminal (TMT)'],
      customsAuthorityCode: 'EG-CUST-ALY-01',
      timeZone: 'Africa/Cairo',
    },
    EGEDK: {
      unlocode: 'EGEDK',
      name: 'El Dekheila Port',
      nameAr: 'ميناء الدخيلة البحري',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Alexandria',
      region: 'North Africa',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 31.1354, lng: 29.8056 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['Dekheila Container Terminal (ACHT)'],
      customsAuthorityCode: 'EG-CUST-EDK-02',
      timeZone: 'Africa/Cairo',
    },
    EGDAM: {
      unlocode: 'EGDAM',
      name: 'Port of Damietta',
      nameAr: 'ميناء دمياط البحري',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Damietta',
      region: 'North Africa',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 31.4727, lng: 31.7644 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['Damietta Container & Cargo Handling (DCHC)', 'Damietta Alliance (Hapag-Lloyd)'],
      customsAuthorityCode: 'EG-CUST-DAM-03',
      timeZone: 'Africa/Cairo',
    },
    EGPSD: {
      unlocode: 'EGPSD',
      name: 'Port Said West',
      nameAr: 'ميناء غرب بورسعيد',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Port Said',
      region: 'North Africa',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 31.2653, lng: 32.3019 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['Port Said Container Terminal (PSCCHC)'],
      customsAuthorityCode: 'EG-CUST-PSD-04',
      timeZone: 'Africa/Cairo',
    },
    EGPSE: {
      unlocode: 'EGPSE',
      name: 'Port Said East (SCCT)',
      nameAr: 'ميناء شرق بورسعيد (محطة قناة السويس للحاويات)',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Port Said',
      region: 'North Africa',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 31.2333, lng: 32.3333 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['Suez Canal Container Terminal (SCCT - APM Terminals)'],
      customsAuthorityCode: 'EG-CUST-PSE-05',
      timeZone: 'Africa/Cairo',
    },
    EGSKX: {
      unlocode: 'EGSKX',
      name: 'Ain Sokhna Port',
      nameAr: 'ميناء العين السخنة',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Suez',
      region: 'Red Sea',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 29.6053, lng: 32.3484 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['DP World Sokhna Terminal 1 & 2', 'CMA CGM Basin 2'],
      customsAuthorityCode: 'EG-CUST-SKX-06',
      timeZone: 'Africa/Cairo',
    },
    EGADB: {
      unlocode: 'EGADB',
      name: 'Adabiya Port',
      nameAr: 'ميناء الأدبية',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Suez',
      region: 'Red Sea',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 29.8569, lng: 32.4764 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['Adabiya General Cargo & Container Berths'],
      customsAuthorityCode: 'EG-CUST-ADB-07',
      timeZone: 'Africa/Cairo',
    },
    EGSFG: {
      unlocode: 'EGSFG',
      name: 'Safaga Port',
      nameAr: 'ميناء سفاجا البحري',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Safaga',
      region: 'Red Sea',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 26.7456, lng: 33.9389 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['Safaga Multipurpose Terminal (AD Ports Group)'],
      customsAuthorityCode: 'EG-CUST-SFG-08',
      timeZone: 'Africa/Cairo',
    },
    EGNWB: {
      unlocode: 'EGNWB',
      name: 'Nuweiba Port',
      nameAr: 'ميناء نويبع البحري (الربط مع العقبة والأردن)',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Nuweiba',
      region: 'Sinai / Gulf of Aqaba',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 28.9719, lng: 34.6547 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['Arab Bridge Maritime Ro-Ro Terminal'],
      customsAuthorityCode: 'EG-CUST-NWB-09',
      timeZone: 'Africa/Cairo',
    },
    EGSUZ: {
      unlocode: 'EGSUZ',
      name: 'Port of Suez / Port Tawfiq',
      nameAr: 'ميناء السويس / بور توفيق',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Suez',
      region: 'Red Sea',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 29.9542, lng: 32.5594 },
      portType: 'sea',
      isDryPort: false,
      terminals: ['Port Tawfiq Passenger & Cargo Terminal'],
      customsAuthorityCode: 'EG-CUST-SUZ-10',
      timeZone: 'Africa/Cairo',
    },

    // ─── EGYPT INLAND DRY PORTS (الموانئ الجافة) ───
    EGDOC: {
      unlocode: 'EGDOC',
      name: '6th of October Dry Port (ODP)',
      nameAr: 'ميناء السادس من أكتوبر الجاف (أول ميناء جاف في مصر)',
      country: 'Egypt',
      countryCode: 'EG',
      city: '6th of October City',
      region: 'Greater Cairo',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 29.9881, lng: 30.8417 },
      portType: 'dry',
      isDryPort: true,
      terminals: ['ODP Inland Container Logistics Terminal', 'Customs Clearance Depot'],
      customsAuthorityCode: 'EG-CUST-ODP-11',
      timeZone: 'Africa/Cairo',
    },
    EGTRD: {
      unlocode: 'EGTRD',
      name: '10th of Ramadan Dry Port',
      nameAr: 'ميناء العاشر من رمضان الجاف والمركز اللوجستي',
      country: 'Egypt',
      countryCode: 'EG',
      city: '10th of Ramadan',
      region: 'Sharkia',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 30.2981, lng: 31.7417 },
      portType: 'dry',
      isDryPort: true,
      terminals: ['Ramadan Dry Port Logistics Center', 'Rail Cargo Yard'],
      customsAuthorityCode: 'EG-CUST-TRD-12',
      timeZone: 'Africa/Cairo',
    },
    EGSAT: {
      unlocode: 'EGSAT',
      name: 'Sadat City Dry Port',
      nameAr: 'ميناء السادات الجاف',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Sadat City',
      region: 'Menoufia',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 30.3800, lng: 30.5200 },
      portType: 'dry',
      isDryPort: true,
      terminals: ['Sadat Inland Hub'],
      customsAuthorityCode: 'EG-CUST-SAT-13',
      timeZone: 'Africa/Cairo',
    },
    EGKAR: {
      unlocode: 'EGKAR',
      name: 'Kom Abu Radi Dry Port (Beni Suef)',
      nameAr: 'ميناء كوم أبو راضي الجاف (بني سويف)',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Beni Suef',
      region: 'Upper Egypt',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 29.1300, lng: 31.1200 },
      portType: 'dry',
      isDryPort: true,
      terminals: ['Upper Egypt Logistics Hub'],
      customsAuthorityCode: 'EG-CUST-KAR-14',
      timeZone: 'Africa/Cairo',
    },
    EGSOH: {
      unlocode: 'EGSOH',
      name: 'Sohag Dry Port',
      nameAr: 'ميناء سوهاج الجاف',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Sohag',
      region: 'Upper Egypt',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 26.5500, lng: 31.6900 },
      portType: 'dry',
      isDryPort: true,
      terminals: ['Sohag Inland Terminal'],
      customsAuthorityCode: 'EG-CUST-SOH-15',
      timeZone: 'Africa/Cairo',
    },

    // ─── EGYPT & REGIONAL LAND BORDER CROSSINGS (المنافذ البرية الجمركية) ───
    EGSLM: {
      unlocode: 'EGSLM',
      name: 'Salloum Land Port (Egypt-Libya)',
      nameAr: 'منفذ السلوم البري الجمركي (الحدود المصرية الليبية)',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Salloum',
      region: 'Matrouh / North Africa',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 31.5458, lng: 25.1389 },
      portType: 'land_crossing',
      isDryPort: true,
      terminals: ['Salloum International Freight & Truck Terminal', 'Customs Clearing Yard'],
      customsAuthorityCode: 'EG-CUST-SLM-20',
      timeZone: 'Africa/Cairo',
    },
    EGQST: {
      unlocode: 'EGQST',
      name: 'Qustul Land Port (Egypt-Sudan East)',
      nameAr: 'منفذ قسطل البري (الحدود المصرية السودانية - شرق النيل)',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Abu Simbel / Aswan',
      region: 'Upper Egypt / Sudan Border',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 22.2514, lng: 31.6322 },
      portType: 'land_crossing',
      isDryPort: true,
      terminals: ['Qustul Commercial Cargo Crossing Yard'],
      customsAuthorityCode: 'EG-CUST-QST-21',
      timeZone: 'Africa/Cairo',
    },
    EGARQ: {
      unlocode: 'EGARQ',
      name: 'Arqeen Land Port (Egypt-Sudan West)',
      nameAr: 'منفذ أرقين البري (الحدود المصرية السودانية - طريق الإسكندرية كيب تاون)',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Aswan',
      region: 'Upper Egypt / Sudan Border',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 21.9961, lng: 31.2386 },
      portType: 'land_crossing',
      isDryPort: true,
      terminals: ['Arqeen Trans-African Highway Cargo Depot'],
      customsAuthorityCode: 'EG-CUST-ARQ-22',
      timeZone: 'Africa/Cairo',
    },
    EGTBA: {
      unlocode: 'EGTBA',
      name: 'Taba Land Port',
      nameAr: 'منفذ طابا البري',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Taba',
      region: 'Sinai / Gulf of Aqaba',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 29.4939, lng: 34.8967 },
      portType: 'land_crossing',
      isDryPort: true,
      terminals: ['Taba Border Cargo & Customs Station'],
      customsAuthorityCode: 'EG-CUST-TBA-23',
      timeZone: 'Africa/Cairo',
    },
    EGRAF: {
      unlocode: 'EGRAF',
      name: 'Rafah Land Port',
      nameAr: 'منفذ رفح البري التجاري',
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Rafah',
      region: 'North Sinai',
      flagEmoji: '🇪🇬',
      coordinates: { lat: 31.2467, lng: 34.2567 },
      portType: 'land_crossing',
      isDryPort: true,
      terminals: ['Rafah Commercial Aid & Goods Terminal'],
      customsAuthorityCode: 'EG-CUST-RAF-24',
      timeZone: 'Africa/Cairo',
    },

    // ─── ARAB GULF & MIDDLE EAST SEAPORTS & LAND PORTS ───
    AEJEA: {
      unlocode: 'AEJEA',
      name: 'Jebel Ali Port',
      nameAr: 'ميناء جبل علي (دبي)',
      country: 'United Arab Emirates',
      countryCode: 'AE',
      city: 'Dubai',
      region: 'Arabian Gulf',
      flagEmoji: '🇦🇪',
      coordinates: { lat: 24.9857, lng: 55.0273 },
      portType: 'sea',
      terminals: ['DP World Jebel Ali Terminal 1, 2, 3, 4'],
      timeZone: 'Asia/Dubai',
    },
    AEKHL: {
      unlocode: 'AEKHL',
      name: 'Khalifa Port Abu Dhabi',
      nameAr: 'ميناء خليفة (أبوظبي)',
      country: 'United Arab Emirates',
      countryCode: 'AE',
      city: 'Abu Dhabi',
      region: 'Arabian Gulf',
      flagEmoji: '🇦🇪',
      coordinates: { lat: 24.8167, lng: 54.6500 },
      portType: 'sea',
      terminals: ['CSP Abu Dhabi (COSCO)', 'CMA Terminals Khalifa'],
      timeZone: 'Asia/Dubai',
    },
    SAJED: {
      unlocode: 'SAJED',
      name: 'Jeddah Islamic Port',
      nameAr: 'ميناء جدة الإسلامي',
      country: 'Saudi Arabia',
      countryCode: 'SA',
      city: 'Jeddah',
      region: 'Red Sea',
      flagEmoji: '🇸🇦',
      coordinates: { lat: 21.4650, lng: 39.1633 },
      portType: 'sea',
      terminals: ['Red Sea Gateway Terminal (RSGT)', 'DP World Middle East (South Container)'],
      timeZone: 'Asia/Riyadh',
    },
    SAKAD: {
      unlocode: 'SAKAD',
      name: 'King Abdulaziz Port Dammam',
      nameAr: 'ميناء الملك عبد العزيز بالدمام',
      country: 'Saudi Arabia',
      countryCode: 'SA',
      city: 'Dammam',
      region: 'Arabian Gulf',
      flagEmoji: '🇸🇦',
      coordinates: { lat: 26.4667, lng: 50.1833 },
      portType: 'sea',
      terminals: ['Saudi Global Ports (SGP Terminal 1 & 2)'],
      timeZone: 'Asia/Riyadh',
    },
    SAKAP: {
      unlocode: 'SAKAP',
      name: 'King Abdullah Port (KAEC)',
      nameAr: 'ميناء الملك عبدالله (مدينة الملك عبدالله الاقتصادية)',
      country: 'Saudi Arabia',
      countryCode: 'SA',
      city: 'Rabigh',
      region: 'Red Sea',
      flagEmoji: '🇸🇦',
      coordinates: { lat: 22.5100, lng: 39.0800 },
      portType: 'sea',
      terminals: ['KAP Deep Water Container Terminal'],
      timeZone: 'Asia/Riyadh',
    },
    SAHDT: {
      unlocode: 'SAHDT',
      name: 'Al-Haditha Land Port (Saudi-Jordan)',
      nameAr: 'منفذ الحديثة البري (الحدود السعودية الأردنية)',
      country: 'Saudi Arabia',
      countryCode: 'SA',
      city: 'Al-Qurayyat',
      region: 'Northern Borders',
      flagEmoji: '🇸🇦',
      coordinates: { lat: 31.4883, lng: 37.1267 },
      portType: 'land_crossing',
      isDryPort: true,
      terminals: ['Haditha TIR Customs Cargo Yard'],
      timeZone: 'Asia/Riyadh',
    },
    SABTH: {
      unlocode: 'SABTH',
      name: 'Al-Batha Land Port (Saudi-UAE)',
      nameAr: 'منفذ البطحاء البري (الحدود السعودية الإماراتية)',
      country: 'Saudi Arabia',
      countryCode: 'SA',
      city: 'Al-Batha',
      region: 'Eastern Province',
      flagEmoji: '🇸🇦',
      coordinates: { lat: 24.1350, lng: 51.5833 },
      portType: 'land_crossing',
      isDryPort: true,
      terminals: ['Batha Commercial Truck Clearance Station'],
      timeZone: 'Asia/Riyadh',
    },
    SAKFC: {
      unlocode: 'SAKFC',
      name: 'King Fahd Causeway (Saudi-Bahrain)',
      nameAr: 'جسر الملك فهد التجاري (السعودية - البحرين)',
      country: 'Saudi Arabia',
      countryCode: 'SA',
      city: 'Khobar / Manama',
      region: 'Arabian Gulf',
      flagEmoji: '🇸🇦',
      coordinates: { lat: 26.1833, lng: 50.3167 },
      portType: 'land_crossing',
      isDryPort: true,
      terminals: ['Causeway Commercial Cargo Inspection Yard'],
      timeZone: 'Asia/Riyadh',
    },
    QAHMD: {
      unlocode: 'QAHMD',
      name: 'Hamad Port',
      nameAr: 'ميناء حمد الدولي (قطر)',
      country: 'Qatar',
      countryCode: 'QA',
      city: 'Umm Al Houl',
      region: 'Arabian Gulf',
      flagEmoji: '🇶🇦',
      coordinates: { lat: 25.0167, lng: 51.6000 },
      portType: 'sea',
      terminals: ['QTerminals Container Terminal 1 & 2'],
      timeZone: 'Asia/Qatar',
    },
    KWSWK: {
      unlocode: 'KWSWK',
      name: 'Shuwaikh Port',
      nameAr: 'ميناء الشويخ (الكويت)',
      country: 'Kuwait',
      countryCode: 'KW',
      city: 'Kuwait City',
      region: 'Arabian Gulf',
      flagEmoji: '🇰🇼',
      coordinates: { lat: 29.3500, lng: 47.9167 },
      portType: 'sea',
      terminals: ['Shuwaikh Container Berths'],
      timeZone: 'Asia/Kuwait',
    },
    OMSOH: {
      unlocode: 'OMSOH',
      name: 'Sohar Port',
      nameAr: 'ميناء صحار الصناعي',
      country: 'Oman',
      countryCode: 'OM',
      city: 'Sohar',
      region: 'Gulf of Oman',
      flagEmoji: '🇴🇲',
      coordinates: { lat: 24.5000, lng: 56.6333 },
      portType: 'sea',
      terminals: ['Oman Container Terminal (OICT - Hutchison)'],
      timeZone: 'Asia/Muscat',
    },
    OMSLL: {
      unlocode: 'OMSLL',
      name: 'Port of Salalah',
      nameAr: 'ميناء صلالة الدولي',
      country: 'Oman',
      countryCode: 'OM',
      city: 'Salalah',
      region: 'Arabian Sea',
      flagEmoji: '🇴🇲',
      coordinates: { lat: 16.9500, lng: 54.0000 },
      portType: 'sea',
      terminals: ['Salalah Container Terminal (APM Terminals)'],
      timeZone: 'Asia/Muscat',
    },
    JOAQB: {
      unlocode: 'JOAQB',
      name: 'Port of Aqaba',
      nameAr: 'ميناء العقبة (الأردن)',
      country: 'Jordan',
      countryCode: 'JO',
      city: 'Aqaba',
      region: 'Gulf of Aqaba',
      flagEmoji: '🇯🇴',
      coordinates: { lat: 29.5167, lng: 35.0000 },
      portType: 'sea',
      terminals: ['Aqaba Container Terminal (ACT - APM Terminals)'],
      timeZone: 'Asia/Amman',
    },
    LBBEY: {
      unlocode: 'LBBEY',
      name: 'Port of Beirut',
      nameAr: 'ميناء بيروت',
      country: 'Lebanon',
      countryCode: 'LB',
      city: 'Beirut',
      region: 'Eastern Mediterranean',
      flagEmoji: '🇱🇧',
      coordinates: { lat: 33.9000, lng: 35.5167 },
      portType: 'sea',
      terminals: ['Beirut Container Terminal Consortium (BCTC - CMA CGM)'],
      timeZone: 'Asia/Beirut',
    },
    MAPTM: {
      unlocode: 'MAPTM',
      name: 'Tanger Med Port',
      nameAr: 'ميناء طنجة المتوسط',
      country: 'Morocco',
      countryCode: 'MA',
      city: 'Tangier',
      region: 'Strait of Gibraltar',
      flagEmoji: '🇲🇦',
      coordinates: { lat: 35.8833, lng: -5.5000 },
      portType: 'sea',
      terminals: ['TC1 (APM Terminals)', 'TC2 (Eurogate)', 'TC3', 'TC4 (APM MedPort)'],
      timeZone: 'Africa/Casablanca',
    },

    // ─── CHINA & ASIA MEGA PORTS ───
    CNSGH: {
      unlocode: 'CNSGH',
      name: 'Port of Shanghai',
      nameAr: 'ميناء شانغهاي (أكبر ميناء حاويات في العالم)',
      country: 'China',
      countryCode: 'CN',
      city: 'Shanghai',
      region: 'East Asia',
      flagEmoji: '🇨🇳',
      coordinates: { lat: 30.6278, lng: 122.0644 },
      portType: 'sea',
      terminals: ['Yangshan Deepwater Terminal Phase 1-4', 'Waigaoqiao Container Terminal'],
      timeZone: 'Asia/Shanghai',
    },
    CNNGB: {
      unlocode: 'CNNGB',
      name: 'Ningbo-Zhoushan Port',
      nameAr: 'ميناء نينغبو تشوشان',
      country: 'China',
      countryCode: 'CN',
      city: 'Ningbo',
      region: 'East Asia',
      flagEmoji: '🇨🇳',
      coordinates: { lat: 29.8876, lng: 121.5790 },
      portType: 'sea',
      terminals: ['Beilun Container Terminal', 'Daxie Island Terminal', 'Meishan Island'],
      timeZone: 'Asia/Shanghai',
    },
    CNSZX: {
      unlocode: 'CNSZX',
      name: 'Shenzhen Port',
      nameAr: 'ميناء شنتشن (يشمل يانتيان وشيكو)',
      country: 'China',
      countryCode: 'CN',
      city: 'Shenzhen',
      region: 'East Asia',
      flagEmoji: '🇨🇳',
      coordinates: { lat: 22.5833, lng: 114.2833 },
      portType: 'sea',
      terminals: ['Yantian International Container Terminals (YICT)', 'Shekou Container Terminals (SCT)'],
      timeZone: 'Asia/Shanghai',
    },
    CNGZG: {
      unlocode: 'CNGZG',
      name: 'Guangzhou / Nansha Port',
      nameAr: 'ميناء غوانزو / نانشا',
      country: 'China',
      countryCode: 'CN',
      city: 'Guangzhou',
      region: 'East Asia',
      flagEmoji: '🇨🇳',
      coordinates: { lat: 22.7500, lng: 113.6000 },
      portType: 'sea',
      terminals: ['Nansha Container Terminal Phase 1-4'],
      timeZone: 'Asia/Shanghai',
    },
    CNTAO: {
      unlocode: 'CNTAO',
      name: 'Qingdao Port',
      nameAr: 'ميناء تشينغداو',
      country: 'China',
      countryCode: 'CN',
      city: 'Qingdao',
      region: 'East Asia',
      flagEmoji: '🇨🇳',
      coordinates: { lat: 36.0833, lng: 120.3167 },
      portType: 'sea',
      terminals: ['Qingdao Qianwan Container Terminal (QQCT)'],
      timeZone: 'Asia/Shanghai',
    },
    SGSIN: {
      unlocode: 'SGSIN',
      name: 'Port of Singapore',
      nameAr: 'ميناء سنغافورة العالمي',
      country: 'Singapore',
      countryCode: 'SG',
      city: 'Singapore',
      region: 'Southeast Asia',
      flagEmoji: '🇸🇬',
      coordinates: { lat: 1.2833, lng: 103.8500 },
      portType: 'sea',
      terminals: ['Tuas Mega Port', 'Pasir Panjang Terminal', 'Tanjong Pagar'],
      timeZone: 'Asia/Singapore',
    },
    MYPKG: {
      unlocode: 'MYPKG',
      name: 'Port Klang',
      nameAr: 'ميناء كلانج (ماليزيا)',
      country: 'Malaysia',
      countryCode: 'MY',
      city: 'Port Klang',
      region: 'Southeast Asia',
      flagEmoji: '🇲🇾',
      coordinates: { lat: 3.0000, lng: 101.4000 },
      portType: 'sea',
      terminals: ['Westports Malaysia', 'Northport'],
      timeZone: 'Asia/Kuala_Lumpur',
    },
    KRPUS: {
      unlocode: 'KRPUS',
      name: 'Port of Busan',
      nameAr: 'ميناء بوسان (كوريا الجنوبية)',
      country: 'South Korea',
      countryCode: 'KR',
      city: 'Busan',
      region: 'East Asia',
      flagEmoji: '🇰🇷',
      coordinates: { lat: 35.1000, lng: 129.0333 },
      portType: 'sea',
      terminals: ['Busan New Port', 'Pusan Newport Company (PNC)'],
      timeZone: 'Asia/Seoul',
    },
    INNSA: {
      unlocode: 'INNSA',
      name: 'Nhava Sheva (JNPT Mumbai)',
      nameAr: 'ميناء نهافا شيفا (مومباي - الهند)',
      country: 'India',
      countryCode: 'IN',
      city: 'Navi Mumbai',
      region: 'South Asia',
      flagEmoji: '🇮🇳',
      coordinates: { lat: 18.9500, lng: 72.9500 },
      portType: 'sea',
      terminals: ['Jawaharlal Nehru Port Trust', 'GTI (APM Terminals)', 'NSIGT (DP World)'],
      timeZone: 'Asia/Kolkata',
    },
    INMUN: {
      unlocode: 'INMUN',
      name: 'Mundra Port',
      nameAr: 'ميناء موندرا (أكبر ميناء خاص في الهند)',
      country: 'India',
      countryCode: 'IN',
      city: 'Gujarat',
      region: 'South Asia',
      flagEmoji: '🇮🇳',
      coordinates: { lat: 22.7500, lng: 69.7000 },
      portType: 'sea',
      terminals: ['Adani Ports Container Terminal 1-4'],
      timeZone: 'Asia/Kolkata',
    },

    // ─── EUROPEAN MEGA PORTS ───
    NLRTM: {
      unlocode: 'NLRTM',
      name: 'Port of Rotterdam',
      nameAr: 'ميناء روتردام (أكبر موانئ أوروبا)',
      country: 'Netherlands',
      countryCode: 'NL',
      city: 'Rotterdam',
      region: 'Northwest Europe',
      flagEmoji: '🇳🇱',
      coordinates: { lat: 51.9547, lng: 4.1287 },
      portType: 'sea',
      terminals: ['Maasvlakte 2 (APM Terminals)', 'Rotterdam World Gateway (RWG)', 'ECT Delta'],
      timeZone: 'Europe/Amsterdam',
    },
    BEANR: {
      unlocode: 'BEANR',
      name: 'Port of Antwerp-Bruges',
      nameAr: 'ميناء أنتويرب - بروج (بلجيكا)',
      country: 'Belgium',
      countryCode: 'BE',
      city: 'Antwerp',
      region: 'Northwest Europe',
      flagEmoji: '🇧🇪',
      coordinates: { lat: 51.2833, lng: 4.3167 },
      portType: 'sea',
      terminals: ['MPET (MSC PSA European Terminal)', 'Antwerp Gateway (DP World)'],
      timeZone: 'Europe/Brussels',
    },
    DEHAM: {
      unlocode: 'DEHAM',
      name: 'Port of Hamburg',
      nameAr: 'ميناء هامبورغ (ألمانيا)',
      country: 'Germany',
      countryCode: 'DE',
      city: 'Hamburg',
      region: 'Northern Europe',
      flagEmoji: '🇩🇪',
      coordinates: { lat: 53.5333, lng: 9.9667 },
      portType: 'sea',
      terminals: ['HHLA Container Terminal Altenwerder (CTA)', 'Eurogate Hamburg'],
      timeZone: 'Europe/Berlin',
    },
    ESVLC: {
      unlocode: 'ESVLC',
      name: 'Port of Valencia',
      nameAr: 'ميناء فالنسيا (إسبانيا)',
      country: 'Spain',
      countryCode: 'ES',
      city: 'Valencia',
      region: 'Western Mediterranean',
      flagEmoji: '🇪🇸',
      coordinates: { lat: 39.4500, lng: -0.3167 },
      portType: 'sea',
      terminals: ['Noatum Container Terminal', 'MSC Terminal Valencia', 'APM Terminals Valencia'],
      timeZone: 'Europe/Madrid',
    },
    GRPIR: {
      unlocode: 'GRPIR',
      name: 'Port of Piraeus',
      nameAr: 'ميناء بيريوس (اليونان - محور البحر المتوسط)',
      country: 'Greece',
      countryCode: 'GR',
      city: 'Athens / Piraeus',
      region: 'Eastern Mediterranean',
      flagEmoji: '🇬🇷',
      coordinates: { lat: 37.9333, lng: 23.6167 },
      portType: 'sea',
      terminals: ['Piraeus Container Terminal (PCT - COSCO Shipping Ports)'],
      timeZone: 'Europe/Athens',
    },
    ESALG: {
      unlocode: 'ESALG',
      name: 'Port of Algeciras',
      nameAr: 'ميناء الجزيرة الخضراء (ألخسيراس - إسبانيا)',
      country: 'Spain',
      countryCode: 'ES',
      city: 'Algeciras',
      region: 'Strait of Gibraltar',
      flagEmoji: '🇪🇸',
      coordinates: { lat: 36.1333, lng: -5.4333 },
      portType: 'sea',
      terminals: ['APM Terminals Algeciras', 'TTIA (Total Terminal International)'],
      timeZone: 'Europe/Madrid',
    },
    TRAMB: {
      unlocode: 'TRAMB',
      name: 'Ambarli Port (Istanbul)',
      nameAr: 'ميناء أمبارلي (إسطنبول - تركيا)',
      country: 'Turkey',
      countryCode: 'TR',
      city: 'Istanbul',
      region: 'Black Sea / Marmara',
      flagEmoji: '🇹🇷',
      coordinates: { lat: 40.9667, lng: 28.6833 },
      portType: 'sea',
      terminals: ['Marport Container Terminal', 'Kumport', 'Mardas'],
      timeZone: 'Europe/Istanbul',
    },

    // ─── AMERICAS & AFRICA ───
    USLAX: {
      unlocode: 'USLAX',
      name: 'Port of Los Angeles',
      nameAr: 'ميناء لوس أنجلوس (الولايات المتحدة)',
      country: 'United States',
      countryCode: 'US',
      city: 'Los Angeles',
      region: 'North America / Pacific',
      flagEmoji: '🇺🇸',
      coordinates: { lat: 33.7400, lng: -118.2600 },
      portType: 'sea',
      terminals: ['TraPac Container Terminal', 'Yusen Terminals', 'APM Terminals Pier 400'],
      timeZone: 'America/Los_Angeles',
    },
    USNYC: {
      unlocode: 'USNYC',
      name: 'Port of New York and New Jersey',
      nameAr: 'ميناء نيويورك ونيوجيرسي',
      country: 'United States',
      countryCode: 'US',
      city: 'New York',
      region: 'North America / Atlantic',
      flagEmoji: '🇺🇸',
      coordinates: { lat: 40.6667, lng: -74.1500 },
      portType: 'sea',
      terminals: ['Maher Terminals', 'APM Terminals Elizabeth', 'Port Newark Container Terminal'],
      timeZone: 'America/New_York',
    },
    BRSSZ: {
      unlocode: 'BRSSZ',
      name: 'Port of Santos',
      nameAr: 'ميناء سانتوس (أكبر ميناء في أمريكا الجنوبية - البرازيل)',
      country: 'Brazil',
      countryCode: 'BR',
      city: 'Santos / Sao Paulo',
      region: 'South America',
      flagEmoji: '🇧🇷',
      coordinates: { lat: -23.9500, lng: -46.3167 },
      portType: 'sea',
      terminals: ['Santos Brasil', 'BTP (Brasil Terminal Portuario)'],
      timeZone: 'America/Sao_Paulo',
    },
    ZADUR: {
      unlocode: 'ZADUR',
      name: 'Port of Durban',
      nameAr: 'ميناء ديربان (جنوب إفريقيا)',
      country: 'South Africa',
      countryCode: 'ZA',
      city: 'Durban',
      region: 'Southern Africa',
      flagEmoji: '🇿🇦',
      coordinates: { lat: -29.8667, lng: 31.0167 },
      portType: 'sea',
      terminals: ['Durban Container Terminal Pier 1 & Pier 2'],
      timeZone: 'Africa/Johannesburg',
    },
    KEMBA: {
      unlocode: 'KEMBA',
      name: 'Port of Mombasa',
      nameAr: 'ميناء مومباسا (بوابة شرق إفريقيا - كينيا)',
      country: 'Kenya',
      countryCode: 'KE',
      city: 'Mombasa',
      region: 'East Africa',
      flagEmoji: '🇰🇪',
      coordinates: { lat: -4.0500, lng: 39.6667 },
      portType: 'sea',
      terminals: ['KPA Container Terminal Berths 16-21'],
      timeZone: 'Africa/Nairobi',
    },
    DJJIB: {
      unlocode: 'DJJIB',
      name: 'Port of Djibouti / Doraleh',
      nameAr: 'ميناء جيبوتي / دوراليه (بوابة البحر الأحمر وإثيوبيا)',
      country: 'Djibouti',
      countryCode: 'DJ',
      city: 'Djibouti',
      region: 'Horn of Africa',
      flagEmoji: '🇩🇯',
      coordinates: { lat: 11.5833, lng: 43.1167 },
      portType: 'sea',
      terminals: ['Doraleh Container Terminal (SGTD)'],
      timeZone: 'Africa/Djibouti',
    },
  };

  /* ====================================================================
     2. INTERNATIONAL TRADE & OVERLAND FREIGHT CORRIDORS (الممرات البرية)
     ==================================================================== */
  private readonly tradeCorridors: TradeCorridor[] = [
    {
      id: 'cor-cairo-capetown',
      code: 'TAH-4',
      nameEn: 'Cairo–Cape Town Trans-African Highway',
      nameAr: 'ممر القاهرة - كيب تاون الإفريقي الدولي (TAH 4)',
      type: 'land',
      originCountry: 'Egypt',
      destinationCountry: 'South Africa',
      transitCountries: ['Egypt', 'Sudan', 'Ethiopia', 'Kenya', 'Tanzania', 'Zambia', 'Zimbabwe', 'Botswana', 'South Africa'],
      keyBorderCrossings: ['منفذ أرقين البري (مصر-السودان)', 'منفذ قسطل البري (مصر-السودان)', 'منفذ المتمة (السودان-إثيوبيا)', 'منفذ مويالي (إثيوبيا-كينيا)', 'نامانغا (كينيا-تنزانيا)'],
      totalDistanceKm: 10228,
      avgTransitDays: 16,
      status: 'active',
      descriptionAr: 'الشريان التجاري البري الأكبر الذي يربط شمال إفريقيا بالقرن الإفريقي والجنوب الإفريقي، ينطلق من ميناء الإسكندرية مروراً بالقاهرة وأسوان ومنفذي قسطل وأرقين حتى جنوب إفريقيا.',
    },
    {
      id: 'cor-mashreq-m40',
      code: 'ESCWA-M40',
      nameEn: 'Arab Mashreq Highway M40 (Iraq-Jordan-Egypt-Libya)',
      nameAr: 'طريق المشرق العربي الدولي M40 (العراق - الأردن - مصر - ليبيا)',
      type: 'land',
      originCountry: 'Iraq',
      destinationCountry: 'Libya',
      transitCountries: ['Iraq', 'Jordan', 'Egypt', 'Libya'],
      keyBorderCrossings: ['منفذ الكرامة / طريبيل (العراق-الأردن)', 'منفذ نويبع البحري / العقبة (الأردن-مصر)', 'منفذ السلوم البري الجمركي (مصر-ليبيا)', 'منفذ مساعد (ليبيا)'],
      totalDistanceKm: 3400,
      avgTransitDays: 5,
      status: 'active',
      descriptionAr: 'الممر التجاري العربي الشمالي المعتمد من لجنة إسكوا بالأمم المتحدة للشحن الدولي بنظام الترانزيت TIR، يربط بلاد الشام بمصر والمغرب العربي عبر منفذ السلوم البري.',
    },
    {
      id: 'cor-mashreq-m50',
      code: 'ESCWA-M50',
      nameEn: 'Arab Mashreq Highway M50 (Red Sea / Gulf Bridge Corridor)',
      nameAr: 'ممر الربط البري والبحري M50 (مصر - الأردن - السعودية - الخليج)',
      type: 'multimodal',
      originCountry: 'Egypt',
      destinationCountry: 'Saudi Arabia',
      transitCountries: ['Egypt', 'Jordan', 'Saudi Arabia', 'United Arab Emirates'],
      keyBorderCrossings: ['ميناء نويبع (مصر)', 'ميناء العقبة (الأردن)', 'منفذ الدرة / الحديثة (الأردن-السعودية)', 'منفذ البطحاء (السعودية-الإمارات)'],
      totalDistanceKm: 2850,
      avgTransitDays: 4,
      status: 'active',
      descriptionAr: 'أسرع ممر بري متعدد الوسائط لنقل البضائع الزراعية والصناعية من مصر إلى الأسواق السعودية والخليجية عبر العبارات الملاحية السريعة (نويبع-العقبة) ثم شبكة الطرق السريعة السعودية.',
    },
    {
      id: 'cor-gcc-freight',
      code: 'GCC-LOGIX',
      nameEn: 'GCC Inland Logistics & Freight Network',
      nameAr: 'شبكة الشحن والنقل البري لدول مجلس التعاون الخليجي',
      type: 'land',
      originCountry: 'Saudi Arabia',
      destinationCountry: 'Oman',
      transitCountries: ['Kuwait', 'Saudi Arabia', 'Bahrain', 'Qatar', 'United Arab Emirates', 'Oman'],
      keyBorderCrossings: ['منفذ الخفجي / النويصيب (الكويت-السعودية)', 'جسر الملك فهد (السعودية-البحرين)', 'منفذ سلوى (السعودية-قطر)', 'منفذ البطحاء (السعودية-الإمارات)', 'منفذ الوجاجة / حتا (الإمارات-عمان)'],
      totalDistanceKm: 2150,
      avgTransitDays: 3,
      status: 'active',
      descriptionAr: 'الممر اللوجستي الموحد لنقل الحاويات والشاحنات المبردة والجافة بين دول مجلس التعاون بنظام البيان الجمركي الخليجي الموحد ونظام الترانزيت البري.',
    },
    {
      id: 'cor-trans-maghreb',
      code: 'TMH-CORRIDOR',
      nameEn: 'Trans-Maghreb Transport Corridor',
      nameAr: 'الممر التجاري السيار المغاربي (مصر - ليبيا - تونس - الجزائر - المغرب)',
      type: 'land',
      originCountry: 'Egypt',
      destinationCountry: 'Morocco',
      transitCountries: ['Egypt', 'Libya', 'Tunisia', 'Algeria', 'Morocco'],
      keyBorderCrossings: ['منفذ السلوم / مساعد (مصر-ليبيا)', 'منفذ رأس جدير (ليبيا-تونس)', 'منفذ بوشبكة / ملولة (تونس-الجزائر)', 'منفذ العقيد لطفي (الجزائر-المغرب)'],
      totalDistanceKm: 4800,
      avgTransitDays: 8,
      status: 'restricted',
      descriptionAr: 'الممر الساحلي الشمال إفريقي الرابط بين الموانئ المصرية والموانئ المغاربية، يتيح النقل البري التبادلي للشاحنات عبر الطريق الساحلي الدولي.',
    },
    {
      id: 'cor-instc',
      code: 'INSTC-MULTI',
      nameEn: 'International North–South Transport Corridor (INSTC)',
      nameAr: 'ممر النقل الدولي شمال - جنوب (INSTC)',
      type: 'multimodal',
      originCountry: 'India',
      destinationCountry: 'Russia',
      transitCountries: ['India', 'Iran', 'Azerbaijan', 'Russia'],
      keyBorderCrossings: ['ميناء تشابهار / بندر عباس (إيران)', 'منفذ أستارا البري الجمركي (إيران-أذربيجان)', 'سامور (أذربيجان-روسيا)'],
      totalDistanceKm: 7200,
      avgTransitDays: 18,
      status: 'active',
      descriptionAr: 'ممر شحن متعدد الوسائط يربط موانئ الهند ومومباي بالخليج ثم إيران براً عبر السكك الحديدية والشاحنات إلى أذربيجان وروسيا وأوروبا الشرقية، مما يقلص زمن العبور بنسبة 40% مقارنة بقناة السويس.',
    },
    {
      id: 'cor-eurasian-bridge',
      code: 'BRI-LAND',
      nameEn: 'New Eurasian Land Bridge (Belt & Road Logistics Corridor)',
      nameAr: 'جسر الأرض الأوراسي الجديد (طريق الحرير البري لقطارات وشاحنات الشحن)',
      type: 'multimodal',
      originCountry: 'China',
      destinationCountry: 'Germany',
      transitCountries: ['China', 'Kazakhstan', 'Russia', 'Belarus', 'Poland', 'Germany'],
      keyBorderCrossings: ['منفذ هورغوس الجاف (الصين-كازاخستان)', 'دوستيك (كازاخستان-روسيا)', 'بريست / مالاشيفيتشي (بيلاروسيا-بولندا)'],
      totalDistanceKm: 11000,
      avgTransitDays: 14,
      status: 'active',
      descriptionAr: 'أضخم خط بري سككي لشحن الحاويات بين موانئ شنغهاي وشنتشن والمراكز اللوجستية في ألمانيا وأوروبا خلال 14 يوماً فقط.',
    },
  ];

  /* ====================================================================
     3. CURRENCIES & EXCHANGE RATES
     ==================================================================== */
  private readonly currencies: Record<string, CurrencyDefinition> = {
    USD: { code: 'USD', symbol: '$', name: 'US Dollar', nameAr: 'دولار أمريكي', rateToEgp: 48.75, rateToUsd: 1.0, decimals: 2, isBase: true },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', nameAr: 'يورو أوروبي', rateToEgp: 53.20, rateToUsd: 1.091, decimals: 2 },
    EGP: { code: 'EGP', symbol: 'EGP', name: 'Egyptian Pound', nameAr: 'جنيه مصري', rateToEgp: 1.0, rateToUsd: 0.0205, decimals: 2 },
    AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', rateToEgp: 13.28, rateToUsd: 0.272, decimals: 2 },
    SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', rateToEgp: 13.00, rateToUsd: 0.266, decimals: 2 },
    CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', nameAr: 'يوان صيني', rateToEgp: 6.89, rateToUsd: 0.141, decimals: 2 },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound', nameAr: 'جنيه إسترليني', rateToEgp: 62.50, rateToUsd: 1.282, decimals: 2 },
  };

  /* ====================================================================
     4. COUNTRIES SERVICE (250 COUNTRIES WITH ARABIC NAMES & FLAGS)
     ==================================================================== */
  getAllCountries(): CountryDefinition[] {
    if (this.cachedCountries) {
      return this.cachedCountries;
    }

    try {
      this.cachedCountries = (worldCountries as any[]).map((c: any) => {
        const cca2 = c.cca2 || '';
        const nameEn = c.name?.common || '';
        let nameAr = '';
        try {
          nameAr = i18nIso.getName(cca2, 'ar') || c.translations?.ara?.common || nameEn;
        } catch {
          nameAr = nameEn;
        }

        const currencies = c.currencies ? Object.keys(c.currencies) : [];
        const callingCode = c.idd?.root
          ? c.idd.root + (c.idd.suffixes && c.idd.suffixes.length === 1 ? c.idd.suffixes[0] : '')
          : '';

        return {
          cca2,
          cca3: c.cca3 || '',
          nameEn,
          nameAr,
          capital: c.capital && c.capital[0] ? c.capital[0] : '',
          region: c.region || '',
          subregion: c.subregion || '',
          currencies,
          callingCode,
          latlng: c.latlng || [0, 0],
          flagEmoji: c.flag || '',
        };
      });

      // Sort by Arabic name or commonly used countries first (Egypt, Saudi, UAE, China, etc.)
      const priorityCodes = ['EG', 'SA', 'AE', 'CN', 'US', 'DE', 'NL', 'TR', 'GB', 'IN', 'QA', 'KW', 'OM', 'JO', 'LB', 'MA', 'SD', 'LY'];
      this.cachedCountries.sort((a, b) => {
        const pA = priorityCodes.indexOf(a.cca2);
        const pB = priorityCodes.indexOf(b.cca2);
        if (pA !== -1 && pB !== -1) return pA - pB;
        if (pA !== -1) return -1;
        if (pB !== -1) return 1;
        return a.nameAr.localeCompare(b.nameAr, 'ar');
      });

      return this.cachedCountries;
    } catch (err) {
      return [];
    }
  }

  searchCountries(query?: string): CountryDefinition[] {
    const list = this.getAllCountries();
    if (!query || !query.trim()) return list;

    const q = query.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.nameAr.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.cca2.toLowerCase().includes(q) ||
        c.cca3.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q)
    );
  }

  /* ====================================================================
     5. PORTS SERVICE & SEARCH
     ==================================================================== */
  getAllPorts(query?: string, countryCode?: string, portType?: string): PortDefinition[] {
    const allPortsMap = { ...GLOBAL_PORTS_MAP, ...this.ports };
    let result = Object.values(allPortsMap);

    if (countryCode && countryCode !== 'all') {
      result = result.filter((p) => p.countryCode.toUpperCase() === countryCode.toUpperCase());
    }

    if (portType && portType !== 'all') {
      result = result.filter((p) => (p.portType || (p.isDryPort ? 'dry' : 'sea')) === portType);
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.unlocode.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.nameAr.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q) ||
          (p.city && p.city.toLowerCase().includes(q))
      );
    }

    return result;
  }

  getPortByUnlocode(code: string): PortDefinition | null {
    const allPortsMap = { ...GLOBAL_PORTS_MAP, ...this.ports };
    return allPortsMap[code.toUpperCase()] || null;
  }

  /* ====================================================================
     6. TRADE CORRIDORS SERVICE
     ==================================================================== */
  getTradeCorridors(type?: string): TradeCorridor[] {
    if (type && type !== 'all') {
      return this.tradeCorridors.filter((c) => c.type === type);
    }
    return this.tradeCorridors;
  }

  getTradeCorridorById(id: string): TradeCorridor | null {
    return this.tradeCorridors.find((c) => c.id === id || c.code === id) || null;
  }

  /* ====================================================================
     7. CURRENCIES & MARITIME DISTANCES
     ==================================================================== */
  getCurrencies(): CurrencyDefinition[] {
    return Object.values(this.currencies);
  }

  validateContainerNumber(containerNumber: string): ContainerIsoValidationResult {
    const clean = containerNumber.trim().toUpperCase().replace(/[\s-]/g, '');
    if (!clean || clean.length !== 11) {
      return { rawInput: containerNumber, isValid: false, errorMessage: 'Must be exactly 11 characters' };
    }

    const isoLetters: Record<string, number> = {
      A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
      K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
      U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
    };

    const owner = clean.slice(0, 3);
    const category = clean.slice(3, 4) as 'U' | 'J' | 'Z';
    const serial = clean.slice(4, 10);
    const check = parseInt(clean.slice(10, 11), 10);

    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const char = clean[i];
      const val = /[A-Z]/.test(char) ? isoLetters[char] || 0 : parseInt(char, 10);
      sum += val * Math.pow(2, i);
    }

    const remainder = sum % 11;
    const calculated = remainder === 10 ? 0 : remainder;
    const isValid = calculated === check;

    return {
      rawInput: containerNumber,
      isValid,
      ownerCode: owner,
      equipmentCategory: category,
      serialNumber: serial,
      checkDigit: check,
      calculatedCheckDigit: calculated,
      errorMessage: isValid ? undefined : `Invalid check digit: Given ${check}, calculated ${calculated}`,
    };
  }

  calculateSeaDistance(originCode: string, destCode: string): { nauticalMiles: number; transitDays: number } {
    const allPortsMap = { ...GLOBAL_PORTS_MAP, ...this.ports };
    const origin = allPortsMap[originCode.toUpperCase()];
    const dest = allPortsMap[destCode.toUpperCase()];

    if (!origin || !dest) {
      return { nauticalMiles: 0, transitDays: 0 };
    }

    const meters = getDistance(
      { latitude: origin.coordinates.lat, longitude: origin.coordinates.lng },
      { latitude: dest.coordinates.lat, longitude: dest.coordinates.lng }
    );
    const nauticalMiles = Math.round(meters / 1852);
    const transitDays = Math.ceil(nauticalMiles / (18 * 24));

    return { nauticalMiles, transitDays };
  }
}
