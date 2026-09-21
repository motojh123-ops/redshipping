import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataStoreService, StoredCustomsDossier } from '../../database/data-store.service';

function isUuid(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

@Injectable()
export class CustomsService {
  constructor(
    private prisma: PrismaService,
    private dataStore: DataStoreService,
  ) {}

  async findAll(tenantId: string, status?: string) {
    try {
      const where: any = { companyId: tenantId };
      if (status && status !== 'all') where.status = status;

      const dossiers = await this.prisma.customsDossier.findMany({
        where,
        include: {
          shipment: {
            select: {
              id: true,
              jobFileNumber: true,
              blNumber: true,
              client: { select: { id: true, name: true } },
            },
          },
          customsBroker: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (dossiers && dossiers.length > 0) return dossiers;
      if (!this.dataStore.isFallbackAllowed()) {
        return dossiers || [];
      }
    } catch (err) {
      if (!this.dataStore.isFallbackAllowed()) {
        throw err;
      }
    }

    let result = [...this.dataStore.customs];
    if (status && status !== 'all') {
      result = result.filter((c) => c.status === status);
    }
    return result;
  }

  async findOne(tenantId: string, id: string) {
    try {
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

      if (dossier) return dossier;
      if (!this.dataStore.isFallbackAllowed()) {
        throw new NotFoundException(`Customs dossier '${id}' not found`);
      }
    } catch (err) {
      if (err instanceof NotFoundException || !this.dataStore.isFallbackAllowed()) {
        throw err;
      }
    }

    const found = this.dataStore.customs.find((c) => c.id === id) || this.dataStore.customs[0];
    return {
      ...found,
      shipment: {
        id: 'ship-1',
        jobFileNumber: found?.shipmentFile || 'RED-2026-0001',
        blNumber: found?.blNumber || 'MAEU982183910',
        client: { id: 'client-1', name: found?.client || 'Al-Ahram Food Industries' },
        containers: [{ id: 'c-1', containerNumber: 'MSKU8849120', containerType: '40HQ', status: 'discharged' }],
        originPort: { id: 'port-7', code: 'CNSHA', nameEn: 'Shanghai Port' },
        destinationPort: { id: 'port-1', code: 'EGALY', nameEn: 'Alexandria Port' },
      },
    };
  }

  async createOrUpdate(tenantId: string, shipmentId: string, data: any) {
    try {
      const where: any = isUuid(shipmentId)
        ? { id: shipmentId, companyId: tenantId }
        : { jobFileNumber: shipmentId, companyId: tenantId };

      const shipment = await this.prisma.shipment.findFirst({ where });
      if (shipment) {
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
        if (data.notes !== undefined) payload.notes = data.notes;

        return await this.prisma.customsDossier.upsert({
          where: { shipmentId: shipment.id },
          create: {
            ...payload,
            shipmentId: shipment.id,
            companyId: tenantId,
          },
          update: payload,
        });
      }

      if (!this.dataStore.isFallbackAllowed()) {
        throw new NotFoundException(`Shipment '${shipmentId}' not found for customs dossier`);
      }
    } catch (err) {
      if (err instanceof NotFoundException || !this.dataStore.isFallbackAllowed()) {
        throw err;
      }
    }

    const existingIdx = this.dataStore.customs.findIndex((c) => c.id === shipmentId || c.shipmentFile === shipmentId);
    if (existingIdx >= 0) {
      this.dataStore.customs[existingIdx] = {
        ...this.dataStore.customs[existingIdx],
        ...data,
      };
      this.dataStore.persist();
      return this.dataStore.customs[existingIdx];
    }

    const newDossier: StoredCustomsDossier = {
      id: `cust-${Date.now()}`,
      acidNumber: data.acidNumber || `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      daysLeft: data.daysLeft || 45,
      certNumber: data.certNumber || `CERT-${Date.now()}`,
      shipmentFile: data.shipmentFile || `RED-2026-000${this.dataStore.customs.length + 1}`,
      blNumber: data.blNumber || `BL-${Date.now()}`,
      client: data.client || 'شركة استيراد مصرية',
      status: data.status || 'acid_issued',
      duties: data.duties || '85,000 EGP',
      vat: data.vat || '65,000 EGP',
      inspectionDate: data.inspectionDate || '2026-09-25',
      port: data.port || 'ميناء الإسكندرية',
      createdAt: new Date().toISOString(),
    };

    this.dataStore.customs.unshift(newDossier);
    this.dataStore.persist();
    return newDossier;
  }
}
