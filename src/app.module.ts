import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { Usuario } from './usuarios/entities/usuario.entity';
import { SolicitudesModule } from './solicitudes/solicitudes.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1234', 
      database: 'datos_empleados_db',          
      entities: [Usuario],
      autoLoadEntities: true,
      synchronize: false,
    }),
    UsuariosModule,
    AuthModule,
    SolicitudesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}