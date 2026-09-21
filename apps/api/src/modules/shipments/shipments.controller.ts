import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ShipmentStage, UserRole } from '@banna/shared-types';
import { CreateShipmentDto, UpdateShipmentStageDto } from './dto/create-shipment.dto';

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
  @Roles(UserRole.OPS_OFFICER, UserRole.COMPANY_ADMIN, UserRole.SALES_REP)
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shipmentsService.create(tenantId, userId, dto);
  }

  @Patch(':id/stage')
  @Roles(UserRole.OPS_OFFICER, UserRole.COMPANY_ADMIN)
  async updateStage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateShipmentStageDto,
  ) {
    return this.shipmentsService.updateStage(tenantId, id, userId, dto.stage, dto.notes);
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

