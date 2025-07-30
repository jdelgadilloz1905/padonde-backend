import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UploadAdminPhotoDto {
  @ApiProperty({
    description: 'Tipo de foto a subir',
    enum: ['profile', 'vehicle', 'document', 'verification'],
    example: 'profile'
  })
  @IsEnum(['profile', 'vehicle', 'document', 'verification'])
  photo_type: string;

  @ApiProperty({
    description: 'Descripción opcional de la foto',
    required: false,
    example: 'Foto de perfil principal de la conductora'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Establecer como foto principal para el tipo especificado',
    required: false,
    default: false,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  set_as_primary?: boolean;

  @ApiProperty({
    description: 'Reemplazar foto existente si ya existe una del mismo tipo',
    required: false,
    default: false,
    example: false
  })
  @Transform(({ value }) => typeof value === 'string' ? value === 'true' : value)
  @IsOptional()
  @IsBoolean()
  replace_existing?: boolean;
}

export class BulkUploadAdminDto {
  @ApiProperty({
    description: 'Configuraciones para cada foto a subir',
    type: [UploadAdminPhotoDto],
    example: [
      { photo_type: 'profile', set_as_primary: true },
      { photo_type: 'vehicle', description: 'Vista frontal del vehículo' }
    ]
  })
  photo_configs: UploadAdminPhotoDto[];
} 