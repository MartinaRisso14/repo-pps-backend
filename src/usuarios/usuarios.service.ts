import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async buscarParaAutenticacion(usuNombre: string): Promise<{
    usuCodigo: number;
    usuNombre: string;
    passwordHash: string;
    apeNom: string | null;
    idRol: number;
    estado: string;
    email: string | null;
    debeCambiarPassword: boolean;
  } | null> {
    const usuarios = await this.usuariosRepository.manager.query(
      `SELECT
         usucodigo AS "usuCodigo",
         usunombre AS "usuNombre",
         password_hash AS "passwordHash",
         apenom AS "apeNom",
         idrol AS "idRol",
         estado,
         email,
         debe_cambiar_password AS "debeCambiarPassword"
       FROM public.usuarios
       WHERE LOWER(usunombre) = LOWER($1)
       LIMIT 1`,
      [usuNombre],
    );

    return usuarios[0] || null;
  }

async findOneByNombre(usuNombre: string): Promise<any | null> {
    const rawData = await this.usuariosRepository.manager.query(
      `
      SELECT 
        u.usucodigo AS "usuCodigo",
        u.usunombre AS "usuNombre",
        u.apenom AS "apeNom",
        u.idrol AS "idRol",
        u.estado,
        u.email,
        u.debe_cambiar_password AS "debeCambiarPassword",
        e.legajo,
        e.apellido,
        e.nombres,
        e.tipodocumento AS "tipoDocumento",
        e.nrodocumento AS "nroDocumento",
        e.cuil,
        e.f_nacimiento AS "fechaNacimiento",
        e.nacionalidad,
        e.estadocivil AS "estadoCivil",
        e.idfuncion AS "idFuncion",
        fn.funcion,
        e.idreparticion AS "idReparticion",
        rep.nombre AS reparticion,
        foto.idarchivo AS "idArchivoFoto",
        d.calle,
        d.callenro AS "calleNro",
        d.barrio,
        d.ciudad,
        d.provincia,
        d.tel1,
        d.tel2,
        d.email AS "emailContacto"
      FROM public.usuarios u
      LEFT JOIN public.usuarioslegajos ul 
        ON u.usucodigo = ul.usucodigo AND ul.estado = 'AC'
      LEFT JOIN public.empleados e 
        ON ul.legajo = e.legajo
      LEFT JOIN public.funciones fn
        ON e.idfuncion = fn.idfuncion
      LEFT JOIN public.reparticiones rep
        ON e.idreparticion = rep.idreparticion
      LEFT JOIN public.archivos foto
        ON foto.idarchivo = e.idarchivofoto AND foto.estado = 'AC'
      LEFT JOIN public.direcciones d 
        ON e.legajo = d.legajo AND d.estado = 'AC'
      WHERE LOWER(u.usunombre) = LOWER($1)
      LIMIT 1;
      `,
      [usuNombre]
    );

    if (!rawData || rawData.length === 0) {
      return null;
    }

    const row = rawData[0];

    // Consultar el listado de familiares asociados a este legajo
   let familiares: any[] = [];
   let cud: Record<string, unknown> | null = null;
   if (row.legajo) {
     familiares = await this.usuariosRepository.manager.query(
        `
        SELECT 
          f.id_familiar AS "idFamiliar",
          f.numfamiliar AS "numFamiliar",
          f.apellido,
          f.nombres,
          f.tipodocumento AS "tipoDocumento",
          f.nrodocumento AS "nroDocumento",
          f.sexo,
          f.f_nacimiento AS "fechaNacimiento",
          f.parentesco,
          f.discapacitado,
          f.estado
        FROM public.familiares f
        WHERE f.legajo = $1 AND f.estado = 'AC'
        ORDER BY f.numfamiliar ASC;
        `,
        [row.legajo]
      );

      const registrosCud = await this.usuariosRepository.manager.query(
        `SELECT
           ec.idcud AS "idCud",
           ec.fechaemision AS "fechaEmision",
           ec.fechavencimiento AS "fechaVencimiento",
           CASE WHEN a.idarchivo IS NOT NULL THEN ec.idarchivo ELSE NULL END AS "idArchivoCud",
           a.nombrearchivo AS "nombreArchivoCud"
         FROM public.emp_cud ec
         LEFT JOIN public.archivos a ON a.idarchivo = ec.idarchivo AND a.estado = 'AC'
         WHERE ec.legajo = $1 AND ec.estado = 'AC'
         ORDER BY ec.fechamod DESC NULLS LAST, ec.idcud DESC
         LIMIT 1`,
        [row.legajo],
      );
      cud = registrosCud[0] || null;
    }

    return {
      usuCodigo: row.usuCodigo,
      usuNombre: row.usuNombre,
      apeNom: row.apeNom,
      idRol: row.idRol,
      estado: row.estado,
      email: row.email,
      debeCambiarPassword: row.debeCambiarPassword,
      empleado: row.legajo ? {
        legajo: row.legajo,
        apellido: row.apellido,
        nombres: row.nombres,
        tipoDocumento: row.tipoDocumento,
        nroDocumento: row.nroDocumento,
        nrodocumento: row.nroDocumento,
        cuil: row.cuil,
        fechaNacimiento: row.fechaNacimiento,
        nacionalidad: row.nacionalidad,
        estadoCivil: row.estadoCivil,
        idFuncion: row.idFuncion,
        funcion: row.funcion,
        idReparticion: row.idReparticion,
        reparticion: row.reparticion,
        idArchivoFoto: row.idArchivoFoto,
        foto: row.idArchivoFoto ? `/archivos/${row.idArchivoFoto}` : '',
        cud,
        calle: row.calle,
        callenro: row.calleNro,
        barrio: row.barrio,
        ciudad: row.ciudad,
        provincia: row.provincia,
        tel1: row.tel1,
        tel2: row.tel2,
        emailContacto: row.emailContacto,
        // Array de familiares:
        familiares: familiares || [],
      } : null,
    };
  }

  async listarFunciones(): Promise<{ idfuncion: number; funcion: string }[]> {
    return this.usuariosRepository.manager.query(
      `SELECT idfuncion, funcion
       FROM public.funciones
       WHERE funcion IS NOT NULL
       ORDER BY funcion`,
    );
  }

}