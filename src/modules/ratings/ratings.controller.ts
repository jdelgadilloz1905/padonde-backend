import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { CreateRatingDto, RatingResponseDto, DriverRatingsDto } from './dto/rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ratings')
@Controller('ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva calificación' })
  @ApiResponse({ status: 201, description: 'Calificación creada exitosamente', type: RatingResponseDto })
  @ApiResponse({ status: 409, description: 'Ya existe una calificación para este viaje y tipo' })
  async createRating(@Body() createRatingDto: CreateRatingDto): Promise<RatingResponseDto> {
    return this.ratingsService.createRating(createRatingDto);
  }

  @Get('driver/:id')
  @ApiOperation({ summary: 'Obtener calificaciones de un conductora' })
  @ApiResponse({ status: 200, description: 'Calificaciones de la conductora obtenidas', type: DriverRatingsDto })
  async getRatingsByDriver(@Param('id') driverId: number): Promise<DriverRatingsDto> {
    return this.ratingsService.getRatingsByDriver(driverId);
  }

  @Get('ride/:id')
  @ApiOperation({ summary: 'Obtener calificaciones de un viaje' })
  @ApiResponse({ status: 200, description: 'Calificaciones del viaje obtenidas', type: [RatingResponseDto] })
  async getRatingsByRide(@Param('id') rideId: number): Promise<RatingResponseDto[]> {
    return this.ratingsService.getRatingsByRide(rideId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener calificación por ID' })
  @ApiResponse({ status: 200, description: 'Calificación encontrada', type: RatingResponseDto })
  @ApiResponse({ status: 404, description: 'Calificación no encontrada' })
  async getRatingById(@Param('id') id: number): Promise<RatingResponseDto> {
    return this.ratingsService.getRatingById(id);
  }
} 