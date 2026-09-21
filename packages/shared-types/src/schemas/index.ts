import { z } from 'zod';
import {
  ClientStatus,
  ContainerStatus,
  ContainerType,
  Incoterm,
  InvoiceStatus,
  InvoiceType,
  QuotationStatus,
  ShipmentStage,
  ShipmentType,
  UserRole,
} from '../enums';

// ==========================================
// AUTH SCHEMAS
// ==========================================

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ==========================================
// CLIENT SCHEMAS
// ==========================================

export const createClientContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  title: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  isPrimary: z.boolean().default(false),
});

export const createClientSchema = z.object({
  name: z.string().trim().min(2, 'Company/Client name must be at least 2 characters'),
  tradeName: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  commercialReg: z.string().trim().optional(),
  status: z.nativeEnum(ClientStatus).default(ClientStatus.ACTIVE),
  category: z.string().optional().default('General Import/Export'),
  address: z.string().optional(),
  city: z.string().optional().default('Cairo'),
  country: z.string().optional().default('Egypt'),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  commodityInterest: z.string().optional(),
  salesRepId: z.string().optional(),
  contacts: z.array(createClientContactSchema).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

// ==========================================
// CONTAINER & SHIPMENT SCHEMAS
// ==========================================

export const createContainerSchema = z.object({
  containerNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}[UJZ]\d{7}$/, 'Container must match ISO 6346 (e.g. MSCU9041280)')
    .or(z.string().min(4)),
  containerType: z.nativeEnum(ContainerType).default(ContainerType.HQ_40),
  sealNumber: z.string().trim().optional(),
  tareWeightKg: z.coerce.number().positive().optional().nullable(),
  cargoWeightKg: z.coerce.number().positive().optional().nullable(),
  status: z.nativeEnum(ContainerStatus).default(ContainerStatus.BOOKED),
});

export type CreateContainerInput = z.infer<typeof createContainerSchema>;

export const createShipmentSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  shipmentType: z.nativeEnum(ShipmentType).default(ShipmentType.FCL),
  incoterm: z.nativeEnum(Incoterm).default(Incoterm.FOB),
  originPortId: z.string().optional().nullable(),
  destinationPortId: z.string().optional().nullable(),
  shippingLineId: z.string().optional().nullable(),
  overseasAgentId: z.string().optional().nullable(),
  salesRepId: z.string().optional().nullable(),
  opsOfficerId: z.string().optional().nullable(),
  currentStage: z.nativeEnum(ShipmentStage).default(ShipmentStage.BOOKING_CONFIRMED),
  blNumber: z.string().trim().optional().nullable(),
  vesselName: z.string().trim().optional().nullable(),
  voyageNumber: z.string().trim().optional().nullable(),
  etd: z.string().optional().nullable(),
  eta: z.string().optional().nullable(),
  freeDaysAllowed: z.coerce.number().int().min(0).default(14),
  cargoDescription: z.string().optional().nullable(),
  grossWeightKg: z.coerce.number().positive().optional().nullable(),
  volumeCbm: z.coerce.number().positive().optional().nullable(),
  packageCount: z.coerce.number().int().positive().optional().nullable(),
  packageType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  containers: z.array(createContainerSchema).optional().default([]),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const updateShipmentStageSchema = z.object({
  stage: z.nativeEnum(ShipmentStage),
  notes: z.string().trim().optional(),
});

export type UpdateShipmentStageInput = z.infer<typeof updateShipmentStageSchema>;

// ==========================================
// INVOICE SCHEMAS
// ==========================================

export const createInvoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative'),
  currency: z.string().default('USD'),
  chargeItemId: z.string().optional().nullable(),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  shipmentId: z.string().optional().nullable(),
  invoiceType: z.nativeEnum(InvoiceType).default(InvoiceType.CLIENT_FREIGHT),
  currency: z.string().default('USD'),
  exchangeRate: z.coerce.number().positive().default(1.0),
  taxRate: z.coerce.number().min(0).max(1).default(0.14),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(createInvoiceItemSchema).min(1, 'At least one invoice item is required'),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ==========================================
// QUOTATION SCHEMAS
// ==========================================

export const createQuotationItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  quantity: z.coerce.number().positive().default(1),
  unit: z.string().default('container'),
  currency: z.string().default('USD'),
  costRate: z.coerce.number().min(0).default(0),
  sellRate: z.coerce.number().min(0).default(0),
  chargeItemId: z.string().optional().nullable(),
});

export const createQuotationSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  shipmentType: z.nativeEnum(ShipmentType).default(ShipmentType.FCL),
  incoterm: z.nativeEnum(Incoterm).default(Incoterm.FOB),
  originPortId: z.string().optional().nullable(),
  destinationPortId: z.string().optional().nullable(),
  validUntil: z.string().optional(),
  currency: z.string().default('USD'),
  notes: z.string().optional().nullable(),
  items: z.array(createQuotationItemSchema).default([]),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
