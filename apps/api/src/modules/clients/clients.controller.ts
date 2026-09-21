import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.clientsService.findAll(tenantId, { status, search });
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.clientsService.findOne(tenantId, id);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() data: any) {
    return this.clientsService.create(tenantId, data);
  }

  @Post(':id/activities')
  async addActivity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.clientsService.addActivity(tenantId, id, userId, data);
  }
}
