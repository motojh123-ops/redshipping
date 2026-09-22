export type DocumentType = 'invoice' | 'quotation' | 'bill_of_lading' | 'customs_declaration' | 'report';

export interface PdfJobData {
  documentType: DocumentType;
  documentId: string;
  tenantId?: string;
  fileName?: string;
  htmlContent?: string;
  data?: {
    title?: string;
    number?: string;
    date?: string;
    clientName?: string;
    clientEmail?: string;
    origin?: string;
    destination?: string;
    currency?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal?: number;
    taxRate?: number;
    taxAmount?: number;
    totalAmount?: number;
    notes?: string;
    acidNumber?: string;
    containerCount?: number;
  };
}

export interface PdfJobResult {
  success: boolean;
  documentId?: string;
  filePath: string;
  fileName: string;
  sizeBytes: number;
  generatedAt: string;
}

export type ReminderType = 'acid_expiry' | 'demurrage_warning' | 'eta_alert';

export interface ReminderJobData {
  type: ReminderType;
  tenantId?: string;
  acidData?: {
    dossierId: string;
    acidNumber: string;
    expiryDate: string; // ISO string
    clientName?: string;
    shipmentRef?: string;
  };
  demurrageData?: {
    containerNumber: string;
    shipmentRef: string;
    dischargeDate: string; // ISO string
    freeDays: number;
    tier1DailyRate?: number;
    tier2DailyRate?: number;
    currentDate?: string; // For testing/reconciliation
  };
  etaData?: {
    shipmentId: string;
    trackingNumber: string;
    portOfDischarge: string;
    eta: string; // ISO string
    clientName?: string;
  };
}

export interface ReminderJobResult {
  type: ReminderType;
  alertLevel: 'info' | 'warning' | 'critical' | 'normal';
  message: string;
  daysRemaining?: number;
  daysOverdue?: number;
  demurrageTier?: number;
  demurrageEstimatedCost?: number;
  notifiedAt: string;
}
