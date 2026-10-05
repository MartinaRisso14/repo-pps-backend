import { Injectable, UnauthorizedException, BadRequestException, } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { SolicitarRecuperacionDto } from './dto/solicitar-recuperacion.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {

    const { usuNombre, password } = loginDto;


    // 1. Buscamos el usuario por su nombre o CUIL
    const usuario = await this.usuariosService.findOneByNombre(usuNombre);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
   const isPasswordValid = await bcrypt.compare(password, usuario.password_hash);
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
  
  // 1. Solicitar recuperación
async solicitarRecuperacion(dto: SolicitarRecuperacionDto) {
  // Usamos el método que acabás de agregar:
  const usuario = await this.usuariosService.buscarPorEmail(dto.email);

  if (!usuario) {
    return {
      message: 'Si el correo está registrado, se enviaron instrucciones para restablecer la contraseña.',
    };
  }

  const payload = { sub: usuario.usuCodigo, email: usuario.email, tipo: 'reset_password' };
  const resetToken = this.jwtService.sign(payload, { expiresIn: '15m' });

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const resetUrl = `${frontendUrl}/restablecer-password?token=${resetToken}`;
// ============================================================================
// SIMULACIÓN DE ENVÍO DE EMAIL (MODO DESARROLLO / LOCAL)
// En producción, acá se integraría un servicio para realizar el envio de correos.
// Durante el desarrollo, el enlace de restablecimiento se emite por consola
// para verificar la generación correcta del token JWT y el flujo de recuperación.
// ============================================================================

  console.log(`\n======================================================`);
  console.log(`[RECUPERACIÓN DE PASSWORD] Para: ${usuario.email}`);
  console.log(`Enlace: ${resetUrl}`);
  console.log(`Token: ${resetToken}`);
  console.log(`======================================================\n`);

  return {
    message: 'Si el correo está registrado, se enviaron instrucciones para restablecer la contraseña.',
    resetToken, // Devolver en desarrollo para probar fácil en PowerShell
  };
}

// 2. Aplicar la nueva contraseña
async resetPassword(dto: ResetPasswordDto) {
  try {
    const payload = this.jwtService.verify(dto.token);

    if (payload.tipo !== 'reset_password') {
      throw new BadRequestException('Token inválido para esta operación');
    }

    // Hasheamos la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.nuevaPassword, salt);

    // Usamos el método que creaste en UsuariosService:
    await this.usuariosService.actualizarPassword(payload.sub, passwordHash);

    return { message: 'Contraseña restablecida con éxito' };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new BadRequestException('El enlace de recuperación ha expirado');
    }
    throw new BadRequestException('Token inválido o corrupto');
  }
}

} 



