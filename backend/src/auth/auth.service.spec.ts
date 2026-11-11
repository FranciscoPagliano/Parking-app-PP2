import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { LoginDto, TipoCuenta } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  const password = 'ClaveSeguraDePrueba123!';
  let passwordHash: string;

  beforeEach(async () => {
    passwordHash = await bcrypt.hash(password, 4);
    const account = (id: number, estado = 'Activo') => ({
      id,
      email: 'cuenta@ejemplo.test',
      contrasena: passwordHash,
      estado,
      nombre: 'Cuenta',
      apellido: 'Prueba',
    });
    prisma = {
      usuario: { findUnique: jest.fn().mockResolvedValue(account(41)) },
      empleado: { findUnique: jest.fn().mockResolvedValue(account(41)) },
      dueno: { findUnique: jest.fn().mockResolvedValue(account(41)) },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('jwt-ficticio') };
    service = new AuthService(prisma, jwt);
  });

  const loginData = (tipoCuenta: TipoCuenta, contrasena = password): LoginDto => ({
    email: ' CUENTA@EJEMPLO.TEST ',
    contrasena,
    tipoCuenta,
  });

  it.each(Object.values(TipoCuenta))(
    'emite una identidad inequívoca para %s incluso si los IDs coinciden',
    async (tipoCuenta) => {
      const result = await service.login(loginData(tipoCuenta), '127.0.0.1');
      expect(result.perfil).toMatchObject({ id: 41, tipoCuenta, rol: tipoCuenta });
      expect(result).not.toHaveProperty('contrasena');
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: `${tipoCuenta}:41`,
          idCuenta: 41,
          tipoCuenta,
          rol: tipoCuenta,
          estado: 'Activo',
        }),
      );
      expect(prisma[tipoCuenta === TipoCuenta.Cliente ? 'usuario' : tipoCuenta === TipoCuenta.Empleado ? 'empleado' : 'dueno'].findUnique)
        .toHaveBeenCalledWith({ where: { email: 'cuenta@ejemplo.test' } });
    },
  );

  it('usa el mismo error para cuenta inexistente y contraseña inválida', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    await expect(service.login(loginData(TipoCuenta.Cliente), 'ip-a')).rejects.toMatchObject({
      status: 401,
      response: {
        message: 'Email, contraseña o tipo de cuenta incorrectos',
      },
    });

    await expect(
      service.login(loginData(TipoCuenta.Cliente, 'incorrecta'), 'ip-b'),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rechaza cuentas desactivadas y limita intentos fallidos', async () => {
    prisma.empleado.findUnique.mockResolvedValue({
      id: 3,
      email: 'cuenta@ejemplo.test',
      contrasena: passwordHash,
      estado: 'Inactivo',
      nombre: 'Cuenta',
      apellido: 'Prueba',
    });

    for (let intento = 0; intento < 5; intento++) {
      await expect(
        service.login(loginData(TipoCuenta.Empleado), 'ip-compartida'),
      ).rejects.toMatchObject({ status: 401 });
    }
    await expect(
      service.login(loginData(TipoCuenta.Empleado), 'ip-compartida'),
    ).rejects.toMatchObject({ status: 429 });
  });
});
