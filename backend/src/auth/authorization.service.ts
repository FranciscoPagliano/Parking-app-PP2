import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatosToken } from './guards/jwt-auth.guard';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async assertClienteOwnsVehicle(identity: DatosToken, vehicleId: number) {
    this.requireRole(identity, 'Cliente');
    const resource = await this.prisma.vehiculo.findFirst({
      where: { id: vehicleId, idUsuario: identity.idCuenta },
      select: { id: true },
    });
    if (!resource) throw this.denied();
  }

  async assertClienteOwnsReservation(identity: DatosToken, reservationId: number) {
    this.requireRole(identity, 'Cliente');
    const resource = await this.prisma.reserva.findFirst({
      where: { id: reservationId, idUsuario: identity.idCuenta },
      select: { id: true },
    });
    if (!resource) throw this.denied();
  }

  async assertClienteOwnsStay(identity: DatosToken, stayId: number) {
    this.requireRole(identity, 'Cliente');
    const resource = await this.prisma.estadia.findFirst({
      where: { id: stayId, idUsuario: identity.idCuenta },
      select: { id: true },
    });
    if (!resource) throw this.denied();
  }

  async assertClienteOwnsPayment(identity: DatosToken, paymentId: number) {
    this.requireRole(identity, 'Cliente');
    const resource = await this.prisma.pago.findFirst({
      where: {
        id: paymentId,
        OR: [
          { reserva: { idUsuario: identity.idCuenta } },
          { estadia: { idUsuario: identity.idCuenta } },
        ],
      },
      select: { id: true },
    });
    if (!resource) throw this.denied();
  }

  async assertClienteOwnsNotification(identity: DatosToken, notificationId: number) {
    this.requireRole(identity, 'Cliente');
    const resource = await this.prisma.notificacion.findFirst({
      where: { id: notificationId, idUsuario: identity.idCuenta },
      select: { id: true },
    });
    if (!resource) throw this.denied();
  }

  async assertEmpleadoAssignedToPlaya(identity: DatosToken, playaId: number) {
    this.requireRole(identity, 'Empleado');
    const assignment = await this.prisma.empleado.findFirst({
      where: { id: identity.idCuenta, estado: 'Activo', idPlaya: playaId },
      select: { id: true },
    });
    if (!assignment) throw this.denied();
  }

  async assertDuenoOwnsPlaya(identity: DatosToken, playaId: number) {
    this.requireRole(identity, 'Dueno');
    const ownership = await this.prisma.playaEstacionamiento.findFirst({
      where: { id: playaId, idDueno: identity.idCuenta },
      select: { id: true },
    });
    if (!ownership) throw this.denied();
  }

  private requireRole(identity: DatosToken, role: DatosToken['rol']): void {
    if (identity.tipoCuenta !== role || identity.rol !== role) throw this.denied();
  }

  private denied(): ForbiddenException {
    return new ForbiddenException('No tienes permisos para acceder a este recurso');
  }
}
