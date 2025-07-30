import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetStreetNameDto {
  @ApiProperty({ description: 'Latitud de la ubicación', example: 19.4324 })
  @IsString()
  @IsNotEmpty()
  latitude: string;

  @ApiProperty({ description: 'Longitud de la ubicación', example: -99.1333 })
  @IsString()
  @IsNotEmpty()
  longitude: string;
} 