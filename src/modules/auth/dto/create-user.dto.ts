import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Correo electrónico del usuario', example: 'admin@taxirosa.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Contraseña del usuario (mínimo 8 caracteres)', example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({ description: 'Nombre del usuario', example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ description: 'Apellido del usuario', example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ description: 'Rol del usuario', enum: ['admin', 'operator'], example: 'admin' })
  @IsEnum(['admin', 'operator'])
  role: 'admin' | 'operator';

  @ApiProperty({ description: 'Número de teléfono (opcional)', example: '+584121234567', required: false })
  @IsOptional()
  @IsPhoneNumber()
  phone_number?: string;
} 