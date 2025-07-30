import { IsNotEmpty, IsString, IsEmail, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateClientDto {
  @ApiProperty({ description: 'Nombre del cliente', example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ description: 'Apellido del cliente', example: 'Pérez' })
  @IsString()
  @IsOptional()
  last_name: string;

  @ApiProperty({ description: 'Número de teléfono del cliente', example: '+5219876543210' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ description: 'Correo electrónico del cliente', example: 'juan@example.com', required: false })
  @Transform(({ value }) => value?.replaceAll(' ', '')? value.toLowerCase():undefined)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Dirección habitual del cliente', example: 'Calle Principal 123', required: false })
  @IsString()
  @IsOptional()
  usual_address?: string;

  @ApiProperty({ description: 'Referencia de la dirección', example: 'Casa azul con portón negro', required: false })
  @IsString()
  @IsOptional()
  address_reference?: string;

  @ApiProperty({ description: 'Notas adicionales sobre el cliente', example: 'Cliente frecuente', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ 
    description: 'Tipo de tarifa VIP a aplicar', 
    enum: ['flat_rate', 'minute_rate'],
    example: 'flat_rate',
    required: false 
  })
  @IsString()
  @IsOptional()
  vip_rate_type?: 'flat_rate' | 'minute_rate';

  @ApiProperty({ description: 'Indica si el cliente es VIP', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  is_vip?: boolean;

  @ApiProperty({ description: 'Tarifa plana para el cliente', example: 25.00, required: false })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99, { message: 'La tarifa plana no puede ser mayor a 999.99' })
  @IsOptional()
  flat_rate?: number;

  @ApiProperty({ description: 'Indica si el cliente está activo', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({ description: 'Tarifa por minuto para el cliente', example: 25.00, required: false })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99, { message: 'La tarifa por minuto no puede ser mayor a 999.99' })
  @IsOptional()
  minute_rate?: number;
} 