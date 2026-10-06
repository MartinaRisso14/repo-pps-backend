import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, DataSource } from 'typeorm';
import { SolicitudModificacion } from './solicitud.entity';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { RechazarSolicitudDto } from './dto/rechazar-solicitud.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';


@Injectable()
export class SolicitudesService {
  private readonly maximoArchivoBytes = 5 * 1024 * 1024;
  private readonly maximoTotalAdjuntosBytes = 15 * 1024 * 1024;

  constructor(
    @InjectRepository(SolicitudModificacion)
    private readonly solicitudRepo: Repository<SolicitudModificacion>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly dataSource: DataSource
  ) {}

  // 1. Crear solicitud (Usuario común)
  async crearSolicitud(usuCodigo: number, dto: CrearSolicitudDto) {
  this.validarAdjuntos(dto);

  // Verificar si ya existe una solicitud PENDIENTE para el usuario
  let solicitud = await this.solicitudRepo.findOne({
    where: {
      usuCodigo,
      estado: 'PENDIENTE',
    },
  });

   if (solicitud) {
      throw new BadRequestException(
        `Ya poseés una solicitud pendiente de revisión (Trámite #${solicitud.id}). Debés esperar a que sea procesada antes de iniciar otra.`,
      );
    }

  // 2. Si no hay ninguna pendiente (es la primera vez o las anteriores ya fueron aprobadas/rechazadas)
  solicitud = this.solicitudRepo.create({
    usuCodigo,
    datosSolicitados: dto,
    estado: 'PENDIENTE',
    fechaCreacion: new Date(),
  });

  return await this.solicitudRepo.save(solicitud);
}

  private validarAdjuntos(dto: CrearSolicitudDto) {
    let totalBytes = 0;
    const validar = (contenido: unknown, etiqueta: string, maximoBytes: number) => {
      if (contenido === undefined || contenido === null || contenido === '') return;
      if (typeof contenido !== 'string') {
        throw new BadRequestException(`El archivo adjunto de ${etiqueta} no tiene un formato válido.`);
      }

      const match = /^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(contenido);
      if (!match) {
        throw new BadRequestException(`El archivo adjunto de ${etiqueta} debe ser PDF, JPG o PNG.`);
      }

      const mime = match[1].toLowerCase();
      const base64 = match[2];
      const bytes = Buffer.from(base64, 'base64');
      if (bytes.toString('base64') !== base64) {
        throw new BadRequestException(`El archivo adjunto de ${etiqueta} está dañado.`);
      }
      if (bytes.length > maximoBytes) {
        throw new BadRequestException(`El archivo adjunto de ${etiqueta} supera el tamaño máximo permitido.`);
      }

      const esPdfValido = mime === 'application/pdf'
        && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
      const esPngValido = mime === 'image/png'
        && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const esJpegValido = mime === 'image/jpeg'
        && bytes[0] === 0xff
        && bytes[1] === 0xd8
        && bytes[2] === 0xff;

      if (!esPdfValido && !esPngValido && !esJpegValido) {
        throw new BadRequestException(`El contenido del archivo adjunto de ${etiqueta} no coincide con su formato.`);
      }

      totalBytes += bytes.length;
    };

    validar(dto.foto, 'la foto', 3 * 1024 * 1024);
    validar(dto.cud?.archivo, 'el CUD del agente', this.maximoArchivoBytes);

    for (const [indice, familiar] of (dto.familiares || []).entries()) {
      validar(familiar.archivoCud, `el CUD del familiar ${indice + 1}`, this.maximoArchivoBytes);
    }

    if (totalBytes > this.maximoTotalAdjuntosBytes) {
      throw new BadRequestException('El tamaño total de los archivos adjuntos supera los 15 MB.');
    }
  }

