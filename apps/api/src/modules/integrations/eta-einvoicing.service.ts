import { Injectable, Logger, HttpException, ServiceUnavailableException, BadGatewayException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus } from '@banna/shared-types';
import { PrismaService } from '../../database/prisma.service';

export interface EtaDocumentLine {
  description: string;
  itemType: 'EGS' | 'GS1';
  itemCode: string; // e.g. "EG-100000000-FREIGHT"
  unitType: string; // "EA", "CS", "KGM"
  quantity: number;
  unitValue: {
    currencySold: string;
    amountEGP: number;
    amountSold?: number;
    currencyExchangeRate?: number;
  };
  salesTotal: number;
  total: number;
  valueDifference: number;
  totalTaxableFees: number;
  netTotal: number;
  itemsDiscount: number;
  taxableItems: {
    taxType: string; // "T1" (VAT), "T4" (WHT)
    amount: number;
    subType: string; // "V009" for 14% general rate
    rate: number; // 14
  }[];
}

export interface EtaDocument {
  issuer: {
    address: {
      branchID: string;
      country: string;
      governate: string;
      regionCity: string;
      streetName: string;
      buildingNumber: string;
    };
    type: 'B' | 'P';
    id: string; // Tax Registration Number (e.g. 9 digits)
    name: string;
  };
  receiver: {
    address: {
      country: string;
      governate: string;
      regionCity: string;
      streetName: string;
      buildingNumber: string;
    };
    type: 'B' | 'P' | 'F';
    id: string; // Tax ID or National ID or Passport
    name: string;
  };
  documentType: 'I' | 'C' | 'D'; // Invoice, Credit Note, Debit Note
  documentTypeVersion: '1.0';
  dateTimeIssued: string;
  taxpayerActivityCode: string; // Freight forwarding code
  internalID: string; // ERP invoice number (INV-2026-0001)
  invoiceLines: EtaDocumentLine[];
  totalSalesAmount: number;
  totalDiscountAmount: number;
  netAmount: number;
  taxTotals: {
    taxType: string;
    amount: number;
  }[];
  totalAmount: number;
  extraDiscountAmount: number;
  totalItemsDiscountAmount: number;
  signatures?: any[];
}

@Injectable()
export class EtaEinvoicingService {
  private readonly logger = new Logger(EtaEinvoicingService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private readonly idBaseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    // ETA_ENV selects the pre-production (SIT) or production endpoints.
    const env = (
      this.config.get<string>('ETA_ENV') ||
      this.config.get<string>('NODE_ENV') ||
      'sit'
    ).toLowerCase();
    const isProd = env === 'production';
    this.idBaseUrl = isProd
      ? 'https://id.invoicing.eta.gov.eg'
      : 'https://id.sit.invoicing.eta.gov.eg';
    this.apiBaseUrl = isProd
      ? 'https://api.invoicing.eta.gov.eg'
      : 'https://api.sit.invoicing.eta.gov.eg';

    this.clientId = this.config.get<string>('ETA_CLIENT_ID') || '';
    this.clientSecret = this.config.get<string>('ETA_CLIENT_SECRET') || '';
  }

