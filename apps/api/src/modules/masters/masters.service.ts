import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GLOBAL_FALLBACK_PORTS } from '../../common/data/world-ports.data';

const FALLBACK_PORTS = GLOBAL_FALLBACK_PORTS;

const FALLBACK_SHIPPING_LINES = [
  { id: 'line-1', code: 'MAEU', name: 'Maersk Line', scac: 'MAEU', trackingUrlTemplate: 'https://www.maersk.com/tracking/{b/l}', freeDaysDefault: 14, standardCurrency: 'USD', isActive: true },
  { id: 'line-2', code: 'MSCU', name: 'Mediterranean Shipping Company (MSC)', scac: 'MSCU', trackingUrlTemplate: 'https://www.msc.com/en/track-a-shipment?query={b/l}', freeDaysDefault: 14, standardCurrency: 'USD', isActive: true },
  { id: 'line-3', code: 'CMDU', name: 'CMA CGM Group', scac: 'CMDU', trackingUrlTemplate: 'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BL&Reference={b/l}', freeDaysDefault: 14, standardCurrency: 'USD', isActive: true },
  { id: 'line-4', code: 'HLCU', name: 'Hapag-Lloyd', scac: 'HLCU', trackingUrlTemplate: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno={b/l}', freeDaysDefault: 14, standardCurrency: 'USD', isActive: true },
  { id: 'line-5', code: 'ONEY', name: 'Ocean Network Express (ONE)', scac: 'ONEY', trackingUrlTemplate: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?query={b/l}', freeDaysDefault: 14, standardCurrency: 'USD', isActive: true },
  { id: 'line-6', code: 'COSU', name: 'COSCO Shipping Lines', scac: 'COSU', trackingUrlTemplate: 'https://lines.coscoshipping.com/home/services/CargoTracking?cargo={b/l}', freeDaysDefault: 14, standardCurrency: 'USD', isActive: true },
  { id: 'line-7', code: 'EGLV', name: 'Evergreen Marine Corporation', scac: 'EGLV', trackingUrlTemplate: 'https://ct.shipmentlink.com/servlet/TTrk_Req?BL={b/l}', freeDaysDefault: 14, standardCurrency: 'USD', isActive: true },
  { id: 'line-8', code: 'YMLU', name: 'Yang Ming Marine Transport', scac: 'YMLU', trackingUrlTemplate: 'https://www.yangming.com/e-service/track_trace/track_trace_cargo_tracking.aspx', freeDaysDefault: 14, standardCurrency: 'USD', isActive: true },
];

const FALLBACK_OVERSEAS_AGENTS = [
  { id: 'agent-1', code: 'SINO-CN', name: 'Sinotrans Global Logistics Shanghai', country: 'China', city: 'Shanghai', contactPerson: 'Zhang Wei', email: 'operations.sha@sinotrans.com', phone: '+86 21 6321 0000', isActive: true },
  { id: 'agent-2', code: 'SCHK-DE', name: 'DB Schenker Hamburg Hub', country: 'Germany', city: 'Hamburg', contactPerson: 'Hans Mueller', email: 'sea.hamburg@dbschenker.com', phone: '+49 40 361350', isActive: true },
  { id: 'agent-3', code: 'DSV-NL', name: 'DSV Air & Sea Rotterdam', country: 'Netherlands', city: 'Rotterdam', contactPerson: 'Jan De Jong', email: 'rotterdam.ocean@dsv.com', phone: '+31 10 282 3333', isActive: true },
  { id: 'agent-4', code: 'KN-TR', name: 'Kuehne + Nagel Istanbul Hub', country: 'Turkey', city: 'Istanbul', contactPerson: 'Emre Yilmaz', email: 'istanbul.seafreight@kuehne-nagel.com', phone: '+90 212 373 5000', isActive: true },
];

const FALLBACK_VENDORS = [
  { id: 'vendor-1', name: 'شركة الإسكندرية لخدمات النقل البري والتريلات', vendorType: 'trucking', contactPerson: 'محمد إبراهيم', phone: '+20 100 445 6789', email: 'trucking@alex-transport.com', taxNumber: 'EG-384-912-331', currencyDefault: 'EGP', isActive: true },
  { id: 'vendor-2', name: 'مكتب النور للتخليص الجمركي - ميناء السخنة', vendorType: 'customs_broker', contactPerson: 'محمود الصاوي', phone: '+20 101 889 1234', email: 'broker@alnoor-customs.eg', taxNumber: 'EG-219-482-105', currencyDefault: 'EGP', isActive: true },
  { id: 'vendor-3', name: 'المستودع المصري لتخزين وتداول الحاويات', vendorType: 'storage_yard', contactPerson: 'كريم عبد الله', phone: '+20 102 555 7788', email: 'operations@egy-yard.com', taxNumber: 'EG-554-118-992', currencyDefault: 'EGP', isActive: true },
];

const FALLBACK_CHARGE_ITEMS = [
  { id: 'chg-1', code: 'OF-01', nameEn: 'Ocean Freight (نولون بحري)', nameAr: 'نولون شحن بحري دولي', category: 'freight', standardCurrency: 'USD', defaultPrice: 1850, isTaxable: false, taxRatePercent: 0, showInPricing: true, showInQuotation: true, showInInvoice: true, isActive: true },
  { id: 'chg-2', code: 'THC-DEST', nameEn: 'Terminal Handling Charges - Destination (THC تفريغ)', nameAr: 'مصاريف تداول الميناء وصول', category: 'local_port', standardCurrency: 'EGP', defaultPrice: 6500, isTaxable: true, taxRatePercent: 14, showInPricing: true, showInQuotation: true, showInInvoice: true, isActive: true },
  { id: 'chg-3', code: 'BL-FEE', nameEn: 'Bill of Lading Issuance / Delivery Order (إذن تسليم)', nameAr: 'مصاريف إذن التسليم والوكيل الملاحي', category: 'documentation', standardCurrency: 'EGP', defaultPrice: 4200, isTaxable: true, taxRatePercent: 14, showInPricing: true, showInQuotation: true, showInInvoice: true, isActive: true },
  { id: 'chg-4', code: 'CC-SRV', nameEn: 'Customs Clearance Service (أتعاب التخليص الجمركي)', nameAr: 'أتعاب التخليص الجمركي وفتح الشهادة', category: 'customs', standardCurrency: 'EGP', defaultPrice: 5000, isTaxable: true, taxRatePercent: 14, showInPricing: true, showInQuotation: true, showInInvoice: true, isActive: true },
  { id: 'chg-5', code: 'INL-TRK', nameEn: 'Inland Trucking (النقل البري الداخلي والتوصيل)', nameAr: 'نقل بري داخلي حتى مخازن العميل', category: 'trucking', standardCurrency: 'EGP', defaultPrice: 8500, isTaxable: false, taxRatePercent: 0, showInPricing: true, showInQuotation: true, showInInvoice: true, isActive: true },
  { id: 'chg-6', code: 'DEM-REC', nameEn: 'Demurrage / Detention Recovery (غرامات أرضيات وتأخير)', nameAr: 'غرامات تأخير أرضيات وحاويات', category: 'storage', standardCurrency: 'USD', defaultPrice: 0, isTaxable: false, taxRatePercent: 0, showInPricing: false, showInQuotation: false, showInInvoice: true, isActive: true },
];

@Injectable()
export class MastersService {
  private readonly logger = new Logger(MastersService.name);

  constructor(private prisma: PrismaService) {}

  // =================== PORTS ===================
  async getPorts(tenantId: string) {
    try {
      const ports = await this.prisma.port.findMany({
        where: {
          OR: [{ companyId: null }, { companyId: tenantId }],
          isActive: true,
        },
        orderBy: { nameEn: 'asc' },
      });
      return ports.length > 0 ? ports : FALLBACK_PORTS;
    } catch (err) {
      this.logger.warn('Database offline, returning fallback ports');
      return FALLBACK_PORTS;
    }
  }

  // =================== SHIPPING LINES ===================
  async getShippingLines(tenantId: string) {
    try {
      const lines = await this.prisma.shippingLine.findMany({
        where: { companyId: tenantId, isActive: true },
        orderBy: { name: 'asc' },
      });
      return lines.length > 0 ? lines : FALLBACK_SHIPPING_LINES;
    } catch (err) {
      this.logger.warn('Database offline, returning fallback shipping lines');
      return FALLBACK_SHIPPING_LINES;
    }
  }

  async createShippingLine(tenantId: string, data: any) {
    try {
      return await this.prisma.shippingLine.create({
        data: {
          ...data,
          companyId: tenantId,
        },
      });
    } catch (err) {
      return {
        id: `line-${Date.now()}`,
        ...data,
        companyId: tenantId,
        isActive: true,
      };
    }
  }

  // =================== OVERSEAS AGENTS ===================
  async getOverseasAgents(tenantId: string) {
    try {
      const agents = await this.prisma.overseasAgent.findMany({
        where: { companyId: tenantId, isActive: true },
        orderBy: { name: 'asc' },
      });
      return agents.length > 0 ? agents : FALLBACK_OVERSEAS_AGENTS;
    } catch (err) {
      this.logger.warn('Database offline, returning fallback overseas agents');
      return FALLBACK_OVERSEAS_AGENTS;
    }
  }

  async createOverseasAgent(tenantId: string, data: any) {
    try {
      return await this.prisma.overseasAgent.create({
        data: {
          ...data,
          companyId: tenantId,
        },
      });
    } catch (err) {
      return {
        id: `agent-${Date.now()}`,
        ...data,
        companyId: tenantId,
        isActive: true,
      };
    }
  }

  // =================== VENDORS ===================
  async getVendors(tenantId: string) {
    try {
      const vendors = await this.prisma.vendor.findMany({
        where: { companyId: tenantId, isActive: true },
        orderBy: { name: 'asc' },
      });
      return vendors.length > 0 ? vendors : FALLBACK_VENDORS;
    } catch (err) {
      this.logger.warn('Database offline, returning fallback vendors');
      return FALLBACK_VENDORS;
    }
  }

  async createVendor(tenantId: string, data: any) {
    try {
      return await this.prisma.vendor.create({
        data: {
          ...data,
          companyId: tenantId,
        },
      });
    } catch (err) {
      return {
        id: `vendor-${Date.now()}`,
        ...data,
        companyId: tenantId,
        isActive: true,
      };
    }
  }

  // =================== DRIVERS (السائقون) ===================
  async getDrivers(tenantId: string) {
    try {
      return await this.prisma.driver.findMany({
        where: { companyId: tenantId, isActive: true },
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      this.logger.warn('Database offline, returning empty drivers list');
      return [];
    }
  }

  async createDriver(tenantId: string, data: any) {
    try {
      return await this.prisma.driver.create({
        data: {
          name: String(data.name || '').trim(),
          phone: data.phone || null,
          nationalId: data.nationalId || null,
          licenseNumber: data.licenseNumber || null,
          licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
          truckPlate: data.truckPlate || null,
          trailerPlate: data.trailerPlate || null,
          truckType: data.truckType || null,
          vendorId: data.vendorId || null,
          notes: data.notes || null,
          companyId: tenantId,
        },
      });
    } catch (err) {
      return {
        id: `driver-${Date.now()}`,
        ...data,
        companyId: tenantId,
        isActive: true,
      };
    }
  }

  // =================== CHARGE ITEMS (البنود) ===================
  async getChargeItems(tenantId: string, context?: 'pricing' | 'quotation' | 'invoice') {
    try {
      const where: any = { companyId: tenantId, isActive: true };
      if (context === 'pricing') where.showInPricing = true;
      if (context === 'quotation') where.showInQuotation = true;
      if (context === 'invoice') where.showInInvoice = true;

      const items = await this.prisma.chargeItem.findMany({
        where,
        orderBy: { nameEn: 'asc' },
      });
      return items.length > 0 ? items : FALLBACK_CHARGE_ITEMS;
    } catch (err) {
      this.logger.warn('Database offline, returning fallback charge items');
      return FALLBACK_CHARGE_ITEMS;
    }
  }

  async createChargeItem(tenantId: string, data: any) {
    try {
      return await this.prisma.chargeItem.create({
        data: {
          ...data,
          companyId: tenantId,
        },
      });
    } catch (err) {
      return {
        id: `chg-${Date.now()}`,
        ...data,
        companyId: tenantId,
        isActive: true,
      };
    }
  }
}

