import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {

    const { usuNombre, password } = loginDto;


    // 1. Buscamos el usuario por su nombre o CUIL
    const usuario = await this.usuariosService.buscarParaAutenticacion(usuNombre);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const isPasswordValid = await bcrypt.compare(password, usuario.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Verificamos que el usuario esté activo
    if (usuario.estado !== 'AC') {
      throw new UnauthorizedException('El usuario se encuentra inactivo');
    }

    // 4. Datos que viajan adentro del token
    const payload = {
      sub: usuario.usuCodigo,
      usuNombre: usuario.usuNombre,
      idRol: usuario.idRol,
      apeNom: usuario.apeNom,
      debeCambiarPassword: usuario.debeCambiarPassword
    };

    // 5. Retornamos el token firmado y los datos para el frontend
    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        usuCodigo: usuario.usuCodigo,
        usuNombre: usuario.usuNombre,
        apeNom: usuario.apeNom,
        idRol: usuario.idRol,
        email: usuario.email,
        debeCambiarPassword: usuario.debeCambiarPassword
      },
    };
    
  }
  
}
