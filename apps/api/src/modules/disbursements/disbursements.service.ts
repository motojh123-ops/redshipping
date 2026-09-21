import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';

export interface DisbursementVoucher {
  id: string;
  voucherNumber: string;
  shipmentId: string;
  shipmentNumber: string;
  vendorName: string;
  vendorCategory: 'shipping_line' | 'trucking' | 'clearance' | 'overseas_agent' | 'port_authority';
  chargeItem: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'EGP';
  exchangeRate: number;
  amountEgp: number;
  paymentMethod: 'bank_transfer' | 'cheque' | 'petty_cash' | 'custody';
  treasury: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'rejected';
  requestDate: string;
  paymentDate?: string;
  receiptNumber?: string;
  notes?: string;
}

const INITIAL_VOUCHERS: DisbursementVoucher[] = [
  {
    id: '1',
    voucherNumber: 'PV-2026-0104',
    shipmentId: '1',
    shipmentNumber: 'SHP-2026-001',
    vendorName: 'MSC Mediterranean Shipping Co.',
    vendorCategory: 'shipping_line',
    chargeItem: 'نولون بحري دولي (Ocean Freight O/F - 2x 40HQ)',
    amount: 4600,
    currency: 'USD',
    exchangeRate: 48.75,
    amountEgp: 224250,
    paymentMethod: 'bank_transfer',
    treasury: 'البنك التجاري الدولي (CIB - USD)',
    requestedBy: 'أحمد الأمين (العمليات)',
    approvedBy: 'سامي كمال (المدير المالي)',
    status: 'paid',
    requestDate: '2026-09-12',
    paymentDate: '2026-09-14',
    receiptNumber: 'MSC-EG-99412',
    notes: 'سداد نولون الخط لإصدار إذن التسليم الملاحي Delivery Order D/O',
  },
  {
    id: '2',
    voucherNumber: 'PV-2026-0105',
    shipmentId: '1',
    shipmentNumber: 'SHP-2026-001',
    vendorName: 'شركة النيل للنقل الثقيل واللوجستيات',
    vendorCategory: 'trucking',
    chargeItem: 'نولون نقل بري (ميناء الدخيلة → العاشر من رمضان)',
    amount: 28000,
    currency: 'EGP',
    exchangeRate: 1,
    amountEgp: 28000,
    paymentMethod: 'cheque',
    treasury: 'البنك الأهلي المصري (NBE - EGP)',
    requestedBy: 'أحمد الأمين (العمليات)',
    approvedBy: 'سامي كمال (المدير المالي)',
    status: 'approved',
    requestDate: '2026-09-14',
    notes: 'شيك مؤجل الدفع 15 يوم طبقاً للاتفاق الائتماني المبرم مع الناقل',
  },
  {
    id: '3',
    voucherNumber: 'PV-2026-0106',
    shipmentId: '2',
    shipmentNumber: 'SHP-2026-002',
    vendorName: 'مكتب الرضوان للتخليص الجمركي',
    vendorCategory: 'clearance',
    chargeItem: 'مصاريف ولواحق تخليص جمركي ومناولة ساحات ونقابات',
    amount: 8500,
    currency: 'EGP',
    exchangeRate: 1,
    amountEgp: 8500,
    paymentMethod: 'petty_cash',
    treasury: 'خزينة الفرع الرئيسية (النقدية)',
    requestedBy: 'محمود طارق (التخليص)',
    status: 'pending_approval',
    requestDate: '2026-09-17',
    notes: 'عهدة نقدية عاجلة لإنهاء إجراءات لجنة الفحص المشترك بميناء الإسكندرية',
  },
  {
    id: '4',
    voucherNumber: 'PV-2026-0107',
    shipmentId: '3',
    shipmentNumber: 'SHP-2026-003',
    vendorName: 'هيئة ميناء دمياط (DPA)',
    vendorCategory: 'port_authority',
    chargeItem: 'رسوم تفريغ ورصيف وموازين (THC / Port Dues)',
    amount: 12400,
    currency: 'EGP',
    exchangeRate: 1,
    amountEgp: 12400,
    paymentMethod: 'custody',
    treasury: 'عهدة دمياط المستديمة',
    requestedBy: 'محمود طارق (التخليص)',
    approvedBy: 'سامي كمال (المدير المالي)',
    status: 'paid',
    requestDate: '2026-09-15',
    paymentDate: '2026-09-15',
    receiptNumber: 'DPA-E-99120',
    notes: 'سداد إلكتروني عبر منظومة الدفع الموحد لميناء دمياط',
  },
  {
    id: '5',
    voucherNumber: 'PV-2026-0108',
    shipmentId: '4',
    shipmentNumber: 'SHP-2026-004',
    vendorName: 'Apex Global Logistics Ningbo',
    vendorCategory: 'overseas_agent',
    chargeItem: 'أتعاب وكيل الخارج ومصاريف أصل (Origin Handling Charges)',
    amount: 1150,
    currency: 'USD',
    exchangeRate: 48.75,
    amountEgp: 56062.5,
    paymentMethod: 'bank_transfer',
    treasury: 'البنك التجاري الدولي (CIB - USD)',
    requestedBy: 'أحمد الأمين (العمليات)',
    status: 'draft',
    requestDate: '2026-09-18',
    notes: 'مطالبة وكيل نينغبو لإصدار بوالص الشحن BL الأصلية',
  },
];

