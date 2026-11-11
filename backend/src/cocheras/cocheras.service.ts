import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarCocheraDto } from './dto/actualizar-cochera.dto';
import { CrearCocheraDto } from './dto/crear-cochera.dto';
import { ListaCocherasQueryDto } from './dto/lista-cocheras-query.dto';

@Injectable()
export class CocherasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  async disponibles(playaId: number, pagina: ListaCocherasQueryDto) {
    await this.exigirPlaya(playaId);
    return this.listadoPaginado(playaId, 'Disponible', pagina);
  }

  async listar(identity: DatosToken, playaId: number, pagina: ListaCocherasQueryDto) {
    await this.exigirAccesoPlaya(identity, playaId);
    return this.listadoPaginado(playaId, undefined, pagina);
  }

  private async listadoPaginado(
    playaId: number,
    estado: 'Disponible' | undefined,
    pagina: ListaCocherasQueryDto,
  ) {
    if (pagina.cursor !== undefined) {
      const cursorValido = await this.prisma.cochera.findFirst({
        where: { id: pagina.cursor, idPlaya: playaId },
        select: { id: true },
      });
      if (!cursorValido) throw new NotFoundException('Cursor de cochera no encontrado en esta playa');
    }
    const rows = await this.prisma.cochera.findMany({
      where: { idPlaya: playaId, ...(estado !== undefined ? { estado } : {}) },
      ...(pagina.cursor !== undefined
        ? { cursor: { id: pagina.cursor }, skip: 1 }
        : {}),
      take: pagina.limite + 1,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        numero: true,
        tipoVehiculo: true,
        estado: true,
        ubicacion: true,
        tarifa: { select: { id: true, descripcion: true, precioHora: true } },
      },
    });
    const hayMas = rows.length > pagina.limite;
    const data = hayMas ? rows.slice(0, pagina.limite) : rows;
    return {
      data,
      paginacion: {
        limite: pagina.limite,
        cursorSiguiente: hayMas ? data[data.length - 1]?.id ?? null : null,
        hayMas,
      },
    };
  }

  async detalle(identity: DatosToken, playaId: number, id: number) {
    await this.exigirAccesoPlaya(identity, playaId);
    const cochera = await this.prisma.cochera.findFirst({
      where: { id, idPlaya: playaId },
      select: this.camposPublicos(),
    });
    if (!cochera) throw new NotFoundException('Cochera no encontrada en esta playa');
    return cochera;
  }

  async crear(identity: DatosToken, playaId: number, dto: CrearCocheraDto) {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id_playa FROM PlayaEstacionamiento WHERE id_playa = ${playaId} FOR UPDATE`;
          const playa = await tx.playaEstacionamiento.findUnique({
            where: { id: playaId },
            select: { capacidad: true },
          });
          if (!playa) throw new NotFoundException('Playa no encontrada');
          const total = await tx.cochera.count({ where: { idPlaya: playaId } });
          if (total >= playa.capacidad) {
            throw new ConflictException('La capacidad declarada de la playa ya está completa');
          }
          const tarifa = await tx.tarifa.findFirst({
            where: { id: dto.tarifaId, idPlaya: playaId },
            select: { id: true },
          });
          if (!tarifa) throw new ConflictException('La tarifa debe pertenecer a la misma playa');
          return tx.cochera.create({
            data: {
              numero: dto.numero,
              tipoVehiculo: dto.tipoVehiculo,
              ubicacion: dto.ubicacion,
              idPlaya: playaId,
              idTarifa: tarifa.id,
            },
            select: this.camposPublicos(),
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (this.esDuplicado(error)) {
        throw new ConflictException('El número de cochera ya existe en esta playa');
      }
      throw error;
    }
  }

  async actualizar(
    identity: DatosToken,
    playaId: number,
    id: number,
    dto: ActualizarCocheraDto,
  ) {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id_cochera FROM Cochera WHERE id_cochera = ${id} AND id_playa = ${playaId} FOR UPDATE`;
          const actual = await tx.cochera.findFirst({
            where: { id, idPlaya: playaId },
            select: { id: true, estado: true },
          });
          if (!actual) throw new NotFoundException('Cochera no encontrada en esta playa');

          if (dto.tarifaId !== undefined) {
            const tarifa = await tx.tarifa.findFirst({
              where: { id: dto.tarifaId, idPlaya: playaId },
              select: { id: true },
            });
            if (!tarifa) throw new ConflictException('La tarifa debe pertenecer a la misma playa');
          }

          const estadiaActiva = await tx.estadia.findFirst({
            where: { idCochera: id, estado: 'Activa' },
            select: { id: true },
          });
          if (
            estadiaActiva &&
            ((dto.estado !== undefined && dto.estado !== actual.estado) ||
              dto.tarifaId !== undefined)
          ) {
            throw new ConflictException(
              'No se puede cambiar estado o tarifa de una cochera con estadía activa',
            );
          }

          return tx.cochera.update({
            where: { id },
            data: {
              ...(dto.numero !== undefined ? { numero: dto.numero } : {}),
              ...(dto.tipoVehiculo !== undefined ? { tipoVehiculo: dto.tipoVehiculo } : {}),
              ...(dto.ubicacion !== undefined ? { ubicacion: dto.ubicacion } : {}),
              ...(dto.tarifaId !== undefined ? { idTarifa: dto.tarifaId } : {}),
              ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
            },
            select: this.camposPublicos(),
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (this.esDuplicado(error)) {
        throw new ConflictException('El número de cochera ya existe en esta playa');
      }
      throw error;
    }
  }

  private async exigirAccesoPlaya(identity: DatosToken, playaId: number) {
    if (identity.tipoCuenta === 'Dueno') {
      await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    } else {
      await this.authorization.assertEmpleadoAssignedToPlaya(identity, playaId);
    }
  }

  private async exigirPlaya(playaId: number): Promise<void> {
    const playa = await this.prisma.playaEstacionamiento.findUnique({
      where: { id: playaId },
      select: { id: true },
    });
    if (!playa) throw new NotFoundException('Playa no encontrada');
  }

  private camposPublicos() {
    return {
      id: true,
      numero: true,
      tipoVehiculo: true,
      estado: true,
      ubicacion: true,
      idPlaya: true,
      idTarifa: true,
      tarifa: { select: { id: true, descripcion: true, precioHora: true } },
    } as const;
  }

  private esDuplicado(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
