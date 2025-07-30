import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating, RatingType } from '../../entities/rating.entity';
import { Driver } from '../../entities/driver.entity';
import { CreateRatingDto, RatingResponseDto, DriverRatingsDto } from './dto/rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
  ) {}

  async createRating(createRatingDto: CreateRatingDto): Promise<RatingResponseDto> {
    // Verificar si ya existe una calificación para este viaje y tipo
    const existingRating = await this.ratingRepository.findOne({
      where: {
        rideId: createRatingDto.rideId,
        ratingType: createRatingDto.ratingType,
      },
    });

    if (existingRating) {
      throw new ConflictException('Ya existe una calificación para este viaje y tipo');
    }

    const rating = this.ratingRepository.create(createRatingDto);
    const savedRating = await this.ratingRepository.save(rating);

    // Actualizar promedio de la conductora si es una calificación de conductora
    if (createRatingDto.ratingType === RatingType.DRIVER) {
      await this.updateDriverAverageRating(createRatingDto.driverId);
    }

    return this.mapToResponseDto(savedRating);
  }

  async getRatingsByDriver(driverId: number): Promise<DriverRatingsDto> {
    const ratings = await this.ratingRepository.find({
      where: { driverId, ratingType: RatingType.DRIVER },
      relations: ['client', 'ride'],
      order: { createdAt: 'DESC' },
    });

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum, rating) => sum + rating.score, 0) / totalRatings 
      : 0;

    return {
      driverId,
      averageRating: Number(averageRating.toFixed(2)),
      totalRatings,
      ratings: ratings.map(rating => this.mapToResponseDto(rating)),
    };
  }

  async getRatingsByRide(rideId: number): Promise<RatingResponseDto[]> {
    const ratings = await this.ratingRepository.find({
      where: { rideId },
      relations: ['driver', 'client'],
      order: { createdAt: 'DESC' },
    });

    return ratings.map(rating => this.mapToResponseDto(rating));
  }

  async getRatingById(id: number): Promise<RatingResponseDto> {
    const rating = await this.ratingRepository.findOne({
      where: { id },
      relations: ['driver', 'client', 'ride'],
    });

    if (!rating) {
      throw new NotFoundException('Calificación no encontrada');
    }

    return this.mapToResponseDto(rating);
  }

  private async updateDriverAverageRating(driverId: number): Promise<void> {
    const ratings = await this.ratingRepository.find({
      where: { driverId, ratingType: RatingType.DRIVER },
    });

    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length 
      : 0;

    await this.driverRepository.update(driverId, {
      average_rating: Number(averageRating.toFixed(2)),
    });
  }

  private mapToResponseDto(rating: Rating): RatingResponseDto {
    return {
      id: rating.id,
      ratingType: rating.ratingType,
      score: rating.score,
      comment: rating.comment,
      driverId: rating.driverId,
      clientId: rating.clientId,
      rideId: rating.rideId,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    };
  }
} 