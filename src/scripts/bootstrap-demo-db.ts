import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from '../config/environment';

const REQUIRED_TABLES = [
  'archivos',
  'direcciones',
  'emp_cud',
  'empleados',
  'familiares',
  'funciones',
  'parentesco',
  'reparticiones',
  'roles',
  'solicitudes_modificacion',
  'usuarios',
  'usuarioslegajos',
];

const PARENTESCOS = [
  'CONYUGE',
  'HERMANO/A',
  'HIJO/A',
  'MADRE',
  'OTRO',
  'PADRE',
];

const FUNCIONES = [
  'OPERARIO',
  'MAESTRANZA',
  'CHOFER',
  'GUARDAVIDA',
  'GUARDAPARQUES',
  'GUIAS TURISTICOS',
  'INSPECTOR',
  'PROFESIONAL DE SALUD',
  'DOCENTE',
  'PROFESIONAL INFORMATICO',
  'PROFESIONAL EN GENERAL',
  'TECNICOS EN GRAL',
  'PERSONAL DE SEGURIDAD',
  'CAJERO',
  'JUEZ',
  'FISCAL',
  'CONCEJAL',
];

function requireDemoValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.length < 8) {
    throw new Error(`${name} must be set to a value of at least 8 characters.`);
  }
  return value;
}

async function ensureSchema(dataSource: DataSource): Promise<void> {
  const existing = await dataSource.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
       AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES],
  );
  if (existing.length === REQUIRED_TABLES.length) return;
  if (existing.length > 0) {
    const found = existing.map((table: { table_name: string }) => table.table_name);
    throw new Error(
      `Refusing to initialize a partially populated database schema (found ${found.join(', ')}).`,
    );
  }

  const schema = await readFile(
    resolve(process.cwd(), 'database/bootstrap/demo-schema.sql'),
    'utf8',
  );
  await dataSource.query(schema);
}

async function ensureSolicitudEstadoCheck(dataSource: DataSource): Promise<void> {
  const restricciones = await dataSource.query(
    `SELECT pg_get_constraintdef(oid) AS definicion
     FROM pg_constraint
     WHERE conrelid = 'public.solicitudes_modificacion'::regclass
       AND conname = 'solicitudes_modificacion_estado_check'`,
  );
  if (restricciones.length > 0 && restricciones[0].definicion.includes('CANCELADA')) return;

  await dataSource.query(
    `ALTER TABLE public.solicitudes_modificacion
       DROP CONSTRAINT IF EXISTS solicitudes_modificacion_estado_check`,
  );
  await dataSource.query(
    `ALTER TABLE public.solicitudes_modificacion
       ADD CONSTRAINT solicitudes_modificacion_estado_check
       CHECK ((estado)::text = ANY (ARRAY['PENDIENTE'::character varying, 'APROBADA'::character varying,
                                          'RECHAZADA'::character varying, 'CANCELADA'::character varying]))`,
  );
  console.log('solicitudes_modificacion_estado_check actualizado para admitir CANCELADA.');
}

