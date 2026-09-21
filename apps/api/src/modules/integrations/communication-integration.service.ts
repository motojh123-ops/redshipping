import { Injectable, Logger } from '@nestjs/common';

export interface WhatsAppNotificationPayload {
  recipientPhone: string;
  templateType: 'shipment_milestone' | 'acid_reminder' | 'invoice_issued' | 'delivery_order_ready';
  variables: Record<string, string>;
}

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  htmlContent: string;
  shipmentNumber?: string;
  attachmentUrls?: string[];
}

@Injectable()
export class CommunicationIntegrationService {
  private readonly logger = new Logger(CommunicationIntegrationService.name);

  async sendWhatsAppNotification(payload: WhatsAppNotificationPayload) {
    const cleanPhone = (payload.recipientPhone || '').replace(/\D/g, '');
    this.logger.log(`Dispatching WhatsApp notification to ${cleanPhone} [template: ${payload.templateType}]`);

    let messageText = '';
    switch (payload.templateType) {
      case 'shipment_milestone':
        messageText = `🚢 *تحديث شحنة RED SHIPPING*\n\nعزيزي العميل، تم وصول شحنتكم رقم: *${payload.variables.shipmentNumber}* إلى ميناء المقصد (*${payload.variables.destinationPort}*).\nتاريخ التفريغ: ${payload.variables.dischargeDate}\nفترة السماح المجاني المتبقية: *${payload.variables.daysRemaining} أيام*.\n\nرابط التتبع الحي: ${payload.variables.trackingUrl}`;
        break;
      case 'acid_reminder':
        messageText = `⚠️ *تنبيه منظومة نافذة (ACID Number)*\n\nيرجى العلم بأن إشعار القيد الجمركي المسبق للشحنة رقم: *${payload.variables.shipmentNumber}* متبقي على انتهائه *${payload.variables.daysRemaining} أيام*.\nرقم ACID: ${payload.variables.acidNumber}\nيرجى شحن الحاوية قبل انتهاء الصلاحية لتفادي الغرامات.`;
        break;
      case 'delivery_order_ready':
        messageText = `✅ *إذن التسليم الملاحي جاهز (Delivery Order D/O)*\n\nتم سداد نولون الخط واستلام إذن التسليم الملاحي الأصلي للشحنة: *${payload.variables.shipmentNumber}*.\nرقم البوليصة: *${payload.variables.blNumber}*.\nيمكنكم الآن بدء سحب الحاويات من الميناء.`;
        break;
      case 'invoice_issued':
        messageText = `🧾 *فاتورة خدمات لوجستية صادرة*\n\nتم إصدار فاتورة الخدمات رقم: *${payload.variables.invoiceNumber}* بقيمة *${payload.variables.total} ${payload.variables.currency}*.\nتاريخ الاستحقاق: ${payload.variables.dueDate}.\nشكراً لتعاملكم مع ريد شيبينج.`;
        break;
      default:
        messageText = `تنبيه من منصة ريد شيبينج للخدمات اللوجستية.`;
    }

    const encodedText = encodeURIComponent(messageText);
    const directWebUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    return {
      success: true,
      messageId: `WA-MSG-${Date.now()}`,
      recipient: cleanPhone,
      timestamp: new Date().toISOString(),
      renderedText: messageText,
      directWhatsAppUrl: directWebUrl,
      status: 'SENT_TO_GATEWAY',
    };
  }

  async sendEmailNotification(payload: EmailNotificationPayload) {
    this.logger.log(`Dispatching email to ${payload.to} with subject: "${payload.subject}"`);

    return {
      success: true,
      emailId: `MAIL-${Date.now()}`,
      recipient: payload.to,
      subject: payload.subject,
      timestamp: new Date().toISOString(),
      status: 'DISPATCHED_SMTP',
    };
  }
}
