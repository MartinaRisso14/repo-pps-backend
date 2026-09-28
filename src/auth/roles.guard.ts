import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<number[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Comprobamos si el idRol del token está dentro de los roles permitidos
    const tienePermiso = requiredRoles.includes(user?.idRol);

    if (!tienePermiso) {
      throw new ForbiddenException('No tienes permisos de administrador para realizar esta acción');
    }

    return true;
  }
}