@Injectable()
export class DisbursementsService {
  private readonly collectionKey = 'disbursements';

  constructor(private dataStore: DataStoreService) {}

  async findAll(tenantId: string, query?: { category?: string; status?: string; search?: string }) {
    let vouchers = await this.dataStore.getItems<DisbursementVoucher>(tenantId, this.collectionKey, INITIAL_VOUCHERS);

    if (query?.category && query.category !== 'all') {
      vouchers = vouchers.filter((v) => v.vendorCategory === query.category);
    }

    if (query?.status && query.status !== 'all') {
      vouchers = vouchers.filter((v) => v.status === query.status);
    }

    if (query?.search) {
      const q = query.search.toLowerCase();
      vouchers = vouchers.filter(
        (v) =>
          v.voucherNumber.toLowerCase().includes(q) ||
          v.vendorName.toLowerCase().includes(q) ||
          v.shipmentNumber.toLowerCase().includes(q) ||
          v.chargeItem.toLowerCase().includes(q),
      );
    }

    return vouchers;
  }

  async findOne(tenantId: string, id: string) {
    const voucher = await this.dataStore.getItemById<DisbursementVoucher>(tenantId, this.collectionKey, id);
    if (!voucher) {
      throw new NotFoundException(`Disbursement voucher with ID ${id} not found`);
    }
    return voucher;
  }

  async getStats(tenantId: string) {
    const vouchers = await this.dataStore.getItems<DisbursementVoucher>(tenantId, this.collectionKey, INITIAL_VOUCHERS);

    const totalPaidEgp = vouchers
      .filter((v) => v.status === 'paid')
      .reduce((sum, v) => sum + v.amountEgp, 0);

    const pendingApprovalCount = vouchers.filter((v) => v.status === 'pending_approval').length;

    const approvedUnpaidEgp = vouchers
      .filter((v) => v.status === 'approved')
      .reduce((sum, v) => sum + v.amountEgp, 0);

    const shippingLinesShareEgp = vouchers
      .filter((v) => v.vendorCategory === 'shipping_line')
      .reduce((sum, v) => sum + v.amountEgp, 0);

    return {
      totalPaidEgp,
      pendingApprovalCount,
      approvedUnpaidEgp,
      shippingLinesShareEgp,
      totalCount: vouchers.length,
    };
  }

  async create(tenantId: string, userId: string, data: any) {
    const vouchers = await this.dataStore.getItems<DisbursementVoucher>(tenantId, this.collectionKey, INITIAL_VOUCHERS);
    const count = vouchers.length + 104;
    const voucherNumber = `PV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const amount = Number(data.amount) || 0;
    const exchangeRate = Number(data.exchangeRate) || (data.currency === 'USD' ? 48.75 : data.currency === 'EUR' ? 53.2 : 1.0);
    const amountEgp = data.currency === 'EGP' ? amount : Math.round(amount * exchangeRate * 100) / 100;

    const newVoucher: DisbursementVoucher = {
      id: String(Date.now()),
      voucherNumber,
      shipmentId: data.shipmentId || 'shp-1',
      shipmentNumber: data.shipmentNumber || 'SHP-2026-001',
      vendorName: data.vendorName || 'المورد المعتمد',
      vendorCategory: data.vendorCategory || 'shipping_line',
      chargeItem: data.chargeItem || 'مصروفات شحن ولوجستيات',
      amount,
      currency: data.currency || 'USD',
      exchangeRate,
      amountEgp,
      paymentMethod: data.paymentMethod || 'bank_transfer',
      treasury: data.treasury || 'البنك التجاري الدولي (CIB)',
      requestedBy: data.requestedBy || 'فريق العمليات',
      status: data.status || 'pending_approval',
      requestDate: new Date().toISOString().slice(0, 10),
      notes: data.notes || '',
    };

    return this.dataStore.saveItem<DisbursementVoucher>(tenantId, this.collectionKey, newVoucher.id, newVoucher);
  }

  async approve(tenantId: string, id: string, approverName: string) {
    const voucher = await this.findOne(tenantId, id);
    voucher.status = 'approved';
    voucher.approvedBy = approverName || 'المدير المالي المعتمد';
    voucher.approvedAt = new Date().toISOString();
    return this.dataStore.saveItem<DisbursementVoucher>(tenantId, this.collectionKey, id, voucher);
  }

  async pay(tenantId: string, id: string, payData: { receiptNumber?: string; paymentDate?: string; treasury?: string }) {
    const voucher = await this.findOne(tenantId, id);
    voucher.status = 'paid';
    voucher.receiptNumber = payData.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;
    voucher.paymentDate = payData.paymentDate || new Date().toISOString().slice(0, 10);
    if (payData.treasury) {
      voucher.treasury = payData.treasury;
    }
    return this.dataStore.saveItem<DisbursementVoucher>(tenantId, this.collectionKey, id, voucher);
  }
}
