import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpi-summary')
  async getExecutiveKpiSummary(@TenantId() tenantId: string) {
    return this.reportsService.getExecutiveKpiSummary(tenantId);
  }

  @Get('lanes-performance')
  async getLanesPerformance(@TenantId() tenantId: string) {
    return this.reportsService.getLanesPerformance(tenantId);
  }
}
