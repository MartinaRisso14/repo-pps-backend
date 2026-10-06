import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    usuCodigo: number;
    idRol: number;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('catalogos/funciones')
  listarFunciones() {
    return this.usuariosService.listarFunciones();
  }

  @Get(':usuNombre')
  async findOne(@Param('usuNombre') usuNombre: string, @Request() req: AuthenticatedRequest) {
    const usuario = await this.usuariosService.findOneByNombre(usuNombre);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const esPropietario = Number(usuario.usuCodigo) === Number(req.user.usuCodigo);
    const esAdministrador = Number(req.user.idRol) === 1;
    if (!esPropietario && !esAdministrador) {
      throw new ForbiddenException('No tienes permiso para consultar este legajo');
    }

    return usuario;
  }
}