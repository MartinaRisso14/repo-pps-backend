import type { DataSourceOptions } from 'typeorm';

type PostgresDataSourceOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('Set JWT_SECRET to a private value of at least 32 characters.');
  }

  return secret;
}

export function getDatabaseConfig(): PostgresDataSourceOptions {
  const ssl = process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: true }
    : undefined;
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl,
    };
  }

  const host = process.env.DB_HOST?.trim();
  const username = process.env.DB_USERNAME?.trim();
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_DATABASE?.trim();

  if (!host || !username || !password || !database) {
    throw new Error(
      'Set DATABASE_URL or all DB_HOST, DB_USERNAME, DB_PASSWORD and DB_DATABASE variables.',
    );
  }

  const port = Number(process.env.DB_PORT || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid TCP port number.');
  }

  return {
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    ssl,
  };
}

export function getCorsOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGINS?.trim();
  if (!configuredOrigins) {
    throw new Error('Set CORS_ORIGINS to the allowed frontend origin(s).');
  }

  const origins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('CORS_ORIGINS must contain explicit frontend origins; wildcard is not allowed.');
  }

  return origins;
}

export function getPort(): number {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port number.');
  }
  return port;
}
