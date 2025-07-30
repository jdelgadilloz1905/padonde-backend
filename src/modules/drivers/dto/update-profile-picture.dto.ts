import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfilePictureDto {
  @ApiProperty({ description: 'URL de la foto de perfil', example: 'https://storage.example.com/profiles/driver-123.jpg' })
  @IsString()
  @IsNotEmpty()
  profile_picture: string;
} 