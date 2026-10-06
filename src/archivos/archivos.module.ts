import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ArchivosController } from './archivos.controller';
import { ArchivosService } from './archivos.service';

@Module({
  imports: [AuthModule],
  controllers: [ArchivosController],
  providers: [ArchivosService],
})
export class ArchivosModule {}
