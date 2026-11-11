import { ForbiddenException } from '@nestjs/common';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  const client = {
    sub: 'Cliente:27', idCuenta: 27, tipoCuenta: 'Cliente', email: 'client@test', rol: 'Cliente', estado: 'Activo',
  } as DatosToken;
  const employee = {
    ...client, sub: 'Empleado:27', tipoCuenta: 'Empleado', rol: 'Empleado',
  } as DatosToken;
  let prisma: any;
  let service: UsuariosService;

  beforeEach(() => {
    prisma = {
      usuario: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      reserva: { findMany: jest.fn().mockResolvedValue([]) },
      estadia: { findMany: jest.fn().mockResolvedValue([]) },
      notificacion: { findMany: jest.fn().mockResolvedValue([]) },
      pago: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new UsuariosService(prisma);
  });

  it('siempre consulta y actualiza solo al cliente de la identidad', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 27, email: 'client@test' });
    prisma.usuario.update.mockResolvedValue({ id: 27, nombre: 'Actualizado' });
    await service.listar(client);
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 27 } }));
    await service.actualizarPerfil(client, { nombre: 'Actualizado' });
    expect(prisma.usuario.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 27 } }));
  });

  it('rechaza empleado y evita consultar historial de otra cuenta', async () => {
    await expect(service.historial(employee)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.reserva.findMany).not.toHaveBeenCalled();
    expect(prisma.estadia.findMany).not.toHaveBeenCalled();
  });
});
