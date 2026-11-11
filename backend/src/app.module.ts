import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PlayasModule } from './playas/playas.module';
import { EmpleadosModule } from './empleados/empleados.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { TarifasModule } from './tarifas/tarifas.module';
import { CocherasModule } from './cocheras/cocheras.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const secret = config.JWT_SECRET;
        if (
          typeof secret !== 'string' ||
          secret.length < 32 ||
          secret.includes('REEMPLAZAR_POR')
        ) {
          throw new Error('JWT_SECRET debe tener al menos 32 caracteres aleatorios');
        }
        if (config.PORT) {
          const port = Number(config.PORT);
          if (!Number.isInteger(port) || port < 1 || port > 65_535) {
            throw new Error('PORT debe ser un puerto entre 1 y 65535');
          }
        }
        return config;
      },
    }),
    PrismaModule,
    HealthModule,
    UsuariosModule,
    AuthModule,
    PlayasModule,
    EmpleadosModule,
    VehiculosModule,
    TarifasModule,
    CocherasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
