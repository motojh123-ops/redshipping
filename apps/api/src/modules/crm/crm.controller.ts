import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CrmService, LeadItem, LeadActivity } from './crm.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@banna/shared-types';

@ApiTags('CRM & Sales Pipeline (إدارة الفرص والمبيعات)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('leads')
  @ApiOperation({ summary: 'Get all sales leads with stage and salesperson filtering' })
  @ApiResponse({ status: 200, description: 'List of sales leads' })
  async findAll(
    @TenantId() tenantId: string,
    @Query('stage') stage?: string,
    @Query('salesPerson') salesPerson?: string,
    @Query('search') search?: string,
  ) {
    return this.crmService.findAll(tenantId, { stage, salesPerson, search });
  }

  @Get('leads/stats')
  @ApiOperation({ summary: 'Get sales pipeline KPIs and conversion rate analytics' })
  async getStats(@TenantId() tenantId: string) {
    return this.crmService.getStats(tenantId);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Get details of a specific sales lead' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.crmService.findOne(tenantId, id);
  }

  @Post('leads')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.SALES_REP, UserRole.OPS_OFFICER)
  @ApiOperation({ summary: 'Create a new sales lead in the CRM pipeline' })
  async create(@TenantId() tenantId: string, @Body() data: any) {
    return this.crmService.create(tenantId, data);
  }

  @Patch('leads/:id/stage')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Update sales lead stage in kanban board' })
  async updateStage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('stage') stage: LeadItem['stage'],
    @CurrentUser() user: RequestUser,
  ) {
    return this.crmService.updateStage(tenantId, id, stage, user?.email || 'sales_rep');
  }

  @Post('leads/:id/activities')
  @ApiOperation({ summary: 'Log sales activity (call, email, meeting, WhatsApp, note)' })
  async addActivity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { type: LeadActivity['type']; description: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.crmService.addActivity(tenantId, id, { ...body, user: user?.email || 'sales_rep' });
  }

  @Post('leads/:id/convert')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Convert a won lead into an active client or shipment file' })
  async convert(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('targetType') targetType: 'shipment' | 'client',
  ) {
    return this.crmService.convert(tenantId, id, targetType || 'client');
  }
}
