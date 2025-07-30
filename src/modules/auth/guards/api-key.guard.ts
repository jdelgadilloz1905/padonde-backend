import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) {
      throw new UnauthorizedException('API key no proporcionada');
    }
    
    const validApiKey = this.configService.get<string>('API_KEY');
    
    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('API key inválida');
    }
    
    return true;
  }
} 