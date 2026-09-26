import { Controller, Get, Post, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Submit invoice documents to the live Egyptian Tax Authority (ETA) eInvoicing API v1.0' })
  async submitToEta(@Body() body: { documents: EtaDocument[] }) {
    if (!Array.isArray(body?.documents) || body.documents.length === 0) {
      throw new BadRequestException('A non-empty "documents" array is required');
    }
    return this.etaService.submitDocuments(body.documents);
  }

  @Post('eta/invoices/:invoiceId')
  @ApiOperation({
    summary: 'Submit a persisted ERP invoice to the live ETA eInvoicing API',
    description:
      'Builds the ETA document from the real invoice, client and company records and submits it to ETA. Requires ETA_CLIENT_ID/ETA_CLIENT_SECRET configuration.',
  })
  async submitInvoiceToEta(@TenantId() tenantId: string, @Param('invoiceId') invoiceId: string) {
    return this.etaService.submitInvoiceDocument(tenantId, invoiceId);
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
  @ApiOperation({ summary: 'Track ocean container timeline using DCSA Track & Trace standard (reads real shipment events from the DB)' })
  async trackContainer(
    @Query('carrier') carrier: string,
    @Query('container') container: string
  ) {
    if (!container || !container.trim()) {
      throw new BadRequestException('The "container" query parameter is required');
    }
    return this.dcsaService.getEventsByContainer(carrier || '', container);
  }

  @Get('dcsa/demurrage')
  @ApiOperation({ summary: 'Calculate container demurrage & detention (D&D) risk and liabilities' })
  async calculateDemurrage(
    @Query('container') container: string,
    @Query('dischargeDate') dischargeDate: string,
    @Query('gateOutDate') gateOutDate?: string,
    @Query('freeDays') freeDays?: number
  ) {
    if (!container || !container.trim()) {
      throw new BadRequestException('The "container" query parameter is required');
    }
    if (!dischargeDate) {
      throw new BadRequestException('The "dischargeDate" query parameter is required (ISO date)');
    }
    const dDate = new Date(dischargeDate);
    if (isNaN(dDate.getTime())) {
      throw new BadRequestException('dischargeDate must be a valid ISO date');
    }
    return this.dcsaService.calculateDemurrage(
      container,
      dDate,
      freeDays ? Number(freeDays) : 14,
      gateOutDate ? new Date(gateOutDate) : undefined
    );
  }

  // ── Customer Communications (WhatsApp & Email) ──
  @Post('notify/whatsapp')
  @ApiOperation({ summary: 'Dispatch a WhatsApp notification via the Meta Cloud API (requires WHATSAPP_API_TOKEN configuration)' })
  async sendWhatsApp(@Body() payload: WhatsAppNotificationPayload) {
    return this.communicationService.sendWhatsAppNotification(payload);
  }

  @Post('notify/email')
  @ApiOperation({ summary: 'Dispatch a logistics email alert (fails honestly while no SMTP provider is configured)' })
  async sendEmail(@Body() payload: EmailNotificationPayload) {
    return this.communicationService.sendEmailNotification(payload);
  }
}