async function seedCatalogs(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO public.roles (idrol, descripcion)
       VALUES (1, 'Administrador'), (2, 'Usuario Común')
       ON CONFLICT (idrol) DO NOTHING`,
    );
    const roles = await manager.query(
      `SELECT idrol, descripcion
       FROM public.roles
       WHERE LOWER(descripcion) IN ('administrador', 'usuario común')`,
    );
    const adminRole = roles.find((role: { descripcion: string }) =>
      role.descripcion.toLowerCase() === 'administrador');
    const userRole = roles.find((role: { descripcion: string }) =>
      role.descripcion.toLowerCase() === 'usuario común');
    if (!adminRole || adminRole.idrol !== 1 || !userRole || userRole.idrol !== 2) {
      throw new Error('The demo database must map idrol 1 to Administrador and idrol 2 to Usuario Común.');
    }

    await manager.query(
      `SELECT setval(
         pg_get_serial_sequence('public.roles', 'idrol'),
         COALESCE((SELECT MAX(idrol) FROM public.roles), 0),
         true
       )`,
    );

    for (const parentesco of PARENTESCOS) {
      await manager.query(
        `INSERT INTO public.parentesco (parentesco)
         VALUES ($1)
         ON CONFLICT (parentesco) DO NOTHING`,
        [parentesco],
      );
    }
    for (const funcion of FUNCIONES) {
      const existente = await manager.query(
        `SELECT 1 FROM public.funciones
         WHERE LOWER(TRIM(funcion)) = LOWER(TRIM($1::varchar))
         LIMIT 1`,
        [funcion],
      );
      if (existente.length === 0) {
        await manager.query(
          `INSERT INTO public.funciones (funcion) VALUES ($1)`,
          [funcion],
        );
      }
    }
  });
}

async function ensureDemoUser(
  dataSource: DataSource,
  options: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    roleId: number;
    createEmployee: boolean;
  },
): Promise<number> {
  const hash = await bcrypt.hash(options.password, 12);
  const user = await dataSource.transaction(async (manager) => {
    const existing = await manager.query(
      `SELECT usucodigo
       FROM public.usuarios
       WHERE LOWER(usunombre) = LOWER($1)
       LIMIT 1`,
      [options.username],
    );
    if (existing.length > 0) return existing[0].usucodigo as number;

    const inserted = await manager.query(
      `INSERT INTO public.usuarios (
         usunombre, password_hash, apenom, idrol, estado, email,
         debe_cambiar_password, fechamod
       )
       VALUES ($1, $2, $3, $4, 'AC', $5, FALSE, CURRENT_TIMESTAMP)
       RETURNING usucodigo`,
      [options.username, hash, options.fullName, options.roleId, options.email],
    );
    return inserted[0].usucodigo as number;
  });

  if (!options.createEmployee) return user;

  await dataSource.transaction(async (manager) => {
    const activeLinks = await manager.query(
      `SELECT legajo
       FROM public.usuarioslegajos
       WHERE usucodigo = $1 AND estado = 'AC'
       LIMIT 1`,
      [user],
    );
    if (activeLinks.length > 0) return;

    const legajoRows = await manager.query(
      `SELECT COALESCE(MAX(legajo), 0) + 1 AS legajo
       FROM public.empleados`,
    );
    const legajo = Number(legajoRows[0].legajo);
    await manager.query(
      `INSERT INTO public.empleados (
         legajo, apellido, nombres, nrodocumento, tipodocumento,
         estadocivil, estado, fechamod
       )
       VALUES ($1, 'DEMO', 'Usuario de prueba', $2, 'DNI', 'SOLTERO/A', 'AC', CURRENT_TIMESTAMP)`,
      [legajo, `DEMO-${user}`],
    );
    await manager.query(
      `INSERT INTO public.usuarioslegajos (usucodigo, legajo, estado, fechamod)
       VALUES ($1, $2, 'AC', CURRENT_TIMESTAMP)`,
      [user, legajo],
    );
    await manager.query(
      `INSERT INTO public.direcciones (legajo, calle, callenro, ciudad, provincia, email, estado, fechamod)
       VALUES ($1, 'Domicilio de prueba', '1', 'Ciudad de prueba', 'Buenos Aires', $2, 'AC', CURRENT_TIMESTAMP)`,
      [legajo, options.email],
    );
  });

  return user;
}

async function bootstrap(): Promise<void> {
  if (process.env.DEMO_MODE !== 'true' || process.env.DEMO_SEED_ENABLED !== 'true') {
    throw new Error('Demo database initialization requires DEMO_MODE=true and DEMO_SEED_ENABLED=true.');
  }

  const adminUsername = requireDemoValue('DEMO_ADMIN_USERNAME');
  const adminPassword = requireDemoValue('DEMO_ADMIN_PASSWORD');
  const userUsername = requireDemoValue('DEMO_USER_USERNAME');
  const userPassword = requireDemoValue('DEMO_USER_PASSWORD');
  if (adminUsername.toLowerCase() === userUsername.toLowerCase()) {
    throw new Error('Demo administrator and user accounts must have different usernames.');
  }

  const dataSource = new DataSource({
    ...getDatabaseConfig(),
    type: 'postgres',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    await ensureSchema(dataSource);
    await ensureSolicitudEstadoCheck(dataSource);
    await seedCatalogs(dataSource);

    const [admin, user] = await Promise.all([
      ensureDemoUser(dataSource, {
        username: adminUsername,
        password: adminPassword,
        fullName: 'Administración de prueba',
        email: 'admin-demo@example.invalid',
        roleId: 1,
        createEmployee: false,
      }),
      ensureDemoUser(dataSource, {
        username: userUsername,
        password: userPassword,
        fullName: 'Agente de prueba',
        email: 'usuario-demo@example.invalid',
        roleId: 2,
        createEmployee: true,
      }),
    ]);
    console.log(`Demo schema ready with test-only accounts (IDs ${admin}, ${user}).`);
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Demo database initialization failed.', error);
  process.exitCode = 1;
});
