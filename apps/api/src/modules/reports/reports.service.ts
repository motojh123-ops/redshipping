import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const USD_TO_EGP = 51.5;

const ACTIVE_EXCLUDED_STAGES = ['delivered', 'closed', 'cancelled'];

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  /* ── Period helpers ── */
  private resolvePeriodRange(period?: string): { start: Date; end: Date } {
    const now = new Date();
    const y = now.getFullYear();
    switch (period) {
      case 'last30':
        return { start: new Date(now.getTime() - 30 * 86400000), end: now };
      case 'q1':
        return { start: new Date(y, 0, 1), end: new Date(y, 3, 0, 23, 59, 59) };
      case 'q2':
        return { start: new Date(y, 3, 1), end: new Date(y, 6, 0, 23, 59, 59) };
      case 'q3':
        return { start: new Date(y, 6, 1), end: new Date(y, 9, 0, 23, 59, 59) };
      default: // ytd
        return { start: new Date(y, 0, 1), end: now };
    }
  }

  private inRange(date: Date | null | undefined, range: { start: Date; end: Date }): boolean {
    if (!date) return false;
    const d = new Date(date);
    return d >= range.start && d <= range.end;
  }

  private toEgp(total: unknown, currency: string, exchangeRate: unknown): number {
    const t = Number(total) || 0;
    if (currency === 'EGP') return t;
    const rate = Number(exchangeRate) > 1 ? Number(exchangeRate) : USD_TO_EGP;
    return t * rate;
  }

  private teuOf(containerType: string): number {
    // 20ft types count as 1 TEU, 40/45ft as 2 TEU; others default to 1
    return ['GP_40', 'HQ_40', 'HQ_45', 'RF_40'].includes(containerType) ? 2 : 1;
  }

  /* ── Executive KPI Summary (real DB aggregations) ── */
  async getExecutiveKpiSummary(tenantId: string, period?: string) {
    const range = this.resolvePeriodRange(period);

    const [invoices, shipments, costs] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { companyId: tenantId },
        select: {
          id: true,
          total: true,
          currency: true,
          exchangeRate: true,
          status: true,
          issueDate: true,
          createdAt: true,
          shipmentId: true,
        },
      }),
      this.prisma.shipment.findMany({
        where: { companyId: tenantId },
        select: {
          id: true,
          currentStage: true,
          createdAt: true,
          etd: true,
          eta: true,
          freeDaysAllowed: true,
          destinationPortId: true,
          shippingLine: { select: { name: true } },
          destinationPort: { select: { code: true, nameAr: true, nameEn: true } },
          containers: { select: { containerType: true, status: true, dischargedAt: true } },
        },
      }),
      this.prisma.shipmentCost.findMany({
        where: { companyId: tenantId },
        select: { actualCost: true, estimatedCost: true, currency: true, createdAt: true },
      }),
    ]);

    const periodInvoices = invoices.filter((inv) =>
      this.inRange(inv.issueDate || inv.createdAt, range),
    );
    const periodShipments = shipments.filter((s) => this.inRange(s.createdAt, range));
    const periodCosts = costs.filter((c) => this.inRange(c.createdAt, range));

    /* Revenue (EGP-consolidated) */
    const totalRevenueEgp = periodInvoices.reduce(
      (sum, inv) => sum + this.toEgp(inv.total, inv.currency, inv.exchangeRate),
      0,
    );

    /* Real cost side from shipment costs (actual, falling back to estimate) */
    const totalCostEgp = periodCosts.reduce(
      (sum, c) =>
        sum + this.toEgp(Number(c.actualCost) > 0 ? c.actualCost : c.estimatedCost, c.currency, 1),
      0,
    );
    const grossProfitEgp = Math.max(0, totalRevenueEgp - totalCostEgp);
    const averageProfitMarginPercent =
      totalRevenueEgp > 0
        ? Math.round((grossProfitEgp / totalRevenueEgp) * 1000) / 10
        : 0;

    /* Monthly trend for the period's year */
    const year = range.end.getFullYear();
    const monthly = Array.from({ length: 12 }, () => ({ revenue: 0, cost: 0, profit: 0 }));
    periodInvoices.forEach((inv) => {
      const d = new Date(inv.issueDate || inv.createdAt!);
      if (d.getFullYear() === year) monthly[d.getMonth()].revenue += this.toEgp(inv.total, inv.currency, inv.exchangeRate);
    });
    periodCosts.forEach((c) => {
      const d = new Date(c.createdAt);
      if (d.getFullYear() === year)
        monthly[d.getMonth()].cost += this.toEgp(
          Number(c.actualCost) > 0 ? c.actualCost : c.estimatedCost,
          c.currency,
          1,
        );
    });
    const monthlyRevenueTrend = monthly
      .map((m, i) => ({
        month: new Date(year, i, 1).toLocaleString('ar-EG', { month: 'long' }),
        revenue: Math.round(m.revenue),
        cost: Math.round(m.cost),
        profit: Math.max(0, Math.round(m.revenue - m.cost)),
      }))
      .filter((m, i) => m.revenue > 0 || m.cost > 0 || i <= new Date().getMonth());

    /* Month-over-month growth */
    const nowMonth = new Date().getMonth();
    const prevMonthVal = nowMonth > 0 ? monthly[nowMonth - 1].revenue : 0;
    const monthlyGrowthPercent =
      prevMonthVal > 0
        ? Math.round(((monthly[nowMonth].revenue - prevMonthVal) / prevMonthVal) * 1000) / 10
        : 0;

    /* Receivables (all time — outstanding is not period-bound) */
    const openStatuses = ['issued', 'partially_paid', 'overdue'];
    const outstandingInvoices = invoices.filter((inv) => openStatuses.includes(inv.status));
    const outstandingReceivablesEgp = Math.round(
      outstandingInvoices.reduce(
        (sum, inv) => sum + this.toEgp(inv.total, inv.currency, inv.exchangeRate),
        0,
      ),
    );
    const overdueInvoicesCount = invoices.filter((inv) => inv.status === 'overdue').length;

    /* Active shipments (current period snapshot) */
    const activeShipmentsCount = shipments.filter(
      (s) => !ACTIVE_EXCLUDED_STAGES.includes(s.currentStage),
    ).length;

    /* Demurrage exposure: discharged containers past/near free time */
    let demurrageExposureRiskCount = 0;
    shipments.forEach((s) => {
      const freeDays = s.freeDaysAllowed ?? 14;
      s.containers.forEach((c) => {
        if (c.status === 'discharged' || c.status === 'gated_out') {
          const ref = c.dischargedAt ? new Date(c.dischargedAt) : null;
          if (ref) {
            const daysOut = Math.floor((Date.now() - ref.getTime()) / 86400000);
            if (daysOut > freeDays - 3) demurrageExposureRiskCount += 1;
          }
        }
      });
    });

    /* Top destination ports by volume + invoiced revenue */
    const shipmentPortMap = new Map<
      string,
      { code: string; nameAr: string | null; nameEn: string | null } | null
    >();
    shipments.forEach((s) => shipmentPortMap.set(s.id, s.destinationPort));
    const invByPort = new Map<string, number>();
    periodInvoices.forEach((inv) => {
      if (!inv.shipmentId) return;
      const port = shipmentPortMap.get(inv.shipmentId);
      if (!port) return;
      invByPort.set(port.code, (invByPort.get(port.code) || 0) + this.toEgp(inv.total, inv.currency, inv.exchangeRate));
    });
    const portAgg = new Map<string, { name: string; teu: number; shipments: number }>();
    periodShipments.forEach((s) => {
      const port = s.destinationPort;
      if (!port) return;
      const cur = portAgg.get(port.code) || { name: port.nameAr || port.nameEn || port.code, teu: 0, shipments: 0 };
      cur.teu += s.containers.reduce((t, c) => t + this.teuOf(c.containerType), 0);
      cur.shipments += 1;
      portAgg.set(port.code, cur);
    });
    const topPortsByVolume = Array.from(portAgg.entries())
      .map(([code, agg]) => ({
        portCode: code,
        portName: agg.name,
        volumeTeu: agg.teu,
        revenueEgp: Math.round(invByPort.get(code) || 0),
        percentage: periodShipments.length > 0 ? Math.round((agg.shipments / periodShipments.length) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.volumeTeu - a.volumeTeu)
      .slice(0, 5);

    /* Carrier market share (from real shipping lines) */
    const carrierAgg = new Map<string, number>();
    periodShipments.forEach((s) => {
      const name = s.shippingLine?.name || 'غير محدد';
      carrierAgg.set(name, (carrierAgg.get(name) || 0) + 1);
    });
    const carrierTotal = periodShipments.length || 1;
    const carrierMarketShare = Array.from(carrierAgg.entries())
      .map(([carrierName, count]) => ({
        carrierName,
        shipmentCount: count,
        sharePercent: Math.round((count / carrierTotal) * 1000) / 10,
      }))
      .sort((a, b) => b.shipmentCount - a.shipmentCount)
      .slice(0, 6);

    return {
      totalRevenueEgp: Math.round(totalRevenueEgp),
      monthlyGrowthPercent,
      activeShipmentsCount,
      averageProfitMarginPercent,
      grossProfitEgp: Math.round(grossProfitEgp),
      outstandingReceivablesEgp,
      overdueInvoicesCount,
      demurrageExposureRiskCount,
      topPortsByVolume,
      carrierMarketShare,
      monthlyRevenueTrend,
    };
  }

  /* ── Lanes performance (real DB aggregations) ── */
  async getLanesPerformance(tenantId: string, period?: string) {
    const range = this.resolvePeriodRange(period);

    const [shipments, trips] = await Promise.all([
      this.prisma.shipment.findMany({
        where: { companyId: tenantId },
        select: {
          id: true,
          createdAt: true,
          etd: true,
          eta: true,
          originPort: { select: { code: true, nameAr: true, nameEn: true } },
          destinationPort: { select: { code: true, nameAr: true, nameEn: true } },
        },
      }),
      this.prisma.dispatchTrip.findMany({
        where: { companyId: tenantId },
        select: { shipmentId: true, costRate: true, sellRate: true },
      }),
    ]);

    const periodShipments = shipments.filter((s) => this.inRange(s.createdAt, range));

    /* Per-shipment trucking margin from real dispatch trips */
    const marginByShipment = new Map<string, number[]>();
    trips.forEach((t) => {
      if (!t.shipmentId) return;
      const sell = Number(t.sellRate) || 0;
      if (sell <= 0) return;
      const margin = ((sell - (Number(t.costRate) || 0)) / sell) * 100;
      if (!marginByShipment.has(t.shipmentId)) marginByShipment.set(t.shipmentId, []);
      marginByShipment.get(t.shipmentId)!.push(margin);
    });

    const laneAgg = new Map<
      string,
      { pol: string; pod: string; label: string; count: number; transitDays: number[]; margins: number[] }
    >();
    periodShipments.forEach((s) => {
      const pol = s.originPort?.code || '—';
      const pod = s.destinationPort?.code || '—';
      const key = `${pol}->${pod}`;
      const label =
        pol === '—' && pod === '—'
          ? 'مسار غير محدد (لم تُحدد الموانئ)'
          : `${s.originPort?.nameAr || s.originPort?.nameEn || pol} ← ${s.destinationPort?.nameAr || s.destinationPort?.nameEn || pod}`;
      const cur =
        laneAgg.get(key) || { pol, pod, label, count: 0, transitDays: [] as number[], margins: [] as number[] };
      cur.count += 1;
      if (s.etd && s.eta) {
        const days = Math.round(
          (new Date(s.eta).getTime() - new Date(s.etd).getTime()) / 86400000,
        );
        if (days > 0 && days < 365) cur.transitDays.push(days);
      }
      if (marginByShipment.has(s.id)) cur.margins.push(...marginByShipment.get(s.id)!);
      laneAgg.set(key, cur);
    });

    return Array.from(laneAgg.values())
      .map((lane) => {
        const averageTransitDays =
          lane.transitDays.length > 0
            ? Math.round(lane.transitDays.reduce((a, b) => a + b, 0) / lane.transitDays.length)
            : 0;
        const averageMarginPercent =
          lane.margins.length > 0
            ? Math.round((lane.margins.reduce((a, b) => a + b, 0) / lane.margins.length) * 10) / 10
            : 0;
        const status =
          lane.count >= 15 ? 'high_demand' : averageTransitDays > 0 && averageTransitDays <= 14 ? 'fast_transit' : 'steady';
        return {
          lane: lane.label,
          pol: lane.pol,
          pod: lane.pod,
          mode: 'FCL Ocean',
          shipmentsCount: lane.count,
          averageTransitDays,
          averageMarginPercent,
          status,
        };
      })
      .sort((a, b) => b.shipmentsCount - a.shipmentsCount)
      .slice(0, 10);
  }
}
