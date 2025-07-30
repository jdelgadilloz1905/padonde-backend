import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DriverLoginDto {
  @ApiProperty({ description: 'Número de teléfono de la conductora', example: '+5219876543210' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ description: 'Contraseña de la conductora', example: 'Password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
} 