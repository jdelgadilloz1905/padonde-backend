import { IsInt, IsString, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RatingType } from '../../../entities/rating.entity';

export class CreateRatingDto {
  @ApiProperty({ description: 'Tipo de calificación', enum: RatingType })
  @IsEnum(RatingType)
  ratingType: RatingType;

  @ApiProperty({ description: 'Puntuación de 1 a 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({ description: 'Comentario opcional', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'ID de la conductora' })
  @IsInt()
  driverId: number;

  @ApiProperty({ description: 'ID del cliente' })
  @IsInt()
  clientId: number;

  @ApiProperty({ description: 'ID del viaje' })
  @IsInt()
  rideId: number;
}

export class RatingResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: RatingType })
  ratingType: RatingType;

  @ApiProperty()
  score: number;

  @ApiProperty()
  comment: string;

  @ApiProperty()
  driverId: number;

  @ApiProperty()
  clientId: number;

  @ApiProperty()
  rideId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DriverRatingsDto {
  @ApiProperty()
  driverId: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalRatings: number;

  @ApiProperty({ type: [RatingResponseDto] })
  ratings: RatingResponseDto[];
} 