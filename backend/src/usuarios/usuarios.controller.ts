import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DatosToken, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  listar(@Req() request: Request & { user: DatosToken }) {
    return this.usuariosService.listar(request.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  perfil(@Req() request: Request & { user: DatosToken }) {
    return this.usuariosService.listar(request.user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  actualizarPerfil(
    @Body() datos: ActualizarPerfilDto,
    @Req() request: Request & { user: DatosToken },
  ) {
    return this.usuariosService.actualizarPerfil(request.user, datos);
  }

  @Get('me/historial')
  @UseGuards(JwtAuthGuard)
  historial(@Req() request: Request & { user: DatosToken }) {
    return this.usuariosService.historial(request.user);
  }

  @Post()
  crear(@Body() datos: CrearUsuarioDto) {
    return this.usuariosService.crear(datos);
  }
}
