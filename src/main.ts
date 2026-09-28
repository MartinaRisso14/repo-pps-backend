import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Permite que el frontend pueda hacer peticiones al backend
  app.enableCors();

  // Activa las validaciones de los DTOs (que no manden campos vacíos)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(3000);
  console.log('Servidor corriendo en: http://localhost:3000');
}
bootstrap();