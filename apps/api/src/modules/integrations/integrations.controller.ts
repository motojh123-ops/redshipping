import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { EtaEinvoicingService, EtaDocument } from './eta-einvoicing.service';
import { DcsaTrackingService } from './dcsa-tracking.service';
import { NafezaIntegrationService } from './nafeza-integration.service';
import { CommunicationIntegrationService, WhatsAppNotificationPayload, EmailNotificationPayload } from './communication-integration.service';

@ApiTags('Integrations (ETA, NAFEZA, DCSA & Communications)')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(
    private etaService: EtaEinvoicingService,
    private dcsaService: DcsaTrackingService,
    private nafezaService: NafezaIntegrationService,
    private communicationService: CommunicationIntegrationService,
  ) {}

  // ── Egyptian Tax Authority (ETA) eInvoicing ──
  @Post('eta/submit')
  @ApiOperation({ summary: 'Submit invoices to Egyptian Tax Authority (ETA) eInvoicing API v1.0' })
  async submitToEta(@Body() body: { documents: EtaDocument[] }) {
    return this.etaService.submitDocuments(body.documents);
  }

  @Get('eta/documents/:uuid')
  @ApiOperation({ summary: 'Query ETA document status and validation history by UUID' })
  async getEtaDocument(@Param('uuid') uuid: string) {
    return this.etaService.getDocumentDetails(uuid);
  }

  @Post('eta/qrcode')
  @ApiOperation({ summary: 'Generate Egyptian Tax compliant TLV Base64 QR code' })
  async generateQrCode(
    @Body()
    body: {
      sellerName: string;
      taxNumber: string;
      issueTimestamp: string;
      invoiceTotal: number;
      vatTotal: number;
    }
  ) {
    const qrCode = this.etaService.generateEtaQrCode(
      body.sellerName,
      body.taxNumber,
      body.issueTimestamp,
      body.invoiceTotal,
      body.vatTotal
    );
    return { qrCode };
  }

  // ── NAFEZA Customs — Manual Verification Mode ──
  @Post('nafeza/verify-acid')
  @ApiOperation({
    summary: 'Manual ACID verification workflow (format check + official NAFEZA inquiry link)',
    description:
      'NOT a live NAFEZA inquiry. NAFEZA has no public API; the response contains format validation, the official manual verification URL, and the required operator checklist.',
  })
  @ApiResponse({ status: 200, description: 'Manual verification workflow — clearly labeled as MANUAL_OFFLINE mode' })
  async verifyAcid(@Body('acidNumber') acidNumber: string) {
    return this.nafezaService.buildManualVerification(acidNumber);
  }

  @Get('nafeza/declaration/:acid')
  @ApiOperation({
    summary: 'DEPRECATED: Form 46 data requires a logged-in NAFEZA party account',
    description:
      'Returns manual-verification instructions only. Live Form 46 (customs declaration) data is unavailable without accredited MTS Egypt broker integration.',
  })
  async getDeclaration(@Param('acid') acid: string) {
    return this.nafezaService.buildManualVerification(acid);
  }

  // ── DCSA Track & Trace & Demurrage ──
  @Get('dcsa/track')
  @ApiOperation({ summary: 'Track ocean container timeline using DCSA Track & Trace standard' })
  async trackContainer(
    @Query('carrier') carrier: string = 'MSC',
    @Query('container') container: string
  ) {
    return this.dcsaService.getEventsByContainer(carrier, container || 'MSCU7821902');
  }

  @Get('dcsa/demurrage')
  @ApiOperation({ summary: 'Calculate container demurrage & detention (D&D) risk and liabilities' })
  async calculateDemurrage(
    @Query('container') container: string,
    @Query('dischargeDate') dischargeDate: string,
    @Query('freeDays') freeDays?: number
  ) {
    const dDate = dischargeDate ? new Date(dischargeDate) : new Date(Date.now() - 10 * 86400000);
    return this.dcsaService.calculateDemurrage(
      container || 'MSCU7821902',
      dDate,
      freeDays ? Number(freeDays) : 14
    );
  }

  // ── Customer Communications (WhatsApp & Email) ──
  @Post('notify/whatsapp')
  @ApiOperation({ summary: 'Dispatch formatted WhatsApp milestone/acid notification' })
  async sendWhatsApp(@Body() payload: WhatsAppNotificationPayload) {
    return this.communicationService.sendWhatsAppNotification(payload);
  }

  @Post('notify/email')
  @ApiOperation({ summary: 'Dispatch logistics email alert via SMTP gateway' })
  async sendEmail(@Body() payload: EmailNotificationPayload) {
    return this.communicationService.sendEmailNotification(payload);
  }
}
