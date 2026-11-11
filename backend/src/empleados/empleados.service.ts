import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthorizationService } from '../auth/authorization.service';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarEmpleadoDto } from './dto/actualizar-empleado.dto';
import { CrearEmpleadoDto } from './dto/crear-empleado.dto';

@Injectable()
export class EmpleadosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  async listar(identity: DatosToken, playaId: number) {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    return this.prisma.empleado.findMany({
      where: { idPlaya: playaId },
      select: this.camposPublicos(),
      orderBy: { id: 'asc' },
    });
  }

  async detalle(identity: DatosToken, playaId: number, id: number) {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    const empleado = await this.prisma.empleado.findFirst({
      where: { id, idPlaya: playaId },
      select: this.camposPublicos(),
    });
    if (!empleado) throw new NotFoundException('Empleado no encontrado');
    return empleado;
  }

  async crear(identity: DatosToken, playaId: number, dto: CrearEmpleadoDto) {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    const contrasena = await bcrypt.hash(dto.contrasena, 10);
    try {
      return await this.prisma.empleado.create({
        data: {
          ...dto,
          email: dto.email.trim().toLowerCase(),
          contrasena,
          idPlaya: playaId,
        },
        select: this.camposPublicos(),
      });
    } catch (error) {
      if (this.esDuplicado(error)) {
        throw new ConflictException('El DNI o el email ya están registrados');
      }
      throw error;
    }
  }

  async actualizar(
    identity: DatosToken,
    playaId: number,
    id: number,
    dto: ActualizarEmpleadoDto,
  ) {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    await this.exigirEmpleadoDePlaya(playaId, id);
    try {
      return await this.prisma.empleado.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
        },
        select: this.camposPublicos(),
      });
    } catch (error) {
      if (this.esDuplicado(error)) {
        throw new ConflictException('El DNI o el email ya están registrados');
      }
      throw error;
    }
  }

  async actualizarEstado(identity: DatosToken, playaId: number, id: number, estado: 'Activo' | 'Inactivo') {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaId);
    await this.exigirEmpleadoDePlaya(playaId, id);
    return this.prisma.empleado.update({
      where: { id },
      data: { estado },
      select: this.camposPublicos(),
    });
  }

  async reasignar(identity: DatosToken, playaActual: number, id: number, playaNueva: number) {
    await this.authorization.assertDuenoOwnsPlaya(identity, playaActual);
    await this.authorization.assertDuenoOwnsPlaya(identity, playaNueva);
    await this.exigirEmpleadoDePlaya(playaActual, id);
    return this.prisma.empleado.update({
      where: { id },
      data: { idPlaya: playaNueva },
      select: this.camposPublicos(),
    });
  }

  private async exigirEmpleadoDePlaya(playaId: number, id: number): Promise<void> {
    const existe = await this.prisma.empleado.findFirst({
      where: { id, idPlaya: playaId },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException('Empleado no encontrado en esta playa');
  }

  private camposPublicos() {
    return {
      id: true,
      nombre: true,
      apellido: true,
      dni: true,
      email: true,
      telefono: true,
      cargo: true,
      estado: true,
      idPlaya: true,
    } as const;
  }

  private esDuplicado(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
