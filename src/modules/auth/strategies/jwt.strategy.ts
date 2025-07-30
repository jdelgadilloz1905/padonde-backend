import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secreto_super_seguro_cambiar_en_produccion',
    });
  }

  async validate(payload: any) {
    const user = await this.usersRepository.findOne({ 
      where: { 
        id: payload.sub,
        active: true 
      } 
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Para tokens antiguos, usar datos de la DB si no están en el payload
    return {
      id: payload.sub,
      email: payload.email || user.email,
      first_name: payload.first_name || user.first_name,
      last_name: payload.last_name || user.last_name,
      full_name: `${payload.first_name || user.first_name} ${payload.last_name || user.last_name}`,
      phone_number: payload.phone_number || user.phone_number,
      profile_picture: payload.profile_picture || user.profile_picture,
      active: payload.active !== undefined ? payload.active : user.active,
      created_at: payload.created_at || user.created_at,
      last_login: payload.last_login || user.last_login,
      role: payload.role || user.role,
    };
  }
} 