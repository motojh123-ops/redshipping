import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

function isUuid(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

@Injectable()
export class CustomsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, status?: string) {
    const where: any = { companyId: tenantId };
    if (status && status !== 'all') where.status = status;

    return this.prisma.customsDossier.findMany({
      where,
      include: {
        shipment: {
          select: {
            id: true,
            jobFileNumber: true,
            blNumber: true,
            client: { select: { id: true, name: true } },
            originPort: { select: { id: true, code: true, nameEn: true, nameAr: true } },
            destinationPort: { select: { id: true, code: true, nameEn: true, nameAr: true } },
          },
        },
        customsBroker: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const where: any = isUuid(id)
      ? { companyId: tenantId, OR: [{ id }, { shipmentId: id }] }
      : { companyId: tenantId, shipment: { jobFileNumber: id } };

    const dossier = await this.prisma.customsDossier.findFirst({
      where,
      include: {
        shipment: {
          include: {
            client: true,
            containers: true,
            originPort: true,
            destinationPort: true,
          },
        },
        customsBroker: true,
      },
    });

    if (!dossier) {
      throw new NotFoundException(`Customs dossier '${id}' not found`);
    }
    return dossier;
  }

  async createOrUpdate(tenantId: string, shipmentId: string, data: any) {
    const where: any = isUuid(shipmentId)
      ? { id: shipmentId, companyId: tenantId }
      : { jobFileNumber: shipmentId, companyId: tenantId };

    const shipment = await this.prisma.shipment.findFirst({ where });
    if (!shipment) {
      throw new NotFoundException(`Shipment '${shipmentId}' not found for customs dossier`);
    }

    const payload: any = {};
    if (data.acidNumber !== undefined) payload.acidNumber = data.acidNumber;
    if (data.acidIssueDate !== undefined) payload.acidIssueDate = new Date(data.acidIssueDate);
    if (data.acidExpiryDate !== undefined) payload.acidExpiryDate = new Date(data.acidExpiryDate);
    if (data.customsCertificateNumber !== undefined) payload.customsCertificateNumber = data.customsCertificateNumber;
    if (data.customsBrokerId !== undefined) payload.customsBrokerId = data.customsBrokerId;
    if (data.customsValueDeclared !== undefined) payload.customsValueDeclared = data.customsValueDeclared;
    if (data.dutiesPaid !== undefined) payload.dutiesPaid = data.dutiesPaid;
    if (data.vatPaid !== undefined) payload.vatPaid = data.vatPaid;
    if (data.inspectionDate !== undefined) payload.inspectionDate = new Date(data.inspectionDate);
    if (data.releaseDate !== undefined) payload.releaseDate = new Date(data.releaseDate);
    if (data.status !== undefined) payload.status = data.status;
    if (data.nafezaVerifiedAt !== undefined) payload.nafezaVerifiedAt = data.nafezaVerifiedAt ? new Date(data.nafezaVerifiedAt) : null;
    if (data.notes !== undefined) payload.notes = data.notes;

    return this.prisma.customsDossier.upsert({
      where: { shipmentId: shipment.id },
      create: {
        ...payload,
        shipmentId: shipment.id,
        companyId: tenantId,
      },
      update: payload,
    });
  }
}
