import { Injectable, UnauthorizedException, Logger, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.usersRepository.findOne({ where: { email, active: true } });
      
      if (!user) {
        this.logger.warn(`Login intento fallido: usuario no encontrado - ${email}`);
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // Validar contraseña con bcrypt
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        this.logger.warn(`Login intento fallido: contraseña incorrecta - ${email}`);
        throw new UnauthorizedException('Credenciales inválidas');
      }

      this.logger.log(`Login exitoso: ${email}`);

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error en validación de usuario: ${error.message}`, error.stack);
      throw new UnauthorizedException('Error en la autenticación');
    }
  }

  async login(user: Partial<User>) {
    try {
      // Actualizar último login
      const updatedDate = new Date();
      await this.usersRepository.update(
        { id: user.id },
        { last_login: updatedDate }
      );

      // Obtener datos completos del usuario para el payload
      const fullUser = await this.usersRepository.findOne({ 
        where: { id: user.id } 
      });

      const payload = {
        email: fullUser.email,
        sub: fullUser.id,
        first_name: fullUser.first_name,
        last_name: fullUser.last_name,
        phone_number: fullUser.phone_number,
        profile_picture: fullUser.profile_picture,
        active: fullUser.active,
        created_at: fullUser.created_at,
        last_login: updatedDate,
        role: fullUser.role,
      };

      this.logger.log(`Token generado exitosamente para: ${fullUser.email}`);

      
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: fullUser.id,
          email: fullUser.email,
          role: fullUser.role,
          first_name: fullUser.first_name,
          last_name: fullUser.last_name,
        }
      };
    } catch (error) {
      this.logger.error(`Error en login: ${error.message}`, error.stack);
      throw new UnauthorizedException('Error al generar token');
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersRepository.findOne({ where: { id: payload.sub, active: true } });
      
      if (!user) {
        throw new UnauthorizedException('Usuario no válido');
      }
      
      return {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      this.logger.warn(`Token inválido: ${error.message}`);
      throw new UnauthorizedException('Token inválido');
    }
  }

  async createUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'operator';
    phone_number?: string;
  }): Promise<User> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.usersRepository.findOne({ 
        where: { email: userData.email } 
      });
      
      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }

      // Hashear contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Crear usuario
      const newUser = this.usersRepository.create({
        email: userData.email,
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        phone_number: `+${userData.phone_number.split('@')[0].replace('+', '')}`,
        active: true
      });

      const savedUser = await this.usersRepository.save(newUser);
      
      this.logger.log(`Usuario creado exitosamente: ${savedUser.email} (ID: ${savedUser.id})`);

      // Remover password del objeto retornado
      const { password, ...userWithoutPassword } = savedUser;
      return userWithoutPassword as User;

    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error al crear usuario: ${error.message}`, error.stack);
      throw new Error('Error al crear usuario');
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Contraseña actual incorrecta');
      }

      // Hashear nueva contraseña
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      await this.usersRepository.update(
        { id: userId },
        { password: hashedNewPassword }
      );

      this.logger.log(`Contraseña cambiada exitosamente para usuario ID: ${userId}`);

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error al cambiar contraseña: ${error.message}`, error.stack);
      throw new Error('Error al cambiar contraseña');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({ where: { email, active: true } });
      
      if (!user) {
        // Por seguridad, no revelamos si el email existe o no
        this.logger.warn(`Intento de reset de contraseña para email no existente: ${email}`);
        return;
      }

      // Generar token de reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date();
      resetTokenExpires.setMinutes(resetTokenExpires.getMinutes() + 15); // 15 minutos

      // Guardar token en la base de datos
      await this.usersRepository.update(
        { id: user.id },
        {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpires,
        }
      );

      // Preparar nombre del usuario para el email
      let userName = 'Usuario';
      
      // Verificar si los nombres no son emails
      const isFirstNameEmail = user.first_name && user.first_name.includes('@');
      const isLastNameEmail = user.last_name && user.last_name.includes('@');
      
      if (user.first_name && user.last_name && !isFirstNameEmail && !isLastNameEmail) {
        // Ambos nombres son válidos (no son emails)
        userName = `${user.first_name} ${user.last_name}`.trim();
      } else if (user.first_name && !isFirstNameEmail) {
        // Solo first_name es válido
        userName = user.first_name.trim();
      } else if (user.last_name && !isLastNameEmail) {
        // Solo last_name es válido
        userName = user.last_name.trim();
      } else {
        // Si no hay nombres válidos o son emails, usar parte del email antes del @
        userName = user.email.split('@')[0];
      }

      this.logger.log(`Enviando email de recuperación - Email: ${user.email}, UserName: "${userName}"`);

      // Enviar email de recuperación
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        userName
      );

      this.logger.log(`Email de recuperación enviado a: ${email}`);

    } catch (error) {
      this.logger.error(`Error en forgot password: ${error.message}`, error.stack);
      throw new Error('Error al procesar solicitud de recuperación');
    }
  }

  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    try {
      const user = await this.usersRepository.findOne({
        where: {
          resetPasswordToken: token,
          active: true,
        },
      });

      if (!user || !user.resetPasswordExpires) {
        return { valid: false };
      }

      // Verificar si el token ha expirado
      if (new Date() > user.resetPasswordExpires) {
        // Limpiar token expirado
        await this.usersRepository.update(
          { id: user.id },
          {
            resetPasswordToken: null,
            resetPasswordExpires: null,
          }
        );
        return { valid: false };
      }

      return { valid: true, email: user.email };

    } catch (error) {
      this.logger.error(`Error validando token de reset: ${error.message}`, error.stack);
      return { valid: false };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({
        where: {
          resetPasswordToken: token,
          active: true,
        },
      });

      if (!user || !user.resetPasswordExpires) {
        throw new BadRequestException('Token de reset inválido');
      }

      // Verificar si el token ha expirado
      if (new Date() > user.resetPasswordExpires) {
        // Limpiar token expirado
        await this.usersRepository.update(
          { id: user.id },
          {
            resetPasswordToken: null,
            resetPasswordExpires: null,
          }
        );
        throw new BadRequestException('Token de reset expirado');
      }

      // Hashear nueva contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña y limpiar tokens
      await this.usersRepository.update(
        { id: user.id },
        {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        }
      );

      this.logger.log(`Contraseña restablecida exitosamente para usuario: ${user.email}`);

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al restablecer contraseña: ${error.message}`, error.stack);
      throw new Error('Error al restablecer contraseña');
    }
  }
} 