import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@banna/shared-types';

export class ResetDataDto {
  scope?: 'operational' | 'all';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('data-stats')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  async getDataStats(@TenantId() tenantId: string) {
    return this.systemService.getDataStats(tenantId);
  }

  @Post('reset-data')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  async resetData(
    @TenantId() tenantId: string,
    @Body() dto: ResetDataDto,
  ) {
    const scope = dto.scope === 'all' ? 'all' : 'operational';
    return this.systemService.resetData(tenantId, scope);
  }
}
