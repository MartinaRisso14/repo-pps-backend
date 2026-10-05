import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SolicitudModificacion } from './solicitud.entity';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { RechazarSolicitudDto } from './dto/rechazar-solicitud.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';


@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(SolicitudModificacion)
    private readonly solicitudRepo: Repository<SolicitudModificacion>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly dataSource: DataSource
  ) {}

  // 1. Crear solicitud (Usuario común)
  async crearSolicitud(usuCodigo: number, dto: CrearSolicitudDto) {
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

  // 2. Ver mis solicitudes (Usuario común)
  async obtenerMisSolicitudes(usuCodigo: number) {
    return await this.solicitudRepo.find({
      where: { usuCodigo },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async obtenerTodas() {
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
    ORDER BY sm.id DESC;
  `;

  return await this.solicitudRepo.query(query);
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

      // 2. Actualizar tabla usuarios (email, apenom)
      const email = datos.email || datos.correoElectronico;
      if (email || datos.apeNom) {
        await queryRunner.manager.query(
          `UPDATE public.usuarios 
           SET email = COALESCE($1, email),
               apenom = COALESCE($2, apenom),
               fechamod = CURRENT_TIMESTAMP,
               usuariomod = $3
           WHERE usucodigo = $4`,
          [email || null, datos.apeNom || null, revisadoPor, idUsuarioSolicitante],
        );
      }

      // 3. Actualizar tabla empleados si existe legajo
      if (legajo) {
        const estadoCivil = datos.estadoCivil || datos.estadocivil;
        const nacionalidad = datos.nacionalidad;

        await queryRunner.manager.query(
          `UPDATE public.empleados
           SET estadocivil = COALESCE($1, estadocivil),
               nacionalidad = COALESCE($2, nacionalidad),
               fechamod = CURRENT_TIMESTAMP,
               usuariomod = $3
           WHERE legajo = $4`,
          [estadoCivil || null, nacionalidad || null, revisadoPor, legajo],
        );

        // 4. Insertar familiares nuevos
        if (Array.isArray(datos.familiares) && datos.familiares.length > 0) {
          for (const fam of datos.familiares) {
            if (fam.esNuevo || !fam.idfamiliar) {
              await queryRunner.manager.query(
                `INSERT INTO public.familiares (
                   legajo, apellido, nombres, tipovinculo, tipodocumento, 
                   nrodocumento, f_nacimiento, discapacitado, estado, 
                   fechamod, usuariomod
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'AC', CURRENT_TIMESTAMP, $9)`,
                [
                  legajo,
                  fam.apellido,
                  fam.nombres,
                  fam.tipovinculo || fam.tipoVinculo,
                  fam.tipodocumento || 'DNI',
                  fam.nrodocumento || fam.nroDocumento,
                  fam.f_nacimiento || fam.fechaNacimiento || null,
                  fam.discapacitado || false,
                  revisadoPor,
                ],
              );
            }
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


}