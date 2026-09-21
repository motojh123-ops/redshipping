import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async checkHealth() {
    let dbStatus = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        api: 'running',
      },
    };
  }

  @Public()
  @Get('ready')
  async checkReady() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready' };
  }
}
