import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { DatabaseModule } from '../../database/database.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { DisbursementsModule } from '../disbursements/disbursements.module';

@Module({
  imports: [DatabaseModule, DispatchModule, DisbursementsModule],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
