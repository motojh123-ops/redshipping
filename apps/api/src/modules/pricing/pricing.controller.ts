import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('tariffs')
  async getTariffs(
    @TenantId() tenantId: string,
    @Query('category') category?: string,
    @Query('carrierCode') carrierCode?: string,
    @Query('origin') origin?: string,
    @Query('destination') destination?: string,
    @Query('containerType') containerType?: string,
  ) {
    return this.pricingService.getTariffs(tenantId, {
      category,
      carrierCode,
      origin,
      destination,
      containerType,
    });
  }

  @Get('tariffs/:id')
  async getTariffById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pricingService.getTariffById(tenantId, id);
  }

  @Post('tariffs')
  async createTariff(@TenantId() tenantId: string, @Body() dto: any) {
    return this.pricingService.createTariff(tenantId, dto);
  }

  // ── Default rates per charge item (prefill source for quotation lines) ──
  @Get('item-rates')
  async getItemRates(@TenantId() tenantId: string) {
    return this.pricingService.getItemRates(tenantId);
  }

  @Put('item-rates/:chargeItemId')
  async upsertItemRate(
    @TenantId() tenantId: string,
    @Param('chargeItemId') chargeItemId: string,
    @Body() dto: any,
  ) {
    return this.pricingService.upsertItemRate(tenantId, chargeItemId, dto);
  }

  @Post('estimate')
  async calculateEstimate(
    @TenantId() tenantId: string,
    @Body()
    body: {
      originPortCode: string;
      destinationPortCode: string;
      containerType: string;
      quantity: number;
      includeClearance?: boolean;
      includeInland?: boolean;
    },
  ) {
    return this.pricingService.calculateQuoteEstimate(tenantId, body);
  }
}
