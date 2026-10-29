import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('full') full?: string,
  ) {
    return this.clientsService.findAll(tenantId, { status, search, full });
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.clientsService.findOne(tenantId, id);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() data: any) {
    return this.clientsService.create(tenantId, data);
  }

  @Patch(':id')
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.clientsService.update(tenantId, id, data);
  }

  // ── Branches & loading addresses (الفروع وعناوين التحميل — §5ب) ──
  @Post(':id/branches')
  async addBranch(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.clientsService.addBranch(tenantId, id, data);
  }

  @Patch(':id/branches/:branchId')
  async updateBranch(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Body() data: any,
  ) {
    return this.clientsService.updateBranch(tenantId, id, branchId, data);
  }

  @Delete(':id/branches/:branchId')
  async deleteBranch(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
  ) {
    return this.clientsService.deleteBranch(tenantId, id, branchId);
  }

  // ── Persons in charge (جهات الاتصال — مع ربط اختياري بفرع) ──
  @Post(':id/contacts')
  async addContact(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.clientsService.addContact(tenantId, id, data);
  }

  @Patch(':id/contacts/:contactId')
  async updateContact(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() data: any,
  ) {
    return this.clientsService.updateContact(tenantId, id, contactId, data);
  }

  @Delete(':id/contacts/:contactId')
  async deleteContact(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.clientsService.deleteContact(tenantId, id, contactId);
  }

  @Post(':id/activities')
  async addActivity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.clientsService.addActivity(tenantId, id, userId, data);
  }
}
