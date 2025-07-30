import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DriverRequestOtpDto {
  @ApiProperty({ description: 'Número de teléfono de la conductora', example: '+5219876543210' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ 
    description: 'Plataforma del dispositivo', 
    example: 'android',
    enum: ['android', 'ios'],
    required: false
  })
  @IsString()
  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: string;

  @ApiProperty({ 
    description: 'Hash de la aplicación Android para detección automática de SMS', 
    example: 'FA+9qCX9VSu',
    required: false
  })
  @IsString()
  @IsOptional()
  app_hash?: string;
} 