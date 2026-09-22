import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ShipmentStageChangedListener } from './shipment-stage-changed.listener';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, ShipmentStageChangedListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
