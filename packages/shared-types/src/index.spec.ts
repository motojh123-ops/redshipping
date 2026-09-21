import {
  UserRole,
  ClientStatus,
  ShipmentType,
  Incoterm,
  QuotationStatus,
  ShipmentStage,
  ContainerType,
  InvoiceStatus,
  InvoiceType,
  VendorType,
  DocumentCategory,
  AuditAction,
} from './index';

describe('shared domain enums', () => {
  it('keeps user roles aligned with the tenant RBAC model', () => {
    expect(Object.values(UserRole)).toEqual([
      'super_admin',
      'company_admin',
      'sales_rep',
      'pricing_officer',
      'ops_officer',
      'clearance_broker',
      'accountant',
      'client_portal',
      'agent_portal',
    ]);
  });

  it('keeps the shipment lifecycle stages in order', () => {
    expect(Object.values(ShipmentStage)).toEqual([
      'booking_confirmed',
      'cargo_received',
      'customs_submitted',
      'acid_issued',
      'in_transit',
      'arrived_destination',
      'clearance_in_progress',
      'release_issued',
      'out_for_delivery',
      'delivered',
      'closed',
      'cancelled',
    ]);
  });

  it('uses standard Incoterms 2020 codes', () => {
    expect(Object.values(Incoterm)).toEqual([
      'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF',
    ]);
  });

  it('keeps invoice and client status values in snake_case', () => {
    expect(Object.values(InvoiceStatus)).toContain('partially_paid');
    expect(Object.values(ClientStatus)).toContain('blacklisted');
  });

  it('keeps container type codes in ISO short form', () => {
    expect(ContainerType.HQ_40).toBe('40HQ');
    expect(ContainerType.GP_20).toBe('20GP');
    expect(ContainerType.REEFER_40).toBe('40RF');
  });

  it('keeps invoice types and audit actions stable for the API contract', () => {
    expect(InvoiceType.VENDOR_DISBURSEMENT).toBe('vendor_disbursement');
    expect(AuditAction.DELETE).toBe('DELETE');
    expect(DocumentCategory.ACID_CERT).toBe('acid_cert');
    expect(VendorType.CLEARANCE).toBe('clearance');
    expect(QuotationStatus.EXPIRED).toBe('expired');
    expect(ShipmentType.CLEARANCE_ONLY).toBe('clearance_only');
  });
});
