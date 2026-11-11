import { ForbiddenException } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { DatosToken } from './guards/jwt-auth.guard';
import { TipoCuenta } from './dto/login.dto';

describe('AuthorizationService', () => {
  const prisma: any = {
    vehiculo: { findFirst: jest.fn() },
    reserva: { findFirst: jest.fn() },
    estadia: { findFirst: jest.fn() },
    pago: { findFirst: jest.fn() },
    notificacion: { findFirst: jest.fn() },
    empleado: { findFirst: jest.fn() },
    playaEstacionamiento: { findFirst: jest.fn() },
  };
  const service = new AuthorizationService(prisma);
  const identity = (tipoCuenta: TipoCuenta, idCuenta = 12): DatosToken => ({
    sub: `${tipoCuenta}:${idCuenta}`,
    idCuenta,
    tipoCuenta,
    email: 'persona@ejemplo.test',
    rol: tipoCuenta,
    estado: 'Activo',
  });

  beforeEach(() => jest.clearAllMocks());

  it('impide consultar un vehículo que pertenece a otro cliente', async () => {
    prisma.vehiculo.findFirst.mockResolvedValue(null);
    await expect(
      service.assertClienteOwnsVehicle(identity(TipoCuenta.Cliente, 12), 90),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.vehiculo.findFirst).toHaveBeenCalledWith({
      where: { id: 90, idUsuario: 12 },
      select: { id: true },
    });
  });

  it('impide al empleado operar en otra playa', async () => {
    prisma.empleado.findFirst.mockResolvedValue(null);
    await expect(
      service.assertEmpleadoAssignedToPlaya(identity(TipoCuenta.Empleado, 13), 99),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.empleado.findFirst).toHaveBeenCalledWith({
      where: { id: 13, estado: 'Activo', idPlaya: 99 },
      select: { id: true },
    });
  });

  it('impide al dueño administrar una playa ajena', async () => {
    prisma.playaEstacionamiento.findFirst.mockResolvedValue(null);
    await expect(
      service.assertDuenoOwnsPlaya(identity(TipoCuenta.Dueno, 14), 88),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.playaEstacionamiento.findFirst).toHaveBeenCalledWith({
      where: { id: 88, idDueno: 14 },
      select: { id: true },
    });
  });

  it('no permite usar una política de cliente con una identidad de empleado', async () => {
    await expect(
      service.assertClienteOwnsReservation(identity(TipoCuenta.Empleado), 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.reserva.findFirst).not.toHaveBeenCalled();
  });
});
