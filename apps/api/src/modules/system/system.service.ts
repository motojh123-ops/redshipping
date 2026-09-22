import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataStoreService } from '../../database/data-store.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { DisbursementsService } from '../disbursements/disbursements.service';

function isUuid(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    private prisma: PrismaService,
    private dataStore: DataStoreService,
    private dispatchService: DispatchService,
    private disbursementsService: DisbursementsService,
  ) {}

  async getDataStats(tenantId: string) {
    const whereTenant = isUuid(tenantId) ? { companyId: tenantId } : undefined;

    const [
      shipmentsCount,
      quotationsCount,
      invoicesCount,
      customsCount,
      clientsCount,
      dispatchesCount,
      disbursementsCount,
    ] = await Promise.all([
      this.prisma.shipment.count({ where: whereTenant }).catch(() => 0),
      this.prisma.quotation.count({ where: whereTenant }).catch(() => 0),
      this.prisma.invoice.count({ where: whereTenant }).catch(() => 0),
      this.prisma.customsDossier.count({ where: whereTenant }).catch(() => 0),
      this.prisma.client.count({ where: whereTenant }).catch(() => 0),
      this.dispatchService.getTrips(tenantId).then((t) => t.length).catch(() => 0),
      this.disbursementsService.findAll(tenantId).then((v) => v.length).catch(() => 0),
    ]);

    return {
      shipments: shipmentsCount,
      quotations: quotationsCount,
      invoices: invoicesCount,
      customs: customsCount,
      clients: clientsCount,
      dispatches: dispatchesCount,
      disbursements: disbursementsCount,
      totalOperational: shipmentsCount + quotationsCount + invoicesCount + customsCount + dispatchesCount + disbursementsCount,
      totalAll: shipmentsCount + quotationsCount + invoicesCount + customsCount + clientsCount + dispatchesCount + disbursementsCount,
    };
  }

  async resetData(tenantId: string, scope: 'operational' | 'all') {
    this.logger.warn(`Initiating DATA RESET for tenant [${tenantId}] with scope: [${scope}]`);
    const whereTenant = isUuid(tenantId) ? { companyId: tenantId } : {};

    const deletedCounts: Record<string, number> = {};

    try {
      // 1. Delete Shipment Dependencies (Costs, Containers, Events, Customs Dossiers)
      const delCosts = await this.prisma.shipmentCost.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      deletedCounts.shipmentCosts = delCosts.count;

      const delContainers = await this.prisma.shipmentContainer.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      deletedCounts.shipmentContainers = delContainers.count;

      const delEvents = await this.prisma.shipmentEvent.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      deletedCounts.shipmentEvents = delEvents.count;

      const delCustoms = await this.prisma.customsDossier.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      deletedCounts.customsDossiers = delCustoms.count;

      // 2. Delete Invoice Items & Invoices
      const delInvItems = await this.prisma.invoiceItem.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      deletedCounts.invoiceItems = delInvItems.count;

      const delInvoices = await this.prisma.invoice.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      deletedCounts.invoices = delInvoices.count;

      // 3. Delete Shipments (must be deleted before Quotations because Shipment references Quotation)
      const delShipments = await this.prisma.shipment.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      deletedCounts.shipments = delShipments.count;

      // 4. Delete Quotation Items & Quotations
      const delQuoteItems = await this.prisma.quotationItem.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      deletedCounts.quotationItems = delQuoteItems.count;

      const delQuotations = await this.prisma.quotation.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      deletedCounts.quotations = delQuotations.count;

      // 5. Delete CRM Activities, Entity Documents, Scheduled Reminders, and Audit Logs
      await this.prisma.crmActivity.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      await this.prisma.entityDocument.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      await this.prisma.scheduledReminder.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
      await this.prisma.auditLog.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));

      // 6. If scope === 'all', also delete Client Contacts and Clients
      if (scope === 'all') {
        const delContacts = await this.prisma.clientContact.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
        deletedCounts.clientContacts = delContacts.count;

        const delClients = await this.prisma.client.deleteMany({ where: whereTenant }).catch(() => ({ count: 0 }));
        deletedCounts.clients = delClients.count;

        this.dataStore.clearAllData(tenantId);
      } else {
        this.dataStore.clearOperationalData(tenantId);
      }

      // 7. Clear Dispatch & Disbursements in-memory state
      this.dispatchService.clearTrips();

      this.logger.log(`Data reset successfully finished. Deleted counts: ${JSON.stringify(deletedCounts)}`);

      return {
        success: true,
        scope,
        message:
          scope === 'all'
            ? 'تم تصفير ومسح كافة البيانات التشغيلية وقائمة العملاء بنجاح'
            : 'تم مسح العمليات التشغيلية (شحنات، عروض، فواتير، جمارك، أوامر نقل) بنجاح مع الإبقاء على العملاء',
        deletedCounts,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.error(`Error during data reset: ${err.message}`, err.stack);
      throw err;
    }
  }
}
