export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin',
  SALES_REP = 'sales_rep',
  PRICING_OFFICER = 'pricing_officer',
  OPS_OFFICER = 'ops_officer',
  CLEARANCE_BROKER = 'clearance_broker',
  ACCOUNTANT = 'accountant',
  CLIENT_PORTAL = 'client_portal',
  AGENT_PORTAL = 'agent_portal',
}

export enum ClientStatus {
  PROSPECT = 'prospect',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLACKLISTED = 'blacklisted',
}

export enum ShipmentType {
  FCL = 'fcl',
  LCL = 'lcl',
  AIR = 'air',
  LAND = 'land',
  CLEARANCE_ONLY = 'clearance_only',
}

export enum Incoterm {
  EXW = 'EXW',
  FCA = 'FCA',
  CPT = 'CPT',
  CIP = 'CIP',
  DAP = 'DAP',
  DPU = 'DPU',
  DDP = 'DDP',
  FAS = 'FAS',
  FOB = 'FOB',
  CFR = 'CFR',
  CIF = 'CIF',
}

export enum QuotationStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum ShipmentStage {
  BOOKING_CONFIRMED = 'booking_confirmed',
  CARGO_RECEIVED = 'cargo_received',
  CUSTOMS_SUBMITTED = 'customs_submitted',
  ACID_ISSUED = 'acid_issued',
  IN_TRANSIT = 'in_transit',
  ARRIVED_DESTINATION = 'arrived_destination',
  CLEARANCE_IN_PROGRESS = 'clearance_in_progress',
  RELEASE_ISSUED = 'release_issued',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum ContainerType {
  GP_20 = '20GP',
  GP_40 = '40GP',
  HQ_40 = '40HQ',
  HQ_45 = '45HQ',
  REEFER_20 = '20RF',
  REEFER_40 = '40RF',
  FLAT_RACK = 'FLAT_RACK',
  OPEN_TOP = 'OPEN_TOP',
}

export enum ContainerStatus {
  BOOKED = 'booked',
  LOADED = 'loaded',
  ON_BOARD = 'on_board',
  DISCHARGED = 'discharged',
  GATED_OUT = 'gated_out',
  DELIVERED = 'delivered',
  RETURNED_EMPTY = 'returned_empty',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum InvoiceType {
  CLIENT_FREIGHT = 'client_freight',
  CLIENT_CLEARANCE = 'client_clearance',
  VENDOR_DISBURSEMENT = 'vendor_disbursement',
}

export enum VendorType {
  TRUCKING = 'trucking',
  CLEARANCE = 'clearance',
  PORT_SERVICES = 'port_services',
  WAREHOUSING = 'warehousing',
  FUMIGATION = 'fumigation',
  INSPECTION = 'inspection',
}

export enum ActivityType {
  CALL = 'call',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
}

export enum DocumentCategory {
  BL = 'bl',
  PACKING_LIST = 'packing_list',
  COMMERCIAL_INVOICE = 'commercial_invoice',
  ACID_CERT = 'acid_cert',
  CERT_OF_ORIGIN = 'cert_of_origin',
  EUR1 = 'eur1',
  CUSTOMS_DECLARATION = 'customs_declaration',
  DELIVERY_ORDER = 'delivery_order',
  DISBURSEMENT_RECEIPT = 'disbursement_receipt',
  OTHER = 'other',
}

export enum AuditAction {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
