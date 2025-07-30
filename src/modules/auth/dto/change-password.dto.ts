import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual', example: 'CurrentPassword123!' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 8 caracteres)', example: 'NewSecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
} 