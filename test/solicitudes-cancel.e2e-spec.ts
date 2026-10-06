import { ValidationPipe, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { jest } from '@jest/globals';
import { AppModule } from './../src/app.module';

describe('Cancelación de solicitudes (e2e con PostgreSQL)', () => {
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

  it('cancela con el solicitante, rechaza a terceros y libera una nueva solicitud', async () => {
    const marker = randomBytes(8).toString('hex');
    const usuariosIds: number[] = [];

    const cleanup = async () => {
      if (usuariosIds.length === 0) return;
      await dataSource.query(
        `DELETE FROM public.solicitudes_modificacion WHERE usucodigo = ANY($1::int[])`,
        [usuariosIds],
      );
      await dataSource.query(
        `DELETE FROM public.usuarios WHERE usucodigo = ANY($1::int[])`,
        [usuariosIds],
      );
    };

    try {
      const roles = await dataSource.query(
        `SELECT idrol, descripcion FROM public.roles
         WHERE LOWER(descripcion) IN ('administrador', 'usuario común')`,
      );
      const idRolUsuario = roles.find((role: { descripcion: string }) =>
        role.descripcion.toLowerCase() === 'usuario común')?.idrol;
      const idRolAdmin = roles.find((role: { descripcion: string }) =>
        role.descripcion.toLowerCase() === 'administrador')?.idrol;
      expect(idRolUsuario).toBeDefined();
      expect(idRolAdmin).toBeDefined();

      const passwordHash = await bcrypt.hash(`E2E-${marker}-password`, 4);
      for (const [sufijo, idRol] of [['solicitante', idRolUsuario], ['tercero', idRolAdmin]] as const) {
        const filas = await dataSource.query(
          `INSERT INTO public.usuarios (
             usunombre, password_hash, apenom, idrol, estado, email, debe_cambiar_password
           )
           VALUES ($1, $2, $3, $4, 'AC', $5, FALSE)
           RETURNING usucodigo`,
          [
            `e2e-cancel-${marker}-${sufijo}`,
            passwordHash,
            `Cancel ${sufijo}`,
            idRol,
            `e2e-cancel-${marker}-${sufijo}@example.invalid`,
          ],
        );
        usuariosIds.push(filas[0].usucodigo);
      }

      const loginSolicitante = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ usuNombre: `e2e-cancel-${marker}-solicitante`, password: `E2E-${marker}-password` })
        .expect(200);
      const loginTercero = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ usuNombre: `e2e-cancel-${marker}-tercero`, password: `E2E-${marker}-password` })
        .expect(200);
      const tokenSolicitante = loginSolicitante.body.access_token as string;
      const tokenTercero = loginTercero.body.access_token as string;

      const creada = await request(app.getHttpServer())
        .post('/solicitudes')
        .set('Authorization', `Bearer ${tokenSolicitante}`)
        .send({ ciudad: `Ciudad ${marker}` })
        .expect(201);
      const idSolicitud = creada.body.id as number;
      expect(creada.body.estado).toBe('PENDIENTE');

      await request(app.getHttpServer())
        .delete(`/solicitudes/${idSolicitud}/cancelar`)
        .set('Authorization', `Bearer ${tokenTercero}`)
        .expect(403);

      const cancelada = await request(app.getHttpServer())
        .delete(`/solicitudes/${idSolicitud}/cancelar`)
        .set('Authorization', `Bearer ${tokenSolicitante}`)
        .expect(200);
      expect(cancelada.body.estado).toBe('CANCELADA');
      expect(cancelada.body.fechaRevision).toBeTruthy();

      const historial = await request(app.getHttpServer())
        .get('/solicitudes/mis-solicitudes')
        .set('Authorization', `Bearer ${tokenSolicitante}`)
        .expect(200);
      const persistida = historial.body.find((solicitud: { id: number }) => solicitud.id === idSolicitud);
      expect(persistida.estado).toBe('CANCELADA');
      expect(persistida.fechaRevision).toBeTruthy();

      const enBD = await dataSource.query(
        `SELECT estado FROM public.solicitudes_modificacion WHERE id = $1`,
        [idSolicitud],
      );
      expect(enBD[0].estado).toBe('CANCELADA');

      await request(app.getHttpServer())
        .delete(`/solicitudes/${idSolicitud}/cancelar`)
        .set('Authorization', `Bearer ${tokenSolicitante}`)
        .expect(400);

      await request(app.getHttpServer())
        .delete('/solicitudes/999999999/cancelar')
        .set('Authorization', `Bearer ${tokenSolicitante}`)
        .expect(404);

      const nueva = await request(app.getHttpServer())
        .post('/solicitudes')
        .set('Authorization', `Bearer ${tokenSolicitante}`)
        .send({ estadoCivil: 'CASADO/A' })
        .expect(201);
      expect(nueva.body.estado).toBe('PENDIENTE');
    } finally {
      await cleanup();
    }
  });
});
