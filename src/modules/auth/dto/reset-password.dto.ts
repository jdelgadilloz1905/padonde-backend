import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de reset de contraseña' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Nueva contraseña', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ description: 'Nueva contraseña (campo alternativo)', minLength: 6, required: false })
  @IsString()
  @MinLength(6)
  password: string;
} 