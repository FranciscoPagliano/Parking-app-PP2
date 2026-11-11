import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TarifasController } from './tarifas.controller';
import { TarifasService } from './tarifas.service';

@Module({
  imports: [AuthModule],
  controllers: [TarifasController],
  providers: [TarifasService],
})
export class TarifasModule {}
