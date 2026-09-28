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
    // Si ya existe una pendiente, sobreescribimos los datos y actualizamos la fecha
    solicitud.datosSolicitados = dto;
    solicitud.fechaCreacion = new Date(); // Opcional: renovar la fecha de envío
    return await this.solicitudRepo.save(solicitud);
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

  // 3. Ver todas las pendientes (Admin)
  async obtenerPendientes() {
    return await this.solicitudRepo.find({
      where: { estado: 'PENDIENTE' },
      relations: {
        usuario: true,
      },
      order: { fechaCreacion: 'ASC' },
    });
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

    // Usamos una transacción para que ambas operaciones se hagan juntas o ninguna
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Extraer y mapear únicamente los datos que pertenecen a la entidad Usuario
      const datosParaUsuario: Partial<Usuario> = {};

      if (solicitud.datosSolicitados.correoElectronico) {
        datosParaUsuario.email = solicitud.datosSolicitados.correoElectronico;
      }

      // Si en el DTO llegara apeNom u otro campo de Usuario, se mapea aquí
      if (solicitud.datosSolicitados.apeNom) {
        datosParaUsuario.apeNom = solicitud.datosSolicitados.apeNom;
      }

      // Solo actualizamos la tabla Usuario si hay campos compatibles
      if (Object.keys(datosParaUsuario).length > 0) {
        await queryRunner.manager.update(
          Usuario,
          { usuCodigo: solicitud.usuCodigo },
          datosParaUsuario,
        );
      }

      // 2. Si más adelante tenés una tabla/entidad "Legajos" o "Personas" para domicilio, teléfonos, etc.,
      // la actualización de esos campos se ejecutaría acá sobre esa otra entidad.

      // 3. Actualizar el estado de la solicitud
      solicitud.estado = 'APROBADA';
      solicitud.revisadoPor = revisadoPor;
      solicitud.fechaRevision = new Date();

      const solicitudActualizada = await queryRunner.manager.save(solicitud);
      await queryRunner.commitTransaction();
      return solicitudActualizada;
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