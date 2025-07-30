import { IsEmail, IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max, Length, Matches, IsArray, IsDate, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
export class CreateDriverDto {
  @ApiProperty({ description: 'Nombre de la conductora', example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  first_name: string;

  @ApiProperty({ description: 'Apellido de la conductora', example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  last_name: string;

  @ApiProperty({ description: 'Número de teléfono de la conductora', example: '+5219876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, {
    message: 'El número telefónico no es válido',
  })
  phone_number: string;

  @ApiPropertyOptional({ description: 'Correo electrónico de la conductora', example: 'conductora@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Marca del vehículo', example: 'Nissan' })
  @IsString()
  @IsNotEmpty()
  vehicle: string;

  @ApiPropertyOptional({ description: 'Modelo del vehículo', example: 'Versa' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'Color del vehículo', example: 'Blanco' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Año del vehículo', example: 2020 })
  @Transform(({ value }) => typeof value === 'string' ? parseInt(value) : value)
  @IsNumber()
  @IsOptional()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @ApiProperty({ description: 'Placa del vehículo', example: 'ABC123' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 20)
  license_plate: string;

  @ApiProperty({ description: 'Número de licencia de conducir', example: 'DL123456' })
  @IsString()
  @IsOptional()
  driver_license: string;

  @ApiProperty({ description: 'Número de documento de identidad', example: 'ID987654' })
  @IsString()
  @IsNotEmpty()
  id_document: string;

  @ApiPropertyOptional({ description: 'URL de la foto de perfil', example: 'https://example.com/profile.jpg' })
  @IsString()
  @IsOptional()
  profile_picture?: string;

  @ApiPropertyOptional({ description: 'Estado de la conductora', example: 'available' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'URL de la foto de perfil', example: 'https://example.com/profile.jpg' })
  @IsString()
  @IsOptional()
  profile_picture_url?: string;

  @ApiPropertyOptional({ description: 'Clave S3 para la foto de perfil', example: '1234567890' })
  @IsString()
  @IsOptional()
  profile_picture_s3_key?: string;

  @ApiPropertyOptional({ description: 'Fotos adicionales de la conductora', example: [{ type: 'vehicle', url: 'https://example.com/vehicle.jpg' }] })
  @IsOptional()
  additional_photos?: {
    vehicle_photos: string[];
    vehicle_insurance: string[];
    vehicle_registration: string[];
    vehicle_inspection: string[];
    document_photos: string[];
    verification_photos: string[];
  };

  @ApiPropertyOptional({ description: 'Fecha de actualización de las fotos', example: '2025-01-01' })
  @IsString()
  @IsOptional()
  photos_updated_at?: Date;

  @ApiPropertyOptional({ description: 'Fecha de registro de la conductora', example: '2025-01-01' })
  @IsString()
  @IsOptional()
  registration_date?: Date;

  @ApiPropertyOptional({ description: 'Calificación promedio de la conductora', example: 4.5 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  average_rating?: number;

  @ApiPropertyOptional({ description: 'Estado activo de la conductora', example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Capacidad máxima de pasajeros del vehículo', example: 4 })
  @Transform(({ value }) => typeof value === 'string' ? parseInt(value) : value)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(8)
  max_passengers?: number;

  @ApiPropertyOptional({ description: 'Indica si el vehículo tiene silla para niños', example: false })
  @IsBoolean()
  @IsOptional()
  has_child_seat?: boolean;

  @ApiPropertyOptional({ description: 'Ubicación actual de la conductora', example: 'POINT(19.432607 -99.133209)' })
  @IsObject()
  @IsOptional()
  current_location?: string;

  @ApiPropertyOptional({ description: 'Fecha de última actualización de la conductora', example: '2025-01-01' })
  @IsString()
  @IsOptional()
  last_update?: Date;
}