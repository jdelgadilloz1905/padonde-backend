import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  private rolesGuard: RolesGuard;

  constructor(private reflector: Reflector) {
    super();
    this.rolesGuard = new RolesGuard(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Primero verificar autenticación JWT
    const jwtValid = await super.canActivate(context);
    if (!jwtValid) {
      return false;
    }

    // Luego verificar que tenga rol de admin
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Verificar que el usuario tenga rol de admin
    if (!user || user.role !== 'admin') {
      return false;
    }

    return true;
  }
} 