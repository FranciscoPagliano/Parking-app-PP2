import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { TarifasService } from './tarifas.service';

describe('TarifasService', () => {
  const identity = {
    sub: 'Dueno:9', idCuenta: 9, tipoCuenta: 'Dueno', email: 'owner@test', rol: 'Dueno', estado: 'Activo',
  } as DatosToken;
  let prisma: any;
  let authorization: any;
  let service: TarifasService;

  beforeEach(() => {
    prisma = {
      tarifa: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      estadia: { findFirst: jest.fn() },
    };
    authorization = { assertDuenoOwnsPlaya: jest.fn().mockResolvedValue(undefined) };
    service = new TarifasService(prisma, authorization);
  });

  it('construye Decimal desde texto y restringe la tarifa a la playa del dueño', async () => {
    prisma.tarifa.create.mockResolvedValue({ id: 2, descripcion: 'Hora', precioHora: new Prisma.Decimal('12.35'), idPlaya: 4 });
    await service.crear(identity, 4, { descripcion: 'Hora', precioHora: '12.35' });
    const data = prisma.tarifa.create.mock.calls[0][0].data;
    expect(data.idPlaya).toBe(4);
    expect(data.precioHora).toBeInstanceOf(Prisma.Decimal);
    expect(data.precioHora.toString()).toBe('12.35');
  });

  it('no modifica la tarifa mientras una cochera vinculada tenga estadía activa', async () => {
    prisma.tarifa.findFirst.mockResolvedValue({ id: 6 });
    prisma.estadia.findFirst.mockResolvedValue({ id: 12 });
    await expect(service.actualizar(identity, 4, 6, { precioHora: '20.00' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(prisma.tarifa.update).not.toHaveBeenCalled();
  });
});
