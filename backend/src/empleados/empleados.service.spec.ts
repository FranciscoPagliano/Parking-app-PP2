import * as bcrypt from 'bcryptjs';
import { DatosToken } from '../auth/guards/jwt-auth.guard';
import { EmpleadosService } from './empleados.service';
import { CrearEmpleadoDto } from './dto/crear-empleado.dto';

describe('EmpleadosService', () => {
  const identity = {
    sub: 'Dueno:9', idCuenta: 9, tipoCuenta: 'Dueno', email: 'owner@test', rol: 'Dueno', estado: 'Activo',
  } as DatosToken;
  const dto: CrearEmpleadoDto = {
    nombre: 'Empleado', apellido: 'Prueba', dni: '12345678', email: 'EMP@TEST.COM',
    contrasena: 'ContrasenaSegura123!', telefono: '+54 11 5555-0200', cargo: 'Operador',
  };
  let prisma: any;
  let authorization: any;
  let service: EmpleadosService;

  beforeEach(() => {
    prisma = { empleado: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() } };
    authorization = { assertDuenoOwnsPlaya: jest.fn().mockResolvedValue(undefined) };
    service = new EmpleadosService(prisma, authorization);
  });

  it('hashea la contraseña y fuerza la playa de la ruta', async () => {
    prisma.empleado.create.mockImplementation(async ({ data }: any) => ({ ...data, id: 1 }));
    await service.crear(identity, 4, dto);
    const data = prisma.empleado.create.mock.calls[0][0].data;
    expect(data.idPlaya).toBe(4);
    expect(data.email).toBe('emp@test.com');
    expect(data.contrasena).not.toBe(dto.contrasena);
    await expect(bcrypt.compare(dto.contrasena, data.contrasena)).resolves.toBe(true);
  });

  it('verifica que el dueño controle la playa antes de listar empleados', async () => {
    authorization.assertDuenoOwnsPlaya.mockRejectedValue(new Error('forbidden'));
    await expect(service.listar(identity, 44)).rejects.toThrow('forbidden');
    expect(prisma.empleado.findMany).not.toHaveBeenCalled();
  });
});
