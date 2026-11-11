import { ConflictException } from '@nestjs/common';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { CocherasService } from './cocheras.service';

describe('CocherasService', () => {
  const identity = {
    sub: 'Dueno:9', idCuenta: 9, tipoCuenta: 'Dueno', email: 'owner@test', rol: 'Dueno', estado: 'Activo',
  } as DatosToken;
  let prisma: any;
  let authorization: any;
  let tx: any;
  let service: CocherasService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn(),
      playaEstacionamiento: { findUnique: jest.fn().mockResolvedValue({ capacidad: 3 }) },
      cochera: {
        count: jest.fn().mockResolvedValue(2),
        create: jest.fn().mockResolvedValue({ id: 5 }),
        findFirst: jest.fn().mockResolvedValue({ id: 5, estado: 'Ocupado' }),
        update: jest.fn(),
      },
      tarifa: { findFirst: jest.fn().mockResolvedValue({ id: 4 }) },
      estadia: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    prisma = {
      $transaction: jest.fn((callback: (transaction: unknown) => unknown) => callback(tx)),
      playaEstacionamiento: { findUnique: jest.fn().mockResolvedValue({ id: 3 }) },
      cochera: { findMany: jest.fn(), findFirst: jest.fn() },
    };
    authorization = {
      assertDuenoOwnsPlaya: jest.fn().mockResolvedValue(undefined),
      assertEmpleadoAssignedToPlaya: jest.fn().mockResolvedValue(undefined),
    };
    service = new CocherasService(prisma, authorization);
  });

  it('crea cocheras dentro de la capacidad y verifica que la tarifa sea de esa playa', async () => {
    await service.crear(identity, 3, {
      numero: 'A-03', tipoVehiculo: 'Auto', ubicacion: 'Patio', tarifaId: 4,
    });
    expect(tx.cochera.count).toHaveBeenCalledWith({ where: { idPlaya: 3 } });
    expect(tx.cochera.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ idPlaya: 3, idTarifa: 4 }),
    }));
  });

  it('bloquea liberar una cochera ocupada con estadía activa', async () => {
    tx.estadia.findFirst.mockResolvedValue({ id: 11 });
    await expect(service.actualizar(identity, 3, 5, { estado: 'Disponible' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.cochera.update).not.toHaveBeenCalled();
  });

  it('pagina disponibilidad con cursor y límite acotado', async () => {
    prisma.cochera.findMany.mockResolvedValue([{ id: 8 }, { id: 9 }]);
    const page = await service.disponibles(3, { limite: 1 });
    expect(page.data).toEqual([{ id: 8 }]);
    expect(page.paginacion).toEqual({ limite: 1, cursorSiguiente: 8, hayMas: true });
  });
});
