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

  async findOneByNombre(usuNombre: string): Promise<Usuario | null> {
    return await this.usuariosRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.password_hash')
      .where('usuario.usuNombre = :usuNombre', { usuNombre })
      .getOne();
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