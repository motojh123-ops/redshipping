import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MastersService } from './masters.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  @Get('ports')
  async getPorts(@TenantId() tenantId: string) {
    return this.mastersService.getPorts(tenantId);
  }

  @Get('shipping-lines')
  async getShippingLines(
    @TenantId() tenantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.mastersService.getShippingLines(tenantId, includeInactive === 'true');
  }

  @Post('shipping-lines')
  async createShippingLine(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createShippingLine(tenantId, data);
  }

  @Patch('shipping-lines/:id')
  async updateShippingLine(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.mastersService.updateShippingLine(tenantId, id, data);
  }

  @Get('overseas-agents')
  async getOverseasAgents(
    @TenantId() tenantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.mastersService.getOverseasAgents(tenantId, includeInactive === 'true');
  }

  @Post('overseas-agents')
  async createOverseasAgent(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createOverseasAgent(tenantId, data);
  }

  @Patch('overseas-agents/:id')
  async updateOverseasAgent(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.mastersService.updateOverseasAgent(tenantId, id, data);
  }

  @Get('vendors')
  async getVendors(
    @TenantId() tenantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.mastersService.getVendors(tenantId, includeInactive === 'true');
  }

  @Post('vendors')
  async createVendor(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createVendor(tenantId, data);
  }

  @Patch('vendors/:id')
  async updateVendor(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.mastersService.updateVendor(tenantId, id, data);
  }

  @Get('drivers')
  async getDrivers(
    @TenantId() tenantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.mastersService.getDrivers(tenantId, includeInactive === 'true');
  }

  @Post('drivers')
  async createDriver(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createDriver(tenantId, data);
  }

  @Patch('drivers/:id')
  async updateDriver(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.mastersService.updateDriver(tenantId, id, data);
  }

  @Get('charge-items')
  async getChargeItems(
    @TenantId() tenantId: string,
    @Query('context') context?: 'pricing' | 'quotation' | 'invoice',
  ) {
    return this.mastersService.getChargeItems(tenantId, context);
  }

  @Post('charge-items')
  async createChargeItem(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createChargeItem(tenantId, data);
  }
}
