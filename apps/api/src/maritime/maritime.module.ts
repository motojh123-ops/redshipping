import { Module } from '@nestjs/common';
import { MaritimeController } from './maritime.controller';
import { MaritimeService } from './maritime.service';

@Module({
  controllers: [MaritimeController],
  providers: [MaritimeService],
  exports: [MaritimeService],
})
export class MaritimeModule {}
