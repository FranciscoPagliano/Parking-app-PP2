import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { VehiculosService } from './vehiculos.service';
import { CrearVehiculoDto } from './dto/crear-vehiculo.dto';

describe('VehiculosService', () => {
  const identity = {
    sub: 'Cliente:27', idCuenta: 27, tipoCuenta: 'Cliente', email: 'client@test', rol: 'Cliente', estado: 'Activo',
  } as DatosToken;
  let prisma: any;
  let authorization: any;
  let service: VehiculosService;

  beforeEach(() => {
    prisma = { vehiculo: { create: jest.fn(), findMany: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() } };
    authorization = { assertClienteOwnsVehicle: jest.fn().mockResolvedValue(undefined) };
    service = new VehiculosService(prisma, authorization);
  });

  it('vincula cada vehículo al cliente autenticado, no a un id enviado por el cliente', async () => {
    const dto: CrearVehiculoDto = { patente: 'ABC123', modelo: 'Prueba', tipo: 'Auto' };
    await service.crear(identity, dto);
    expect(prisma.vehiculo.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ...dto, idUsuario: 27 } }),
    );
  });

  it('valida propiedad antes de modificar un vehículo', async () => {
    authorization.assertClienteOwnsVehicle.mockRejectedValue(new Error('forbidden'));
    await expect(service.actualizar(identity, 90, { modelo: 'Intento' })).rejects.toThrow('forbidden');
    expect(prisma.vehiculo.update).not.toHaveBeenCalled();
  });
});
