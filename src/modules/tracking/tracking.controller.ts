import { Controller, Get, Post, Param, Query, Body, ParseIntPipe, UseGuards, Logger } from '@nestjs/common';
import { DriverLocationService } from './driver-location.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { UpdateLocationDto } from './dto/update-location.dto';
import { DriverAuthGuard } from '../drivers/guards/driver-auth.guard';
import { CurrentDriver } from '../drivers/decorators/current-driver.decorator';
import { TrackingGateway } from './tracking.gateway';

@ApiTags('tracking')
@Controller('tracking')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(
    private readonly driverLocationService: DriverLocationService,
    private readonly trackingGateway: TrackingGateway
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @Get('drivers/active')
  @ApiOperation({ summary: 'Obtener ubicaciones de conductoras activos' })
  @ApiResponse({ status: 200, description: 'Ubicaciones recuperadas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  async getActiveDriversLocations() {
    return this.driverLocationService.getActiveDriversLocations();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @Get('driver/:id/locations')
  @ApiOperation({ summary: 'Obtener ubicaciones recientes de un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número máximo de ubicaciones a devolver' })
  @ApiResponse({ status: 200, description: 'Ubicaciones recuperadas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async getDriverLocations(
    @Param('id', ParseIntPipe) driverId: number,
    @Query('limit', ParseIntPipe) limit?: number
  ) {
    return this.driverLocationService.getDriverLocations(driverId, limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @Get('driver/:id/history')
  @ApiOperation({ summary: 'Obtener historial de ubicaciones de un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiQuery({ name: 'start', required: false, description: 'Fecha de inicio (formato ISO)' })
  @ApiQuery({ name: 'end', required: false, description: 'Fecha de fin (formato ISO)' })
  @ApiResponse({ status: 200, description: 'Historial recuperado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async getDriverLocationHistory(
    @Param('id', ParseIntPipe) driverId: number,
    @Query('start') startDate: string,
    @Query('end') endDate: string
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.driverLocationService.getDriverLocationHistory(driverId, start, end);
  }

  @Post('location')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar ubicación de la conductora' })
  @ApiBody({ type: UpdateLocationDto })
  @ApiResponse({ status: 201, description: 'Ubicación actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateDriverLocation(
    @CurrentDriver() driver,
    @Body() locationData: any
  ) {
    this.logger.log(`Recibida actualización de ubicación: ${JSON.stringify(locationData)}`);
    
    let driverId = driver.id;
    let latitude, longitude, speed, direction, rideId, timestamp;
    
    // Detectar el formato del cuerpo recibido
    if (locationData.location && locationData.location.lat && locationData.location.lng) {
      // Formato: {driverId: 1, location: {lat: 10.4870749, lng: -66.8558558, timestamp: 1747331611175}}
      latitude = locationData.location.lat;
      longitude = locationData.location.lng;
      timestamp = locationData.location.timestamp;
      
      if (locationData.driverId) {
        // Si se envía un driverId en el cuerpo, asegurarse de que coincida con el conductora autenticado
        if (locationData.driverId !== driver.id) {
          this.logger.warn(`Intento de actualizar ubicación para otro conductora: ${locationData.driverId} vs ${driver.id}`);
        }
      }
    } else {
      // Formato DTO: {latitude: 10.4870749, longitude: -66.8558558, speed: 0, direction: 0}
      latitude = locationData.latitude;
      longitude = locationData.longitude;
      speed = locationData.speed;
      direction = locationData.direction;
      rideId = locationData.rideId;
    }
    
    this.logger.log(`Procesando ubicación: lat=${latitude}, lng=${longitude}`);
    
    // Guardar la ubicación en la base de datos
    const location = await this.driverLocationService.saveDriverLocation({
      driverId,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      speed,
      direction,
      rideId
    });
    
    // Emitir evento WebSocket a los clientes de administración
    this.trackingGateway.notifyAdminsLocationUpdate({
      driverId,
      location: {
        latitude,
        longitude
      },
      speed,
      direction,
      timestamp: location.timestamp,
      rideId
    });
    
    return {
      success: true,
      message: 'Ubicación actualizada exitosamente',
      timestamp: location.timestamp
    };
  }
} 