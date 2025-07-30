import { ApiProperty } from '@nestjs/swagger';

export class PhotoMetadataDto {
  @ApiProperty({
    description: 'ID único de la foto',
    example: 'photo_uuid_12345'
  })
  id: string;

  @ApiProperty({
    description: 'URL de acceso a la foto (CloudFront o S3)',
    example: 'https://d1234567890.cloudfront.net/drivers/photos/profile/uuid-photo.jpg'
  })
  url: string;

  @ApiProperty({
    description: 'Clave S3 para gestión interna',
    example: 'drivers/photos/123/profile/uuid-photo.jpg'
  })
  s3_key: string;

  @ApiProperty({
    description: 'Tipo de foto',
    enum: ['profile', 'vehicle', 'document', 'verification'],
    example: 'profile'
  })
  type: string;

  @ApiProperty({
    description: 'Descripción de la foto',
    required: false,
    example: 'Foto de perfil principal de la conductora'
  })
  description?: string;

  @ApiProperty({
    description: 'Si es la foto principal para su tipo',
    example: true
  })
  is_primary: boolean;

  @ApiProperty({
    description: 'Fecha de subida',
    example: '2025-01-25T10:00:00Z'
  })
  uploaded_at: string;

  @ApiProperty({
    description: 'Tamaño del archivo en bytes',
    example: 1024000
  })
  size_bytes?: number;

  @ApiProperty({
    description: 'Nombre original del archivo',
    example: 'conductor_foto.jpg'
  })
  original_filename?: string;

  @ApiProperty({
    description: 'Usuario que subió la foto (para admin)',
    required: false,
    example: 'admin@taxirosa.com'
  })
  uploaded_by?: string;
}

export class DriverPhotosResponseDto {
  @ApiProperty({
    description: 'ID de la conductora',
    example: 123
  })
  driver_id: number;

  @ApiProperty({
    description: 'Foto de perfil principal',
    type: PhotoMetadataDto,
    required: false
  })
  profile_picture?: PhotoMetadataDto;

  @ApiProperty({
    description: 'Fotos del vehículo',
    type: [PhotoMetadataDto],
    example: []
  })
  vehicle_photos: PhotoMetadataDto[];

  @ApiProperty({
    description: 'Fotos de documentos',
    type: [PhotoMetadataDto],
    example: []
  })
  document_photos: PhotoMetadataDto[];

  @ApiProperty({
    description: 'Fotos de verificación',
    type: [PhotoMetadataDto],
    example: []
  })
  verification_photos: PhotoMetadataDto[];

  @ApiProperty({
    description: 'Fecha de última actualización de fotos',
    required: false,
    example: '2025-01-25T10:00:00Z'
  })
  photos_updated_at?: string;

  @ApiProperty({
    description: 'Total de fotos',
    example: 5
  })
  total_photos: number;
}

export class AdminPhotoUploadResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Datos de la foto subida',
    type: PhotoMetadataDto
  })
  data: PhotoMetadataDto;

  @ApiProperty({
    description: 'Mensaje descriptivo',
    example: 'Foto de perfil subida exitosamente'
  })
  message: string;
} 