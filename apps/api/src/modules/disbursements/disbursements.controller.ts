import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DisbursementsService } from './disbursements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@banna/shared-types';

@ApiTags('Disbursements & Treasury (أذون الصرف والخزينة)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('disbursements')
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all disbursement vouchers with filtering by category and status' })
  @ApiResponse({ status: 200, description: 'List of disbursement vouchers' })
  async findAll(
    @TenantId() tenantId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.disbursementsService.findAll(tenantId, { category, status, search });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get financial summary and KPIs for disbursements & treasury liabilities' })
  @ApiResponse({ status: 200, description: 'Disbursements KPI summary' })
  async getStats(@TenantId() tenantId: string) {
    return this.disbursementsService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific disbursement voucher' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.disbursementsService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new disbursement payment voucher' })
  @ApiResponse({ status: 201, description: 'Disbursement voucher created' })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.disbursementsService.create(tenantId, userId, data);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Approve disbursement voucher (Accountant / Financial Manager / Admin)' })
  @ApiResponse({ status: 200, description: 'Voucher approved successfully' })
  async approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.disbursementsService.approve(tenantId, id, user?.email || 'المدير المالي');
  }

  @Patch(':id/pay')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Execute voucher payment and settle from bank/petty cash treasury' })
  @ApiResponse({ status: 200, description: 'Payment recorded and voucher settled' })
  async pay(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() payData: { receiptNumber?: string; paymentDate?: string; treasury?: string },
  ) {
    return this.disbursementsService.pay(tenantId, id, payData);
  }
}
