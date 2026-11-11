import {
  Injectable,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, TipoCuenta } from './dto/login.dto';

type Cuenta = {
  id: number;
  email: string;
  contrasena: string;
  estado: string;
  nombre: string;
  apellido: string;
  tipoCuenta: TipoCuenta;
};

const MAX_INTENTOS_FALLIDOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const MENSAJE_LOGIN = 'Email, contraseña o tipo de cuenta incorrectos';
const HASH_CEBO = bcrypt.hashSync('clave-ficticia-no-valida-para-login', 10);

@Injectable()
export class AuthService {
  private readonly intentos = new Map<string, { cantidad: number; vence: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(datos: LoginDto, ip: string) {
    const email = datos.email.trim().toLowerCase();
    const claveIntentos = createHash('sha256')
      .update(`${ip}:${datos.tipoCuenta}:${email}`)
      .digest('hex');
    const ahora = Date.now();
    this.limpiarIntentosVencidos(ahora);
    const registro = this.intentos.get(claveIntentos);

    if (registro && registro.cantidad >= MAX_INTENTOS_FALLIDOS) {
      throw new HttpException('Demasiados intentos. Intenta más tarde.', 429);
    }
    this.registrarIntentoFallido(claveIntentos, ahora);

    const cuenta = await this.buscarCuenta(email, datos.tipoCuenta);
    const contrasenaValida = await bcrypt.compare(
      datos.contrasena,
      cuenta?.contrasena ?? HASH_CEBO,
    );
    if (!cuenta || cuenta.estado !== 'Activo' || !contrasenaValida) {
      throw new UnauthorizedException(MENSAJE_LOGIN);
    }

    this.intentos.delete(claveIntentos);
    const rol = cuenta.tipoCuenta;
    const accessToken = await this.jwtService.signAsync({
      sub: `${cuenta.tipoCuenta}:${cuenta.id}`,
      idCuenta: cuenta.id,
      tipoCuenta: cuenta.tipoCuenta,
      email: cuenta.email,
      rol,
      estado: cuenta.estado,
    });

    return {
      mensaje: 'Inicio de sesión exitoso',
      accessToken,
      perfil: {
        id: cuenta.id,
        tipoCuenta: cuenta.tipoCuenta,
        nombre: cuenta.nombre,
        apellido: cuenta.apellido,
        email: cuenta.email,
        rol,
        estado: cuenta.estado,
      },
    };
  }

  private async buscarCuenta(
    email: string,
    tipoCuenta: TipoCuenta,
  ): Promise<Cuenta | null> {
    if (tipoCuenta === TipoCuenta.Cliente) {
      const cuenta = await this.prisma.usuario.findUnique({ where: { email } });
      return cuenta ? { ...cuenta, tipoCuenta } : null;
    }
    if (tipoCuenta === TipoCuenta.Empleado) {
      const cuenta = await this.prisma.empleado.findUnique({ where: { email } });
      return cuenta ? { ...cuenta, tipoCuenta } : null;
    }

    const cuenta = await this.prisma.dueno.findUnique({ where: { email } });
    return cuenta ? { ...cuenta, tipoCuenta } : null;
  }

  private registrarIntentoFallido(clave: string, ahora: number): void {
    if (this.intentos.size >= 10_000 && !this.intentos.has(clave)) {
      const primeraClave = this.intentos.keys().next().value;
      if (primeraClave) this.intentos.delete(primeraClave);
    }
    const actual = this.intentos.get(clave);
    this.intentos.set(clave, {
      cantidad: (actual?.cantidad ?? 0) + 1,
      vence: actual?.vence ?? ahora + VENTANA_MS,
    });
  }

  private limpiarIntentosVencidos(ahora: number): void {
    for (const [clave, registro] of this.intentos) {
      if (registro.vence <= ahora) this.intentos.delete(clave);
    }
  }
}
