import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoCuenta } from '../dto/login.dto';

export type Rol = 'Cliente' | 'Empleado' | 'Dueno';

export type DatosToken = {
  sub: string;
  idCuenta: number;
  tipoCuenta: TipoCuenta;
  email: string;
  rol: Rol;
  estado: 'Activo';
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const partes = request.headers.authorization?.trim().split(/\s+/) ?? [];
    const [tipo, token] = partes;

    if (partes.length !== 2 || tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Debes enviar un token Bearer');
    }

    let claims: DatosToken;
    try {
      claims = await this.jwtService.verifyAsync<DatosToken>(token);
    } catch {
      throw new UnauthorizedException('El token no es válido o ya venció');
    }

    if (
      !claims ||
      !Object.values(TipoCuenta).includes(claims.tipoCuenta) ||
      !Number.isInteger(claims.idCuenta) ||
      typeof claims.email !== 'string' ||
      claims.sub !== `${claims.tipoCuenta}:${claims.idCuenta}` ||
      claims.rol !== claims.tipoCuenta ||
      claims.estado !== 'Activo'
    ) {
      throw new UnauthorizedException('El token no es válido o ya venció');
    }

    const cuenta = await this.buscarEstadoActual(claims);
    if (!cuenta || cuenta.estado !== 'Activo' || cuenta.email !== claims.email) {
      throw new UnauthorizedException('La cuenta ya no está activa');
    }
    request.user = claims;
    return true;
  }

  private buscarEstadoActual(claims: DatosToken) {
    switch (claims.tipoCuenta) {
      case TipoCuenta.Cliente:
        return this.prisma.usuario.findUnique({
          where: { id: claims.idCuenta },
          select: { email: true, estado: true },
        });
      case TipoCuenta.Empleado:
        return this.prisma.empleado.findUnique({
          where: { id: claims.idCuenta },
          select: { email: true, estado: true },
        });
      case TipoCuenta.Dueno:
        return this.prisma.dueno.findUnique({
          where: { id: claims.idCuenta },
          select: { email: true, estado: true },
        });
      default:
        throw new Error('Invalid account type');
    }
  }
}
