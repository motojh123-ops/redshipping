import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface DispatchTrip {
  id: string;
  tripNumber: string;
  shipmentId?: string;
  jobFileNumber?: string;
  clientName: string;
  containerNumber: string;
  containerType: string;
  pickupLocation: string;
  deliveryLocation: string;
  driverName: string;
  driverPhone: string;
  truckPlate: string;
  truckType: string;
  status: 'scheduled' | 'loading' | 'in_transit' | 'delivered' | 'cancelled';
  scheduledDate: string;
  departureTime?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  costRate: number;
  sellRate: number;
  currency: 'EGP' | 'USD';
  waybillNumber: string;
  notes?: string;
}

const FALLBACK_DISPATCH_TRIPS: DispatchTrip[] = [
  {
    id: 'dsp-01',
    tripNumber: 'TRP-2026-081',
    shipmentId: 'ship-1',
    jobFileNumber: 'RED-2026-0001',
    clientName: 'المصرية لتجارة الأجهزة والآلات الكبرى',
    containerNumber: 'MSCU9041280',
    containerType: "40' High Cube",
    pickupLocation: 'ميناء الإسكندرية - رصيف 54',
    deliveryLocation: 'مدينة السادس من أكتوبر - المنطقة الصناعية الثالثة',
    driverName: 'محمود عبد السلام',
    driverPhone: '+20 100 987 6543',
    truckPlate: 'ط ر د 8941',
    truckType: 'تريلا فرش حمولة 45 طن',
    status: 'in_transit',
    scheduledDate: '2026-09-18',
    departureTime: '08:30',
    estimatedArrival: '13:00',
    costRate: 11000,
    sellRate: 13500,
    currency: 'EGP',
    waybillNumber: 'WB-EG-89104',
    notes: 'تحميل مباشر بعد انتهاء الكشف الجمركي وشهادة 46',
  },
  {
    id: 'dsp-02',
    tripNumber: 'TRP-2026-082',
    shipmentId: 'ship-2',
    jobFileNumber: 'RED-2026-0002',
    clientName: 'السويدي للصناعات الهندسية والتطوير',
    containerNumber: 'MAEU7612349',
    containerType: "40' High Cube",
    pickupLocation: 'ميناء العين السخنة - محطة موانئ دبي DP World',
    deliveryLocation: 'مدينة العاشر من رمضان - مجمع الصناعات الثقيلة',
    driverName: 'عصام عبد الله الجيار',
    driverPhone: '+20 102 334 5566',
    truckPlate: 'س ف ج 1290',
    truckType: 'تريلا جوانب ستارة',
    status: 'loading',
    scheduledDate: '2026-09-19',
    departureTime: '10:00',
    estimatedArrival: '14:30',
    costRate: 9500,
    sellRate: 12000,
    currency: 'EGP',
    waybillNumber: 'WB-EG-89105',
    notes: 'بضائع مصنعية حساسة - سرعة محددة بـ 70 كم/س',
  },
  {
    id: 'dsp-03',
    tripNumber: 'TRP-2026-083',
    shipmentId: 'ship-3',
    jobFileNumber: 'RED-2026-0003',
    clientName: 'الأهرام للاستيراد والتصدير الدولي',
    containerNumber: 'COSU4410982',
    containerType: "20' Standard GP",
    pickupLocation: 'ميناء دمياط البحري - صومعة البضائع العامة',
    deliveryLocation: 'المنصورة - طريق المنزلة الزراعي',
    driverName: 'تامر فتحي البرنس',
    driverPhone: '+20 114 876 5432',
    truckPlate: 'د ق ط 5512',
    truckType: 'تريلا قلاب 20 قدم',
    status: 'scheduled',
    scheduledDate: '2026-09-20',
    estimatedArrival: '16:00',
    costRate: 6500,
    sellRate: 8500,
    currency: 'EGP',
    waybillNumber: 'WB-EG-89106',
    notes: 'بانتظار سداد رسوم وزن البسكول بالميناء',
  },
];

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  private trips: DispatchTrip[] = [...FALLBACK_DISPATCH_TRIPS];

  constructor(private prisma: PrismaService) {}

  async getTrips(tenantId: string, filter?: { status?: string; search?: string }): Promise<DispatchTrip[]> {
    let result = this.trips;

    if (filter?.status) {
      result = result.filter((t) => t.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.tripNumber.toLowerCase().includes(q) ||
          t.clientName.toLowerCase().includes(q) ||
          t.containerNumber.toLowerCase().includes(q) ||
          t.driverName.toLowerCase().includes(q) ||
          t.truckPlate.toLowerCase().includes(q),
      );
    }

    return result;
  }

  async getTripById(tenantId: string, id: string): Promise<DispatchTrip> {
    const trip = this.trips.find((t) => t.id === id);
    if (!trip) {
      throw new NotFoundException(`Dispatch trip with id ${id} not found`);
    }
    return trip;
  }

  async createTrip(tenantId: string, dto: any): Promise<DispatchTrip> {
    const tripNumber = `TRP-2026-${String(this.trips.length + 84).padStart(3, '0')}`;
    const waybillNumber = `WB-EG-${Math.floor(10000 + Math.random() * 90000)}`;

    const newTrip: DispatchTrip = {
      id: `dsp-${Date.now()}`,
      tripNumber,
      shipmentId: dto.shipmentId,
      jobFileNumber: dto.jobFileNumber || 'RED-2026-MANUAL',
      clientName: dto.clientName || 'عميل محلي',
      containerNumber: dto.containerNumber || 'MSCU0000000',
      containerType: dto.containerType || "40' High Cube",
      pickupLocation: dto.pickupLocation || 'ميناء الإسكندرية',
      deliveryLocation: dto.deliveryLocation || 'مخازن العميل',
      driverName: dto.driverName || 'سائق معتمد',
      driverPhone: dto.driverPhone || '+20 100 000 0000',
      truckPlate: dto.truckPlate || 'أ ب ج 1234',
      truckType: dto.truckType || 'تريلا نقل ثقيل',
      status: 'scheduled',
      scheduledDate: dto.scheduledDate || new Date().toISOString().slice(0, 10),
      costRate: Number(dto.costRate) || 8000,
      sellRate: Number(dto.sellRate) || 10500,
      currency: 'EGP',
      waybillNumber,
      notes: dto.notes || '',
    };

    this.trips.unshift(newTrip);
    return newTrip;
  }

  async updateTripStatus(
    tenantId: string,
    id: string,
    status: 'scheduled' | 'loading' | 'in_transit' | 'delivered' | 'cancelled',
  ): Promise<DispatchTrip> {
    const trip = await this.getTripById(tenantId, id);
    trip.status = status;
    if (status === 'in_transit' && !trip.departureTime) {
      trip.departureTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
    if (status === 'delivered') {
      trip.actualArrival = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
    return trip;
  }

  clearTrips() {
    this.trips = [];
  }
}
