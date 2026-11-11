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
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { CrearVehiculoDto } from './dto/crear-vehiculo.dto';
import { VehiculosService } from './vehiculos.service';

@Controller('vehiculos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Cliente')
export class VehiculosController {
  constructor(private readonly vehiculos: VehiculosService) {}

  @Get()
  listar(@Req() request: Request & { user: DatosToken }) {
    return this.vehiculos.listar(request.user);
  }

  @Post()
  crear(
    @Body() dto: CrearVehiculoDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.vehiculos.crear(request.user, dto);
  }

  @Get(':id')
  detalle(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.vehiculos.detalle(request.user, id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarVehiculoDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.vehiculos.actualizar(request.user, id, dto);
  }
}
