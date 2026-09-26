import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';

/** Friendly/UI role aliases → the real Prisma UserRole enum values. */
const ROLE_ALIASES: Record<string, string> = {
  sales: 'sales_rep',
  sales_rep: 'sales_rep',
  operations: 'ops_officer',
  ops_officer: 'ops_officer',
  accountant: 'accountant',
  customs: 'clearance_broker',
  customs_broker: 'clearance_broker',
  clearance_broker: 'clearance_broker',
  pricing: 'pricing_officer',
  pricing_officer: 'pricing_officer',
  admin: 'company_admin',
  company_admin: 'company_admin',
  super_admin: 'super_admin',
};

const VALID_ROLES = [
  'super_admin',
  'company_admin',
  'sales_rep',
  'pricing_officer',
  'ops_officer',
  'clearance_broker',
  'accountant',
  'client_portal',
  'agent_portal',
];

/** Fields safe to return to clients — never expose password hashes. */
const PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { companyId: tenantId },
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId: tenantId },
      select: PUBLIC_SELECT,
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(tenantId: string, data: any) {
    const name = String(data?.name || '').trim();
    const email = String(data?.email || '').trim().toLowerCase();
    const password = String(data?.password || '');

    if (!name) {
      throw new BadRequestException('User name is required');
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('A valid work email is required');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const role = ROLE_ALIASES[String(data?.role || '').toLowerCase()] || 'sales_rep';
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestException(`Invalid role "${data?.role}"`);
    }

    const existing = await this.prisma.user.findFirst({
      where: { companyId: tenantId, email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in the company');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        companyId: tenantId,
        name,
        email,
        passwordHash,
        role: role as any,
        phone: data?.phone ? String(data.phone).trim() : null,
      },
      select: PUBLIC_SELECT,
    });

    this.logger.log(`User "${email}" created with role ${role}`);
    return user;
  }

  async update(tenantId: string, id: string, data: any) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId: tenantId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updateData: any = {};
    if (data?.name != null) updateData.name = String(data.name).trim();
    if (data?.phone != null) updateData.phone = String(data.phone).trim();
    if (data?.isActive != null) updateData.isActive = Boolean(data.isActive);
    if (data?.role != null) {
      const role = ROLE_ALIASES[String(data.role).toLowerCase()];
      if (!role || !VALID_ROLES.includes(role)) {
        throw new BadRequestException(`Invalid role "${data.role}"`);
      }
      updateData.role = role;
    }
    if (data?.password) {
      const password = String(data.password);
      if (password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: PUBLIC_SELECT,
    });
  }
}