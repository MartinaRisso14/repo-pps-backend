import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ArchivosService } from './archivos.service';
import type { Request as ExpressRequest, Response } from 'express';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    usuCodigo: number;
    idRol: number;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  @Get(':id')
  async obtenerArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const archivo = await this.archivosService.obtenerArchivo(
      id,
      req.user.usuCodigo,
      Number(req.user.idRol) === 1,
    );

    res.set({
      'Content-Type': archivo.tipoMime,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(archivo.contenido);
  }
}
