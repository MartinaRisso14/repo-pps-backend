import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { getCorsOrigins, getPort } from './config/environment';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  app.useBodyParser('json', { limit: '24mb' });

  app.enableCors({ origin: getCorsOrigins() });

  // Activa las validaciones de los DTOs (que no manden campos vacíos)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = getPort();
  await app.listen(port, '0.0.0.0');
  console.log(`Servidor iniciado en el puerto ${port}`);
}
bootstrap();