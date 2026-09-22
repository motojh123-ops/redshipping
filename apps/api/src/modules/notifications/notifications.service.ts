import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AppNotification {
  id: string;
  type: 'demurrage' | 'customs' | 'invoice' | 'shipment' | 'system';
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  entityId?: string;
}

/**
 * Persisted, tenant-scoped notification store.
 *
 * Writes: domain-event listeners (e.g. shipment stage changes) and workers.
 * Reads:  GET /notifications consumed by the web notification center.
 *
 * Fail-soft: if the DB is unreachable, reads fall back to an empty list
 * instead of crashing the request.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /** Creates a persisted notification row. Safe to call from event listeners. */
  async create(tenantId: string, input: {
    type: AppNotification['type'];
    severity: AppNotification['severity'];
    title: string;
    message: string;
    link?: string;
    entityId?: string;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          companyId: tenantId,
          type: input.type,
          severity: input.severity,
          title: input.title,
          message: input.message,
          link: input.link,
          entityId: input.entityId,
        },
      });
      this.logger.debug(`Notification created [${input.type}/${input.severity}]: ${input.title}`);
    } catch (err: any) {
      // Never let notification writes break the business action that triggered them
      this.logger.warn(`Failed to persist notification: ${err?.message}`);
    }
  }

  async getNotifications(tenantId: string, filter?: { isRead?: boolean; type?: string }): Promise<AppNotification[]> {
    try {
      const where: any = { companyId: tenantId };
      if (filter?.isRead !== undefined) where.isRead = filter.isRead;
      if (filter?.type) where.type = filter.type;

      const rows = await this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return rows.map((n) => ({
        id: n.id,
        type: n.type as AppNotification['type'],
        severity: n.severity as AppNotification['severity'],
        title: n.title,
        message: n.message,
        link: n.link || undefined,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        entityId: n.entityId || undefined,
      }));
    } catch (err: any) {
      this.logger.warn(`Notification read failed, returning empty list: ${err?.message}`);
      return [];
    }
  }

  async getUnreadCount(tenantId: string): Promise<{ unreadCount: number }> {
    try {
      const unreadCount = await this.prisma.notification.count({
        where: { companyId: tenantId, isRead: false },
      });
      return { unreadCount };
    } catch {
      return { unreadCount: 0 };
    }
  }

  async markAsRead(tenantId: string, id: string): Promise<AppNotification | null> {
    try {
      const n = await this.prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
      return {
        id: n.id,
        type: n.type as AppNotification['type'],
        severity: n.severity as AppNotification['severity'],
        title: n.title,
        message: n.message,
        link: n.link || undefined,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        entityId: n.entityId || undefined,
      };
    } catch (err: any) {
      this.logger.warn(`markAsRead failed: ${err?.message}`);
      return null;
    }
  }

  async markAllAsRead(tenantId: string): Promise<{ success: boolean; markedCount: number }> {
    try {
      const res = await this.prisma.notification.updateMany({
        where: { companyId: tenantId, isRead: false },
        data: { isRead: true },
      });
      return { success: true, markedCount: res.count };
    } catch (err: any) {
      this.logger.warn(`markAllAsRead failed: ${err?.message}`);
      return { success: false, markedCount: 0 };
    }
  }
}
