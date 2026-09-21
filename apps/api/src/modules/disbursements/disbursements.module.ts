import { Module } from '@nestjs/common';
import { DisbursementsController } from './disbursements.controller';
import { DisbursementsService } from './disbursements.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DisbursementsController],
  providers: [DisbursementsService],
  exports: [DisbursementsService],
})
export class DisbursementsModule {}
