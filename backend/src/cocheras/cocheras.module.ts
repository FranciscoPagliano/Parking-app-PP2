import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CocherasController } from './cocheras.controller';
import { CocherasService } from './cocheras.service';

@Module({
  imports: [AuthModule],
  controllers: [CocherasController],
  providers: [CocherasService],
})
export class CocherasModule {}
