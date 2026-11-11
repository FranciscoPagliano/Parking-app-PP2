import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization.service';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { CrearVehiculoDto } from './dto/crear-vehiculo.dto';

@Injectable()
export class VehiculosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  listar(identity: DatosToken) {
    return this.prisma.vehiculo.findMany({
      where: { idUsuario: identity.idCuenta },
      select: this.camposPublicos(),
      orderBy: { id: 'asc' },
    });
  }

  async detalle(identity: DatosToken, id: number) {
    await this.authorization.assertClienteOwnsVehicle(identity, id);
    return this.prisma.vehiculo.findUniqueOrThrow({
      where: { id },
      select: this.camposPublicos(),
    }).catch((error: unknown) => {
      if (this.esNoEncontrado(error)) throw new NotFoundException('Vehículo no encontrado');
      throw error;
    });
  }

  async crear(identity: DatosToken, dto: CrearVehiculoDto) {
    try {
      return await this.prisma.vehiculo.create({
        data: { ...dto, idUsuario: identity.idCuenta },
        select: this.camposPublicos(),
      });
    } catch (error) {
      if (this.esDuplicado(error)) throw new ConflictException('La patente ya está registrada');
      throw error;
    }
  }

  async actualizar(identity: DatosToken, id: number, dto: ActualizarVehiculoDto) {
    await this.authorization.assertClienteOwnsVehicle(identity, id);
    try {
      return await this.prisma.vehiculo.update({
        where: { id },
        data: dto,
        select: this.camposPublicos(),
      });
    } catch (error) {
      if (this.esDuplicado(error)) throw new ConflictException('La patente ya está registrada');
      throw error;
    }
  }

  private camposPublicos() {
    return { id: true, patente: true, modelo: true, tipo: true } as const;
  }

  private esDuplicado(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private esNoEncontrado(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
  }
}
