import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';
import { QuotationStatus } from '@banna/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.quotationsService.findAll(tenantId, { status, clientId });
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.quotationsService.findOne(tenantId, id);
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.quotationsService.create(tenantId, userId, data);
  }

  @Patch(':id/status')
  async updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { status: QuotationStatus },
  ) {
    return this.quotationsService.updateStatus(tenantId, id, body.status);
  }

  @Post(':id/accept')
  async acceptAndConvert(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationsService.acceptAndConvertToShipment(tenantId, id, userId);
  }

  @Post(':id/clone')
  async clone(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationsService.cloneQuotation(tenantId, id, userId);
  }

  @Post(':id/items')
  async addItem(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.quotationsService.addItem(tenantId, id, data);
  }

  @Delete(':id/items/:itemId')
  async removeItem(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.quotationsService.removeItem(tenantId, id, itemId);
  }
}

