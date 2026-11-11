import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { DatosToken, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarCocheraDto } from './dto/actualizar-cochera.dto';
import { CrearCocheraDto } from './dto/crear-cochera.dto';
import { ListaCocherasQueryDto } from './dto/lista-cocheras-query.dto';
import { CocherasService } from './cocheras.service';

@Controller('playas/:playaId/cocheras')
export class CocherasController {
  constructor(private readonly cocheras: CocherasService) {}

  @Get('disponibles')
  disponibles(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Query() pagina: ListaCocherasQueryDto,
  ) {
    return this.cocheras.disponibles(playaId, pagina);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno', 'Empleado')
  listar(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Req() request: Request & { user: DatosToken },
    @Query() pagina: ListaCocherasQueryDto,
  ) {
    return this.cocheras.listar(request.user, playaId, pagina);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno')
  crear(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Body() dto: CrearCocheraDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.cocheras.crear(request.user, playaId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno', 'Empleado')
  detalle(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.cocheras.detalle(request.user, playaId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Dueno')
  actualizar(
    @Param('playaId', ParseIntPipe) playaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCocheraDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.cocheras.actualizar(request.user, playaId, id, dto);
  }
}
