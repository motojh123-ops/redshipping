import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get('trips')
  async getTrips(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.dispatchService.getTrips(tenantId, { status, search });
  }

  @Get('trips/:id')
  async getTripById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.dispatchService.getTripById(tenantId, id);
  }

  @Post('trips')
  async createTrip(@TenantId() tenantId: string, @Body() dto: any) {
    return this.dispatchService.createTrip(tenantId, dto);
  }

  @Patch('trips/:id/status')
  async updateTripStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('status') status: any,
  ) {
    return this.dispatchService.updateTripStatus(tenantId, id, status);
  }
}
