import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(identidad: DatosToken) {
    if (identidad.tipoCuenta !== 'Cliente') {
      throw new ForbiddenException(
        'La consulta de datos de clientes requiere un alcance por recurso',
      );
    }
    return this.prisma.usuario.findUnique({
      where: { id: identidad.idCuenta },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        email: true,
        telefono: true,
        fechaRegistro: true,
        ciudad: true,
        estado: true,
      },
    });
  }

  async actualizarPerfil(identidad: DatosToken, datos: ActualizarPerfilDto) {
    this.exigirCliente(identidad);
    try {
      return await this.prisma.usuario.update({
        where: { id: identidad.idCuenta },
        data: {
          ...datos,
          ...(datos.email ? { email: datos.email.trim().toLowerCase() } : {}),
        },
        select: this.camposPerfil(),
      });
    } catch (error) {
      if (this.esErrorDeDatoDuplicado(error)) {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }

  async historial(identidad: DatosToken) {
    this.exigirCliente(identidad);
    const idUsuario = identidad.idCuenta;
    const [reservas, estadias, notificaciones] = await Promise.all([
      this.prisma.reserva.findMany({
        where: { idUsuario },
        orderBy: { fechaReserva: 'desc' },
        take: 20,
        select: {
          id: true,
          fechaReserva: true,
          ingreso: true,
          salidaEstimada: true,
          montoSena: true,
          estado: true,
          cochera: {
            select: { numero: true, playa: { select: { id: true, nombre: true } } },
          },
        },
      }),
      this.prisma.estadia.findMany({
        where: { idUsuario },
        orderBy: { fechaIngreso: 'desc' },
        take: 20,
        select: {
          id: true,
          fechaIngreso: true,
          fechaSalida: true,
          montoTotal: true,
          estado: true,
          vehiculo: { select: { patente: true } },
          cochera: {
            select: { numero: true, playa: { select: { id: true, nombre: true } } },
          },
        },
      }),
      this.prisma.notificacion.findMany({
        where: { idUsuario },
        orderBy: { fechaEnvio: 'desc' },
        take: 20,
        select: { id: true, titulo: true, mensaje: true, tipo: true, fechaEnvio: true, leida: true },
      }),
    ]);

    const condicionesPago = [
      ...(reservas.length ? [{ idReserva: { in: reservas.map(({ id }) => id) } }] : []),
      ...(estadias.length ? [{ idEstadia: { in: estadias.map(({ id }) => id) } }] : []),
    ];
    const pagos = condicionesPago.length
      ? await this.prisma.pago.findMany({
          where: { OR: condicionesPago },
          orderBy: { fechaPago: 'desc' },
          take: 20,
          select: {
            id: true,
            fechaPago: true,
            monto: true,
            metodo: true,
            estado: true,
            idReserva: true,
            idEstadia: true,
          },
        })
      : [];

    return { reservas, estadias, pagos, notificaciones };
  }

  async crear(datos: CrearUsuarioDto) {
    const contrasenaHash = await bcrypt.hash(datos.contrasena, 10);

    try {
      return await this.prisma.usuario.create({
        data: {
          ...datos,
          email: datos.email.trim().toLowerCase(),
          contrasena: contrasenaHash,
        },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          dni: true,
          email: true,
          telefono: true,
          fechaRegistro: true,
          ciudad: true,
          estado: true,
        },
      });
    } catch (error) {
      if (this.esErrorDeDatoDuplicado(error)) {
        throw new ConflictException('El DNI o el email ya están registrados');
      }

      throw error;
    }
  }

  private esErrorDeDatoDuplicado(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private exigirCliente(identidad: DatosToken): void {
    if (identidad.tipoCuenta !== 'Cliente') {
      throw new ForbiddenException('Esta operación es exclusiva del cliente');
    }
  }

  private camposPerfil() {
    return {
      id: true,
      nombre: true,
      apellido: true,
      dni: true,
      email: true,
      telefono: true,
      fechaRegistro: true,
      ciudad: true,
      estado: true,
    } as const;
  }
}
