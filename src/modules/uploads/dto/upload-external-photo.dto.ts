import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadExternalPhotoDto {
  @ApiProperty({
    description: 'Tipo de foto a subir (más restrictivo que admin)',
    enum: ['profile', 'vehicle', 'document'],
    example: 'profile'
  })
  @IsEnum(['profile', 'vehicle', 'document'])
  photo_type: string;

  @ApiProperty({
    description: 'Fuente o workflow de origen de la foto',
    required: false,
    example: 'registration_workflow'
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: 'Metadata adicional del workflow o sistema origen',
    required: false,
    example: {
      workflow_id: 'wf_12345',
      step: 'document_processing',
      processing_time: '2025-01-25T10:00:00Z'
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'ID del workflow o proceso que originó la subida',
    required: false,
    example: 'n8n_workflow_123'
  })
  @IsOptional()
  @IsString()
  workflow_id?: string;
}

export class ExternalPhotoResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'ID único de la foto subida',
    example: 'photo_uuid_12345'
  })
  photo_id: string;

  @ApiProperty({
    description: 'URL de acceso a la foto (CloudFront o S3)',
    example: 'https://d1234567890.cloudfront.net/drivers/photos/profile/uuid-photo.jpg'
  })
  url: string;

  @ApiProperty({
    description: 'Tipo de foto subida',
    example: 'profile'
  })
  type: string;

  @ApiProperty({
    description: 'Timestamp de subida',
    example: '2025-01-25T10:00:00Z'
  })
  uploaded_at?: string;
} 