import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoiceStatus } from '@banna/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.invoicesService.findAll(tenantId, { status, clientId });
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(tenantId, id);
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.invoicesService.create(tenantId, userId, data);
  }

  @Patch(':id/status')
  async updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('status') status: InvoiceStatus,
  ) {
    return this.invoicesService.updateStatus(tenantId, id, status);
  }
}
