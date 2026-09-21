import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomsService } from './customs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('customs')
export class CustomsController {
  constructor(private readonly customsService: CustomsService) {}

  @Get()
  async findAll(@TenantId() tenantId: string, @Query('status') status?: string) {
    return this.customsService.findAll(tenantId, status);
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.customsService.findOne(tenantId, id);
  }

  @Post(':shipmentId')
  async createOrUpdate(
    @TenantId() tenantId: string,
    @Param('shipmentId') shipmentId: string,
    @Body() data: any,
  ) {
    return this.customsService.createOrUpdate(tenantId, shipmentId, data);
  }
}
