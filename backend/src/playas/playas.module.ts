import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlayasController } from './playas.controller';
import { PlayasService } from './playas.service';

@Module({
  imports: [AuthModule],
  controllers: [PlayasController],
  providers: [PlayasService],
  exports: [PlayasService],
})
export class PlayasModule {}
