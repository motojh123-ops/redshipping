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

const FALLBACK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-01',
    type: 'demurrage',
    severity: 'critical',
    title: 'تحذير انتهاء فترة السماح المجانية للحاويات (Demurrage Risk)',
    message: 'الشحنة RED-2026-0001 (MSC): تبقي 48 ساعة فقط على بدء احتساب غرامات التأخير اليومية ($75/يوم للحاوية).',
    link: '/shipments/ship-1',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    entityId: 'ship-1',
  },
  {
    id: 'notif-02',
    type: 'customs',
    severity: 'success',
    title: 'صدور الرقم التعريفي المبدئي للشحنة (ACID Number)',
    message: 'تمت الموافقة على طلب القيد المسبق للشحنة RED-2026-0002 وصدر رقم ACID 8921049281 عبر منصة نافذة.',
    link: '/customs/ship-2',
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    entityId: 'ship-2',
  },
  {
    id: 'notif-03',
    type: 'invoice',
    severity: 'info',
    title: 'اعتماد الفاتورة الضريبية الإلكترونية (ETA e-Invoicing)',
    message: 'تم إرسال الفاتورة INV-2026-001 بنجاح لمنظومة مصلحة الضرائب المصرية وصدر الـ UUID المعتمد.',
    link: '/invoices/inv-1',
    isRead: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    entityId: 'inv-1',
  },
  {
    id: 'notif-04',
    type: 'shipment',
    severity: 'warning',
    title: 'تحديث موعد وصول السفينة (ETA Update)',
    message: 'سفينة MSC TIANJIN للشحنة RED-2026-0003 تم تعديل موعد وصولها لميناء دمياط ليصبح 22 سبتمبر 2026.',
    link: '/shipments/ship-3',
    isRead: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    entityId: 'ship-3',
  },
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private notifications: AppNotification[] = [...FALLBACK_NOTIFICATIONS];

  constructor(private prisma: PrismaService) {}

  async getNotifications(tenantId: string, filter?: { isRead?: boolean; type?: string }): Promise<AppNotification[]> {
    let result = this.notifications;

    if (filter?.isRead !== undefined) {
      result = result.filter((n) => n.isRead === filter.isRead);
    }
    if (filter?.type) {
      result = result.filter((n) => n.type === filter.type);
    }

    return result;
  }

  async getUnreadCount(tenantId: string): Promise<{ unreadCount: number }> {
    const unreadCount = this.notifications.filter((n) => !n.isRead).length;
    return { unreadCount };
  }

  async markAsRead(tenantId: string, id: string): Promise<AppNotification | null> {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
    }
    return notif || null;
  }

  async markAllAsRead(tenantId: string): Promise<{ success: boolean; markedCount: number }> {
    let count = 0;
    this.notifications.forEach((n) => {
      if (!n.isRead) {
        n.isRead = true;
        count++;
      }
    });
    return { success: true, markedCount: count };
  }
}
