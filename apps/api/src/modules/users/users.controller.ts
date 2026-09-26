import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@banna/shared-types';

@ApiTags('Users & Team Management (إدارة المستخدمين والفريق)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List company users (tenant-scoped, real database records)' })
  @ApiResponse({ status: 200, description: 'Company users without password hashes' })
  async findAll(@TenantId() tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single company user by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.usersService.findOne(tenantId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Create a real user account (name, email, password, role) — persisted in PostgreSQL' })
  async create(@TenantId() tenantId: string, @Body() data: any) {
    return this.usersService.create(tenantId, data);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Update user profile, role, activation status or reset password' })
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.usersService.update(tenantId, id, data);
  }
}