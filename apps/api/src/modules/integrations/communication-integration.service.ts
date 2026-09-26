import { Injectable, Logger, BadRequestException, BadGatewayException, ServiceUnavailableException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private config: ConfigService) {}

  /** Render the WhatsApp message body for the requested template. */
  private renderWhatsAppText(payload: WhatsAppNotificationPayload): string {
    switch (payload.templateType) {
      case 'shipment_milestone':
        return `🚢 *تحديث شحنة RED SHIPPING*\n\nعزيزي العميل، تم وصول شحنتكم رقم: *${payload.variables.shipmentNumber}* إلى ميناء المقصد (*${payload.variables.destinationPort}*).\nتاريخ التفريغ: ${payload.variables.dischargeDate}\nفترة السماح المجاني المتبقية: *${payload.variables.daysRemaining} أيام*.\n\nرابط التتبع الحي: ${payload.variables.trackingUrl}`;
      case 'acid_reminder':
        return `⚠️ *تنبيه منظومة نافذة (ACID Number)*\n\nيرجى العلم بأن إشعار القيد الجمركي المسبق للشحنة رقم: *${payload.variables.shipmentNumber}* متبقي على انتهائه *${payload.variables.daysRemaining} أيام*.\nرقم ACID: ${payload.variables.acidNumber}\nيرجى شحن الحاوية قبل انتهاء الصلاحية لتفادي الغرامات.`;
      case 'delivery_order_ready':
        return `✅ *إذن التسليم الملاحي جاهز (Delivery Order D/O)*\n\nتم سداد نولون الخط واستلام إذن التسليم الملاحي الأصلي للشحنة: *${payload.variables.shipmentNumber}*.\nرقم البوليصة: *${payload.variables.blNumber}*.\nيمكنكم الآن بدء سحب الحاويات من الميناء.`;
      case 'invoice_issued':
        return `🧾 *فاتورة خدمات لوجستية صادرة*\n\nتم إصدار فاتورة الخدمات رقم: *${payload.variables.invoiceNumber}* بقيمة *${payload.variables.total} ${payload.variables.currency}*.\nتاريخ الاستحقاق: ${payload.variables.dueDate}.\nشكراً لتعاملكم مع ريد شيبينج.`;
      default:
        return `تنبيه من منصة ريد شيبينج للخدمات اللوجستية.`;
    }
  }

  /**
   * Dispatch a WhatsApp notification through the live Meta WhatsApp Cloud API.
   * Requires WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID configuration;
   * when not configured it fails honestly and returns the manual wa.me link.
   */
  async sendWhatsAppNotification(payload: WhatsAppNotificationPayload) {
    const cleanPhone = (payload.recipientPhone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      throw new BadRequestException('recipientPhone is required to dispatch a WhatsApp notification');
    }

    const messageText = this.renderWhatsAppText(payload);
    const directWebUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    const token = this.config.get<string>('WHATSAPP_API_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    if (!token || !phoneNumberId) {
      throw new ServiceUnavailableException({
        message:
          'WhatsApp Cloud API is not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID to enable automated dispatch — or send manually using the provided link.',
        manualWhatsAppUrl: directWebUrl,
        renderedText: messageText,
      });
    }

    this.logger.log(
      `Dispatching WhatsApp notification to ${cleanPhone} [template: ${payload.templateType}] via Meta Cloud API`,
    );

    let json: any = null;
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { preview_url: true, body: messageText },
        }),
        signal: AbortSignal.timeout(15000),
      });
      json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new BadGatewayException({
          message: 'WhatsApp Cloud API rejected the message',
          providerResponse: json,
        });
      }
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(`Could not reach the WhatsApp Cloud API: ${error.message}`);
    }

    const message = json?.messages?.[0];
    return {
      success: true,
      messageId: message?.id ?? null,
      recipient: cleanPhone,
      timestamp: new Date().toISOString(),
      renderedText: messageText,
      status: message?.status || 'accepted',
      rawResponse: json,
    };
  }

  /**
   * Email dispatch is not enabled until an SMTP provider is configured on the
   * server. Instead of pretending a message was sent, fail honestly with the
   * payload so callers can surface it to the operator.
   */
  async sendEmailNotification(payload: EmailNotificationPayload) {
    this.logger.warn(
      `Email dispatch requested for "${payload.subject}" to ${payload.to} — no SMTP provider is configured on this server`,
    );
    throw new ServiceUnavailableException({
      message:
        'Email dispatch is not configured on this server. SMTP provider credentials must be set before emails can be sent.',
      recipient: payload.to,
      subject: payload.subject,
      htmlContent: payload.htmlContent,
    });
  }
}
