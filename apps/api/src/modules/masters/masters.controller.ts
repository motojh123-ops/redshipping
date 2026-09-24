import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
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
  async getShippingLines(@TenantId() tenantId: string) {
    return this.mastersService.getShippingLines(tenantId);
  }

  @Post('shipping-lines')
  async createShippingLine(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createShippingLine(tenantId, data);
  }

  @Get('overseas-agents')
  async getOverseasAgents(@TenantId() tenantId: string) {
    return this.mastersService.getOverseasAgents(tenantId);
  }

  @Post('overseas-agents')
  async createOverseasAgent(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createOverseasAgent(tenantId, data);
  }

  @Get('vendors')
  async getVendors(@TenantId() tenantId: string) {
    return this.mastersService.getVendors(tenantId);
  }

  @Post('vendors')
  async createVendor(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createVendor(tenantId, data);
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
