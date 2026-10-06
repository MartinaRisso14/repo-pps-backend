import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { Usuario } from './usuarios/entities/usuario.entity';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { ArchivosModule } from './archivos/archivos.module';
import { getDatabaseConfig } from './config/environment';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...getDatabaseConfig(),
      entities: [Usuario],
      autoLoadEntities: true,
      synchronize: false,
    }),
    UsuariosModule,
    AuthModule,
    SolicitudesModule,
    ArchivosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}