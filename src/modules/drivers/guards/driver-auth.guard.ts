import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { DriversService } from '../drivers.service';

@Injectable()
export class DriverAuthGuard implements CanActivate {
  constructor(private driversService: DriversService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }
    
    const driver = await this.driversService.validateDriverToken(token);
    
    if (!driver) {
      throw new UnauthorizedException('Token de autenticación inválido o expirado');
    }
    
    // Añadir el driver al objeto request para poder usarlo en los controladores
    request['driver'] = driver;
    
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 