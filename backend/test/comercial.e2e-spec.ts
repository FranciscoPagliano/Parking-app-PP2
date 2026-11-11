import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { TipoCuenta } from '../src/auth/dto/login.dto';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureHttp } from '../src/app-setup';

describe('Commercial modules e2e (test database only)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let suffix: string;
  let emails: string[] = [];
  let userIds: number[] = [];
  let employeeIds: number[] = [];
  let ownerIds: number[] = [];
  let beachIds: number[] = [];
  let vehicleIds: number[] = [];
  let tariffIds: number[] = [];
  let spotIds: number[] = [];
  let reservationIds: number[] = [];
  let stayIds: number[] = [];
  let paymentIds: number[] = [];
  let notificationIds: number[] = [];

  let ownerA: any;
  let ownerB: any;
  let clientA: any;
  let clientB: any;
  let employeeA: any;
  let employeeB: any;
  let beachA: any;
  let beachB: any;
  let tariffA: any;
  let tariffB: any;
  let occupiedSpot: any;
  let historicalStay: any;
  let reservaA: any;

  const password = 'EtapaTresPruebaSegura123!';

  beforeAll(async () => {
    const databaseName = new URL(process.env.DATABASE_URL ?? '').pathname;
    if (!databaseName.includes('_test')) {
      throw new Error('E2E bloqueado: DATABASE_URL debe apuntar a una base con sufijo _test');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureHttp(app);
    await app.init();
    prisma = app.get(PrismaService);

    suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const email = (name: string) => {
      const value = `e3-${name}-${suffix}@ejemplo.test`;
      emails.push(value);
      return value;
    };
    const dni = () => `${Math.floor(100_000_000 + Math.random() * 900_000_000)}`;
    const hash = await bcrypt.hash(password, 4);

    [ownerA, ownerB] = await Promise.all([
      prisma.dueno.create({
        data: {
          nombre: 'Dueño A', apellido: 'Ficticio', dni: dni(), email: email('owner-a'),
          contrasena: hash, telefono: '+54 11 5555-0201',
        },
      }),
      prisma.dueno.create({
        data: {
          nombre: 'Dueño B', apellido: 'Ficticio', dni: dni(), email: email('owner-b'),
          contrasena: hash, telefono: '+54 11 5555-0202',
        },
      }),
    ]);
    ownerIds = [ownerA.id, ownerB.id];

    [clientA, clientB] = await Promise.all([
      prisma.usuario.create({
        data: {
          nombre: 'Cliente A', apellido: 'Ficticio', dni: dni(), email: email('client-a'),
          contrasena: hash, telefono: '+54 11 5555-0211', ciudad: 'Buenos Aires',
        },
      }),
      prisma.usuario.create({
        data: {
          nombre: 'Cliente B', apellido: 'Ficticio', dni: dni(), email: email('client-b'),
          contrasena: hash, telefono: '+54 11 5555-0212', ciudad: 'Córdoba',
        },
      }),
    ]);
    userIds = [clientA.id, clientB.id];

    const createBeach = (idDueno: number, name: string) =>
      prisma.playaEstacionamiento.create({
        data: {
          nombre: name, direccion: 'Dirección ficticia 100', telefono: '+54 11 5555-0220',
          horaApertura: new Date('1970-01-01T07:00:00.000Z'),
          horaCierre: new Date('1970-01-01T22:00:00.000Z'),
          capacidad: idDueno === ownerA.id ? 3 : 4, permiteReservas: true, idDueno,
        },
      });
    [beachA, beachB] = await Promise.all([
      createBeach(ownerA.id, 'Playa E3 A'),
      createBeach(ownerB.id, 'Playa E3 B'),
    ]);
    beachIds = [beachA.id, beachB.id];

    [tariffA, tariffB] = await Promise.all([
      prisma.tarifa.create({
        data: { descripcion: 'Hora estándar', precioHora: '12.50', idPlaya: beachA.id },
      }),
      prisma.tarifa.create({
        data: { descripcion: 'Hora estándar', precioHora: '20.00', idPlaya: beachB.id },
      }),
    ]);
    tariffIds = [tariffA.id, tariffB.id];

    [occupiedSpot] = await Promise.all([
      prisma.cochera.create({
        data: {
          numero: 'A-01', tipoVehiculo: 'Auto', estado: 'Ocupado', ubicacion: 'Planta baja',
          idPlaya: beachA.id, idTarifa: tariffA.id,
        },
      }),
      prisma.cochera.create({
        data: {
          numero: 'B-01', tipoVehiculo: 'Auto', estado: 'Disponible', ubicacion: 'Planta baja',
          idPlaya: beachB.id, idTarifa: tariffB.id,
        },
      }),
    ]);
    spotIds = [occupiedSpot.id];
    const secondSpot = await prisma.cochera.create({
      data: {
        numero: 'A-00', tipoVehiculo: 'Moto', estado: 'Disponible', ubicacion: 'Patio',
        idPlaya: beachA.id, idTarifa: tariffA.id,
      },
    });
    spotIds.push(secondSpot.id);
    const otherSpot = await prisma.cochera.findFirstOrThrow({ where: { idPlaya: beachB.id } });
    spotIds.push(otherSpot.id);

    [employeeA, employeeB] = await Promise.all([
      prisma.empleado.create({
        data: {
          nombre: 'Empleado A', apellido: 'Ficticio', dni: dni(), email: email('employee-a'),
          contrasena: hash, telefono: '+54 11 5555-0231', cargo: 'Operador', idPlaya: beachA.id,
        },
      }),
      prisma.empleado.create({
        data: {
          nombre: 'Empleado B', apellido: 'Ficticio', dni: dni(), email: email('employee-b'),
          contrasena: hash, telefono: '+54 11 5555-0232', cargo: 'Operador', idPlaya: beachB.id,
        },
      }),
    ]);
    employeeIds = [employeeA.id, employeeB.id];

    const vehicle = await prisma.vehiculo.create({
      data: { patente: `E3${suffix.replace(/\D/g, '').slice(-6)}`, modelo: 'Auto prueba', tipo: 'Auto', idUsuario: clientA.id },
    });
    vehicleIds = [vehicle.id];
    historicalStay = await prisma.estadia.create({
      data: {
        fechaIngreso: new Date('2026-10-01T10:00:00.000Z'),
        fechaSalida: new Date('2026-10-01T12:00:00.000Z'),
        montoTotal: '123.45', estado: 'Finalizada', idUsuario: clientA.id,
        idVehiculo: vehicle.id, idCochera: occupiedSpot.id,
      },
    });
    stayIds.push(historicalStay.id);
    const activeStay = await prisma.estadia.create({
      data: {
        fechaIngreso: new Date(), estado: 'Activa', idUsuario: clientA.id,
        idVehiculo: vehicle.id, idCochera: occupiedSpot.id,
      },
    });
    stayIds.push(activeStay.id);
    reservaA = await prisma.reserva.create({
      data: {
        ingreso: new Date('2026-12-01T10:00:00.000Z'),
        salidaEstimada: new Date('2026-12-01T12:00:00.000Z'),
        montoSena: '50.00', idUsuario: clientA.id, idVehiculo: vehicle.id, idCochera: occupiedSpot.id,
      },
    });
    reservationIds = [reservaA.id];
    const payment = await prisma.pago.create({
      data: {
        fechaPago: new Date(), monto: '50.00', metodo: 'Efectivo', estado: 'Aprobado',
        idReserva: reservaA.id,
      },
    });
    paymentIds = [payment.id];
    const notification = await prisma.notificacion.create({
      data: {
        titulo: 'Aviso de prueba', mensaje: 'Mensaje ficticio', tipo: 'Prueba',
        fechaEnvio: new Date(), idUsuario: clientA.id,
      },
    });
    notificationIds = [notification.id];
  });

  afterAll(async () => {
    if (prisma) {
      if (paymentIds.length) await prisma.pago.deleteMany({ where: { id: { in: paymentIds } } });
      if (reservationIds.length) await prisma.reserva.deleteMany({ where: { id: { in: reservationIds } } });
      if (stayIds.length) await prisma.estadia.deleteMany({ where: { id: { in: stayIds } } });
      if (notificationIds.length) await prisma.notificacion.deleteMany({ where: { id: { in: notificationIds } } });
      if (vehicleIds.length) await prisma.vehiculo.deleteMany({ where: { id: { in: vehicleIds } } });
      if (spotIds.length) await prisma.cochera.deleteMany({ where: { id: { in: spotIds } } });
      if (tariffIds.length) await prisma.tarifa.deleteMany({ where: { id: { in: tariffIds } } });
      if (employeeIds.length) await prisma.empleado.deleteMany({ where: { id: { in: employeeIds } } });
      if (beachIds.length) await prisma.playaEstacionamiento.deleteMany({ where: { id: { in: beachIds } } });
      if (ownerIds.length) await prisma.dueno.deleteMany({ where: { id: { in: ownerIds } } });
      if (userIds.length) await prisma.usuario.deleteMany({ where: { id: { in: userIds } } });
      if (emails.length) await prisma.empleado.deleteMany({ where: { email: { in: emails } } });
      if (emails.length) await prisma.usuario.deleteMany({ where: { email: { in: emails } } });
      if (emails.length) await prisma.dueno.deleteMany({ where: { email: { in: emails } } });
    }
    await app?.close();
  });

  async function token(tipoCuenta: TipoCuenta, email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, contrasena: password, tipoCuenta })
      .expect(201);
    return response.body.accessToken as string;
  }

  it('expone información pública de playas y tarifas sin divulgar datos de propietario', async () => {
    const playas = await request(app.getHttpServer()).get('/playas/publicas').expect(200);
    expect(playas.body.some((playa: { id: number }) => playa.id === beachA.id)).toBe(true);
    expect(JSON.stringify(playas.body)).not.toContain('contrasena');
    const detalle = await request(app.getHttpServer()).get(`/playas/publicas/${beachA.id}`).expect(200);
    expect(detalle.body).toMatchObject({ id: beachA.id, horaApertura: '07:00', capacidad: 3 });
    const rates = await request(app.getHttpServer()).get(`/playas/${beachA.id}/tarifas`).expect(200);
    expect(rates.body).toContainEqual(expect.objectContaining({ id: tariffA.id, precioHora: '12.5' }));
  });

  it('crea, lista y actualiza playas solo bajo propiedad del dueño', async () => {
    const ownerToken = await token(TipoCuenta.Dueno, ownerA.email);
    const clientToken = await token(TipoCuenta.Cliente, clientA.email);
    await request(app.getHttpServer()).post('/playas').send({
      nombre: 'Nueva Playa', direccion: 'Calle 123', telefono: '+54 11 5555-0240',
      horaApertura: '08:00', horaCierre: '20:00', capacidad: 2, permiteReservas: false,
      idDueno: ownerB.id,
    }).set('Authorization', `Bearer ${ownerToken}`).expect(400);
    const creada = await request(app.getHttpServer()).post('/playas').send({
      nombre: 'Nueva Playa', direccion: 'Calle 123', telefono: '+54 11 5555-0240',
      horaApertura: '08:00', horaCierre: '20:00', capacidad: 2, permiteReservas: false,
    }).set('Authorization', `Bearer ${ownerToken}`).expect(201);
    const creadaId = creada.body.id as number;
    beachIds.push(creadaId);
    await request(app.getHttpServer()).get('/playas').set('Authorization', `Bearer ${ownerToken}`)
      .expect(200).expect(({ body }) => expect(body.map((row: { id: number }) => row.id)).toContain(creadaId));
    await request(app.getHttpServer()).patch(`/playas/${beachB.id}`).send({ nombre: 'Intrusión' })
      .set('Authorization', `Bearer ${ownerToken}`).expect(403);
    await request(app.getHttpServer()).post('/playas').send({
      nombre: 'Cliente', direccion: 'Calle 123', telefono: '+54 11 5555-0241',
      horaApertura: '08:00', horaCierre: '20:00', capacidad: 2, permiteReservas: false,
    }).set('Authorization', `Bearer ${clientToken}`).expect(403);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}`).send({ capacidad: 1 })
      .set('Authorization', `Bearer ${ownerToken}`).expect(409);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}`).send({ horaCierre: '06:00' })
      .set('Authorization', `Bearer ${ownerToken}`).expect(422);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}`).send({ nombre: 'Playa A Editada' })
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
  });

  it('limita playas de gestión y cocheras de empleados a su playa asignada', async () => {
    const employeeToken = await token(TipoCuenta.Empleado, employeeA.email);
    await request(app.getHttpServer()).get('/playas').set('Authorization', `Bearer ${employeeToken}`)
      .expect(200).expect(({ body }) => expect(body.map((row: { id: number }) => row.id)).toEqual([beachA.id]));
    await request(app.getHttpServer()).get(`/playas/${beachB.id}`).set('Authorization', `Bearer ${employeeToken}`).expect(403);
    await request(app.getHttpServer()).get(`/playas/${beachB.id}/cocheras`)
      .set('Authorization', `Bearer ${employeeToken}`).expect(403);
    await request(app.getHttpServer()).post('/playas').send({})
      .set('Authorization', `Bearer ${employeeToken}`).expect(403);
  });

  it('administra empleados únicamente en playas propias y nunca devuelve hashes', async () => {
    const ownerToken = await token(TipoCuenta.Dueno, ownerA.email);
    const payload = {
      nombre: 'Nuevo', apellido: 'Empleado', dni: `8${suffix.replace(/\D/g, '').slice(-8)}`,
      email: `nuevo-${suffix}@ejemplo.test`, contrasena: password,
      telefono: '+54 11 5555-0250', cargo: 'Operador',
    };
    emails.push(payload.email);
    const creado = await request(app.getHttpServer()).post(`/playas/${beachA.id}/empleados`)
      .send(payload).set('Authorization', `Bearer ${ownerToken}`).expect(201);
    expect(creado.body).toMatchObject({ email: payload.email, idPlaya: beachA.id, estado: 'Activo' });
    expect(JSON.stringify(creado.body)).not.toContain('contrasena');
    const nuevoId = creado.body.id as number;
    employeeIds.push(nuevoId);
    await request(app.getHttpServer()).post(`/playas/${beachA.id}/empleados`)
      .send(payload).set('Authorization', `Bearer ${ownerToken}`).expect(409);
    await request(app.getHttpServer()).get(`/playas/${beachA.id}/empleados`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    await request(app.getHttpServer()).get(`/playas/${beachA.id}/empleados/${employeeA.id}`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/empleados/${employeeA.id}`)
      .send({ estado: 'Inactivo' }).set('Authorization', `Bearer ${ownerToken}`).expect(400);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/empleados/${employeeA.id}/traslado`)
      .send({ playaId: beachB.id }).set('Authorization', `Bearer ${ownerToken}`).expect(403);
    await request(app.getHttpServer()).get(`/playas/${beachA.id}/empleados`)
      .set('Authorization', `Bearer ${await token(TipoCuenta.Dueno, ownerB.email)}`).expect(403);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/empleados/${nuevoId}/estado`)
      .send({ estado: 'Inactivo' }).set('Authorization', `Bearer ${ownerToken}`).expect(200);
    const loginDisabled = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: payload.email, contrasena: password, tipoCuenta: 'Empleado' }).expect(401);
    expect(loginDisabled.body.message).toBe('Email, contraseña o tipo de cuenta incorrectos');
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/empleados/${nuevoId}/estado`)
      .send({ estado: 'Activo' }).set('Authorization', `Bearer ${ownerToken}`).expect(200);
  });

  it('permite al cliente actualizar solo su perfil y consultar su historial', async () => {
    const clientToken = await token(TipoCuenta.Cliente, clientA.email);
    await request(app.getHttpServer()).get('/usuarios/me').set('Authorization', `Bearer ${clientToken}`)
      .expect(200).expect(({ body }) => {
        expect(body.id).toBe(clientA.id);
        expect(body).not.toHaveProperty('contrasena');
      });
    await request(app.getHttpServer()).patch('/usuarios/me').send({ nombre: 'Cliente Actualizado' })
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    await request(app.getHttpServer()).patch('/usuarios/me').send({ estado: 'Inactivo' })
      .set('Authorization', `Bearer ${clientToken}`).expect(400);
    const history = await request(app.getHttpServer()).get('/usuarios/me/historial')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(history.body.reservas.map((row: { id: number }) => row.id)).toContain(reservaA.id);
    expect(history.body.estadias.map((row: { id: number }) => row.id)).toContain(historicalStay.id);
    expect(history.body.pagos.map((row: { id: number }) => row.id)).toContain(paymentIds[0]);
    expect(history.body.notificaciones.map((row: { id: number }) => row.id)).toContain(notificationIds[0]);
    const otherHistory = await request(app.getHttpServer()).get('/usuarios/me/historial')
      .set('Authorization', `Bearer ${await token(TipoCuenta.Cliente, clientB.email)}`).expect(200);
    expect(otherHistory.body.reservas).toHaveLength(0);
  });

  it('registra, consulta y modifica vehículos propios; bloquea acceso cruzado y duplicados', async () => {
    const tokenA = await token(TipoCuenta.Cliente, clientA.email);
    const tokenB = await token(TipoCuenta.Cliente, clientB.email);
    const created = await request(app.getHttpServer()).post('/vehiculos')
      .send({ patente: ' ab 123 cd ', modelo: 'Sedan de prueba', tipo: 'Auto' })
      .set('Authorization', `Bearer ${tokenA}`).expect(201);
    expect(created.body.patente).toBe('AB123CD');
    expect(created.body).not.toHaveProperty('idUsuario');
    vehicleIds.push(created.body.id as number);
    await request(app.getHttpServer()).get('/vehiculos').set('Authorization', `Bearer ${tokenA}`)
      .expect(200).expect(({ body }) => expect(body).toContainEqual(expect.objectContaining({ id: created.body.id })));
    await request(app.getHttpServer()).get(`/vehiculos/${created.body.id}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    await request(app.getHttpServer()).get(`/vehiculos/${created.body.id}`).set('Authorization', `Bearer ${tokenB}`).expect(403);
    await request(app.getHttpServer()).patch(`/vehiculos/${created.body.id}`).send({ modelo: 'Intrusión' })
      .set('Authorization', `Bearer ${tokenB}`).expect(403);
    await request(app.getHttpServer()).post('/vehiculos')
      .send({ patente: 'AB123CD', modelo: 'Duplicado', tipo: 'Auto' })
      .set('Authorization', `Bearer ${tokenB}`).expect(409);
    await request(app.getHttpServer()).post('/vehiculos')
      .send({ patente: 'CORTA', modelo: 'Inválido', tipo: 'Auto', idUsuario: clientB.id })
      .set('Authorization', `Bearer ${tokenA}`).expect(400);
    await request(app.getHttpServer()).patch(`/vehiculos/${created.body.id}`).send({ modelo: 'Hatchback' })
      .set('Authorization', `Bearer ${tokenA}`).expect(200);
  });

  it('crea tarifas decimales, restringe su administración y protege importes históricos', async () => {
    const ownerToken = await token(TipoCuenta.Dueno, ownerA.email);
    const created = await request(app.getHttpServer()).post(`/playas/${beachA.id}/tarifas`)
      .send({ descripcion: 'Tarifa e2e', precioHora: '30.25' })
      .set('Authorization', `Bearer ${ownerToken}`).expect(201);
    expect(created.body.precioHora).toBe('30.25');
    tariffIds.push(created.body.id as number);
    await request(app.getHttpServer()).post(`/playas/${beachA.id}/tarifas`)
      .send({ descripcion: 'Negativa', precioHora: '-1' }).set('Authorization', `Bearer ${ownerToken}`).expect(400);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/tarifas/${tariffA.id}`)
      .send({ precioHora: '14.00' }).set('Authorization', `Bearer ${ownerToken}`).expect(409);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/tarifas/${tariffB.id}`)
      .send({ precioHora: '5.00' }).set('Authorization', `Bearer ${ownerToken}`).expect(404);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/tarifas/${tariffA.id}`)
      .send({ descripcion: 'Cambio ajeno' })
      .set('Authorization', `Bearer ${await token(TipoCuenta.Dueno, ownerB.email)}`).expect(403);

    const activeStay = stayIds[1];
    await prisma.estadia.update({ where: { id: activeStay }, data: { estado: 'Finalizada', fechaSalida: new Date() } });
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/tarifas/${tariffA.id}`)
      .send({ precioHora: '14.00' }).set('Authorization', `Bearer ${ownerToken}`).expect(200);
    const unchanged = await prisma.estadia.findUniqueOrThrow({
      where: { id: historicalStay.id }, select: { montoTotal: true },
    });
    expect(unchanged.montoTotal?.toString()).toBe('123.45');
  });

  it('valida relación playa-tarifa, capacidad y estado de cocheras', async () => {
    const ownerToken = await token(TipoCuenta.Dueno, ownerA.email);
    const employeeToken = await token(TipoCuenta.Empleado, employeeA.email);
    const clientToken = await token(TipoCuenta.Cliente, clientA.email);
    const activeStay = await prisma.estadia.create({
      data: {
        fechaIngreso: new Date(), estado: 'Activa', idUsuario: clientA.id,
        idVehiculo: vehicleIds[0], idCochera: occupiedSpot.id,
      },
    });
    stayIds.push(activeStay.id);
    await request(app.getHttpServer()).get(`/playas/${beachA.id}/cocheras/disponibles`).expect(200);
    await request(app.getHttpServer()).get(`/playas/${beachA.id}/cocheras`)
      .set('Authorization', `Bearer ${employeeToken}`).expect(200);
    await request(app.getHttpServer()).get(`/playas/${beachA.id}/cocheras`)
      .set('Authorization', `Bearer ${clientToken}`).expect(403);
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/cocheras/${occupiedSpot.id}`)
      .send({ estado: 'Disponible' }).set('Authorization', `Bearer ${ownerToken}`).expect(409);
    await request(app.getHttpServer()).post(`/playas/${beachA.id}/cocheras`)
      .send({ numero: 'A-02', tipoVehiculo: 'Auto', ubicacion: 'Patio', tarifaId: tariffB.id })
      .set('Authorization', `Bearer ${ownerToken}`).expect(409);
    const newSpot = await request(app.getHttpServer()).post(`/playas/${beachA.id}/cocheras`)
      .send({ numero: 'A-02', tipoVehiculo: 'Moto', ubicacion: 'Patio', tarifaId: tariffA.id })
      .set('Authorization', `Bearer ${ownerToken}`).expect(201);
    spotIds.push(newSpot.body.id as number);
    expect(newSpot.body.estado).toBe('Disponible');
    const available = await request(app.getHttpServer()).get(`/playas/${beachA.id}/cocheras/disponibles`).expect(200);
    expect(available.body.data.map((row: { id: number }) => row.id)).toContain(newSpot.body.id);
    const firstPage = await request(app.getHttpServer())
      .get(`/playas/${beachA.id}/cocheras/disponibles?limite=1`).expect(200);
    expect(firstPage.body.data).toHaveLength(1);
    expect(firstPage.body.paginacion.hayMas).toBe(true);
    const nextPage = await request(app.getHttpServer())
      .get(`/playas/${beachA.id}/cocheras/disponibles?limite=1&cursor=${firstPage.body.paginacion.cursorSiguiente}`)
      .expect(200);
    expect(nextPage.body.data[0].id).not.toBe(firstPage.body.data[0].id);
    await request(app.getHttpServer()).post(`/playas/${beachA.id}/cocheras`)
      .send({ numero: 'A-03', tipoVehiculo: 'Auto', ubicacion: 'Patio', tarifaId: tariffA.id })
      .set('Authorization', `Bearer ${ownerToken}`).expect(409);
    await prisma.estadia.update({
      where: { id: activeStay.id },
      data: { estado: 'Finalizada', fechaSalida: new Date() },
    });
    await request(app.getHttpServer()).patch(`/playas/${beachA.id}/cocheras/${occupiedSpot.id}`)
      .send({ estado: 'Disponible' }).set('Authorization', `Bearer ${ownerToken}`).expect(200);
  });
});
