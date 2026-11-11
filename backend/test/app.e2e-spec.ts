import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TipoCuenta } from '../src/auth/dto/login.dto';
import { configureHttp } from '../src/app-setup';

describe('Smart Parking security e2e (test database only)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let fixtureId: number;
  let playaId: number;
  let fixtureEmail: string;
  let registrationEmail: string;
  const password = 'ClaveE2ESegura123!';

  beforeAll(async () => {
    const databaseName = new URL(process.env.DATABASE_URL ?? '').pathname;
    if (!databaseName.includes('_test')) {
      throw new Error('E2E bloqueado: DATABASE_URL debe apuntar a una base con sufijo _test');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    process.env.CORS_ORIGINS = 'https://front.ejemplo.test';
    configureHttp(app);
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    const [usuario, empleado, dueno] = await Promise.all([
      prisma.usuario.findFirst({ orderBy: { id: 'desc' }, select: { id: true } }),
      prisma.empleado.findFirst({ orderBy: { id: 'desc' }, select: { id: true } }),
      prisma.dueno.findFirst({ orderBy: { id: 'desc' }, select: { id: true } }),
    ]);
    fixtureId = Math.max(usuario?.id ?? 0, empleado?.id ?? 0, dueno?.id ?? 0) + 100;
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    fixtureEmail = `etapa2-${suffix}@ejemplo.test`;
    registrationEmail = `registro-${suffix}@ejemplo.test`;
    const hash = await bcrypt.hash(password, 4);
    const dni = `${Math.floor(100_000_000 + Math.random() * 900_000_000)}`;

    await prisma.usuario.create({
      data: {
        id: fixtureId,
        nombre: 'Cliente',
        apellido: 'Ficticio',
        dni,
        email: fixtureEmail,
        contrasena: hash,
        telefono: '+54 11 5555-0101',
        ciudad: 'Buenos Aires',
      },
    });
    const owner = await prisma.dueno.create({
      data: {
        id: fixtureId,
        nombre: 'Dueño',
        apellido: 'Ficticio',
        dni,
        email: fixtureEmail,
        contrasena: hash,
        telefono: '+54 11 5555-0102',
      },
    });
    const playa = await prisma.playaEstacionamiento.create({
      data: {
        nombre: 'Playa e2e',
        direccion: 'Calle de prueba 123',
        telefono: '+54 11 5555-0103',
        horaApertura: new Date('1970-01-01T08:00:00.000Z'),
        horaCierre: new Date('1970-01-01T20:00:00.000Z'),
        capacidad: 5,
        idDueno: owner.id,
      },
    });
    playaId = playa.id;
    await prisma.empleado.create({
      data: {
        id: fixtureId,
        nombre: 'Empleado',
        apellido: 'Ficticio',
        dni,
        email: fixtureEmail,
        contrasena: hash,
        telefono: '+54 11 5555-0104',
        cargo: 'Operador',
        idPlaya: playa.id,
      },
    });
  });

  afterAll(async () => {
    if (prisma && fixtureEmail) {
      await prisma.empleado.deleteMany({ where: { email: fixtureEmail } });
      if (playaId) {
        await prisma.playaEstacionamiento.deleteMany({ where: { id: playaId } });
      }
      await prisma.dueno.deleteMany({ where: { email: fixtureEmail } });
      await prisma.usuario.deleteMany({ where: { email: { in: [fixtureEmail, registrationEmail] } } });
    }
    await app?.close();
  });

  const login = (tipoCuenta: TipoCuenta, email = fixtureEmail, contrasena = password) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, contrasena, tipoCuenta });

  it('preserva el endpoint raíz y publica health sin métricas internas', async () => {
    await request(app.getHttpServer()).get('/').expect(200).expect('Genio!!');
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'connected' });
  });

  it('limita CORS al origen explícito de configuración', async () => {
    await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'https://front.ejemplo.test')
      .set('Access-Control-Request-Method', 'POST')
      .expect('Access-Control-Allow-Origin', 'https://front.ejemplo.test')
      .expect(204);
    const disallowed = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'https://origen-invalido.test')
      .set('Access-Control-Request-Method', 'POST');
    expect(disallowed.headers['access-control-allow-origin']).toBeUndefined();
  });

  it.each(Object.values(TipoCuenta))(
    'autentica por separado el perfil %s aun con email e ID coincidentes',
    async (tipoCuenta) => {
      const response = await login(tipoCuenta).expect(201);
      expect(response.body.perfil).toMatchObject({
        id: fixtureId,
        tipoCuenta,
        rol: tipoCuenta,
        estado: 'Activo',
      });
      expect(response.body).not.toHaveProperty('contrasena');
      expect(response.body.perfil).not.toHaveProperty('hash');
      const claims = await jwt.verifyAsync(response.body.accessToken);
      expect(claims).toMatchObject({
        sub: `${tipoCuenta}:${fixtureId}`,
        idCuenta: fixtureId,
        tipoCuenta,
        rol: tipoCuenta,
        estado: 'Activo',
      });
    },
  );

  it('devuelve errores genéricos para email inexistente, contraseña errónea y cuenta inactiva', async () => {
    const wrongPassword = await login(TipoCuenta.Cliente, fixtureEmail, 'incorrecta').expect(401);
    const absent = await login(TipoCuenta.Cliente, 'inexistente@ejemplo.test').expect(401);
    expect(wrongPassword.body.message).toEqual(absent.body.message);

    await prisma.usuario.update({ where: { id: fixtureId }, data: { estado: 'Inactivo' } });
    await login(TipoCuenta.Cliente).expect(401);
    await prisma.usuario.update({ where: { id: fixtureId }, data: { estado: 'Activo' } });
    await prisma.dueno.update({ where: { id: fixtureId }, data: { estado: 'Inactivo' } });
    await login(TipoCuenta.Dueno).expect(401);
    await prisma.dueno.update({ where: { id: fixtureId }, data: { estado: 'Activo' } });
  });

  it('rechaza credenciales con tipos no válidos y limita intentos de login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: fixtureEmail, contrasena: password })
      .expect(400);

    for (let attempt = 0; attempt < 5; attempt++) {
      await login(
        TipoCuenta.Cliente,
        `limit-${fixtureEmail}`,
        'clave incorrecta',
      ).expect(401);
    }
    await login(
      TipoCuenta.Cliente,
      `limit-${fixtureEmail}`,
      'clave incorrecta',
    ).expect(429);
  });

  it('rechaza tokens ausentes, alterados, vencidos y revocados al cambiar estado', async () => {
    await request(app.getHttpServer()).get('/usuarios').expect(401);
    const valid = (await login(TipoCuenta.Cliente).expect(201)).body.accessToken as string;
    await request(app.getHttpServer()).get('/usuarios').set('Authorization', `Bearer ${valid.slice(0, -1)}x`).expect(401);

    const expired = await jwt.signAsync(
      {
        sub: `Cliente:${fixtureId}`,
        idCuenta: fixtureId,
        tipoCuenta: 'Cliente',
        email: fixtureEmail,
        rol: 'Cliente',
        estado: 'Activo',
      },
      { expiresIn: -1 },
    );
    await request(app.getHttpServer()).get('/usuarios').set('Authorization', `Bearer ${expired}`).expect(401);

    const ownerToken = (await login(TipoCuenta.Dueno).expect(201)).body.accessToken as string;
    await request(app.getHttpServer()).get('/usuarios').set('Authorization', `Bearer ${ownerToken}`).expect(403);
    const employeeToken = (await login(TipoCuenta.Empleado).expect(201)).body.accessToken as string;
    await request(app.getHttpServer()).get('/usuarios').set('Authorization', `Bearer ${employeeToken}`).expect(403);

    await prisma.usuario.update({ where: { id: fixtureId }, data: { estado: 'Inactivo' } });
    await request(app.getHttpServer()).get('/usuarios').set('Authorization', `Bearer ${valid}`).expect(401);
    await prisma.usuario.update({ where: { id: fixtureId }, data: { estado: 'Activo' } });
  });

  it('deja al cliente consultar solo su perfil y nunca filtra hashes', async () => {
    const token = (await login(TipoCuenta.Cliente).expect(201)).body.accessToken as string;
    const response = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toMatchObject({ id: fixtureId, email: fixtureEmail });
    expect(JSON.stringify(response.body)).not.toContain('contrasena');
    expect(JSON.stringify(response.body)).not.toContain('hash');
  });

  it('valida registro y rechaza campos privilegiados o contraseñas débiles', async () => {
    const payload = {
      nombre: '  Ficticio  ',
      apellido: 'Prueba',
      dni: `${Math.floor(100_000_000 + Math.random() * 900_000_000)}`,
      email: `  ${registrationEmail.toUpperCase()}  `,
      contrasena: 'ClaveRegistroSegura123!',
      telefono: '+54 11 5555-0199',
      ciudad: 'Buenos Aires',
    };
    const created = await request(app.getHttpServer()).post('/usuarios').send(payload).expect(201);
    expect(created.body.nombre).toBe('Ficticio');
    expect(created.body.email).toBe(registrationEmail);
    expect(JSON.stringify(created.body)).not.toContain('contrasena');

    await request(app.getHttpServer())
      .post('/usuarios')
      .send({ ...payload, email: `otro-${registrationEmail}`, rol: 'Dueno' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/usuarios')
      .send({ ...payload, email: `debil-${registrationEmail}`, contrasena: 'corta' })
      .expect(400);
  });
});
