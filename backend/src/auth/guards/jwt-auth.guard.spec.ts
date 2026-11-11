import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TipoCuenta } from '../dto/login.dto';

describe('JwtAuthGuard', () => {
  const secret = 'secreto-de-prueba-con-32-caracteres-minimo';
  let jwt: JwtService;
  let prisma: any;
  let guard: JwtAuthGuard;
  const claims = {
    sub: 'Cliente:41',
    idCuenta: 41,
    tipoCuenta: TipoCuenta.Cliente,
    email: 'cuenta@ejemplo.test',
    rol: 'Cliente',
    estado: 'Activo',
  };

  const context = (authorization?: string) => {
    const request: any = { headers: { authorization } };
    return {
      request,
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as any,
    };
  };

  beforeEach(() => {
    jwt = new JwtService({ secret });
    prisma = {
      usuario: { findUnique: jest.fn().mockResolvedValue({ email: claims.email, estado: 'Activo' }) },
      empleado: { findUnique: jest.fn() },
      dueno: { findUnique: jest.fn() },
    };
    guard = new JwtAuthGuard(jwt, prisma);
  });

  it('rechaza token ausente, alterado, vencido y firmado con otra clave', async () => {
    const noToken = context();
    await expect(guard.canActivate(noToken.context)).rejects.toBeInstanceOf(UnauthorizedException);

    const signed = await jwt.signAsync(claims);
    const altered = context(`${signed.slice(0, -1)}x`);
    await expect(guard.canActivate(altered.context)).rejects.toBeInstanceOf(UnauthorizedException);

    const expiredToken = await jwt.signAsync(claims, { expiresIn: -1 });
    await expect(guard.canActivate(context(`Bearer ${expiredToken}`).context))
      .rejects.toBeInstanceOf(UnauthorizedException);

    const wrongSigner = new JwtService({ secret: 'otra-clave-invalida-para-pruebas-123456' });
    const invalidSignature = await wrongSigner.signAsync(claims);
    await expect(guard.canActivate(context(`Bearer ${invalidSignature}`).context))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('reconsulta la cuenta tipada, aunque otro perfil tenga el mismo ID', async () => {
    const token = await jwt.signAsync(claims);
    const request = context(`Bearer ${token}`);
    await expect(guard.canActivate(request.context)).resolves.toBe(true);
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: 41 },
      select: { email: true, estado: true },
    });
    expect(prisma.empleado.findUnique).not.toHaveBeenCalled();
    expect(request.request.user).toMatchObject({ tipoCuenta: 'Cliente', idCuenta: 41 });
  });

  it('revoca inmediatamente el acceso cuando la cuenta se desactiva', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ email: claims.email, estado: 'Inactivo' });
    const token = await jwt.signAsync(claims);
    await expect(guard.canActivate(context(`Bearer ${token}`).context))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
