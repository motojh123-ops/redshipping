import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MastersModule } from './modules/masters/masters.module';
import { ClientsModule } from './modules/clients/clients.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { CustomsModule } from './modules/customs/customs.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MaritimeModule } from './maritime/maritime.module';
import { DisbursementsModule } from './modules/disbursements/disbursements.module';
import { CrmModule } from './modules/crm/crm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 150,
      },
    ]),
    DatabaseModule,
    AuthModule,
    HealthModule,
    MastersModule,
    ClientsModule,
    QuotationsModule,
    ShipmentsModule,
    CustomsModule,
    InvoicesModule,
    IntegrationsModule,
    PricingModule,
    DispatchModule,
    NotificationsModule,
    ReportsModule,
    MaritimeModule,
    DisbursementsModule,
    CrmModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
