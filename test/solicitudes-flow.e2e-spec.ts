import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { jest } from '@jest/globals';
import { AppModule } from './../src/app.module';

describe('Flujo integral de solicitudes (e2e con PostgreSQL)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea, aprueba y rechaza solicitudes; persiste familiares y adjuntos, y respeta estados activos', async () => {
    const marker = randomBytes(8).toString('hex');
    const legajoUsuario = 900000000 + randomBytes(3).readUIntBE(0, 3);
    const legajoAdmin = legajoUsuario + 1;
    const nombreReparticion = `E2E-${marker}`;
    const usuariosIds: number[] = [];
    const legajos = [legajoUsuario, legajoAdmin];

    const cleanup = async () => {
      const archivos = await dataSource.query(
        `SELECT idarchivofoto AS id FROM public.empleados WHERE legajo = ANY($1::int[])
         UNION
         SELECT idarchivo AS id FROM public.emp_cud WHERE legajo = ANY($1::int[])`,
        [legajos],
      );
      await dataSource.query(
        `DELETE FROM public.solicitudes_modificacion WHERE usucodigo = ANY($1::int[])`,
        [usuariosIds],
      );
      await dataSource.query(
        `DELETE FROM public.emp_cud WHERE legajo = ANY($1::int[])`,
        [legajos],
      );
      await dataSource.query(
        `DELETE FROM public.familiares WHERE legajo = ANY($1::int[])`,
        [legajos],
      );
      await dataSource.query(
        `DELETE FROM public.direcciones WHERE legajo = ANY($1::int[])`,
        [legajos],
      );
      await dataSource.query(
        `DELETE FROM public.usuarioslegajos WHERE usucodigo = ANY($1::int[])`,
        [usuariosIds],
      );
      await dataSource.query(
        `DELETE FROM public.empleados WHERE legajo = ANY($1::int[])`,
        [legajos],
      );
      if (archivos.length > 0) {
        await dataSource.query(
          `DELETE FROM public.archivos WHERE idarchivo = ANY($1::int[])`,
          [archivos.map((archivo: { id: number }) => archivo.id).filter(Boolean)],
        );
      }
      if (usuariosIds.length > 0) {
        await dataSource.query(
          `DELETE FROM public.usuarios WHERE usucodigo = ANY($1::int[])`,
          [usuariosIds],
        );
      }
      await dataSource.query(
        `DELETE FROM public.reparticiones
         WHERE nombre = $1
           AND NOT EXISTS (
             SELECT 1 FROM public.empleados WHERE idreparticion = reparticiones.idreparticion
           )`,
        [nombreReparticion],
      );
    };

    try {
      const roles = await dataSource.query(
        `SELECT idrol, descripcion FROM public.roles
         WHERE LOWER(descripcion) IN ('administrador', 'usuario común')`,
      );
      const idRolAdmin = roles.find((role: { descripcion: string }) =>
        role.descripcion.toLowerCase() === 'administrador')?.idrol;
      const idRolUsuario = roles.find((role: { descripcion: string }) =>
        role.descripcion.toLowerCase() === 'usuario común')?.idrol;
      expect(idRolAdmin).toBeDefined();
      expect(idRolUsuario).toBeDefined();

      const password = `E2E-${marker}-password`;
      const passwordHash = await bcrypt.hash(password, 4);
      for (const [sufijo, idRol] of [['usuario', idRolUsuario], ['admin', idRolAdmin]] as const) {
        const filas = await dataSource.query(
          `INSERT INTO public.usuarios (
             usunombre, password_hash, apenom, idrol, estado, email, debe_cambiar_password
           )
           VALUES ($1, $2, $3, $4, 'AC', $5, FALSE)
           RETURNING usucodigo`,
          [
            `e2e-${marker}-${sufijo}`,
            passwordHash,
            `Usuario ${sufijo} de prueba`,
            idRol,
            `e2e-${marker}-${sufijo}@example.invalid`,
          ],
        );
        usuariosIds.push(filas[0].usucodigo);
      }
      const [idUsuario, idAdmin] = usuariosIds;

      for (const [legajo, apellido] of [
        [legajoUsuario, 'PRUEBA'],
        [legajoAdmin, 'ADMIN PRUEBA'],
      ] as const) {
        await dataSource.query(
          `INSERT INTO public.empleados (
             legajo, apellido, nombres, nrodocumento, estadocivil, estado
           )
           VALUES ($1, $2, 'E2E', $3, 'SOLTERO/A', 'AC')`,
          [legajo, apellido, `${legajo}`],
        );
      }
      for (const [usuCodigo, legajo] of [
        [idUsuario, legajoUsuario],
        [idAdmin, legajoAdmin],
      ] as const) {
        await dataSource.query(
          `INSERT INTO public.usuarioslegajos (usucodigo, legajo, estado)
           VALUES ($1, $2, 'AC')`,
          [usuCodigo, legajo],
        );
      }
      await dataSource.query(
        `INSERT INTO public.direcciones (legajo, calle, callenro, ciudad, estado)
         VALUES ($1, 'Calle Inicial', '10', 'Ciudad Inicial', 'AC'),
                ($2, 'Calle Admin', '20', 'Ciudad Inicial', 'AC')`,
        [legajoUsuario, legajoAdmin],
      );
      const familiarInicial = await dataSource.query(
        `INSERT INTO public.familiares (
           legajo, numfamiliar, apellido, nombres, parentesco, estado
         )
         VALUES ($1, 1, 'FAMILIAR', 'INICIAL', 'HIJO/A', 'AC')
         RETURNING id_familiar`,
        [legajoUsuario],
      );
      const idFamiliarInicial = familiarInicial[0].id_familiar;

      const loginUsuario = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ usuNombre: `e2e-${marker}-usuario`, password })
        .expect(200);
      const loginAdmin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ usuNombre: `e2e-${marker}-admin`, password })
        .expect(200);
      const tokenUsuario = loginUsuario.body.access_token as string;
      const tokenAdmin = loginAdmin.body.access_token as string;
      expect(tokenUsuario).toBeTruthy();
      expect(tokenAdmin).toBeTruthy();

      const perfilInicial = await request(app.getHttpServer())
        .get(`/usuarios/e2e-${marker}-usuario`)
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(200);
      expect(perfilInicial.body.password_hash).toBeUndefined();
      expect(perfilInicial.body.empleado.estadoCivil).toBe('SOLTERO/A');

      const funciones = await request(app.getHttpServer())
        .get('/usuarios/catalogos/funciones')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(200);
      expect(funciones.body.length).toBeGreaterThan(0);

      const foto = 'data:image/png;base64,iVBORw0KGgo=';
      const cud = 'data:application/pdf;base64,JVBERi0xLjQK';
      const cudFamiliar = 'data:application/pdf;base64,JVBERi0xLjQK';
      const solicitudUsuario = await request(app.getHttpServer())
        .post('/solicitudes')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .send({
          calle: 'Calle Aprobada',
          callenro: '25',
          ciudad: 'Ciudad Nueva',
          email: `actualizado-${marker}@example.invalid`,
          estadoCivil: 'CASADO/A',
          funcion: funciones.body[0].funcion,
          reparticion: nombreReparticion,
          foto,
          cud: {
            fechaEmision: '2025-01-01',
            fechaVencimiento: '2030-01-01',
            archivo: cud,
            nombreArchivo: `cud-${marker}.pdf`,
          },
          familiares: [
            { idFamiliar: idFamiliarInicial, eliminado: true },
            {
              esNuevo: true,
              apellido: 'FAMILIAR',
              nombres: 'NUEVO',
              parentesco: 'HIJO/A',
              tipoDocumento: 'DNI',
              nroDocumento: `${legajoUsuario}`,
              sexo: 'FEMENINO',
              discapacitado: false,
              archivoCud: cudFamiliar,
              nombreArchivoCud: `familiar-${marker}.pdf`,
            },
          ],
        })
        .expect(201);
      const idSolicitudUsuario = solicitudUsuario.body.id as number;
      expect(solicitudUsuario.body.estado).toBe('PENDIENTE');

      const solicitudPersistida = await dataSource.query(
        `SELECT datos_solicitados
         FROM public.solicitudes_modificacion
         WHERE id = $1`,
        [idSolicitudUsuario],
      );
      expect(solicitudPersistida[0].datos_solicitados.familiares[1].archivoCud)
        .toBe(cudFamiliar);

      const sinCambiosAntesDeAprobar = await dataSource.query(
        `SELECT e.estadocivil, d.calle, e.idarchivofoto
         FROM public.empleados e
         JOIN public.direcciones d ON d.legajo = e.legajo AND d.estado = 'AC'
         WHERE e.legajo = $1`,
        [legajoUsuario],
      );
      expect(sinCambiosAntesDeAprobar[0]).toMatchObject({
        estadocivil: 'SOLTERO/A',
        calle: 'Calle Inicial',
        idarchivofoto: null,
      });

      const solicitudPropiaAdmin = await request(app.getHttpServer())
        .post('/solicitudes')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ estadoCivil: 'DIVORCIADO/A' })
        .expect(201);

      const bandeja = await request(app.getHttpServer())
        .get('/solicitudes')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      const idsBandeja = bandeja.body.map((item: { id: number }) => item.id);
      expect(idsBandeja).toContain(idSolicitudUsuario);
      expect(idsBandeja).not.toContain(solicitudPropiaAdmin.body.id);
      const itemBandeja = bandeja.body.find(
        (item: { id: number }) => item.id === idSolicitudUsuario,
      );
      expect(itemBandeja.apellidoEmpleado).toBe('PRUEBA');
      expect(itemBandeja.nombresEmpleado).toBe('E2E');
      await request(app.getHttpServer())
        .get('/solicitudes')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/solicitudes/${idSolicitudUsuario}/aprobar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      const empleadoAprobado = await dataSource.query(
        `SELECT e.estadocivil, e.idfuncion, e.idreparticion,
                d.calle, d.callenro, d.ciudad, d.email, u.email AS email_cuenta
         FROM public.empleados e
         JOIN public.direcciones d ON d.legajo = e.legajo AND d.estado = 'AC'
         JOIN public.usuarioslegajos ul ON ul.legajo = e.legajo AND ul.estado = 'AC'
         JOIN public.usuarios u ON u.usucodigo = ul.usucodigo
         WHERE e.legajo = $1`,
        [legajoUsuario],
      );
      expect(empleadoAprobado[0]).toMatchObject({
        estadocivil: 'CASADO/A',
        calle: 'Calle Aprobada',
        callenro: '25',
        ciudad: 'Ciudad Nueva',
        email: `actualizado-${marker}@example.invalid`,
        email_cuenta: `actualizado-${marker}@example.invalid`,
      });
      const reparticionCreada = await dataSource.query(
        `SELECT r.idreparticion
         FROM public.reparticiones r
         JOIN public.empleados e ON e.idreparticion = r.idreparticion
         WHERE e.legajo = $1 AND r.nombre = $2 AND r.estado = 'AC'`,
        [legajoUsuario, nombreReparticion],
      );
      expect(reparticionCreada).toHaveLength(1);
      expect(empleadoAprobado[0].idfuncion).toBe(funciones.body[0].idfuncion);

      const familiaresAplicados = await dataSource.query(
        `SELECT apellido, nombres, estado
         FROM public.familiares
         WHERE legajo = $1
         ORDER BY id_familiar`,
        [legajoUsuario],
      );
      expect(familiaresAplicados).toContainEqual(expect.objectContaining({
        apellido: 'FAMILIAR',
        nombres: 'INICIAL',
        estado: 'BA',
      }));
      expect(familiaresAplicados).toContainEqual(expect.objectContaining({
        apellido: 'FAMILIAR',
        nombres: 'NUEVO',
        estado: 'AC',
      }));

      const perfilAprobado = await request(app.getHttpServer())
        .get(`/usuarios/e2e-${marker}-usuario`)
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(200);
      const idArchivoFoto = perfilAprobado.body.empleado.idArchivoFoto as number;
      const idArchivoCud = perfilAprobado.body.empleado.cud.idArchivoCud as number;
      expect(idArchivoFoto).toBeTruthy();
      expect(idArchivoCud).toBeTruthy();
      expect(perfilAprobado.body.empleado.familiares).toHaveLength(1);

      await request(app.getHttpServer())
        .get(`/archivos/${idArchivoFoto}`)
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(200)
        .expect('Content-Type', /image\/png/);
      await request(app.getHttpServer())
        .get(`/archivos/${idArchivoCud}`)
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(200)
        .expect('Content-Type', /application\/pdf/);
      await request(app.getHttpServer())
        .get(`/archivos/${idArchivoFoto}`)
        .expect(401);

      const archivosPersistidos = await dataSource.query(
        `SELECT COUNT(*)::int AS cantidad
         FROM public.archivos
         WHERE idarchivo = ANY($1::int[]) AND estado = 'AC'`,
        [[idArchivoFoto, idArchivoCud]],
      );
      expect(archivosPersistidos[0].cantidad).toBe(2);

      const solicitudRechazada = await request(app.getHttpServer())
        .post('/solicitudes')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .send({ calle: 'Calle Rechazada', estadoCivil: 'VIUDO/A' })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/solicitudes/${solicitudRechazada.body.id}/rechazar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ motivoRechazo: 'Rechazo de prueba integral' })
        .expect(200);
      const luegoDelRechazo = await dataSource.query(
        `SELECT e.estadocivil, d.calle
         FROM public.empleados e
         JOIN public.direcciones d ON d.legajo = e.legajo AND d.estado = 'AC'
         WHERE e.legajo = $1`,
        [legajoUsuario],
      );
      expect(luegoDelRechazo[0]).toMatchObject({
        estadocivil: 'CASADO/A',
        calle: 'Calle Aprobada',
      });

      await request(app.getHttpServer())
        .post('/solicitudes')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .send({ cud: null })
        .expect(201)
        .then(async (respuesta) => {
          await request(app.getHttpServer())
            .patch(`/solicitudes/${respuesta.body.id}/aprobar`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(200);
        });

      const cudDadoDeBaja = await dataSource.query(
        `SELECT ec.estado AS estado_cud, a.estado AS estado_archivo
         FROM public.emp_cud ec
         JOIN public.archivos a ON a.idarchivo = ec.idarchivo
         WHERE ec.legajo = $1
         ORDER BY ec.idcud DESC
         LIMIT 1`,
        [legajoUsuario],
      );
      expect(cudDadoDeBaja[0]).toMatchObject({
        estado_cud: 'BA',
        estado_archivo: 'BA',
      });
      await request(app.getHttpServer())
        .get(`/archivos/${idArchivoCud}`)
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(404);

      const perfilSinCud = await request(app.getHttpServer())
        .get(`/usuarios/e2e-${marker}-usuario`)
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(200);
      expect(perfilSinCud.body.empleado.cud).toBeNull();

      await dataSource.query(
        `UPDATE public.archivos SET estado = 'BA' WHERE idarchivo = $1`,
        [idArchivoFoto],
      );
      const perfilSinFoto = await request(app.getHttpServer())
        .get(`/usuarios/e2e-${marker}-usuario`)
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(200);
      expect(perfilSinFoto.body.empleado.idArchivoFoto).toBeNull();
      await request(app.getHttpServer())
        .get(`/archivos/${idArchivoFoto}`)
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/solicitudes/${solicitudPropiaAdmin.body.id}/rechazar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ motivoRechazo: 'Solicitud propia de prueba' })
        .expect(200);
      const adminSinCambios = await dataSource.query(
        `SELECT estadocivil FROM public.empleados WHERE legajo = $1`,
        [legajoAdmin],
      );
      expect(adminSinCambios[0].estadocivil).toBe('SOLTERO/A');
    } finally {
      await cleanup();
    }
  });
});
