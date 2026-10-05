import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import * as bcrypt from 'bcrypt';
import { CambiarClaveDto } from './dto/cambiar-password.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

async findOneByNombre(usuNombre: string): Promise<any | null> {
    const rawData = await this.usuariosRepository.manager.query(
      `
      SELECT 
        u.usucodigo AS "usuCodigo",
        u.usunombre AS "usuNombre",
        u.password_hash,
        u.apenom AS "apeNom",
        u.idrol AS "idRol",
        u.estado,
        u.email,
        u.debe_cambiar_password AS "debeCambiarPassword",
        e.legajo,
        e.apellido,
        e.nombres,
        e.nrodocumento AS "nroDocumento",
        e.cuil,
        e.f_nacimiento AS "fechaNacimiento",
        e.nacionalidad,
        e.estadocivil AS "estadoCivil",
        e.idarchivofoto AS "idArchivoFoto",
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
    }

    return {
      usuCodigo: row.usuCodigo,
      usuNombre: row.usuNombre,
      password_hash: row.password_hash,
      apeNom: row.apeNom,
      idRol: row.idRol,
      estado: row.estado,
      email: row.email,
      debeCambiarPassword: row.debeCambiarPassword,
      empleado: row.legajo ? {
        legajo: row.legajo,
        apellido: row.apellido,
        nombres: row.nombres,
        nroDocumento: row.nroDocumento,
        nrodocumento: row.nroDocumento,
        cuil: row.cuil,
        fechaNacimiento: row.fechaNacimiento,
        nacionalidad: row.nacionalidad,
        estadoCivil: row.estadoCivil,
        idArchivoFoto: row.idArchivoFoto,
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

  // Método que calcula el hash y guarda en la base de datos
  async create(datosUsuario: {
    usuNombre: string;
    password: string;
    apeNom?: string;
    idRol?: number;
    email?: string;
  }): Promise<Usuario> {
    const existe = await this.findOneByNombre(datosUsuario.usuNombre);
    if (existe) {
      throw new BadRequestException('El nombre de usuario ya está en uso');
    }

    // Hashea automáticamente la contraseña en texto plano
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(datosUsuario.password, saltRounds);

    const nuevoUsuario = this.usuariosRepository.create({
      usuNombre: datosUsuario.usuNombre,
      password_hash,
      apeNom: datosUsuario.apeNom,
      idRol: datosUsuario.idRol,
      email: datosUsuario.email,
      estado: 'AC',
    });

    return await this.usuariosRepository.save(nuevoUsuario);
  }
  // Adentro de la clase UsuariosService:

async cambiarClave(id: number, dto: CambiarClaveDto) {
  const usuario = await this.usuariosRepository
    .createQueryBuilder('usuario')
    .addSelect('usuario.password_hash')
    .where('usuario.usuCodigo = :id', { id }) // o el nombre de tu primary key
    .getOne();

  if (!usuario) {
    throw new NotFoundException('Usuario no encontrado');
  }

  const esValida = await bcrypt.compare(dto.claveActual, usuario.password_hash);
  if (!esValida) {
    throw new UnauthorizedException('La clave actual no es correcta');
  }

  // Hashear y guardar la nueva clave
  const salt = await bcrypt.genSalt(10);
  usuario.password_hash = await bcrypt.hash(dto.nuevaClave, salt);
  
  await this.usuariosRepository.save(usuario);

  return { message: 'Contraseña actualizada correctamente' };
}
// En usuarios.service.ts
async buscarPorEmail(email: string) {
  return await this.usuariosRepository.findOne({ where: { email } });
}

async actualizarPassword(usuCodigo: number, passwordHash: string) {
  return await this.usuariosRepository.update(
    { usuCodigo },
    { password_hash: passwordHash, debeCambiarPassword: false },
  );
}

}