  // 2. Ver mis solicitudes (Usuario común)
  async obtenerMisSolicitudes(usuCodigo: number) {
    return await this.solicitudRepo.find({
      where: { usuCodigo },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async obtenerTodas(usuCodigo: number) {
  const query = `
    SELECT 
      sm.id,
      sm.usucodigo AS "usuCodigo",
      sm.estado,
      sm.datos_solicitados AS "datosSolicitados",
      sm.fecha_creacion AS "fechaCreacion",
      sm.fecha_revision AS "fechaRevision",
      sm.revisado_por AS "revisadoPor",
      sm.motivo_rechazo AS "motivoRechazo",
      u.apenom AS agente,
      ul.legajo AS legajo
    FROM public.solicitudes_modificacion sm
    LEFT JOIN public.usuarios u ON u.usucodigo = sm.usucodigo
    LEFT JOIN public.usuarioslegajos ul ON ul.usucodigo = sm.usucodigo
    WHERE sm.usucodigo <> $1
    ORDER BY sm.id DESC;
  `;

  return await this.solicitudRepo.query(query, [usuCodigo]);
}

  // 4. Aprobar solicitud (Admin)
  async aprobarSolicitud(idSolicitud: number, revisadoPor: number) {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: idSolicitud },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${idSolicitud} no encontrada`);
    }

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(`La solicitud ya fue procesada (Estado: ${solicitud.estado})`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const datos = (solicitud as any).datosSolicitados || (solicitud as any).datos_solicitados || {};
      const idUsuarioSolicitante = (solicitud as any).usuCodigo || (solicitud as any).usucodigo;

      // 1. Obtener legajo desde usuarioslegajos
      const vinculo = await queryRunner.manager.query(
        `SELECT legajo FROM public.usuarioslegajos 
         WHERE usucodigo = $1 AND estado = 'AC' LIMIT 1`,
        [idUsuarioSolicitante],
      );

      const legajo = vinculo.length > 0 ? vinculo[0].legajo : null;

      const camposDireccion = [
        'calle',
        'callenro',
        'barrio',
        'ciudad',
        'provincia',
        'tel1',
        'tel2',
        'email',
      ];
      const solicitaCambioDireccion = camposDireccion.some((campo) =>
        Object.prototype.hasOwnProperty.call(datos, campo),
      );
      const tieneAdjuntosDelAgente = Boolean(datos.foto)
        || Object.prototype.hasOwnProperty.call(datos, 'cud');
      if ((tieneAdjuntosDelAgente || solicitaCambioDireccion) && !legajo) {
        throw new BadRequestException(
          'No se pueden aplicar los cambios al legajo porque el usuario no tiene un legajo activo vinculado.',
        );
      }
      if (Object.prototype.hasOwnProperty.call(datos, 'reparticion') && !legajo) {
        throw new BadRequestException(
          'No se puede aplicar el cambio de repartición porque el usuario no tiene un legajo activo vinculado.',
        );
      }

      // Keep the account email and the profile email in sync.
      const tieneEmail = Object.prototype.hasOwnProperty.call(datos, 'email')
        || Object.prototype.hasOwnProperty.call(datos, 'correoElectronico');
      const emailSolicitado = Object.prototype.hasOwnProperty.call(datos, 'email')
        ? datos.email
        : datos.correoElectronico;
      const tieneApeNom = Object.prototype.hasOwnProperty.call(datos, 'apeNom');
      if (tieneEmail || tieneApeNom) {
        await queryRunner.manager.query(
          `UPDATE public.usuarios 
           SET email = CASE WHEN $1 THEN $2 ELSE email END,
               apenom = CASE WHEN $3 THEN $4 ELSE apenom END,
               fechamod = CURRENT_TIMESTAMP,
               usuariomod = $5
           WHERE usucodigo = $6`,
          [
            tieneEmail,
            emailSolicitado || null,
            tieneApeNom,
            datos.apeNom || null,
            revisadoPor,
            idUsuarioSolicitante,
          ],
        );
      }

      // 3. Actualizar tabla empleados si existe legajo
      if (legajo) {
        await this.aplicarCambiosDireccion(
          queryRunner.manager,
          datos,
          legajo,
          revisadoPor,
        );

        await this.aplicarArchivosDelAgente(
          queryRunner.manager,
          datos,
          legajo,
          revisadoPor,
        );

        const tieneEstadoCivil = Object.prototype.hasOwnProperty.call(datos, 'estadoCivil')
          || Object.prototype.hasOwnProperty.call(datos, 'estadocivil');
        const estadoCivil = Object.prototype.hasOwnProperty.call(datos, 'estadoCivil')
          ? datos.estadoCivil
          : datos.estadocivil;
        const tieneNacionalidad = Object.prototype.hasOwnProperty.call(datos, 'nacionalidad');
        const nacionalidad = datos.nacionalidad;

        if (Object.prototype.hasOwnProperty.call(datos, 'funcion')) {
          const funcion = typeof datos.funcion === 'string' ? datos.funcion.trim() : '';
          let idFuncion: number | null = null;
          if (funcion) {
            const funciones = await queryRunner.manager.query(
              `SELECT idfuncion
               FROM public.funciones
               WHERE LOWER(TRIM(funcion)) = LOWER(TRIM($1))
               LIMIT 1`,
              [funcion],
            );
            if (funciones.length === 0) {
              throw new BadRequestException('La función seleccionada no existe en el catálogo.');
            }
            idFuncion = funciones[0].idfuncion;
          }
          await queryRunner.manager.query(
            `UPDATE public.empleados
             SET idfuncion = $1,
                 fechamod = CURRENT_TIMESTAMP,
                 usuariomod = $2
             WHERE legajo = $3`,
            [idFuncion, revisadoPor, legajo],
          );
        }

        if (Object.prototype.hasOwnProperty.call(datos, 'reparticion')) {
          const nombreReparticion = typeof datos.reparticion === 'string'
            ? datos.reparticion.trim()
            : '';
          let idReparticion: number | null = null;
          if (nombreReparticion) {
            const reparticiones = await queryRunner.manager.query(
              `SELECT idreparticion
               FROM public.reparticiones
               WHERE estado = 'AC'
                 AND LOWER(TRIM(nombre)) = LOWER(TRIM($1))
               LIMIT 1
               FOR UPDATE`,
              [nombreReparticion],
            );
            if (reparticiones.length > 0) {
              idReparticion = reparticiones[0].idreparticion;
            } else {
              const nuevaReparticion = await queryRunner.manager.query(
                `INSERT INTO public.reparticiones (
                   nombre, estado, fechamod, usuariomod
                 )
                 VALUES ($1, 'AC', CURRENT_TIMESTAMP, $2)
                 ON CONFLICT ((LOWER(TRIM(nombre))))
                 DO UPDATE SET
                   estado = 'AC',
                   fechamod = CURRENT_TIMESTAMP,
                   usuariomod = EXCLUDED.usuariomod
                 RETURNING idreparticion`,
                [nombreReparticion, revisadoPor],
              );
              idReparticion = nuevaReparticion[0].idreparticion;
            }
          }
          await queryRunner.manager.query(
            `UPDATE public.empleados
             SET idreparticion = $1,
                 fechamod = CURRENT_TIMESTAMP,
                 usuariomod = $2
             WHERE legajo = $3`,
            [idReparticion, revisadoPor, legajo],
          );
        }

        await queryRunner.manager.query(
          `UPDATE public.empleados
           SET estadocivil = CASE WHEN $1 THEN NULLIF($2, '') ELSE estadocivil END,
               nacionalidad = CASE WHEN $3 THEN NULLIF($4, '') ELSE nacionalidad END,
               fechamod = CURRENT_TIMESTAMP,
               usuariomod = $5
           WHERE legajo = $6`,
          [tieneEstadoCivil, estadoCivil, tieneNacionalidad, nacionalidad, revisadoPor, legajo],
        );

        // 4. Actualizar familiares existentes e insertar los nuevos
        if (Array.isArray(datos.familiares) && datos.familiares.length > 0) {
          for (const fam of datos.familiares) {
            const idFamiliar = fam.idFamiliar ?? fam.idfamiliar;

            if (idFamiliar && !fam.esNuevo) {
              if (fam.eliminado === true) {
                const familiaresDadosDeBaja = await queryRunner.manager.query(
                  `UPDATE public.familiares
                   SET estado = 'BA',
                       fechamod = CURRENT_TIMESTAMP,
                       usuariomod = $1
                   WHERE id_familiar = $2
                     AND legajo = $3
                     AND estado = 'AC'
                   RETURNING id_familiar`,
                  [revisadoPor, idFamiliar, legajo],
                );
                if (familiaresDadosDeBaja.length === 0) {
                  throw new BadRequestException(
                    'No se puede dar de baja el familiar porque no está activo en este legajo.',
                  );
                }
                continue;
              }

              const columnas: Record<string, string> = {
                apellido: 'apellido',
                nombres: 'nombres',
                parentesco: 'parentesco',
                tipoDocumento: 'tipodocumento',
                nroDocumento: 'nrodocumento',
                sexo: 'sexo',
                fechaNacimiento: 'f_nacimiento',
                discapacitado: 'discapacitado',
              };
              const cambios = Object.entries(columnas).filter(([campo]) =>
                Object.prototype.hasOwnProperty.call(fam, campo),
              );

              if (cambios.length > 0) {
                const valores = cambios.map(([campo]) => fam[campo]);
                const asignaciones = cambios.map(([, columna], indice) => `${columna} = $${indice + 1}`);
                valores.push(revisadoPor, idFamiliar, legajo);
                const indiceAuditoria = cambios.length + 1;

                await queryRunner.manager.query(
                  `UPDATE public.familiares
                   SET ${asignaciones.join(', ')},
                       fechamod = CURRENT_TIMESTAMP,
                       usuariomod = $${indiceAuditoria}
                   WHERE id_familiar = $${indiceAuditoria + 1} AND legajo = $${indiceAuditoria + 2}`,
                  valores,
                );
              }
              continue;
            }

            const partesNombre = String(fam.apeNom || '').trim().split(/\s+/);
            const apellido = fam.apellido || partesNombre.shift();
            const nombres = fam.nombres || partesNombre.join(' ');
            const parentesco = fam.parentesco || fam.tipoVinculo || fam.tipovinculo;

            if (!apellido || !nombres || !parentesco) {
              throw new BadRequestException(
                'No se puede aprobar la solicitud porque los datos de un familiar están incompletos.',
              );
            }

            if (!idFamiliar && !fam.esNuevo) {
              const familiarExistente = await queryRunner.manager.query(
                `SELECT id_familiar
                 FROM public.familiares
                 WHERE legajo = $1
                   AND estado = 'AC'
                   AND LOWER(TRIM(apellido)) = LOWER(TRIM($2))
                   AND LOWER(TRIM(nombres)) = LOWER(TRIM($3))
                   AND LOWER(TRIM(parentesco)) = LOWER(TRIM($4))
                 LIMIT 1`,
                [legajo, apellido, nombres, parentesco],
              );

              if (familiarExistente.length > 0) {
                continue;
              }
            }

            await queryRunner.manager.query(
              `INSERT INTO public.familiares (
                 legajo, numfamiliar, apellido, nombres, parentesco, tipodocumento,
                 nrodocumento, sexo, f_nacimiento, discapacitado, estado,
                 fechamod, usuariomod
               )
               SELECT $1, COALESCE(MAX(numfamiliar), 0) + 1, $2, $3, $4, $5, $6, $7, $8, $9, 'AC', CURRENT_TIMESTAMP, $10
               FROM public.familiares
               WHERE legajo = $1`,
              [
                legajo,
                apellido,
                nombres,
                parentesco,
                fam.tipoDocumento || fam.tipodocumento || 'DNI',
                fam.nroDocumento || fam.nrodocumento || fam.dni || null,
                fam.sexo || 'MASCULINO',
                fam.fechaNacimiento || fam.f_nacimiento || null,
                Boolean(fam.discapacitado),
                revisadoPor,
              ],
            );
          }
        }
      }

      // 5. Marcar la solicitud como APROBADA
await queryRunner.manager.query(
  `UPDATE public.solicitudes_modificacion
   SET estado = 'APROBADA',
       fecha_revision = CURRENT_TIMESTAMP,
       revisado_por = $1
   WHERE id = $2`,
  [revisadoPor, idSolicitud],
);

      await queryRunner.commitTransaction();

      return {
        mensaje: 'Solicitud aprobada y datos impactados con éxito',
        idSolicitud,
        legajoAfectado: legajo,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async aplicarCambiosDireccion(
    manager: EntityManager,
    datos: Record<string, any>,
    legajo: number,
    revisadoPor: number,
  ) {
    const columnas: Record<string, string> = {
      calle: 'calle',
      callenro: 'callenro',
      barrio: 'barrio',
      ciudad: 'ciudad',
      provincia: 'provincia',
      tel1: 'tel1',
      tel2: 'tel2',
      email: 'email',
    };
    const cambios = Object.entries(columnas).filter(([campo]) =>
      Object.prototype.hasOwnProperty.call(datos, campo),
    );
    if (cambios.length === 0) return;

    const valores = cambios.map(([campo]) => datos[campo] === '' ? null : datos[campo]);
    const existente = await manager.query(
      `SELECT legajo
       FROM public.direcciones
       WHERE legajo = $1 AND estado = 'AC'
       FOR UPDATE`,
      [legajo],
    );

    if (existente.length > 0) {
      const asignaciones = cambios.map(([, columna], indice) => `${columna} = $${indice + 1}`);
      valores.push(revisadoPor, legajo);
      const indiceAuditoria = cambios.length + 1;
      await manager.query(
        `UPDATE public.direcciones
         SET ${asignaciones.join(', ')},
             fechamod = CURRENT_TIMESTAMP,
             usuariomod = $${indiceAuditoria}
         WHERE legajo = $${indiceAuditoria + 1} AND estado = 'AC'`,
        valores,
      );
      return;
    }

    const nombresColumnas = cambios.map(([, columna]) => columna);
    const placeholders = cambios.map((_, indice) => `$${indice + 2}`);
    await manager.query(
      `INSERT INTO public.direcciones (
         legajo, ${nombresColumnas.join(', ')}, estado, fechamod, usuariomod
       )
       VALUES (
         $1, ${placeholders.join(', ')}, 'AC', CURRENT_TIMESTAMP, $${cambios.length + 2}
       )`,
      [legajo, ...valores, revisadoPor],
    );
  }

  private async aplicarArchivosDelAgente(
    manager: EntityManager,
    datos: Record<string, any>,
    legajo: number,
    revisadoPor: number,
  ) {
    if (typeof datos.foto === 'string' && datos.foto) {
      const idArchivoFoto = await this.guardarArchivo(
        manager,
        datos.foto,
        'foto-perfil',
        revisadoPor,
      );
      const empleadosActualizados = await manager.query(
        `UPDATE public.empleados
         SET idarchivofoto = $1,
             fechamod = CURRENT_TIMESTAMP,
             usuariomod = $2
         WHERE legajo = $3
         RETURNING legajo`,
        [idArchivoFoto, revisadoPor, legajo],
      );
      if (empleadosActualizados.length === 0) {
        throw new NotFoundException(`No se encontró el legajo ${legajo} para asociar la foto.`);
      }
    }

    if (!Object.prototype.hasOwnProperty.call(datos, 'cud')) return;

    if (datos.cud === null) {
      const cudActivo = await manager.query(
        `SELECT idcud, idarchivo
         FROM public.emp_cud
         WHERE legajo = $1 AND estado = 'AC'
         ORDER BY fechamod DESC NULLS LAST, idcud DESC
         LIMIT 1`,
        [legajo],
      );
      if (cudActivo.length > 0) {
        await manager.query(
          `UPDATE public.emp_cud
           SET estado = 'BA',
               fechamod = CURRENT_TIMESTAMP,
               usuariomod = $1
           WHERE idcud = $2 AND estado = 'AC'`,
          [revisadoPor, cudActivo[0].idcud],
        );
        if (cudActivo[0].idarchivo) {
          await this.marcarArchivoBajaSiNoEstaVinculado(
            manager,
            cudActivo[0].idarchivo,
            revisadoPor,
          );
        }
      }
      return;
    }

    if (!datos.cud || typeof datos.cud !== 'object' || Array.isArray(datos.cud)) {
      throw new BadRequestException('Los datos del CUD del agente no tienen un formato válido.');
    }

    const cud = datos.cud as Record<string, unknown>;
    const idArchivo = typeof cud.archivo === 'string' && cud.archivo
      ? await this.guardarArchivo(
        manager,
        cud.archivo,
        typeof cud.nombreArchivo === 'string' ? cud.nombreArchivo : 'certificado-cud',
        revisadoPor,
      )
      : null;
    const cudActivo = await manager.query(
      `SELECT idcud, idarchivo
       FROM public.emp_cud
       WHERE legajo = $1 AND estado = 'AC'
       ORDER BY fechamod DESC NULLS LAST, idcud DESC
       LIMIT 1`,
      [legajo],
    );
    const fechaEmision = typeof cud.fechaEmision === 'string' && cud.fechaEmision
      ? cud.fechaEmision
      : null;
    const fechaVencimiento = typeof cud.fechaVencimiento === 'string' && cud.fechaVencimiento
      ? cud.fechaVencimiento
      : null;

    if (cudActivo.length > 0) {
      await manager.query(
        `UPDATE public.emp_cud
         SET fechaemision = $1::date,
             fechavencimiento = $2::date,
             idarchivo = COALESCE($3, idarchivo),
             fechamod = CURRENT_TIMESTAMP,
             usuariomod = $4
         WHERE idcud = $5 AND estado = 'AC'`,
        [fechaEmision, fechaVencimiento, idArchivo, revisadoPor, cudActivo[0].idcud],
      );
      if (idArchivo && cudActivo[0].idarchivo && cudActivo[0].idarchivo !== idArchivo) {
        await this.marcarArchivoBajaSiNoEstaVinculado(
          manager,
          cudActivo[0].idarchivo,
          revisadoPor,
        );
      }
      return;
    }

    await manager.query(
      `INSERT INTO public.emp_cud (
         legajo, fechaemision, fechavencimiento, idarchivo,
         fechamod, usuariomod
       )
       VALUES ($1, $2::date, $3::date, $4, CURRENT_TIMESTAMP, $5)`,
      [legajo, fechaEmision, fechaVencimiento, idArchivo, revisadoPor],
    );
  }

  private async marcarArchivoBajaSiNoEstaVinculado(
    manager: EntityManager,
    idArchivo: number,
    revisadoPor: number,
  ) {
    await manager.query(
      `UPDATE public.archivos a
       SET estado = 'BA',
           fechamod = CURRENT_TIMESTAMP,
           usuariomod = $2
       WHERE a.idarchivo = $1
         AND a.estado = 'AC'
         AND NOT EXISTS (
           SELECT 1 FROM public.empleados e
           WHERE e.idarchivofoto = a.idarchivo AND e.estado = 'AC'
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.emp_cud ec
           WHERE ec.idarchivo = a.idarchivo AND ec.estado = 'AC'
         )`,
      [idArchivo, revisadoPor],
    );
  }

  private async guardarArchivo(
    manager: EntityManager,
    dataUrl: string,
    nombreArchivo: string,
    usuariomod: number,
  ): Promise<number> {
    const match = /^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
    if (!match) {
      throw new BadRequestException('El archivo adjunto no está codificado en un formato compatible.');
    }

    const tipoarchivo = match[1].toLowerCase();
    const contenido = Buffer.from(match[2], 'base64');
    const nombre = nombreArchivo.replace(/[\\/\r\n"]/g, '_').trim().slice(0, 255) || 'archivo';
    const insercion = await manager.query(
      `INSERT INTO public.archivos (
         contenido, tipoarchivo, nombrearchivo, fechacarga,
         fechamod, usuariomod
       )
       VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_TIMESTAMP, $4)
       RETURNING idarchivo`,
      [contenido, tipoarchivo, nombre, usuariomod],
    );

    return insercion[0].idarchivo;
  }

  // 5. Rechazar solicitud (Admin)
  async rechazarSolicitud(idSolicitud: number, revisadoPor: number, dto: RechazarSolicitudDto) {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: idSolicitud },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${idSolicitud} no encontrada`);
    }

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(`La solicitud ya fue procesada (Estado: ${solicitud.estado})`);
    }

    solicitud.estado = 'RECHAZADA';
    solicitud.revisadoPor = revisadoPor;
    solicitud.fechaRevision = new Date();
    solicitud.motivoRechazo = dto.motivoRechazo;

    return await this.solicitudRepo.save(solicitud);
  }

  // 6. Cancelar solicitud pendiente (Solo el solicitante)
  async cancelarSolicitud(idSolicitud: number, usuCodigo: number) {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: idSolicitud },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${idSolicitud} no encontrada`);
    }

    if (Number(solicitud.usuCodigo) !== Number(usuCodigo)) {
      throw new ForbiddenException('No podés cancelar una solicitud de otro usuario.');
    }

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(`La solicitud ya fue procesada (Estado: ${solicitud.estado})`);
    }

    solicitud.estado = 'CANCELADA';
    solicitud.revisadoPor = usuCodigo;
    solicitud.fechaRevision = new Date();

    return await this.solicitudRepo.save(solicitud);
  }


}