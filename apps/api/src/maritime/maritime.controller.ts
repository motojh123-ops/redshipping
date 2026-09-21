import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MaritimeService } from './maritime.service';

@ApiTags('Maritime & Logistics Masters')
@Controller('maritime')
export class MaritimeController {
  constructor(private readonly maritimeService: MaritimeService) {}

  @Get('countries')
  @ApiOperation({ summary: 'Get all 250 countries with ISO codes, official Arabic names, capitals, currencies, and coordinates' })
  @ApiQuery({ name: 'q', required: false, description: 'Search country by Arabic name, English name, or ISO code' })
  getCountries(@Query('q') q?: string) {
    const data = q ? this.maritimeService.searchCountries(q) : this.maritimeService.getAllCountries();
    return {
      success: true,
      count: data.length,
      data,
    };
  }

  @Get('ports')
  @ApiOperation({ summary: 'Get all UN/LOCODE sea ports, dry ports, and land border crossings' })
  @ApiQuery({ name: 'q', required: false, description: 'Search port by name, Arabic name, or UN/LOCODE' })
  @ApiQuery({ name: 'country', required: false, description: 'Filter by ISO 2 country code (e.g. EG, SA, CN)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by port type: sea | dry | land_crossing | air' })
  getPorts(
    @Query('q') q?: string,
    @Query('country') country?: string,
    @Query('type') type?: string
  ) {
    const data = this.maritimeService.getAllPorts(q, country, type);
    return {
      success: true,
      count: data.length,
      data,
    };
  }

  @Get('ports/:unlocode')
  @ApiOperation({ summary: 'Get port details by UN/LOCODE (e.g. EGALY, EGSKX, EGSLM, EGDOC)' })
  getPort(@Param('unlocode') unlocode: string) {
    const port = this.maritimeService.getPortByUnlocode(unlocode);
    return {
      success: !!port,
      data: port,
    };
  }

  @Get('land-corridors')
  @ApiOperation({ summary: 'Get international overland freight corridors and border crossings (TIR, Arab Mashreq, Cairo-Cape Town)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by corridor type: land | multimodal | sea_land' })
  getTradeCorridors(@Query('type') type?: string) {
    const data = this.maritimeService.getTradeCorridors(type);
    return {
      success: true,
      count: data.length,
      data,
    };
  }

  @Get('land-corridors/:id')
  @ApiOperation({ summary: 'Get trade corridor details by ID or code' })
  getTradeCorridor(@Param('id') id: string) {
    const corridor = this.maritimeService.getTradeCorridorById(id);
    return {
      success: !!corridor,
      data: corridor,
    };
  }

  @Get('currencies')
  @ApiOperation({ summary: 'Get official FX rates (EGP, USD, EUR, AED, SAR, CNY, GBP)' })
  getCurrencies() {
    return {
      success: true,
      data: this.maritimeService.getCurrencies(),
    };
  }

  @Get('validate-container/:number')
  @ApiOperation({ summary: 'Validate ISO 6346 container number and check-digit' })
  validateContainer(@Param('number') containerNumber: string) {
    const result = this.maritimeService.validateContainerNumber(containerNumber);
    return {
      success: true,
      data: result,
    };
  }

  @Get('distance')
  @ApiOperation({ summary: 'Calculate nautical miles and transit time between two UN/LOCODEs' })
  getDistance(
    @Query('origin') origin: string,
    @Query('destination') destination: string
  ) {
    const result = this.maritimeService.calculateSeaDistance(origin, destination);
    return {
      success: true,
      data: {
        origin,
        destination,
        ...result,
      },
    };
  }
}
