export declare enum UserRole {
    SUPER_ADMIN = "super_admin",
    COMPANY_ADMIN = "company_admin",
    SALES_REP = "sales_rep",
    PRICING_OFFICER = "pricing_officer",
    OPS_OFFICER = "ops_officer",
    CLEARANCE_BROKER = "clearance_broker",
    ACCOUNTANT = "accountant",
    CLIENT_PORTAL = "client_portal",
    AGENT_PORTAL = "agent_portal"
}
export declare enum ClientStatus {
    PROSPECT = "prospect",
    ACTIVE = "active",
    INACTIVE = "inactive",
    BLACKLISTED = "blacklisted"
}
export declare enum ShipmentType {
    FCL = "fcl",
    LCL = "lcl",
    AIR = "air",
    LAND = "land",
    CLEARANCE_ONLY = "clearance_only"
}
export declare enum Incoterm {
    EXW = "EXW",
    FCA = "FCA",
    CPT = "CPT",
    CIP = "CIP",
    DAP = "DAP",
    DPU = "DPU",
    DDP = "DDP",
    FAS = "FAS",
    FOB = "FOB",
    CFR = "CFR",
    CIF = "CIF"
}
export declare enum QuotationStatus {
    DRAFT = "draft",
    SENT = "sent",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    EXPIRED = "expired"
}
export declare enum ShipmentStage {
    BOOKING_CONFIRMED = "booking_confirmed",
    CARGO_RECEIVED = "cargo_received",
    CUSTOMS_SUBMITTED = "customs_submitted",
    ACID_ISSUED = "acid_issued",
    IN_TRANSIT = "in_transit",
    ARRIVED_DESTINATION = "arrived_destination",
    CLEARANCE_IN_PROGRESS = "clearance_in_progress",
    RELEASE_ISSUED = "release_issued",
    OUT_FOR_DELIVERY = "out_for_delivery",
    DELIVERED = "delivered",
    CLOSED = "closed",
    CANCELLED = "cancelled"
}
export declare enum ContainerType {
    GP_20 = "20GP",
    GP_40 = "40GP",
    HQ_40 = "40HQ",
    HQ_45 = "45HQ",
    REEFER_20 = "20RF",
    REEFER_40 = "40RF",
    FLAT_RACK = "FLAT_RACK",
    OPEN_TOP = "OPEN_TOP"
}
export declare enum ContainerStatus {
    BOOKED = "booked",
    LOADED = "loaded",
    ON_BOARD = "on_board",
    DISCHARGED = "discharged",
    GATED_OUT = "gated_out",
    DELIVERED = "delivered",
    RETURNED_EMPTY = "returned_empty"
}
export declare enum InvoiceStatus {
    DRAFT = "draft",
    ISSUED = "issued",
    PARTIALLY_PAID = "partially_paid",
    PAID = "paid",
    OVERDUE = "overdue",
    CANCELLED = "cancelled"
}
export declare enum InvoiceType {
    CLIENT_FREIGHT = "client_freight",
    CLIENT_CLEARANCE = "client_clearance",
    VENDOR_DISBURSEMENT = "vendor_disbursement"
}
export declare enum VendorType {
    TRUCKING = "trucking",
    CLEARANCE = "clearance",
    PORT_SERVICES = "port_services",
    WAREHOUSING = "warehousing",
    FUMIGATION = "fumigation",
    INSPECTION = "inspection"
}
export declare enum ActivityType {
    CALL = "call",
    WHATSAPP = "whatsapp",
    EMAIL = "email",
    MEETING = "meeting",
    NOTE = "note"
}
export declare enum DocumentCategory {
    BL = "bl",
    PACKING_LIST = "packing_list",
    COMMERCIAL_INVOICE = "commercial_invoice",
    ACID_CERT = "acid_cert",
    CERT_OF_ORIGIN = "cert_of_origin",
    EUR1 = "eur1",
    CUSTOMS_DECLARATION = "customs_declaration",
    DELIVERY_ORDER = "delivery_order",
    DISBURSEMENT_RECEIPT = "disbursement_receipt",
    OTHER = "other"
}
export declare enum AuditAction {
    INSERT = "INSERT",
    UPDATE = "UPDATE",
    DELETE = "DELETE"
}
export interface BaseEntity {
    id: string;
    createdAt: string;
    updatedAt?: string;
}
export interface TenantEntity extends BaseEntity {
    companyId: string;
}
export interface Company extends BaseEntity {
    name: string;
    commercialRegistration?: string;
    taxNumber?: string;
    phone?: string;
    email?: string;
    address?: string;
    logoUrl?: string;
    currencyDefault: string;
    isActive: boolean;
}
export interface User extends TenantEntity {
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    isActive: boolean;
    avatarUrl?: string;
    lastLoginAt?: string;
}
export interface ClientContact extends TenantEntity {
    clientId: string;
    name: string;
    title?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    isPrimary: boolean;
    notes?: string;
}
export interface Client extends TenantEntity {
    name: string;
    tradeName?: string;
    taxNumber?: string;
    commercialReg?: string;
    status: ClientStatus;
    salesRepId?: string;
    category?: string;
    address?: string;
    city?: string;
    country: string;
    notes?: string;
    contacts?: ClientContact[];
}
export interface Port {
    id: string;
    companyId?: string | null;
    code: string;
    nameEn: string;
    nameAr?: string;
    countryCode: string;
    portType: 'sea' | 'air' | 'dry' | 'land';
    isActive: boolean;
}
export interface ShippingLine extends TenantEntity {
    name: string;
    scac?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    isActive: boolean;
}
export interface OverseasAgent extends TenantEntity {
    name: string;
    countryCode: string;
    city: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    specialization?: string;
    isActive: boolean;
}
export interface Vendor extends TenantEntity {
    name: string;
    vendorType: VendorType;
    taxId?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    isActive: boolean;
}
export interface ChargeItem extends TenantEntity {
    nameEn: string;
    nameAr: string;
    code: string;
    category: 'freight' | 'origin_charges' | 'destination_charges' | 'customs_clearance' | 'inland_haulage' | 'other';
    defaultCurrency: string;
    defaultPrice?: number;
    showInPricing: boolean;
    showInQuotation: boolean;
    showInInvoice: boolean;
    isActive: boolean;
}
export interface QuotationItem extends TenantEntity {
    quotationId: string;
    chargeItemId?: string;
    description: string;
    currency: string;
    costRate: number;
    sellRate: number;
    quantity: number;
    unit: string;
    totalCost: number;
    totalSell: number;
    profit: number;
    profitMarginPercent: number;
    showInClientQuote: boolean;
}
export interface Quotation extends TenantEntity {
    quotationNumber: string;
    clientId: string;
    salesRepId: string;
    originPortId?: string;
    destinationPortId?: string;
    shipmentType: ShipmentType;
    incoterm: Incoterm;
    status: QuotationStatus;
    validUntil: string;
    currency: string;
    totalCost: number;
    totalSell: number;
    totalProfit: number;
    estimatedTransitDays?: number;
    termsAndConditions?: string;
    notes?: string;
    items?: QuotationItem[];
}
export interface ShipmentContainer extends TenantEntity {
    shipmentId: string;
    containerNumber?: string;
    containerType: ContainerType;
    sealNumber?: string;
    tareWeightKg?: number;
    cargoWeightKg?: number;
    status: ContainerStatus;
    notes?: string;
}
export interface ShipmentEvent extends TenantEntity {
    shipmentId: string;
    fromStage?: ShipmentStage;
    toStage: ShipmentStage;
    changedById: string;
    notes?: string;
    location?: string;
    eventAt: string;
}
export interface ShipmentCost extends TenantEntity {
    shipmentId: string;
    vendorId?: string;
    chargeItemId?: string;
    description: string;
    currency: string;
    estimatedCost: number;
    actualCost: number;
    isReconciled: boolean;
    notes?: string;
}
export interface CustomsDossier extends TenantEntity {
    shipmentId: string;
    acidNumber?: string;
    acidIssueDate?: string;
    acidExpiryDate?: string;
    customsCertificateNumber?: string;
    customsBrokerId?: string;
    customsValueDeclared?: number;
    dutiesPaid?: number;
    vatPaid?: number;
    inspectionDate?: string;
    releaseDate?: string;
    status: 'acid_requested' | 'acid_issued' | 'docs_submitted' | 'assessed' | 'inspected' | 'duties_paid' | 'released';
    notes?: string;
}
export interface Shipment extends TenantEntity {
    jobFileNumber: string;
    quotationId?: string;
    clientId: string;
    salesRepId?: string;
    opsOfficerId?: string;
    shippingLineId?: string;
    overseasAgentId?: string;
    shipmentType: ShipmentType;
    incoterm: Incoterm;
    originPortId?: string;
    destinationPortId?: string;
    currentStage: ShipmentStage;
    blNumber?: string;
    vesselName?: string;
    voyageNumber?: string;
    etd?: string;
    eta?: string;
    ata?: string;
    cargoDescription?: string;
    grossWeightKg?: number;
    volumeCbm?: number;
    packageCount?: number;
    packageType?: string;
    containers?: ShipmentContainer[];
    events?: ShipmentEvent[];
    customsDossier?: CustomsDossier;
}
export interface InvoiceItem extends TenantEntity {
    invoiceId: string;
    chargeItemId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: string;
}
export interface Invoice extends TenantEntity {
    invoiceNumber: string;
    shipmentId?: string;
    clientId: string;
    invoiceType: InvoiceType;
    status: InvoiceStatus;
    currency: string;
    exchangeRate: number;
    subtotal: number;
    taxAmount: number;
    total: number;
    issueDate?: string;
    dueDate?: string;
    notes?: string;
    createdById?: string;
    items?: InvoiceItem[];
}
export interface CrmActivity extends TenantEntity {
    clientId: string;
    userId: string;
    activityType: ActivityType;
    subject?: string;
    body?: string;
    scheduledAt?: string;
    completedAt?: string;
}
export interface EntityDocument extends TenantEntity {
    entityType: 'shipment' | 'quotation' | 'client' | 'customs_dossier' | 'invoice';
    entityId: string;
    category: DocumentCategory;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageKey: string;
    publicUrl?: string;
    expiryDate?: string;
    ocrExtractedText?: string;
    uploadedById: string;
}
export interface ScheduledReminder extends TenantEntity {
    title: string;
    entityType?: 'shipment' | 'customs_dossier' | 'quotation' | 'client_contact';
    entityId?: string;
    dueAt: string;
    assignedUserId: string;
    isCompleted: boolean;
    priority: 'low' | 'normal' | 'high' | 'urgent';
}
export interface AuditLog {
    id: number;
    companyId: string;
    userId?: string;
    action: AuditAction;
    tableName: string;
    recordId: string;
    oldData?: Record<string, any>;
    newData?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any[];
        timestamp: string;
        path?: string;
    };
}
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
export interface PortDefinition {
    unlocode: string;
    name: string;
    nameAr: string;
    country: string;
    countryCode: string;
    flagEmoji: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    isDryPort?: boolean;
    terminals: string[];
    customsAuthorityCode?: string;
    timeZone: string;
}
export interface MaritimeWaypoint {
    name: string;
    lat: number;
    lng: number;
    description?: string;
}
export interface MaritimeRoute {
    id: string;
    originUnlocode: string;
    destinationUnlocode: string;
    nauticalMiles: number;
    standardTransitDays: number;
    waypoints: MaritimeWaypoint[];
}
export interface ContainerIsoValidationResult {
    rawInput: string;
    isValid: boolean;
    ownerCode?: string;
    equipmentCategory?: 'U' | 'J' | 'Z';
    serialNumber?: string;
    checkDigit?: number;
    calculatedCheckDigit?: number;
    errorMessage?: string;
}
export interface CurrencyDefinition {
    code: string;
    symbol: string;
    name: string;
    nameAr: string;
    rateToEgp: number;
    rateToUsd: number;
    decimals: number;
    isBase?: boolean;
}
export interface DemurrageTier {
    dayRange: string;
    days: number;
    ratePerDayUsd: number;
    totalUsd: number;
    totalEgp: number;
}
export interface DemurrageCalculationResult {
    containerNumber: string;
    containerType: ContainerType;
    dischargedAt: string;
    gatedOutAt?: string;
    freeDays: number;
    totalDaysInPort: number;
    chargeableDays: number;
    isOverdue: boolean;
    tiers: DemurrageTier[];
    totalDemurrageUsd: number;
    totalDemurrageEgp: number;
    currencyRateApplied: number;
}
