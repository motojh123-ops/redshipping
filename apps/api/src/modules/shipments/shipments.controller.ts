import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShipmentStage } from '@banna/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('stage') stage?: string,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.shipmentsService.findAll(tenantId, { stage, clientId, search });
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.shipmentsService.findOne(tenantId, id);
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.shipmentsService.create(tenantId, userId, data);
  }

  @Patch(':id/stage')
  async updateStage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { stage: ShipmentStage; notes?: string },
  ) {
    return this.shipmentsService.updateStage(tenantId, id, userId, body.stage, body.notes);
  }

  @Post(':id/containers')
  async addContainer(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.shipmentsService.addContainer(tenantId, id, data);
  }

  @Post(':id/costs')
  async addCost(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.shipmentsService.addCost(tenantId, id, data);
  }

  @Patch(':id/containers/:containerId')
  async updateContainerStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('containerId') containerId: string,
    @Body() data: any,
  ) {
    return this.shipmentsService.updateContainerStatus(tenantId, id, containerId, data);
  }

  @Patch(':id/costs/:costId')
  async reconcileCost(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('costId') costId: string,
    @Body() data: any,
  ) {
    return this.shipmentsService.reconcileCost(tenantId, id, costId, data);
  }

  @Get(':id/timeline')
  async getTimeline(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.shipmentsService.getTimeline(tenantId, id);
  }
}

