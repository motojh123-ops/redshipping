import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InvoiceStatus } from '@banna/shared-types';
import { extractSequenceNumber } from '../../common/utils/numbering.util';

function isUuid(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { status?: any; clientId?: string }) {
    const where: any = { companyId: tenantId };
    if (query?.status) where.status = query.status;
    if (query?.clientId) where.clientId = query.clientId;

    return this.prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        shipment: { select: { id: true, jobFileNumber: true, blNumber: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const where: any = isUuid(id)
      ? { id, companyId: tenantId }
      : { invoiceNumber: id, companyId: tenantId };

    const invoice = await this.prisma.invoice.findFirst({
      where,
      include: {
        client: true,
        shipment: true,
        items: { include: { chargeItem: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  async create(tenantId: string, userId: string, data: any) {
    let subtotal = 0;
    const formattedItems = (data.items || []).map((item: any) => {
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const totalPrice = qty * unitPrice;
      subtotal += totalPrice;

      return {
        companyId: tenantId,
        chargeItemId: item.chargeItemId,
        description: item.description,
        quantity: qty,
        unitPrice,
        totalPrice,
        currency: item.currency || 'USD',
      };
    });

    const taxRate = Number(data.taxRate ?? 0.14);
    // Per-line taxability (e.g. 0% international freight vs 14% local services)
    // is resolved by the caller and sent as an explicit taxAmount; otherwise
    // the flat taxRate applies.
    const taxAmount =
      data.taxAmount != null && Number.isFinite(Number(data.taxAmount))
        ? Math.round(Number(data.taxAmount) * 100) / 100
        : Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + taxAmount;

    let resolvedShipmentId = data.shipmentId;
    if (resolvedShipmentId) {
      const where: any = isUuid(resolvedShipmentId)
        ? { id: resolvedShipmentId, companyId: tenantId }
        : { jobFileNumber: resolvedShipmentId, companyId: tenantId };
      const shipment = await this.prisma.shipment.findFirst({
        where,
        select: { id: true },
      });
      if (shipment) {
        resolvedShipmentId = shipment.id;
      }
    }

    let resolvedClientId = data.clientId;
    if (resolvedClientId) {
      const where: any = isUuid(resolvedClientId)
        ? { id: resolvedClientId, companyId: tenantId }
        : { name: resolvedClientId, companyId: tenantId };
      const client = await this.prisma.client.findFirst({
        where,
        select: { id: true },
      });
      if (client) {
        resolvedClientId = client.id;
      }
    }

    if (!resolvedClientId || !isUuid(resolvedClientId)) {
      throw new NotFoundException('A valid clientId is required to create an invoice');
    }

    let invoiceType: any = (data.invoiceType || 'client_freight').toString().toLowerCase();
    if (!['client_freight', 'client_clearance', 'vendor_disbursement'].includes(invoiceType)) {
      invoiceType = 'client_freight';
    }

    let status: any = (data.status || 'draft').toString().toLowerCase();
    if (!['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'].includes(status)) {
      status = 'draft';
    }

    const year = new Date().getFullYear();
    const latest = await this.prisma.invoice.findFirst({
      where: {
        companyId: tenantId,
        invoiceNumber: { startsWith: `INV-${year}-` },
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    const nextSeq = extractSequenceNumber(latest?.invoiceNumber) + 1;
    const invoiceNumber = `INV-${year}-${String(nextSeq).padStart(4, '0')}`;

    try {
      return await this.prisma.invoice.create({
        data: {
          companyId: tenantId,
          invoiceNumber,
          shipmentId: resolvedShipmentId,
          clientId: resolvedClientId,
          invoiceType,
          status,
          currency: data.currency || 'USD',
          exchangeRate: data.exchangeRate || 1.0,
          subtotal,
          taxAmount,
          total,
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          notes: data.notes,
          createdById: userId,
          items: {
            create: formattedItems,
          },
        },
        include: { items: true, client: true },
      });
    } catch (err: any) {
      this.logger.error(`Database error creating invoice: ${err.message}`, err.stack);
      throw err;
    }
  }

  async updateStatus(tenantId: string, id: string, status: any) {
    const normalizedStatus: any = (status || 'draft').toString().toLowerCase();
    if (!Object.values(InvoiceStatus).includes(normalizedStatus)) {
      throw new NotFoundException(`Invalid invoice status '${status}'`);
    }
    try {
      return await this.prisma.invoice.update({
        where: { id },
        data: { status: normalizedStatus },
      });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException(`Invoice with ID ${id} not found`);
      }
      throw err;
    }
  }
}
