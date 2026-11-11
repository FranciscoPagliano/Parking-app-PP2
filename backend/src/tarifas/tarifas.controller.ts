import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { DatosToken, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarTarifaDto } from './dto/actualizar-tarifa.dto';
import { CrearTarifaDto } from './dto/crear-tarifa.dto';
import { TarifasService } from './tarifas.service';

@Controller('playas/:playaId/tarifas')
export class TarifasController {
  constructor(private readonly tarifas: TarifasService) {}

  @Get()
  listar(@Param('playaId', ParseIntPipe) playaId: number) {
    return this.tarifas.listarPublicas(playaId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno')
  crear(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Body() dto: CrearTarifaDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.tarifas.crear(request.user, playaId, dto);
  }

  @Patch(':tarifaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno')
  actualizar(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Param('tarifaId', ParseIntPipe) tarifaId: number,
    @Body() dto: ActualizarTarifaDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.tarifas.actualizar(request.user, playaId, tarifaId, dto);
  }
}
