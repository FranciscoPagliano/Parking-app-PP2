import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { AuthorizationService } from '../auth/authorization.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPlayaDto } from './dto/actualizar-playa.dto';
import { CrearPlayaDto } from './dto/crear-playa.dto';

const horaADate = (hora: string) => new Date(`1970-01-01T${hora}:00.000Z`);
const dateAHora = (hora: Date) =>
  `${String(hora.getUTCHours()).padStart(2, '0')}:${String(hora.getUTCMinutes()).padStart(2, '0')}`;

@Injectable()
export class PlayasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  async listarPublicas() {
    const playas = await this.prisma.playaEstacionamiento.findMany({
      select: {
        id: true,
        nombre: true,
        direccion: true,
        telefono: true,
        horaApertura: true,
        horaCierre: true,
        capacidad: true,
        permiteReservas: true,
        _count: { select: { cocheras: true } },
      },
      orderBy: { id: 'asc' },
    });
    return playas.map((playa) => this.formatoPublico(playa));
  }

  async detallePublico(id: number) {
    const playa = await this.prisma.playaEstacionamiento.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        telefono: true,
        horaApertura: true,
        horaCierre: true,
        capacidad: true,
        permiteReservas: true,
        _count: { select: { cocheras: true } },
      },
    });
    if (!playa) throw new NotFoundException('Playa no encontrada');
    return this.formatoPublico(playa);
  }

  async listarAutorizadas(identity: DatosToken) {
    if (identity.tipoCuenta === 'Dueno') {
      return this.prisma.playaEstacionamiento.findMany({
        where: { idDueno: identity.idCuenta },
        select: {
          id: true,
          nombre: true,
          direccion: true,
          telefono: true,
          horaApertura: true,
          horaCierre: true,
          capacidad: true,
          permiteReservas: true,
          _count: { select: { cocheras: true } },
        },
        orderBy: { id: 'asc' },
      }).then((playas) => playas.map((playa) => this.formatoPublico(playa)));
    }

    const empleado = await this.prisma.empleado.findUnique({
      where: { id: identity.idCuenta },
      select: { idPlaya: true, estado: true },
    });
    if (!empleado || empleado.estado !== 'Activo') {
      throw new NotFoundException('No se encontró una playa asignada');
    }
    return [await this.detalleAutorizado(identity, empleado.idPlaya)];
  }

  async detalleAutorizado(identity: DatosToken, id: number) {
    if (identity.tipoCuenta === 'Dueno') {
      await this.authorization.assertDuenoOwnsPlaya(identity, id);
    } else {
      await this.authorization.assertEmpleadoAssignedToPlaya(identity, id);
    }
    const playa = await this.prisma.playaEstacionamiento.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        telefono: true,
        horaApertura: true,
        horaCierre: true,
        capacidad: true,
        permiteReservas: true,
      },
    });
    if (!playa) throw new NotFoundException('Playa no encontrada');
    const estados = await this.prisma.cochera.groupBy({
      by: ['estado'],
      where: { idPlaya: id },
      _count: { _all: true },
    });
    return {
      ...this.formatoPublico(playa),
      estadoGeneral: {
        cocherasConfiguradas: estados.reduce((sum, row) => sum + row._count._all, 0),
        cocherasPorEstado: Object.fromEntries(
          estados.map((row) => [row.estado, row._count._all]),
        ),
      },
    };
  }

  async crear(identity: DatosToken, dto: CrearPlayaDto) {
    this.validarHorario(dto.horaApertura, dto.horaCierre);
    const playa = await this.prisma.playaEstacionamiento.create({
      data: {
        nombre: dto.nombre,
        direccion: dto.direccion,
        telefono: dto.telefono,
        horaApertura: horaADate(dto.horaApertura),
        horaCierre: horaADate(dto.horaCierre),
        capacidad: dto.capacidad,
        permiteReservas: dto.permiteReservas,
        idDueno: identity.idCuenta,
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        telefono: true,
        horaApertura: true,
        horaCierre: true,
        capacidad: true,
        permiteReservas: true,
      },
    });
    return this.formatoPublico(playa);
  }

  async actualizar(identity: DatosToken, id: number, dto: ActualizarPlayaDto) {
    await this.authorization.assertDuenoOwnsPlaya(identity, id);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id_playa FROM PlayaEstacionamiento WHERE id_playa = ${id} FOR UPDATE`;
        const actual = await tx.playaEstacionamiento.findUnique({
          where: { id },
          select: {
            capacidad: true,
            horaApertura: true,
            horaCierre: true,
            _count: { select: { cocheras: true } },
          },
        });
        if (!actual) throw new NotFoundException('Playa no encontrada');

        const horaApertura = dto.horaApertura ?? dateAHora(actual.horaApertura);
        const horaCierre = dto.horaCierre ?? dateAHora(actual.horaCierre);
        this.validarHorario(horaApertura, horaCierre);
        if (dto.capacidad !== undefined && dto.capacidad < actual._count.cocheras) {
          throw new ConflictException('La capacidad no puede ser menor a las cocheras existentes');
        }

        const playa = await tx.playaEstacionamiento.update({
          where: { id },
          data: {
            ...dto,
            ...(dto.horaApertura ? { horaApertura: horaADate(dto.horaApertura) } : {}),
            ...(dto.horaCierre ? { horaCierre: horaADate(dto.horaCierre) } : {}),
          },
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true,
            horaApertura: true,
            horaCierre: true,
            capacidad: true,
            permiteReservas: true,
          },
        });
        return this.formatoPublico(playa);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private validarHorario(apertura: string, cierre: string): void {
    if (apertura >= cierre) {
      throw new UnprocessableEntityException(
        'La hora de apertura debe ser anterior a la hora de cierre del mismo día',
      );
    }
  }

  private formatoPublico<T extends {
    horaApertura: Date;
    horaCierre: Date;
    _count?: { cocheras: number };
  }>(playa: T) {
    const { _count, ...datos } = playa;
    return {
      ...datos,
      horaApertura: dateAHora(playa.horaApertura),
      horaCierre: dateAHora(playa.horaCierre),
      ...(typeof _count?.cocheras === 'number'
        ? { cocherasConfiguradas: _count.cocheras }
        : {}),
    };
  }
}
