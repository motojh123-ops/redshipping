import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EtaEinvoicingService } from './eta-einvoicing.service';
import { DcsaTrackingService } from './dcsa-tracking.service';
import { NafezaIntegrationService } from './nafeza-integration.service';
import { CommunicationIntegrationService } from './communication-integration.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [ConfigModule],
  controllers: [IntegrationsController],
  providers: [
    EtaEinvoicingService,
    DcsaTrackingService,
    NafezaIntegrationService,
    CommunicationIntegrationService,
  ],
  exports: [
    EtaEinvoicingService,
    DcsaTrackingService,
    NafezaIntegrationService,
    CommunicationIntegrationService,
  ],
})
export class IntegrationsModule {}
