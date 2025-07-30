import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
  ValidationPipe,
  Logger,
  Header,
  Put,
  Delete,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { RidesService } from './rides.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { GetStreetNameDto } from './dto/get-street-name.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { FareService } from './fare.service';
import { DriverLocationService } from '../tracking/driver-location.service';
import { GeocodingService } from './geocoding.service';
import { AskForRideDto } from './dto/ask-for-ride-dto';
import { AcceptRideDto } from './dto/accept-ride-dto';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { RideStatus } from 'src/entities/ride.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../entities/client.entity';

@ApiTags('rides')
@Controller('rides')
export class RidesController {
  private readonly logger = new Logger(RidesController.name);

  constructor(
    private readonly ridesService: RidesService,
    private readonly fareService: FareService,
    private readonly driverLocationService: DriverLocationService,
    private readonly geocodingService: GeocodingService,
    private readonly whatsAppNotificationService: WhatsAppNotificationService,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({
    summary: 'Iniciar una nueva carrera',
    description:
      'Crea una nueva carrera, geocodifica automáticamente la dirección de destino y calcula distancia y tiempo estimado',
  })
  @ApiResponse({
    status: 201,
    description:
      'Carrera creada exitosamente con información de destino, distancia y tiempo calculados',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o error en geocodificación',
  })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async create(@Body() createRideDto: CreateRideDto) {
    return this.ridesService.create({
      ...createRideDto,
      phone_number: `+${createRideDto.phone_number.split('@')[0].replace('+', '')}`,
    });
  }

  @Get('tracking/:code')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({ summary: 'Obtener una carrera por código de seguimiento' })
  @ApiParam({
    name: 'code',
    description: 'Código de seguimiento de la carrera',
  })
  @ApiResponse({ status: 200, description: 'Carrera encontrada' })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  @ApiResponse({ status: 404, description: 'Carrera no encontrada' })
  async findByTrackingCode(@Param('code') code: string) {
    return this.ridesService.findByTrackingCode(code);
  }

  @Get('geocode/street')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({
    summary: 'Obtener nombre de la calle a partir de coordenadas',
  })
  @ApiQuery({ name: 'latitude', description: 'Latitud de la ubicación' })
  @ApiQuery({ name: 'longitude', description: 'Longitud de la ubicación' })
  @ApiResponse({ status: 200, description: 'Dirección encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Coordenadas inválidas o error en el servicio',
  })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  async getStreetName(@Query(ValidationPipe) query: GetStreetNameDto) {
    return this.ridesService.getStreetName(
      Number(query.latitude),
      Number(query.longitude),
    );
  }

  @Post('estimate-fare')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({ 
    summary: 'Calcular tarifa estimada para un viaje',
    description: 'Calcula la tarifa estimada incluyendo comisiones y recargos aplicables según la zona y tipo de cliente'
  })
  @ApiResponse({
    status: 200,
    description: 'Tarifa estimada calculada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            estimatedFare: {
              type: 'number',
              description: 'Tarifa final estimada (incluye comisiones y recargos)'
            },
            distance: {
              type: 'number',
              description: 'Distancia en kilómetros'
            },
            duration: {
              type: 'number',
              description: 'Duración estimada en minutos'
            },
            zone: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
              },
            },
            breakdown: {
              type: 'object',
              properties: {
                baseFare: { type: 'number', description: 'Tarifa base antes de recargos' },
                timeCost: { type: 'number', description: 'Costo por tiempo' },
                nightSurcharge: { type: 'number', description: 'Recargo nocturno si aplica' },
                weekendSurcharge: { type: 'number', description: 'Recargo fin de semana si aplica' },
                commission: { type: 'number', description: 'Monto de comisión' }
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error en los datos proporcionados',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  async estimateFare(@Body() createRideDto: CreateRideDto) {
    try {
      let origin_coordinates_wkt = undefined;
      if(!createRideDto.origin_longitude || !createRideDto.origin_latitude) {
        origin_coordinates_wkt = undefined;
      }else{
        // Construir origin_coordinates desde las coordenadas separadas
       origin_coordinates_wkt = `POINT(${createRideDto.origin_longitude} ${createRideDto.origin_latitude})`;
      }

      // Geocodificar las direcciones
      const origin_coordinates = await this.geocodingService.geocodeAddress(
        createRideDto.origin,
        origin_coordinates_wkt,
        true,
      );

      if (!origin_coordinates) {
        throw new BadRequestException('Dirección de origen inválida');
      }

      const destination_coordinates = await this.geocodingService.geocodeAddress(
        createRideDto.destination,
        origin_coordinates,
        false,
      );

      if (!destination_coordinates) {
        throw new BadRequestException('Dirección de destino inválida');
      }

      // Extraer coordenadas para cálculos
      const originCoords = this.ridesService.extractCoordsFromWKT(origin_coordinates);
      const destCoords = this.ridesService.extractCoordsFromWKT(destination_coordinates);

      // Calcular distancia y duración
      const { distance, duration } = await this.ridesService.calculateDistanceAndDuration(
        originCoords.longitude,
        originCoords.latitude,
        destCoords.longitude,
        destCoords.latitude
      );

      // Obtener cliente si existe
      let clientId = null;
      if (createRideDto.phone_number) {
        const client = await this.clientsRepository.findOne({
          where: { phone_number: `+${createRideDto.phone_number.split('@')[0].replace('+', '')}` }
        });
        if (client) {
          clientId = client.id;
        }
      }

      // Calcular tarifa usando el sistema de prioridades
      const fareCalculation = await this.fareService.calculateFareWithPriorities(
        clientId,
        origin_coordinates,
        duration
      );

      // Formatear respuesta en el formato esperado por el frontend
      return {
        success: true,
        data: {
          estimatedFare: fareCalculation.finalFare,
          distance,
          duration,
          zone: {
            id: fareCalculation.zoneId,
            name: fareCalculation.zoneName
          },
          breakdown: {
            baseFare: fareCalculation.baseFare,
            timeCost: fareCalculation.breakdown.timeCost,
            nightSurcharge: fareCalculation.breakdown.nightSurcharge,
            weekendSurcharge: fareCalculation.breakdown.weekendSurcharge,
            commission: fareCalculation.commissionAmount
          }
        }
      };

    } catch (error) {
      this.logger.error(`Error al estimar tarifa: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post(':id/cancel')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Cancelar un viaje' })
  @ApiResponse({ status: 200, description: 'Viaje cancelado exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede cancelar el viaje' })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  async cancelRide(
    @Param('id') id: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.ridesService.cancelRide(id);
      return {
        success: true,
        message: 'Viaje cancelado exitosamente',
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('cancel-by-phone')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({ 
    summary: 'Cancelar carrera por número de teléfono',
    description: 'Permite a n8n cancelar la carrera de un usuario usando su número de teléfono. Se pueden cancelar carreras en estado "pending" o "in_progress". Si está en progreso, se notifica automáticamente al conductora por WhatsApp.'
  })
  @ApiBody({
    description: 'Datos necesarios para cancelar la carrera',
    schema: {
      type: 'object',
      required: ['phone_number'],
      properties: {
        phone_number: {
          type: 'string',
          description: 'Número de teléfono del cliente (puede incluir @c.us)',
          example: '1234567890'
        },
        reason: {
          type: 'string',
          description: 'Razón opcional de la cancelación',
          example: 'Cliente canceló por WhatsApp'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Carrera cancelada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        ride: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            tracking_code: { type: 'string' },
            status: { type: 'string' },
            cancelled_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'No se puede cancelar la carrera o datos inválidos',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'No se encontró carrera activa para el número proporcionado',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  async cancelRideByPhone(
    @Body() body: { phone_number: string; reason?: string }
  ): Promise<{ success: boolean; message?: string; error?: string; ride?: any }> {
    try {
      // Validar que se proporcione el número de teléfono
      if (!body.phone_number) {
        return {
          success: false,
          error: 'El número de teléfono es requerido'
        };
      }

      // Limpiar el número de teléfono (remover @c.us si existe)
      const cleanPhone = body.phone_number.split('@')[0];

      // Validar formato básico del número
      if (!/^\d+$/.test(cleanPhone)) {
        return {
          success: false,
          error: 'El número de teléfono debe contener solo dígitos'
        };
      }

      // Buscar carrera activa del usuario
      const activeRide = await this.ridesService.findPendingRideByPhone(cleanPhone);

      if (!activeRide) {
        return {
          success: false,
          error: 'No se encontró una carrera activa para este número de teléfono'
        };
      }

      // Verificar que la carrera se pueda cancelar
      if (activeRide.status === 'cancelled') {
        return {
          success: false,
          error: 'La carrera ya está cancelada'
        };
      }

      if (activeRide.status === 'completed') {
        return {
          success: false,
          error: 'No se puede cancelar una carrera completada'
        };
      }

      // Permitir cancelación si está en estado pendiente o en progreso
      if (activeRide.status !== 'pending' && activeRide.status !== 'in_progress') {
        return {
          success: false,
          error: 'Solo se pueden cancelar carreras en estado pendiente o en progreso.'
        };
      }

      // Cancelar la carrera
      const cancelledRide = await this.ridesService.cancelRide(activeRide.id);

      this.logger.log(
        `Carrera ${activeRide.id} cancelada por n8n para el número ${cleanPhone}` +
        (body.reason ? ` - Razón: ${body.reason}` : '')
      );

      return {
        success: true,
        message: 'Carrera cancelada exitosamente',
        ride: {
          id: cancelledRide.id,
          tracking_code: cancelledRide.tracking_code,
          status: cancelledRide.status,
          cancelled_at: cancelledRide.cancelled_at,
          origin: cancelledRide.origin,
          destination: cancelledRide.destination,
          client: activeRide.client ? {
            name: `${activeRide.client.first_name} ${activeRide.client.last_name??''}`.trim(),
            phone: activeRide.client.phone_number
          } : null
        }
      };

    } catch (error) {
      this.logger.error(
        `Error al cancelar carrera por teléfono ${body.phone_number}: ${error.message}`,
        error.stack
      );
      
      return {
        success: false,
        error: error.message || 'Error interno del servidor'
      };
    }
  }

  @Get('pending/:phone')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({ summary: 'Verificar si un número tiene un viaje pendiente' })
  @ApiResponse({ status: 200, description: 'Consulta exitosa' })
  @ApiResponse({
    status: 404,
    description: 'No se encontró un viaje pendiente',
  })
  async checkPendingRide(
    @Param('phone') phone: string,
  ): Promise<{ success: boolean; hasPendingRide: boolean; ride?: any }> {
    const ride = await this.ridesService.findPendingRideByPhone(phone);

    return {
      success: true,
      hasPendingRide: !!ride,
      ride: ride || undefined,
    };
  }

  @Get('find-nearest-driver')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({
    summary: 'Buscar conductora más cercano',
    description:
      'Encuentra el conductora disponible más cercano a una carrera específica o ubicación de cliente',
  })
  @ApiQuery({
    name: 'rideId',
    description: 'ID de la carrera',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'phone',
    description: 'Número de teléfono del cliente para buscar carrera pendiente',
    required: false,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'conductora encontrado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        driver: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            phone: { type: 'string' },
            vehicle: { type: 'string' },
            plate: { type: 'string' },
            status: { type: 'string' },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
              },
            },
            distance: {
              type: 'number',
              description: 'Distancia en kilómetros al origen',
            },
            estimatedArrival: {
              type: 'number',
              description: 'Tiempo estimado de llegada en minutos',
            },
          },
        },
        rideInfo: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            origin: { type: 'string' },
            destination: { type: 'string' },
            client: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos o carrera no encontrada',
  })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron conductoras disponibles',
  })
  async findNearestDriver(
    @Query('rideId') rideId?: number,
    @Query('phone') phone?: string,
  ): Promise<{
    success: boolean;
    driver?: any;
    rideInfo?: any;
    message?: string;
  }> {
    try {
      // Validar que se proporcione al menos un parámetro
      if (!rideId && !phone) {
        return {
          success: false,
          message: 'Debe proporcionar rideId o phone para buscar conductora',
        };
      }

      let ride: any = null;

      // Buscar la carrera por ID o por teléfono
      if (rideId) {
        ride = await this.ridesService.findOne(rideId);
      } else if (phone) {
        ride = await this.ridesService.findPendingRideByPhone(
          phone.split('@')[0],
        );
        if (!ride) {
          return {
            success: false,
            message:
              'No se encontró una carrera pendiente para este número de teléfono',
          };
        }
      }

      if (!ride) {
        return {
          success: false,
          message: 'Carrera no encontrada',
        };
      }

      // Obtener coordenadas de origen de la carrera
      const originCoords = this.ridesService.extractCoordsFromWKT(
        typeof ride.origin_coordinates === 'string'
          ? ride.origin_coordinates
          : `POINT(${ride.origin_coordinates.coordinates[0]} ${ride.origin_coordinates.coordinates[1]})`,
      );

      // Obtener conductoras activos disponibles
      const activeDrivers =
        await this.driverLocationService.getActiveDriversLocations();

      if (!activeDrivers || activeDrivers.length === 0) {
        return {
          success: false,
          message: 'No hay conductoras disponibles en este momento',
        };
      }

      // Filtrar solo conductoras disponibles (no ocupados) y que cumplan con los requisitos del viaje
      const availableDrivers = activeDrivers.filter((driver) => {
        // Verificar que el conductor esté disponible y tenga ubicación
        if (driver.status !== 'available' || !driver.location) {
          return false;
        }

        // Verificar capacidad de pasajeros
        const requiredPassengers = ride.passenger_count || 1;
        const driverCapacity = driver.maxPassengers || 4;
        if (requiredPassengers > driverCapacity) {
          this.logger.debug(
            `Conductor ${driver.driverId} descartado: capacidad insuficiente (${driverCapacity} < ${requiredPassengers})`
          );
          return false;
        }

        // Verificar silla de niños si es requerida
        if (ride.has_children_under_5 && !driver.hasChildSeat) {
          this.logger.debug(
            `Conductor ${driver.driverId} descartado: no tiene silla de niños requerida`
          );
          return false;
        }

        return true;
      });

      if (availableDrivers.length === 0) {
        return {
          success: false,
          message: 'No hay conductoras disponibles en este momento',
        };
      }

      // Calcular distancias y encontrar el más cercano
      let nearestDriver = null;
      let minDistance = Infinity;

      for (const driver of availableDrivers) {
        if (!driver.location) continue;

        // Calcular distancia usando fórmula de Haversine
        const distance = this.calculateHaversineDistance(
          originCoords.latitude,
          originCoords.longitude,
          driver.location.latitude,
          driver.location.longitude,
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestDriver = {
            ...driver,
            distance: distance,
            estimatedArrival: Math.ceil((distance / 30) * 60), // Asumiendo 30 km/h velocidad promedio
          };
        }
      }
      if (!nearestDriver) {
        return {
          success: false,
          message: 'No se pudo encontrar un conductora cercano',
        };
      }

      // Obtener el nombre de la calle donde está ubicado el conductora
      let streetName = 'Ubicación no disponible';
      try {
        if (
          nearestDriver.location &&
          nearestDriver.location.latitude &&
          nearestDriver.location.longitude
        ) {
          const addressInfo = await this.geocodingService.reverseGeocode(
            nearestDriver.location.latitude,
            nearestDriver.location.longitude,
          );
          streetName =
            addressInfo.street ||
            addressInfo.fullAddress ||
            'Calle no identificada';
        }
      } catch (geocodeError) {
        this.logger.warn(
          `No se pudo obtener el nombre de la calle para el conductora ${nearestDriver.driverId}: ${geocodeError.message}`,
        );
      }

      // Información de la carrera para contexto
      const rideInfo = {
        id: ride.id,
        origin: ride.origin,
        destination: ride.destination,
        client: ride.client
          ? `${ride.client.first_name} ${ride.client.last_name??''}`.trim()
          : 'Cliente',
        coordinates_destination: ride.destination_coordinates,
        distance: ride.distance,
        duration: ride.duration,
        price: ride.price,
        driver: ride.driver,
        trackingCode: ride.tracking_code,
      };

      this.logger.log(
        `conductora más cercano encontrado para carrera ${ride.id}: ` +
          `Driver ID ${nearestDriver.driverId} a ${nearestDriver.distance}km de distancia en ${streetName}`,
      );

      return {
        success: true,
        driver: {
          id: nearestDriver.driverId,
          name: nearestDriver.name,
          phone: nearestDriver.phone,
          vehicle: nearestDriver.vehicle,
          plate: nearestDriver.plate,
          status: nearestDriver.status,
          location: nearestDriver.location,
          streetName: streetName,
          distance: nearestDriver.distance,
          estimatedArrival: nearestDriver.estimatedArrival,
        },
        rideInfo,
      };
    } catch (error) {
      this.logger.error(
        `Error al buscar conductora más cercano: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Método auxiliar para calcular distancia usando fórmula de Haversine
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distancia en km

    return parseFloat(distance.toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  @Post('ask-for-ride')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({ summary: 'Solicitar una carrera' })
  @ApiResponse({ status: 200, description: 'Carrera solicitada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async askForRide(@Body() askForRideDto: AskForRideDto) {
    return this.ridesService.askForRide(askForRideDto);
  }

  @Get('ask-for-ride')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({ summary: 'Obtener todas las carreras pendientes' })
  @ApiResponse({ status: 200, description: 'Carreras pendientes obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getPendingRides() {
    return this.ridesService.getPendingRides();
  }

  @Post('accept-ride')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({ summary: 'Aceptar una carrera' })
  @ApiResponse({ status: 200, description: 'Carrera aceptada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async acceptRide(@Body() acceptRideDto: AcceptRideDto) {
    return this.ridesService.acceptRide(acceptRideDto);
  }

  @Post('test-distance-calculation')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Probar cálculo de distancia y tiempo (Admin)',
    description: 'Endpoint de prueba para verificar que Google Maps y OSRM funcionen correctamente para calcular rutas'
  })
  @ApiBody({
    description: 'Coordenadas para probar el cálculo de distancia',
    schema: {
      type: 'object',
      required: ['originLat', 'originLon', 'destLat', 'destLon'],
      properties: {
        originLat: {
          type: 'number',
          description: 'Latitud de origen',
          example: 19.43215
        },
        originLon: {
          type: 'number',
          description: 'Longitud de origen',
          example: -99.12345
        },
        destLat: {
          type: 'number',
          description: 'Latitud de destino',
          example: 19.42935
        },
        destLon: {
          type: 'number',
          description: 'Longitud de destino',
          example: -99.12823
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Cálculo completado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en el cálculo' })
  @ApiResponse({ status: 401, description: 'No autorizado - requiere login de administrador' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async testDistanceCalculation(
    @Body() body: {
      originLat: number;
      originLon: number;
      destLat: number;
      destLon: number;
    }
  ) {
    try {
      const startTime = Date.now();
      
      const result = await this.ridesService.calculateDistanceAndDuration(
        body.originLon,
        body.originLat,
        body.destLon,
        body.destLat
      );
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      return {
        success: true,
        result: {
          distance: result.distance,
          duration: result.duration,
          processingTime: `${processingTime}ms`
        },
        coordinates: {
          origin: { lat: body.originLat, lon: body.originLon },
          destination: { lat: body.destLat, lon: body.destLon }
        }
      };
    } catch (error) {
      this.logger.error(`Error en prueba de cálculo de distancia: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('test-whatsapp-notification')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Probar notificación de WhatsApp (Admin)',
    description: 'Endpoint de prueba para verificar que las notificaciones de WhatsApp funcionen correctamente'
  })
  @ApiBody({
    description: 'Datos para la prueba de notificación de WhatsApp',
    schema: {
      type: 'object',
      required: ['phone'],
      properties: {
        phone: {
          type: 'string',
          description: 'Número de teléfono de la conductora para enviar la prueba',
          example: '1234567890'
        },
        trackingCode: {
          type: 'string',
          description: 'Código de seguimiento de prueba (opcional)',
          example: 'TEST123'
        },
        origin: {
          type: 'string',
          description: 'Dirección de origen de prueba (opcional)',
          example: 'Calle Principal 123'
        },
        destination: {
          type: 'string',
          description: 'Dirección de destino de prueba (opcional)',
          example: 'Avenida Central 456'
        },
        clientName: {
          type: 'string',
          description: 'Nombre del cliente de prueba (opcional)',
          example: 'Juan Pérez'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Notificación enviada exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al enviar notificación' })
  @ApiResponse({ status: 401, description: 'No autorizado - requiere login de administrador' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async testWhatsAppNotification(
    @Body() body: { 
      phone: string; 
      trackingCode?: string;
      origin?: string;
      destination?: string;
      clientName?: string;
    }
  ) {
    try {
      const result = await this.whatsAppNotificationService.sendCancellationMessageToDriver(
        body.phone,
        {
          trackingCode: body.trackingCode || 'TEST123',
          origin: body.origin || 'Dirección de prueba origen',
          destination: body.destination || 'Dirección de prueba destino',
          clientName: body.clientName || 'Cliente de Prueba'
        }
      );

      if (result) {
        return {
          success: true,
          message: 'Notificación de prueba enviada exitosamente',
          phone: body.phone
        };
      } else {
        return {
          success: false,
          error: 'No se pudo enviar la notificación de prueba'
        };
      }
    } catch (error) {
      this.logger.error(`Error en prueba de notificación: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ========== ENDPOINTS CRUD PARA ADMINISTRACIÓN ==========

  @Get()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todas las carreras (Admin)' })
  @ApiQuery({
    name: 'page',
    description: 'Número de página',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Elementos por página',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'status',
    description: 'Filtrar por estado',
    required: false,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
  })
  @ApiQuery({
    name: 'clientPhone',
    description: 'Filtrar por teléfono del cliente',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'driverId',
    description: 'Filtrar por ID de la conductora',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Fecha de inicio (YYYY-MM-DD)',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Fecha de fin (YYYY-MM-DD)',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'start_date',
    description: 'Alias en snake_case de startDate (YYYY-MM-DD)',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'end_date',
    description: 'Alias en snake_case de endDate (YYYY-MM-DD)',
    required: false,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de carreras obtenida exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - requiere login de administrador',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - requiere rol de administrador',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('clientPhone') clientPhone?: string,
    @Query('driverId') driverId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
  ) {
    const startDateFilter = startDate || start_date;
    const endDateFilter = endDate || end_date;

    return this.ridesService.findAll(
      Number(page),
      Number(limit),
      status ? status.split(',').map(s => s as RideStatus) : undefined,
      search,
      clientPhone,
      driverId ? Number(driverId) : undefined,
      startDateFilter,
      endDateFilter,
    );
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar una carrera (Admin)' })
  @ApiParam({ name: 'id', description: 'ID de la carrera' })
  @ApiResponse({ status: 200, description: 'Carrera actualizada exitosamente' })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - requiere login de administrador',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - requiere rol de administrador',
  })
  @ApiResponse({ status: 404, description: 'Carrera no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRideDto: UpdateRideDto,
  ) {
    return this.ridesService.update(id, updateRideDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una carrera (Admin)' })
  @ApiParam({ name: 'id', description: 'ID de la carrera' })
  @ApiResponse({ status: 200, description: 'Carrera eliminada exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar la carrera' })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - requiere login de administrador',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - requiere rol de administrador',
  })
  @ApiResponse({ status: 404, description: 'Carrera no encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.ridesService.remove(id);
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar estado de una carrera (Admin)' })
  @ApiParam({ name: 'id', description: 'ID de la carrera' })
  @ApiResponse({
    status: 200,
    description: 'Estado de carrera cambiado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Cambio de estado no válido' })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - requiere login de administrador',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - requiere rol de administrador',
  })
  @ApiResponse({ status: 404, description: 'Carrera no encontrada' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeStatusDto: ChangeStatusDto,
  ) {
    return this.ridesService.changeStatus(
      id,
      changeStatusDto.status,
      changeStatusDto.reason,
    );
  }

  @Patch(':id/assign-driver')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Asignar conductora a una carrera (Admin)' })
  @ApiParam({ name: 'id', description: 'ID de la carrera' })
  @ApiResponse({ status: 200, description: 'conductora asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede asignar conductora' })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - requiere login de administrador',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - requiere rol de administrador',
  })
  @ApiResponse({ status: 404, description: 'Carrera no encontrada' })
  async assignDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignDriverDto: AssignDriverDto,
  ) {
    return this.ridesService.assignDriver(
      id,
      assignDriverDto.driver_id,
      assignDriverDto.notes,
    );
  }

  @Get('admin/statistics')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener estadísticas de carreras (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - requiere login de administrador',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - requiere rol de administrador',
  })
  async getStatistics() {
    return this.ridesService.getStatistics();
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({ summary: 'Obtener una carrera por ID' })
  @ApiParam({ name: 'id', description: 'ID de la carrera' })
  @ApiResponse({ status: 200, description: 'Carrera encontrada' })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  @ApiResponse({ status: 404, description: 'Carrera no encontrada' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ridesService.findOne(id);
  }
}
