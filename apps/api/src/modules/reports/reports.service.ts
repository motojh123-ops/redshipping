import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  async getExecutiveKpiSummary(tenantId: string) {
    return {
      totalRevenueEgp: 1425000,
      monthlyGrowthPercent: 18.4,
      activeShipmentsCount: 14,
      averageProfitMarginPercent: 19.8,
      outstandingReceivablesEgp: 310500,
      overdueInvoicesCount: 2,
      demurrageExposureRiskCount: 1,
      topPortsByVolume: [
        { portCode: 'EGALY', portName: 'ميناء الإسكندرية', volumeTeu: 142, revenueEgp: 580000, percentage: 40.7 },
        { portCode: 'EGSOK', portName: 'ميناء العين السخنة', volumeTeu: 98, revenueEgp: 410000, percentage: 28.8 },
        { portCode: 'EGDAM', portName: 'ميناء دمياط', volumeTeu: 64, revenueEgp: 260000, percentage: 18.2 },
        { portCode: 'EG6OC', portName: 'ميناء 6 أكتوبر الجاف', volumeTeu: 38, revenueEgp: 120000, percentage: 8.4 },
        { portCode: 'EGPSD', portName: 'ميناء شرق بورسعيد', volumeTeu: 16, revenueEgp: 55000, percentage: 3.9 },
      ],
      carrierMarketShare: [
        { carrierCode: 'MSCU', carrierName: 'MSC Mediterranean Shipping', shipmentCount: 28, sharePercent: 38.5 },
        { carrierCode: 'MAEU', carrierName: 'Maersk Line Egypt', shipmentCount: 19, sharePercent: 26.0 },
        { carrierCode: 'COSU', carrierName: 'COSCO Shipping Lines', shipmentCount: 15, sharePercent: 20.5 },
        { carrierCode: 'HLCU', carrierName: 'Hapag-Lloyd Egypt', shipmentCount: 11, sharePercent: 15.0 },
      ],
      monthlyRevenueTrend: [
        { month: 'يناير', revenue: 420000, cost: 336000, profit: 84000 },
        { month: 'فبراير', revenue: 580000, cost: 464000, profit: 116000 },
        { month: 'مارس', revenue: 750000, cost: 600000, profit: 150000 },
        { month: 'أبريل', revenue: 640000, cost: 512000, profit: 128000 },
        { month: 'مايو', revenue: 920000, cost: 736000, profit: 184000 },
        { month: 'يونيو', revenue: 1100000, cost: 880000, profit: 220000 },
        { month: 'يوليو', revenue: 1350000, cost: 1080000, profit: 270000 },
        { month: 'أغسطس', revenue: 1850000, cost: 1480000, profit: 370000 },
        { month: 'سبتمبر', revenue: 1600000, cost: 1280000, profit: 320000 },
      ],
    };
  }

  async getLanesPerformance(tenantId: string) {
    return [
      {
        lane: 'نينغبو (الصين) ← الإسكندرية (مصر)',
        pol: 'CNNGB',
        pod: 'EGALY',
        mode: 'FCL Ocean',
        shipmentsCount: 38,
        averageTransitDays: 26,
        averageMarginPercent: 17.5,
        status: 'high_demand',
      },
      {
        lane: 'شنغهاي (الصين) ← السخنة (مصر)',
        pol: 'CNSHA',
        pod: 'EGSOK',
        mode: 'FCL Ocean',
        shipmentsCount: 29,
        averageTransitDays: 22,
        averageMarginPercent: 18.2,
        status: 'fast_transit',
      },
      {
        lane: 'جينوا (إيطاليا) ← الإسكندرية (مصر)',
        pol: 'ITGOA',
        pod: 'EGALY',
        mode: 'FCL Ocean',
        shipmentsCount: 14,
        averageTransitDays: 8,
        averageMarginPercent: 21.0,
        status: 'steady',
      },
      {
        lane: 'جبل علي (الإمارات) ← السخنة (مصر)',
        pol: 'AEJEA',
        pod: 'EGSOK',
        mode: 'FCL Ocean',
        shipmentsCount: 12,
        averageTransitDays: 7,
        averageMarginPercent: 24.5,
        status: 'steady',
      },
    ];
  }
}
