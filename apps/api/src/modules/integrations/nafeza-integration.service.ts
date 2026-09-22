import { Injectable, Logger, BadRequestException } from '@nestjs/common';

/**
 * ── NAFEZA (Egyptian Customs Single Window) — Manual Verification Mode ──────
 *
 * NAFEZA / MTS Egypt does NOT offer a public, self-serve API for ACID inquiry.
 * The only free channel is the official manual inquiry page:
 *   https://www.nafeza.gov.eg/ar/aci/validate
 * Automated integration is gated behind corporate registration and accredited
 * customs-broker tokens issued by MTS Egypt (hotline 15460 / nafeza@mts-egy.com).
 *
 * Therefore this service performs NO live calls and returns NO simulated data.
 * It helps staff run an honest, auditable manual workflow:
 *   1. Validates the ACID format client-side of the workflow (9-19 digits).
 *   2. Provides the official deep link for manual verification.
 *   3. Hands back a checklist the operator records against the dossier.
 */

export const NAFEZA_VALIDATE_PAGE_URL = 'https://www.nafeza.gov.eg/ar/aci/validate';
export const NAFEZA_SUPPORT_HOTLINE = '15460';

export const INTEGRATION_MODE = 'MANUAL_OFFLINE' as const;

export interface AcidFormatCheck {
  provided: string;
  cleaned: string;
  digitCount: number;
  formatValid: boolean;
  formatMessage: string;
}

export interface ManualVerificationStep {
  order: number;
  titleAr: string;
  titleEn: string;
  actionUrl?: string;
}

export interface ManualAcidVerification {
  /** Clearly labels that this is NOT a live NAFEZA response */
  integrationMode: typeof INTEGRATION_MODE;
  dataAuthority: string;
  disclaimerAr: string;
  disclaimerEn: string;
  acidFormatCheck: AcidFormatCheck;
  officialVerificationUrl: string;
  clipboardReadyAcid: string;
  verificationSteps: ManualVerificationStep[];
}

@Injectable()
export class NafezaIntegrationService {
  private readonly logger = new Logger(NafezaIntegrationService.name);

  /**
   * Validates ACID number format and returns the manual verification workflow.
   * This is NOT a live NAFEZA inquiry — the operator must verify on the
   * official page (link included in the response) and record the outcome.
   */
  buildManualVerification(acidNumber: string): ManualAcidVerification {
    const raw = (acidNumber || '').trim();
    const cleaned = raw.replace(/\D/g, '');

    // Egyptian ACID numbers are 19 digits on the standard ACI manifest;
    // older/legacy shipments may carry 9-16 digit identifiers.
    const digitCount = cleaned.length;
    const formatValid = digitCount >= 9 && digitCount <= 19;

    if (!formatValid) {
      throw new BadRequestException(
        `رقم نافذة (ACID) غير صالح: ${digitCount > 0 ? `يحتوي ${digitCount} رقم فقط` : 'قيمة فارغة'} — يجب أن يتكون من 9 إلى 19 رقماً`,
      );
    }

    this.logger.log(`Manual ACID verification workflow prepared for ${cleaned} (no live NAFEZA call)`);

    return {
      integrationMode: INTEGRATION_MODE,
      dataAuthority: 'NAFEZA — Egyptian Customs Single Window (MTS Egypt)',
      disclaimerAr:
        'هذه نتيجة تحقق يدوي وليست استعلاماً مباشراً من منظومة نافذة. يجب التحقق من صلاحية الرقم على البوابة الرسمية وتسجيل النتيجة في ملف التخليص.',
      disclaimerEn:
        'This is a manual verification aid, NOT a live NAFEZA inquiry. Verify the number on the official portal and record the outcome on the customs dossier.',
      acidFormatCheck: {
        provided: raw,
        cleaned,
        digitCount,
        formatValid: true,
        formatMessage:
          digitCount === 19
            ? 'صيغة سليمة — 19 رقماً (نمط بيان ACI القياسي)'
            : `صيغة مقبولة — ${digitCount} رقماً (تحقق من النمط القياسي 19 رقماً للشحنات الحديثة)`,
      },
      officialVerificationUrl: NAFEZA_VALIDATE_PAGE_URL,
      clipboardReadyAcid: cleaned,
      verificationSteps: [
        {
          order: 1,
          titleAr: 'انسخ رقم ACID والصقه في نموذج الاستعلام الرسمي',
          titleEn: 'Copy the ACID and paste it into the official inquiry form',
          actionUrl: NAFEZA_VALIDATE_PAGE_URL,
        },
        {
          order: 2,
          titleAr: 'تحقق من صلاحية الرقم وتاريخ انتهاء الصلاحية (90 يوماً من الإصدار)',
          titleEn: 'Confirm validity status and the 90-day expiry window',
        },
        {
          order: 3,
          titleAr: 'طابق بيانات المستورد والمصدر (CargoX) مع بيانات ملف الشحنة',
          titleEn: 'Match importer/exporter (CargoX) details against the shipment file',
        },
        {
          order: 4,
          titleAr: 'سجل نتيجة التحقق وتاريخ الانتهاء في ملف التخليص الجمركي بالنظام',
          titleEn: 'Record the verification outcome and expiry date on the customs dossier',
        },
      ],
    };
  }
}
