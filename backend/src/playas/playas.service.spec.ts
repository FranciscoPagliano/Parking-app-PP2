import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { PlayasService } from './playas.service';
import { CrearPlayaDto } from './dto/crear-playa.dto';

describe('PlayasService', () => {
  const identity = {
    sub: 'Dueno:9', idCuenta: 9, tipoCuenta: 'Dueno', email: 'owner@test', rol: 'Dueno', estado: 'Activo',
  } as DatosToken;
  const date = new Date('1970-01-01T08:00:00.000Z');
  let prisma: any;
  let authorization: any;
  let service: PlayasService;

  beforeEach(() => {
    prisma = {
      playaEstacionamiento: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      cochera: { groupBy: jest.fn() },
      $transaction: jest.fn(),
    };
    authorization = { assertDuenoOwnsPlaya: jest.fn().mockResolvedValue(undefined) };
    service = new PlayasService(prisma, authorization);
  });

  it('asigna la playa al dueño de la sesión y normaliza horarios', async () => {
    prisma.playaEstacionamiento.create.mockResolvedValue({
      id: 3, nombre: 'Nueva', direccion: 'Calle', telefono: '+54 11 5555-0100',
      horaApertura: date, horaCierre: new Date('1970-01-01T20:00:00.000Z'),
      capacidad: 5, permiteReservas: true,
    });
    const dto: CrearPlayaDto = {
      nombre: 'Nueva', direccion: 'Calle', telefono: '+54 11 5555-0100',
      horaApertura: '08:00', horaCierre: '20:00', capacidad: 5, permiteReservas: true,
    };
    await service.crear(identity, dto);
    expect(prisma.playaEstacionamiento.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ idDueno: 9 }) }),
    );
  });

  it('rechaza horarios invertidos y capacidad inferior a cocheras existentes', async () => {
    await expect(service.crear(identity, {
      nombre: 'Nueva', direccion: 'Calle', telefono: '+54 11 5555-0100',
      horaApertura: '20:00', horaCierre: '08:00', capacidad: 5, permiteReservas: true,
    })).rejects.toBeInstanceOf(UnprocessableEntityException);

    const tx = {
      $queryRaw: jest.fn(),
      playaEstacionamiento: {
        findUnique: jest.fn().mockResolvedValue({
          capacidad: 4, horaApertura: date,
          horaCierre: new Date('1970-01-01T20:00:00.000Z'), _count: { cocheras: 4 },
        }),
        update: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation((callback: (arg: unknown) => unknown) => callback(tx));
    await expect(service.actualizar(identity, 3, { capacidad: 3 })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.playaEstacionamiento.update).not.toHaveBeenCalled();
  });
});
