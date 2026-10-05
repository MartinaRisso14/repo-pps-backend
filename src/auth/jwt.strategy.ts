import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'RRHH_SISTEMA_SEG_2026_CLAVE_JWT_KEY',    });
  }

  async validate(payload: any) {
    // Esto es lo que se inyecta en req.user
    return {
      usuCodigo: payload.sub ?? payload.usuCodigo,
      idRol: payload.idRol,
      email: payload.email,
    };
  }
}