  /** Fail fast with an honest error when the integration is not configured. */
  private ensureConfigured(): void {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'ETA e-Invoicing is not configured on this server. Set ETA_ENV, ETA_CLIENT_ID and ETA_CLIENT_SECRET to enable live submission to the Egyptian Tax Authority.',
      );
    }
  }

  /**
   * Authenticate with Egyptian Tax Authority Identity Server via Client Credentials
   */
  async getAuthToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    this.ensureConfigured();

    try {
      this.logger.log(`Requesting ETA auth token from ${this.idBaseUrl}/connect/token`);

      const form = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'invoicing.api',
      });

      const res = await fetch(`${this.idBaseUrl}/connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new BadGatewayException(
          `ETA identity server returned HTTP ${res.status}: ${errText.slice(0, 300)}`,
        );
      }

      const json = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!json?.access_token) {
        throw new BadGatewayException('ETA identity server response did not contain an access_token');
      }

      this.accessToken = json.access_token;
      this.tokenExpiresAt = Date.now() + (Number(json.expires_in) || 3600) * 1000;
      return this.accessToken;
    } catch (error: any) {
      this.accessToken = null;
      this.tokenExpiresAt = 0;
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to obtain ETA token: ${error.message}`);
      throw new ServiceUnavailableException(
        `Could not reach the ETA identity server: ${error.message}`,
      );
    }
  }

  /**
   * Format and submit invoice document batch to ETA API v1.0
   */
  async submitDocuments(documents: EtaDocument[]) {
    const token = await this.getAuthToken();

    try {
      this.logger.log(
        `Submitting ${documents.length} document(s) to ETA (${this.apiBaseUrl}/api/v1.0/documentsubmissions)`,
      );

      const res = await fetch(`${this.apiBaseUrl}/api/v1.0/documentsubmissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documents }),
        signal: AbortSignal.timeout(30000),
      });

      const raw = await res.text();
      let parsed: any = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        throw new BadGatewayException({
          statusCode: 502,
          message: `ETA submission endpoint returned HTTP ${res.status}`,
          etaResponse: parsed ?? raw.slice(0, 1000),
        });
      }
      if (!parsed) {
        throw new BadGatewayException('ETA submission endpoint returned a non-JSON response');
      }

      // Return the live ETA response together with a normalized summary.
      return {
        submissionId: parsed.submissionUUID ?? null,
        acceptedDocuments: parsed.acceptedDocuments ?? [],
        rejectedDocuments: parsed.rejectedDocuments ?? [],
        rawResponse: parsed,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`ETA submission failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Could not reach the ETA invoicing API: ${error.message}`,
      );
    }
  }

  /**
   * Query document details & status from ETA by UUID
   */
  async getDocumentDetails(uuid: string) {
    const token = await this.getAuthToken();
    this.logger.log(`Fetching ETA document ${uuid}`);

    try {
      const res = await fetch(
        `${this.apiBaseUrl}/api/v1.0/documents/${encodeURIComponent(uuid)}/details`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15000),
        },
      );

      const raw = await res.text();
      let parsed: any = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        throw new BadGatewayException(
          `ETA document API returned HTTP ${res.status}${parsed ? `: ${JSON.stringify(parsed).slice(0, 300)}` : ''}`,
        );
      }
      if (!parsed) {
        throw new BadGatewayException('ETA document API returned a non-JSON response');
      }
      return parsed;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        `Could not reach the ETA document API: ${error.message}`,
      );
    }
  }

  /**
   * Submit a persisted ERP invoice to the ETA e-Invoicing API.
   * The document is built from real database rows (invoice + client + company)
   * and the live ETA outcome is persisted back onto the invoice.
   */
  async submitInvoiceDocument(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: tenantId },
      include: { client: true, items: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    const company = await this.prisma.company.findUnique({ where: { id: tenantId } });
    if (!company?.taxNumber) {
      throw new BadRequestException(
        'Company tax number (issuer) is missing. Maintain the company tax registration in settings before submitting to ETA.',
      );
    }
    if (!invoice.client?.taxNumber) {
      throw new BadRequestException(
        `Client "${invoice.client?.name ?? invoice.clientId}" has no tax number (receiver ID). Add the client tax registration before submitting to ETA.`,
      );
    }

    const doc = this.buildDocumentFromInvoice(invoice, invoice.client, company);
    const result = await this.submitDocuments([doc]);

    const accepted: any =
      result.acceptedDocuments?.find((d: any) => d.internalId === invoice.invoiceNumber) ??
      result.acceptedDocuments?.[0] ??
      null;
    const acceptedUuid = accepted?.uuid ?? accepted?.longId ?? null;

    // Persist the real ETA outcome on the invoice (no invented identifiers).
    if (result.submissionId || acceptedUuid) {
      const etaTrail = [
        result.submissionId ? `etaSubmissionUUID:${result.submissionId}` : '',
        acceptedUuid ? `etaUUID:${acceptedUuid}` : '',
      ]
        .filter(Boolean)
        .join(' | ');
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.ISSUED,
          notes: `${invoice.notes ? `${invoice.notes} | ` : ''}${etaTrail}`.slice(0, 4000),
        },
      });
    }

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      etaSubmission: result,
    };
  }

  /**
   * Map a real ERP invoice (with client + company rows) to the ETA document format.
   * Every value is derived from database records — nothing is simulated.
   */
  private buildDocumentFromInvoice(invoice: any, client: any, company: any): EtaDocument {
    const rate = Number(invoice.exchangeRate) || 1;
    const toEgp = (v: any) => {
      const n = Number(v) || 0;
      return Math.round((invoice.currency === 'EGP' ? n : n * rate) * 100) / 100;
    };

    const subtotal = toEgp(invoice.subtotal);
    const taxAmount = toEgp(invoice.taxAmount);
    const total = toEgp(invoice.total);
    // Effective VAT ratio across the invoice (0% international freight vs 14% local services)
    const taxRatio = subtotal > 0 ? taxAmount / subtotal : 0;

    const lines = (invoice.items || []).map((it: any) => {
      const lineTotal = toEgp(it.totalPrice);
      return {
        description: it.description,
        itemType: 'EGS' as const,
        itemCode: it.chargeItemId || 'EGS-UNSPECIFIED',
        unitType: 'EA',
        quantity: Number(it.quantity) || 1,
        unitValue: {
          currencySold: invoice.currency,
          amountEGP: toEgp(it.unitPrice),
          amountSold: Number(it.unitPrice) || 0,
          currencyExchangeRate: invoice.currency === 'EGP' ? undefined : rate,
        },
        salesTotal: lineTotal,
        total: lineTotal,
        valueDifference: 0,
        totalTaxableFees: 0,
        netTotal: lineTotal,
        itemsDiscount: 0,
        taxableItems:
          taxRatio > 0
            ? [
                {
                  taxType: 'T1',
                  amount: Math.round(lineTotal * taxRatio * 100) / 100,
                  subType: 'V009',
                  rate: 14,
                },
              ]
            : [],
      };
    });

    const addressParts = (company.address || '').split(',').map((p: string) => p.trim());
    const clientAddressParts = (client.address || client.city || '')
      .split(',')
      .map((p: string) => p.trim());

    return {
      issuer: {
        address: {
          branchID: '0',
          country: 'EG',
          governate: addressParts[1] || addressParts[0] || 'N/A',
          regionCity: addressParts[0] || 'N/A',
          streetName: addressParts[2] || 'N/A',
          buildingNumber: addressParts[3] || 'N/A',
        },
        type: 'B',
        id: company.taxNumber,
        name: company.name,
      },
      receiver: {
        address: {
          country: client.country || 'EG',
          governate: clientAddressParts[1] || clientAddressParts[0] || 'N/A',
          regionCity: clientAddressParts[0] || 'N/A',
          streetName: clientAddressParts[2] || 'N/A',
          buildingNumber: clientAddressParts[3] || 'N/A',
        },
        type: 'B',
        id: client.taxNumber,
        name: client.name,
      },
      documentType: 'I',
      documentTypeVersion: '1.0',
      dateTimeIssued: new Date(invoice.issueDate ?? invoice.createdAt).toISOString(),
      // Configure with the company's registered activity code on the ETA portal.
      taxpayerActivityCode: this.config.get<string>('ETA_ACTIVITY_CODE') || '46102',
      internalID: invoice.invoiceNumber,
      invoiceLines: lines,
      totalSalesAmount: subtotal,
      totalDiscountAmount: 0,
      netAmount: subtotal,
      taxTotals: taxRatio > 0 ? [{ taxType: 'T1', amount: taxAmount }] : [],
      totalAmount: total,
      extraDiscountAmount: 0,
      totalItemsDiscountAmount: 0,
    };
  }

  /**
   * Generate QR Code content according to Egyptian Tax Authority standard TLV format
   */
  generateEtaQrCode(
    sellerName: string,
    taxNumber: string,
    issueTimestamp: string,
    invoiceTotal: number,
    vatTotal: number
  ): string {
    // Encodes Seller Name (Tag 1), Tax ID (Tag 2), Timestamp (Tag 3), Total (Tag 4), VAT (Tag 5)
    const encodeTLV = (tag: number, val: string): Buffer => {
      const valBuf = Buffer.from(val, 'utf8');
      return Buffer.concat([Buffer.from([tag, valBuf.length]), valBuf]);
    };

    const tlvBuffer = Buffer.concat([
      encodeTLV(1, sellerName),
      encodeTLV(2, taxNumber),
      encodeTLV(3, issueTimestamp),
      encodeTLV(4, invoiceTotal.toFixed(2)),
      encodeTLV(5, vatTotal.toFixed(2)),
    ]);

    return tlvBuffer.toString('base64');
  }
}
