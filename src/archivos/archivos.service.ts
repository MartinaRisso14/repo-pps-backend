import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ArchivoDescargable {
  contenido: Buffer;
  tipoMime: 'application/pdf' | 'image/jpeg' | 'image/png';
  nombre: string;
}

@Injectable()
export class ArchivosService {
  constructor(private readonly dataSource: DataSource) {}

  async obtenerArchivo(idArchivo: number, usuCodigo: number, esAdmin: boolean): Promise<ArchivoDescargable> {
    const archivos = await this.dataSource.query(
      `SELECT a.contenido, a.tipoarchivo, a.nombrearchivo
       FROM public.archivos a
       WHERE a.idarchivo = $1
         AND a.estado = 'AC'
         AND EXISTS (
           SELECT 1
           FROM public.empleados e
           JOIN public.usuarioslegajos ul ON ul.legajo = e.legajo
           WHERE ul.estado = 'AC'
             AND e.estado = 'AC'
             AND (ul.usucodigo = $2 OR $3 = TRUE)
             AND (
               e.idarchivofoto = a.idarchivo
               OR EXISTS (
                 SELECT 1
                 FROM public.emp_cud ec
                 WHERE ec.legajo = e.legajo
                   AND ec.idarchivo = a.idarchivo
                     AND ec.estado = 'AC'
               )
             )
         )
       LIMIT 1`,
      [idArchivo, usuCodigo, esAdmin],
    );

    const archivo = archivos[0];
    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const contenido = Buffer.isBuffer(archivo.contenido)
      ? archivo.contenido
      : Buffer.from(archivo.contenido);
    const tipoMime = this.detectarMime(contenido);
    if (!tipoMime) {
      throw new NotFoundException('El contenido del archivo no tiene un formato permitido');
    }

    return {
      contenido,
      tipoMime,
      nombre: this.normalizarNombre(archivo.nombrearchivo, tipoMime),
    };
  }

  private detectarMime(contenido: Buffer): ArchivoDescargable['tipoMime'] | null {
    if (contenido.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
    if (contenido.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return 'image/png';
    }
    if (contenido[0] === 0xff && contenido[1] === 0xd8 && contenido[2] === 0xff) {
      return 'image/jpeg';
    }
    return null;
  }

  private normalizarNombre(nombre: unknown, tipoMime: ArchivoDescargable['tipoMime']): string {
    const nombreSeguro = typeof nombre === 'string'
      ? nombre.replace(/[\\/\r\n"]/g, '_').trim()
      : '';
    if (nombreSeguro) return nombreSeguro;
    const extension = tipoMime === 'application/pdf' ? 'pdf' : tipoMime === 'image/png' ? 'png' : 'jpg';
    return `archivo.${extension}`;
  }
}
