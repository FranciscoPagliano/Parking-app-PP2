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
import { ActualizarPlayaDto } from './dto/actualizar-playa.dto';
import { CrearPlayaDto } from './dto/crear-playa.dto';
import { PlayasService } from './playas.service';

@Controller('playas')
export class PlayasController {
  constructor(private readonly playas: PlayasService) {}

  @Get('publicas')
  listarPublicas() {
    return this.playas.listarPublicas();
  }

  @Get('publicas/:id')
  detallePublico(@Param('id', ParseIntPipe) id: number) {
    return this.playas.detallePublico(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno', 'Empleado')
  listarAutorizadas(@Req() request: Request & { user: DatosToken }) {
    return this.playas.listarAutorizadas(request.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno', 'Empleado')
  detalle(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.playas.detalleAutorizado(request.user, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno')
  crear(
    @Body() dto: CrearPlayaDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.playas.crear(request.user, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPlayaDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.playas.actualizar(request.user, id, dto);
  }
}
