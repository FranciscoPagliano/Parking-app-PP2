import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarTarifaDto } from './dto/actualizar-tarifa.dto';
import { CrearTarifaDto } from './dto/crear-tarifa.dto';

@Injectable()
export class TarifasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  async listarPublicas(playaId: number) {
    const existe = await this.prisma.playaEstacionamiento.findUnique({
      where: { id: playaId },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException('Playa no encontrada');
    return this.prisma.tarifa.findMany({
      where: { idPlaya: playaId },
      select: { id: true, descripcion: true, precioHora: true, idPlaya: true },
      orderBy: { id: 'asc' },
    });
  }

  async crear(identity: DatosToken, playaId: number, dto: CrearTarifaDto) {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    const precioHora = this.precio(dto.precioHora);
    return this.prisma.tarifa.create({
      data: { descripcion: dto.descripcion, precioHora, idPlaya: playaId },
      select: { id: true, descripcion: true, precioHora: true, idPlaya: true },
    });
  }

  async actualizar(
    identity: DatosToken,
    playaId: number,
    tarifaId: number,
    dto: ActualizarTarifaDto,
  ) {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    const tarifa = await this.prisma.tarifa.findFirst({
      where: { id: tarifaId, idPlaya: playaId },
      select: { id: true },
    });
    if (!tarifa) throw new NotFoundException('Tarifa no encontrada en esta playa');

    if (dto.precioHora !== undefined) {
      const estadiaActiva = await this.prisma.estadia.findFirst({
        where: {
          estado: 'Activa',
          cochera: { is: { idPlaya: playaId, idTarifa: tarifaId } },
        },
        select: { id: true },
      });
      if (estadiaActiva) {
        throw new ConflictException('No se puede cambiar una tarifa asociada a una estadía activa');
      }
    }

    return this.prisma.tarifa.update({
      where: { id: tarifaId },
      data: {
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
        ...(dto.precioHora !== undefined ? { precioHora: this.precio(dto.precioHora) } : {}),
      },
      select: { id: true, descripcion: true, precioHora: true, idPlaya: true },
    });
  }

  private precio(valor: string): Prisma.Decimal {
    const precio = new Prisma.Decimal(valor);
    if (!precio.isFinite() || precio.lessThanOrEqualTo(0)) {
      throw new UnprocessableEntityException('El precio por hora debe ser mayor a cero');
    }
    return precio;
  }
}
