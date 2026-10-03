import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MastersService } from './masters.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Masters — المرجعيات (dynamic libraries, cities, hierarchy & alerts)')
@UseGuards(JwtAuthGuard)
@Controller('masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  // ── Dynamic reference libraries (وحدات الحساب / التصنيفات اللوجستية / أنواع الموانئ) ──
  @Get('libraries/:lib')
  @ApiOperation({ summary: 'List library items (units | logistics-categories | port-types) — seeds approved defaults on first use' })
  async getLibrary(@TenantId() tenantId: string, @Param('lib') lib: string) {
    return this.mastersService.getLibrary(tenantId, lib);
  }

  @Post('libraries/:lib')
  @ApiOperation({ summary: 'Add an item to a dynamic library' })
  async createLibraryItem(
    @TenantId() tenantId: string,
    @Param('lib') lib: string,
    @Body() data: any,
  ) {
    return this.mastersService.createLibraryItem(tenantId, lib, data);
  }

  @Patch('libraries/:lib/:id')
  @ApiOperation({ summary: 'Update a library item' })
  async updateLibraryItem(
    @TenantId() tenantId: string,
    @Param('lib') lib: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.mastersService.updateLibraryItem(tenantId, lib, id, data);
  }

  @Delete('libraries/:lib/:id')
  @ApiOperation({ summary: 'Delete a library item (deactivates it if currently referenced)' })
  async deleteLibraryItem(
    @TenantId() tenantId: string,
    @Param('lib') lib: string,
    @Param('id') id: string,
  ) {
    return this.mastersService.deleteLibraryItem(tenantId, lib, id);
  }

  // ── Country Atlas: cities (أطلس الدول — المدن) ──
  @Get('cities')
  @ApiOperation({ summary: 'List managed cities (optionally filtered by 2-letter countryCode)' })
  async getCities(@TenantId() tenantId: string, @Query('countryCode') countryCode?: string) {
    return this.mastersService.getCities(tenantId, countryCode);
  }

  @Post('cities')
  @ApiOperation({ summary: 'Add a city to a country' })
  async createCity(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createCity(tenantId, data);
  }

  @Patch('cities/:id')
  async updateCity(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.mastersService.updateCity(tenantId, id, data);
  }

  @Delete('cities/:id')
  async deleteCity(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.deleteCity(tenantId, id);
  }

  // ── Ports registry (سجل الموانئ) ──
  @Get('ports')
  async getPorts(
    @TenantId() tenantId: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    return this.mastersService.getPorts(tenantId, includeInactive === 'true', countryCode);
  }

  @Post('ports')
  @ApiOperation({ summary: 'Add a port bound to a dynamic port type' })
  async createPort(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createPort(tenantId, data);
  }

  @Patch('ports/:id')
  async updatePort(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.mastersService.updatePort(tenantId, id, data);
  }

  @Delete('ports/:id')
  async deletePort(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.deletePort(tenantId, id);
  }

  // ── Entity documents (مرفقات السجلات الرسمية — سجل تجاري / بطاقة ضريبية / رخص...) ──
  @Get('documents')
  @ApiOperation({ summary: 'List documents attached to a vendor / shipping line / overseas agent / driver' })
  async getEntityDocuments(
    @TenantId() tenantId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.mastersService.getEntityDocuments(tenantId, entityType, entityId);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Attach a document (base64 payload ≤ 4MB)' })
  async uploadEntityDocument(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.mastersService.uploadEntityDocument(tenantId, userId, data);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Fetch a document payload for download' })
  async downloadEntityDocument(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.downloadEntityDocument(tenantId, id);
  }

  @Delete('documents/:id')
  async deleteEntityDocument(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.deleteEntityDocument(tenantId, id);
  }

  // ── Shipping lines (multi-level hierarchy) ──
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
  async updateShippingLine(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.mastersService.updateShippingLine(tenantId, id, data);
  }

  // ── Overseas agents (branches + persons in charge + multi services) ──
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
  async updateOverseasAgent(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.mastersService.updateOverseasAgent(tenantId, id, data);
  }

  // ── Vendors (multi services + official registration + contacts tree) ──
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
  async updateVendor(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.mastersService.updateVendor(tenantId, id, data);
  }

  // ── Drivers ──
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
  async updateDriver(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.mastersService.updateDriver(tenantId, id, data);
  }

  // ── Charge items (linked to dynamic libraries) ──
  @Get('charge-items')
  async getChargeItems(
    @TenantId() tenantId: string,
    @Query('context') context?: string,
  ) {
    return this.mastersService.getChargeItems(tenantId, context);
  }

  @Post('charge-items')
  async createChargeItem(@TenantId() tenantId: string, @Body() data: any) {
    return this.mastersService.createChargeItem(tenantId, data);
  }

  @Patch('charge-items/:id')
  async updateChargeItem(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.mastersService.updateChargeItem(tenantId, id, data);
  }

  @Delete('charge-items/:id')
  @ApiOperation({ summary: 'Soft-delete a charge item (kept for historical documents)' })
  async deleteChargeItem(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.deleteChargeItem(tenantId, id);
  }

  // ── Expiry alerts feed (محرك تنبيهات تواريخ الانتهاء) ──
  @Get('expiry-alerts')
  @ApiOperation({ summary: 'Commercial registries, tax cards and driver licenses nearing expiry — feed for the Alarms screen' })
  async getExpiryAlerts(@TenantId() tenantId: string) {
    return this.mastersService.getExpiryAlerts(tenantId);
  }
}