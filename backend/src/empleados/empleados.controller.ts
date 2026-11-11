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
import { ActualizarEmpleadoDto } from './dto/actualizar-empleado.dto';
import { ActualizarEstadoEmpleadoDto } from './dto/actualizar-estado-empleado.dto';
import { CrearEmpleadoDto } from './dto/crear-empleado.dto';
import { ReasignarEmpleadoDto } from './dto/reasignar-empleado.dto';
import { EmpleadosService } from './empleados.service';

@Controller('playas/:playaId/empleados')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Dueno')
export class EmpleadosController {
  constructor(private readonly empleados: EmpleadosService) {}

  @Get()
  listar(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.empleados.listar(request.user, playaId);
  }

  @Post()
  crear(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Body() dto: CrearEmpleadoDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.empleados.crear(request.user, playaId, dto);
  }

  @Get(':id')
  detalle(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.empleados.detalle(request.user, playaId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEmpleadoDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.empleados.actualizar(request.user, playaId, id, dto);
  }

  @Patch(':id/estado')
  actualizarEstado(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEstadoEmpleadoDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.empleados.actualizarEstado(request.user, playaId, id, dto.estado);
  }

  @Patch(':id/traslado')
  reasignar(
    @Param('playaId', ParseIntPipe) playaActual: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReasignarEmpleadoDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.empleados.reasignar(request.user, playaActual, id, dto.playaId);
  }
}
