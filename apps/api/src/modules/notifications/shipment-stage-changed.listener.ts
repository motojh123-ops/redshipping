import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReminderQueueService } from '../../common/queue/reminder-queue.service';
import { ShipmentStageChangedEvent } from '../../common/events/shipment-events';

const STAGE_LABEL_AR: Record<string, string> = {
  booking_confirmed: 'تأكيد الحجز',
  cargo_received: 'استلام البضاعة',
  customs_submitted: 'إيداع البيان الجمركي',
  acid_issued: 'صدور رقم نافذة (ACID)',
  in_transit: 'السفينة في البحر',
  arrived_destination: 'وصول السفينة للميناء',
  clearance_in_progress: 'قيد التخليص الجمركي',
  release_issued: 'صدور الإفراج الجمركي',
  out_for_delivery: 'خروج الشحنة للتسليم',
  delivered: 'تم تسليم الشحنة',
  closed: 'إغلاق ملف الشحنة',
  cancelled: 'إلغاء الشحنة',
};

const STAGE_SEVERITY: Record<string, 'info' | 'warning' | 'critical' | 'success'> = {
  booking_confirmed: 'info',
  cargo_received: 'info',
  customs_submitted: 'info',
  acid_issued: 'success',
  in_transit: 'info',
  arrived_destination: 'warning',
  clearance_in_progress: 'warning',
  release_issued: 'success',
  out_for_delivery: 'info',
  delivered: 'success',
  closed: 'info',
  cancelled: 'critical',
};

/**
 * Reacts to shipment stage changes:
 *  - writes real notification rows for the tenant notification center
 *  - enqueues operational reminder jobs (ACID expiry / ETA) to the workers queue
 *
 * Listener failures must never break the ops action that emitted the event.
 */
@Injectable()
export class ShipmentStageChangedListener {
  private readonly logger = new Logger(ShipmentStageChangedListener.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private reminderQueue: ReminderQueueService,
  ) {}

  @OnEvent('shipment.stage.changed', { async: true })
  async handleStageChanged(event: ShipmentStageChangedEvent): Promise<void> {
    try {
      // One read to enrich notifications and reminder payloads with related data
      const shipment = await this.prisma.shipment.findUnique({
        where: { id: event.shipmentId },
        select: {
          client: { select: { name: true } },
          destinationPort: { select: { nameAr: true, nameEn: true, code: true } },
          eta: true,
          containers: { select: { id: true, containerNumber: true, status: true, dischargedAt: true } },
          customsDossier: { select: { id: true, acidNumber: true, acidExpiryDate: true } },
        },
      });
      if (!shipment) return;

      const clientName = shipment.client?.name || null;
      const stageLabel = STAGE_LABEL_AR[event.toStage] || event.toStage;
      const link = `/shipments/${event.shipmentId}`;

      // 1) Tenant notification row
      const by = event.actorName ? ` بواسطة ${event.actorName}` : '';
      await this.notifications.create(event.tenantId, {
        type: 'shipment',
        severity: STAGE_SEVERITY[event.toStage] || 'info',
        title: `تحديث مرحلة الشحنة ${event.jobFileNumber}`,
        message: `${stageLabel}${by}`,
        link,
        entityId: event.shipmentId,
      });

      // 2) Stage-specific side effects
      if (event.toStage === 'arrived_destination') {
        await this.notifications.create(event.tenantId, {
          type: 'demurrage',
          severity: 'warning',
          title: `بدء عد فترة السماح — ${event.jobFileNumber}`,
          message: `رسو السفينة بميناء ${shipment.destinationPort?.nameAr || shipment.destinationPort?.nameEn || 'الوصول'}؛ مراقبة تفريغ الحاويات وموعد بدء غرامات الأرضيات.`,
          link,
          entityId: event.shipmentId,
        });
      }

      if (event.toStage === 'customs_submitted' || event.toStage === 'acid_issued') {
        await this.notifications.create(event.tenantId, {
          type: 'customs',
          severity: 'info',
          title: `متابعة نافذة — ${event.jobFileNumber}`,
          message:
            event.toStage === 'acid_issued'
              ? `تم تحديث مرحلة القيد المسبق (ACID) للشحنة. تأكيد صلاحية الرقم على بوابة نافذة.`
              : `تم إيداع البيان الجمركي للشحنة. متابعة صدور رقم ACID من منظومة نافذة.`,
          link: `/customs?shipment=${event.shipmentId}`,
          entityId: event.shipmentId,
        });
      }

      // 3) ETA reminder job — schedule for ETA minus 72h (or immediately if close/past)
      if (event.toStage === 'in_transit' && shipment.eta) {
        const etaDate = new Date(shipment.eta);
        const remindAt = etaDate.getTime() - 72 * 3600 * 1000;
        const delayMs = Math.max(0, remindAt - Date.now());
        await this.reminderQueue.enqueueReminder(
          {
            type: 'eta_alert',
            tenantId: event.tenantId,
            etaData: {
              shipmentId: event.shipmentId,
              trackingNumber: event.jobFileNumber,
              portOfDischarge: shipment.destinationPort?.nameEn || 'Destination Port',
              eta: etaDate.toISOString(),
              clientName: clientName || undefined,
            },
          },
          { delayMs },
        );
      }

      // 4) Demurrage reminder job — when containers are discharged, remind at free-time end
      if (event.toStage === 'arrived_destination' || event.toStage === 'clearance_in_progress') {
        const activeContainers = shipment.containers.filter(
          (c) => c.status === 'discharged' || c.status === 'gated_out',
        );
        const dischargeRef = activeContainers[0]?.dischargedAt || new Date();
        for (const c of activeContainers.slice(0, 3)) {
          await this.reminderQueue.enqueueReminder({
            type: 'demurrage_warning',
            tenantId: event.tenantId,
            demurrageData: {
              containerNumber: c.containerNumber || '—',
              shipmentRef: event.jobFileNumber,
              dischargeDate: new Date(dischargeRef).toISOString(),
              freeDays: 14,
            },
          });
        }
      }

      // 5) ACID expiry reminder — (re)scheduled when a dossier is linked to the shipment
      if (event.toStage === 'acid_issued' && shipment.customsDossier?.acidNumber && shipment.customsDossier?.acidExpiryDate) {
        await this.reminderQueue.enqueueReminder({
          type: 'acid_expiry',
          tenantId: event.tenantId,
          acidData: {
            dossierId: shipment.customsDossier.id,
            acidNumber: shipment.customsDossier.acidNumber,
            expiryDate: new Date(shipment.customsDossier.acidExpiryDate).toISOString(),
            clientName: clientName || undefined,
            shipmentRef: event.jobFileNumber,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(
        `Stage-change side effects failed for ${event.jobFileNumber} (${event.toStage}): ${err?.message}`,
      );
    }
  }
}
