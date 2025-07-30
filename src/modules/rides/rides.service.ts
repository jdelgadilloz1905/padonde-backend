import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Driver, Like, Repository } from 'typeorm';
import { Ride } from '../../entities/ride.entity';
import { Client } from '../../entities/client.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { FareService } from './fare.service';
import { In } from 'typeorm';
import { RideStatus } from '../../entities/ride.entity';
import { GeocodingService } from './geocoding.service';
import { DriverPendingResponse } from 'src/entities/driver-pending-response.entity';
import { AskForRideDto } from './dto/ask-for-ride-dto';
import { Driver as DriverEntity, DriverStatus } from 'src/entities/driver.entity';
import { AcceptRideDto } from './dto/accept-ride-dto';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { ChatHistoryService } from '../chat-history/chat-history.service';

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);
  private readonly MAX_DISTANCE_KM = 100; // Distancia máxima permitida en kilómetros

  constructor(
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(DriverPendingResponse)
    private driverPendingResponseRepository: Repository<DriverPendingResponse>,
    private fareService: FareService,
    private geocodingService: GeocodingService,
    @InjectRepository(DriverEntity)
    private driverRepository: Repository<DriverEntity>,
    private whatsAppNotificationService: WhatsAppNotificationService,
    private chatHistoryService: ChatHistoryService,
  ) {}

  async create(createRideDto: CreateRideDto): Promise<Ride> {
    try {
      // Verificar si existe el cliente
      const client = await this.clientsRepository.findOne({
        where: { phone_number: createRideDto.phone_number }
      });
      
      if (!client) {
        throw new NotFoundException(`Cliente con telefono ${createRideDto.phone_number} no encontrado`);
      }

      // verificar si tiene un ride pendiente
      const ride = await this.ridesRepository.findOne({
        where: { client_id: client.id, status: RideStatus.PENDING }
      });
      if (ride) {
        throw new BadRequestException('Ya tienes un ride pendiente');
      }

      // Construir origin_coordinates desde las coordenadas separadas
      let origin_coordinates_input: string;
      
      // Si el DTO tiene el campo origin_coordinates (compatibilidad hacia atrás)
      if ((createRideDto as any).origin_coordinates) {
        origin_coordinates_input = (createRideDto as any).origin_coordinates;
      } else if(!createRideDto.origin_longitude || !createRideDto.origin_latitude) {
        origin_coordinates_input = undefined;
      }else{
        // Construir origin_coordinates desde las coordenadas separadas
       origin_coordinates_input = `POINT(${createRideDto.origin_longitude} ${createRideDto.origin_latitude})`;
      } 

      //verificar si la direccion de origen es valida
      const origin_coordinates = await this.geocodingService.geocodeAddress(createRideDto.origin, origin_coordinates_input, true);
      if (!origin_coordinates) {
        throw new BadRequestException('Dirección de origen inválida');
      }
      
      // Geocodificar la dirección de destino para obtener las coordenadas
      const destination_coordinates = await this.geocodingService.geocodeAddress(createRideDto.destination, origin_coordinates);
      if (!destination_coordinates) {
        throw new BadRequestException('Dirección de destino inválida');
      }

      // Extraer coordenadas de origen para cálculos de distancia
      const originCoords = this.extractCoordsFromWKT(origin_coordinates);
      const destCoords = this.extractCoordsFromWKT(destination_coordinates);

      // Calcular distancia y tiempo estimado
      const { distance, duration } = await this.calculateDistanceAndDuration(
        originCoords.longitude, 
        originCoords.latitude, 
        destCoords.longitude, 
        destCoords.latitude
      );

      // Validar que la distancia sea razonable
      if (distance > this.MAX_DISTANCE_KM) {
        throw new BadRequestException(
          `La distancia del viaje (${distance}km) excede el límite permitido de ${this.MAX_DISTANCE_KM}km. ` +
          'Por favor, verifica las direcciones de origen y destino.'
        );
      }

      // Validar que el tiempo estimado sea razonable (máximo 3 horas)
      const MAX_DURATION_MINUTES = 180;
      if (duration > MAX_DURATION_MINUTES) {
        throw new BadRequestException(
          `El tiempo estimado del viaje (${duration} minutos) excede el límite permitido de ${MAX_DURATION_MINUTES} minutos. ` +
          'Por favor, verifica las direcciones de origen y destino.'
        );
      }

      // Calcular la tarifa
      const fare = await this.fareService.calculateFareWithPriorities(
        client.id,
        origin_coordinates,
        duration
      );
      
      // Generar código de seguimiento único
      const trackingCode = this.generateTrackingCode();
      
      // Crear nueva carrera
      const newRide = this.ridesRepository.create({
        client_id: client.id,
        origin: createRideDto.origin,
        destination: createRideDto.destination,
        origin_coordinates: this.wktToGeoJSON(origin_coordinates),
        destination_coordinates: this.wktToGeoJSON(destination_coordinates),
        status: RideStatus.PENDING,
        request_date: new Date(),
        tracking_code: trackingCode,
        distance,
        duration,
        price: fare.finalFare,
        commission_percentage: fare.commissionPercentage,
        commission_amount: fare.commissionAmount,
        passenger_count: createRideDto.passenger_count || 1,
        has_children_under_5: createRideDto.has_children_under_5 || false,
        is_round_trip: createRideDto.is_round_trip || false,
        payment_method: createRideDto.payment_method || 'cash'
      });

      const savedRide = await this.ridesRepository.save(newRide);
      
      this.logger.log(
        `Nueva carrera creada con ID: ${savedRide.id}, ` +
        `código de seguimiento: ${trackingCode}, ` +
        `distancia: ${distance}km, ` +
        `duración estimada: ${duration} minutos, ` +
        `precio: ${fare.finalFare}`
      );
      
      return savedRide;
    } catch (error) {
      this.logger.error(`Error al crear carrera: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Generar código de seguimiento alfanumérico de 8 caracteres
  private generateTrackingCode(): string {
    return uuidv4().substring(0, 8).toUpperCase();
  }
  
  // Método para extraer las coordenadas de una cadena WKT Point
  extractCoordsFromWKT(wktPoint: string): { longitude: number, latitude: number } {
    try {
      // Ejemplo de formato: POINT(-99.12345 19.43215)
      const coordsString = wktPoint.replace('POINT(', '').replace(')', '');
      console.log(coordsString);
      const [lon, lat] = coordsString.split(' ').map(Number);
      
      return { longitude: lon, latitude: lat };
    } catch (error) {
      this.logger.error(`Error al extraer coordenadas de WKT: ${error.message}`, error.stack);
      throw new BadRequestException('Formato de coordenadas inválido');
    }
  }
  
  // Método para convertir WKT a GeoJSON
  private wktToGeoJSON(wktPoint: string): any {
    try {
      const coords = this.extractCoordsFromWKT(wktPoint);
      return {
        type: 'Point',
        coordinates: [coords.longitude, coords.latitude]
      };
    } catch (error) {
      this.logger.error(`Error al convertir WKT a GeoJSON: ${error.message}`, error.stack);
      throw new BadRequestException('Error al convertir coordenadas');
    }
  }
  
  // Método para calcular distancia y tiempo entre dos puntos usando rutas reales
  async calculateDistanceAndDuration(
    originLon: number, 
    originLat: number, 
    destLon: number, 
    destLat: number
  ): Promise<{ distance: number, duration: number }> {
    try {
      // PRIORIDAD 1: Intentar primero con Google Maps Directions API (más preciso)
      try {
        const result = await this.geocodingService.calculateDistanceAndDurationWithGoogleMaps(
          originLat, 
          originLon, 
          destLat, 
          destLon
        );
        this.logger.log(`Google Maps exitoso - Distancia: ${result.distance}km, Duración: ${result.duration} minutos`);
        return result;
      } catch (googleError) {
        this.logger.warn(`Error con Google Maps, intentando con OSRM: ${googleError.message}`);
      }

      // PRIORIDAD 2: Fallback a OSRM (Open Source Routing Machine)
      const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false`;
      this.logger.log(`Usando OSRM: ${url}`);
      const response = await axios.get(url);
      
      if (!response.data || !response.data.routes || response.data.routes.length === 0) {
        throw new BadRequestException('No se pudo calcular la ruta entre origen y destino con OSRM');
      }
      
      const route = response.data.routes[0];
      
      // Distancia en metros, la convertimos a kilómetros con 2 decimales
      const distance = parseFloat((route.distance / 1000).toFixed(2));
      
      // Duración en segundos, la convertimos a minutos redondeando hacia arriba
      const duration = Math.ceil(route.duration / 60);
      
      this.logger.log(`OSRM exitoso - Distancia: ${distance}km, Duración: ${duration} minutos`);
      return { distance, duration };
    } catch (error) {
      this.logger.error(`Error con todos los servicios de rutas: ${error.message}`, error.stack);
      
      // PRIORIDAD 3: En caso de error con ambos servicios, usar cálculo aproximado con Haversine
      const distance = this.calculateHaversineDistance(originLat, originLon, destLat, destLon);
      
      // Tiempo estimado asumiendo velocidad promedio de 30 km/h en ciudad
      const duration = Math.ceil((distance / 30) * 60);
      
      this.logger.log(`Usando cálculo aproximado (Haversine): distancia ${distance}km, duración ${duration} minutos`);
      
      return { distance, duration };
    }
  }
  
  // Método de respaldo para calcular distancia usando fórmula de Haversine (en línea recta)
  public calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distancia en km
    
    return parseFloat(distance.toFixed(2));
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  async findOne(id: number): Promise<Ride> {
    const ride = await this.ridesRepository.findOne({
      where: { id },
      relations: ['client', 'driver']
    });
    
    if (!ride) {
      throw new NotFoundException(`Carrera con ID ${id} no encontrada`);
    }
    
    return ride;
  }
  
  async findByTrackingCode(trackingCode: string): Promise<Ride> {
    const ride = await this.ridesRepository.findOne({
      where: { tracking_code: trackingCode },
      relations: ['client', 'driver']
    });
    
    if (!ride) {
      throw new NotFoundException(`Carrera con código ${trackingCode} no encontrada`);
    }
    
    return ride;
  }
  
  async getStreetName(latitude: number, longitude: number): Promise<{ street: string, fullAddress: string }> {
    return this.geocodingService.reverseGeocode(latitude, longitude);
  }

  async cancelRide(id: number): Promise<Ride> {
    const ride = await this.findOne(id);
    
    if (ride.status === RideStatus.CANCELLED) {
      throw new BadRequestException('El viaje ya está cancelado');
    }

    if (ride.status === RideStatus.COMPLETED) {
      throw new BadRequestException('No se puede cancelar un viaje completado');
    }

    // Si la carrera está en progreso y tiene conductora asignado, enviar notificación
    if (ride.status === RideStatus.IN_PROGRESS && ride.driver && ride.driver.phone_number) {
      try {
        const clientName = ride.client 
          ? `${ride.client.first_name} ${ride.client.last_name??''}`.trim() 
          : undefined;

        await this.whatsAppNotificationService.sendCancellationMessageToDriver(
          ride.driver.phone_number,
          {
            trackingCode: ride.tracking_code,
            origin: ride.origin,
            destination: ride.destination,
            clientName: clientName
          }
        );

        this.logger.log(
          `Notificación de cancelación enviada al conductora ${ride.driver.phone_number} ` +
          `para la carrera ${ride.tracking_code}`
        );
      } catch (notificationError) {
        // Log el error pero no fallar la cancelación
        this.logger.error(
          `Error al enviar notificación de cancelación al conductora: ${notificationError.message}`,
          notificationError.stack
        );
      }
    }

    // Si hay conductora asignado, cambiar su estado a 'available'
    if (ride.driver_id) {
      try {
        await this.driverRepository.update(ride.driver_id, {
          status: DriverStatus.AVAILABLE
        });

        this.logger.log(
          `Estado de la conductora ${ride.driver_id} cambiado a 'available' ` +
          `tras cancelación de carrera ${ride.tracking_code}`
        );
      } catch (driverUpdateError) {
        // Log el error pero no fallar la cancelación
        this.logger.error(
          `Error al actualizar estado de la conductora ${ride.driver_id}: ${driverUpdateError.message}`,
          driverUpdateError.stack
        );
      }
    }

    ride.status = RideStatus.CANCELLED;
    ride.cancelled_at = new Date();
    
    const savedRide = await this.ridesRepository.save(ride);

    // Borrar historial de chat del cliente cuando se cancele la carrera
    if (ride.client && ride.client.phone_number) {
      try {
        await this.chatHistoryService.clearClientChatHistory(ride.client.phone_number);
        this.logger.log(
          `Historial de chat borrado para cliente ${ride.client.phone_number} ` +
          `tras cancelación de carrera ${ride.tracking_code}`
        );
      } catch (chatError) {
        // Log el error pero no fallar la cancelación
        this.logger.error(
          `Error al borrar historial de chat del cliente: ${chatError.message}`,
          chatError.stack
        );
      }
    }
    
    return savedRide;
  }

  async findPendingRideByPhone(phone: string): Promise<Ride | null> {
    return this.ridesRepository.findOne({
      where: {
        client: { phone_number: Like(`%${phone.split('@')[0]}%`) },
        status: In([RideStatus.PENDING, RideStatus.IN_PROGRESS, RideStatus.ON_THE_WAY])
      },
      relations: ['client', 'driver'],
      order: {
        created_at: 'DESC'
      }
    });
  }

  // ========== MÉTODOS CRUD PARA ADMINISTRACIÓN ==========

  async findAll(
    page: number = 1, 
    limit: number = 10, 
    status?: RideStatus[],
    search?: string,
    clientPhone?: string,
    driverId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<{ rides: Ride[], total: number, page: number, totalPages: number }> {
    try {
      const queryBuilder = this.ridesRepository.createQueryBuilder('ride')
        .leftJoinAndSelect('ride.client', 'client')
        .leftJoinAndSelect('ride.driver', 'driver');

      // Aplicar filtros
      if (status) {
        queryBuilder.andWhere('ride.status IN (:...status)', { status });
      } 
      
      // Filtrar cuentas demo pero incluir carreras sin conductor asignado
      queryBuilder.andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false });

      if (search) {
        queryBuilder.andWhere(
          new Brackets(qb => {
            qb.where('ride.tracking_code ILIKE :search', { search: `%${search}%` })
              .orWhere('ride.origin ILIKE :search', { search: `%${search}%` })
              .orWhere('ride.destination ILIKE :search', { search: `%${search}%` })
              .orWhere('CONCAT(client.first_name, \' \', client.last_name) ILIKE :search', { search: `%${search}%` })
              .orWhere('CONCAT(driver.first_name, \' \', driver.last_name) ILIKE :search', { search: `%${search}%` });
          })
        );
      }

      if (clientPhone) {
        queryBuilder.andWhere('client.phone_number ILIKE :phone', { 
          phone: `%${clientPhone}%` 
        });
      }

      if (driverId) {
        queryBuilder.andWhere('ride.driver_id = :driverId', { driverId });
      }

      if (startDate) {
        queryBuilder.andWhere('ride.request_date >= :startDate', { 
          startDate: new Date(startDate) 
        });
      }

      if (endDate) {
        queryBuilder.andWhere('ride.request_date <= :endDate', { 
          endDate: new Date(new Date(endDate).setHours(23, 59, 59, 999))
        });
      }

      // Contar total de registros
      const total = await queryBuilder.getCount();

      // Aplicar paginación y obtener resultados
      const rides = await queryBuilder
        .orderBy('ride.request_date', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Listando carreras: página ${page}/${totalPages}, total: ${total}`);

      return {
        rides,
        total,
        page,
        totalPages
      };
    } catch (error) {
      this.logger.error(`Error al listar carreras: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateData: any): Promise<Ride> {
    try {
      const ride = await this.findOne(id);

      // Actualizar solo los campos proporcionados
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== null) {
          ride[key] = updateData[key];
        }
      });

      const updatedRide = await this.ridesRepository.save(ride);
      
      this.logger.log(`Carrera ${id} actualizada exitosamente`);
      return updatedRide;
    } catch (error) {
      this.logger.error(`Error al actualizar carrera ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: number): Promise<{ success: boolean, message: string }> {
    try {
      const ride = await this.findOne(id);

      // Verificar que la carrera se pueda eliminar
      if (ride.status === RideStatus.IN_PROGRESS) {
        throw new BadRequestException('No se puede eliminar una carrera en progreso');
      }

      await this.ridesRepository.remove(ride);
      
      this.logger.log(`Carrera ${id} eliminada exitosamente`);
      return {
        success: true,
        message: 'Carrera eliminada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error al eliminar carrera ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async changeStatus(id: number, newStatus: RideStatus, reason?: string): Promise<Ride> {
    try {
      const ride = await this.findOne(id);

      // Validaciones de cambio de estado
      if (ride.status === newStatus) {
        throw new BadRequestException(`La carrera ya tiene el estado ${newStatus}`);
      }

      // Lógica de validación de transiciones de estado
      const validTransitions = {
        [RideStatus.PENDING]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
        [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED, RideStatus.CANCELLED],
        [RideStatus.ON_THE_WAY]: [RideStatus.COMPLETED, RideStatus.CANCELLED],
        [RideStatus.COMPLETED]: [], // No se puede cambiar desde completado
        [RideStatus.CANCELLED]: [] // No se puede cambiar desde cancelado
      };

      if (!validTransitions[ride.status].includes(newStatus)) {
        throw new BadRequestException(
          `No se puede cambiar de ${ride.status} a ${newStatus}`
        );
      }

      // Actualizar estado y fechas correspondientes
      ride.status = newStatus;
      
      if (newStatus === RideStatus.IN_PROGRESS && !ride.start_date) {
        ride.start_date = new Date();
      }
      
      if (newStatus === RideStatus.COMPLETED && !ride.end_date) {
        ride.end_date = new Date();
      }
      
      if (newStatus === RideStatus.CANCELLED && !ride.cancelled_at) {
        ride.cancelled_at = new Date();
      }

      // Si la carrera se cancela o completa y hay conductora asignado, cambiar su estado a 'available'
      if ((newStatus === RideStatus.CANCELLED || newStatus === RideStatus.COMPLETED) && ride.driver_id) {
        try {
          await this.driverRepository.update(ride.driver_id, {
            status: DriverStatus.AVAILABLE
          }); 

          this.logger.log(
            `Estado de la conductora ${ride.driver_id} cambiado a 'available' ` +
            `tras cambio de estado de carrera ${id} a ${newStatus}`
          );
        } catch (driverUpdateError) {
          // Log el error pero no fallar el cambio de estado
          this.logger.error(
            `Error al actualizar estado de la conductora ${ride.driver_id}: ${driverUpdateError.message}`,
            driverUpdateError.stack
          );
        }
      }

      const updatedRide = await this.ridesRepository.save(ride);

      // Borrar historial de chat del cliente cuando se complete o cancele la carrera
      if ((newStatus === RideStatus.CANCELLED || newStatus === RideStatus.COMPLETED) && 
          ride.client && ride.client.phone_number) {
        try {
          await this.chatHistoryService.clearClientChatHistory(ride.client.phone_number);
          this.logger.log(
            `Historial de chat borrado para cliente ${ride.client.phone_number} ` +
            `tras cambio de estado de carrera ${id} a ${newStatus}`
          );
        } catch (chatError) {
          // Log el error pero no fallar el cambio de estado
          this.logger.error(
            `Error al borrar historial de chat del cliente: ${chatError.message}`,
            chatError.stack
          );
        }
      }
      
      this.logger.log(
        `Estado de carrera ${id} cambiado a ${newStatus}` + 
        (reason ? ` - Razón: ${reason}` : '')
      );
      
      return updatedRide;
    } catch (error) {
      this.logger.error(`Error al cambiar estado de carrera ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async assignDriver(id: number, driverId: number, notes?: string): Promise<Ride> {
    try {
      const ride = await this.findOne(id);
      const driver = await this.driverRepository.findOne({ where: { id: driverId } });

      if (!driver) {
        throw new NotFoundException(`conductora con ID ${driverId} no encontrado`);
      }

      // Verificar que la carrera esté en estado válido para asignar conductora
      if (![RideStatus.PENDING, RideStatus.IN_PROGRESS].includes(ride.status)) {
        throw new BadRequestException(
          'Solo se puede asignar conductora a carreras pendientes o aceptadas'
        );
      }

      // Si es una reasignación, eliminar cualquier respuesta pendiente anterior
      await this.driverPendingResponseRepository.delete({
        ride_id: id
      });

      // Crear nueva solicitud pendiente para el conductora
      const driverPendingResponse = this.driverPendingResponseRepository.create({
        driver_id: driverId,
        ride_id: id
      });
      await this.driverPendingResponseRepository.save(driverPendingResponse);

      // Si la carrera estaba en progreso, volver a ponerla como pendiente
      if (ride.status === RideStatus.IN_PROGRESS) {
        ride.status = RideStatus.PENDING;
      }

      ride.driver_id = driverId;
      const updatedRide = await this.ridesRepository.save(ride);

      try {
        // Enviar notificación al conductora
      await this.whatsAppNotificationService.sendDriverAssignmentNotification(
        driver.phone_number,
        {
          origin: ride.origin,
          destination: ride.destination,
          client_name: ride.client?.first_name || 'Cliente',
          tracking_code: ride.tracking_code
        }
      );
      
      this.logger.log(
        `conductora ${driverId} asignado a carrera ${id}` + 
        (notes ? ` - Notas: ${notes}` : '')
      );
      } catch (error) {
        this.logger.error(`Error al enviar notificación al conductora ${driverId}: ${error.message}`, error.stack);
      }
      
      return updatedRide;
    } catch (error) {
      this.logger.error(`Error al asignar conductora a carrera ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStatistics(): Promise<any> {
    try {
      const totalRides = await this.ridesRepository.count();
      
      const statusCounts = await this.ridesRepository
        .createQueryBuilder('ride')
        .select('ride.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('ride.status')
        .getRawMany();

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayRides = await this.ridesRepository.count({
        where: {
          request_date: { 
            // @ts-ignore
            $gte: todayStart,
            $lte: todayEnd
          }
        }
      });

      const avgFare = await this.ridesRepository
        .createQueryBuilder('ride')
        .select('AVG(ride.price)', 'average')
        .where('ride.price IS NOT NULL')
        .getRawOne();

      return {
        total: totalRides,
        today: todayRides,
        statusBreakdown: statusCounts,
        averageFare: parseFloat(avgFare?.average || 0)
      };
    } catch (error) {
      this.logger.error(`Error al obtener estadísticas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async askForRide(askForRideDto: AskForRideDto): Promise<DriverPendingResponse> {
    const deltePreviousResponse = await this.driverPendingResponseRepository.delete({
      ride_id: askForRideDto.ride_id
    });

    if (deltePreviousResponse.affected > 0) {
      this.logger.log(`Respuesta anterior eliminada para la carrera ${askForRideDto.ride_id}`);
    }
    const driverPendingResponse = this.driverPendingResponseRepository.create({
      driver_id: askForRideDto.driver_id,
      ride_id: askForRideDto.ride_id
    });

    return this.driverPendingResponseRepository.save(driverPendingResponse);
  }

  async getPendingRides(): Promise<DriverPendingResponse[]> {
    return this.driverPendingResponseRepository.find();
  }

  async acceptRide(acceptRideDto: AcceptRideDto): Promise<Ride> {
    const driverPendingResponse = await this.driverPendingResponseRepository.findOne({
      where: {  driver_id: acceptRideDto.driver_id, ride_id: acceptRideDto.ride_id }
    });


    if (!driverPendingResponse) {
      throw new NotFoundException('Respuesta de conductora no encontrada');
    }

    const driver = await this.driverRepository.findOne({
      where: { id: acceptRideDto.driver_id }
    });

    if (!driver) {
      throw new NotFoundException('conductora no encontrado');
    }

    const ride = await this.ridesRepository.findOne({
      where: { id: acceptRideDto.ride_id },
    });

    if (!ride) {
      throw new NotFoundException('Carrera no encontrada');
    }

    ride.driver_id = acceptRideDto.driver_id;
    ride.status = RideStatus.IN_PROGRESS;

    await this.driverPendingResponseRepository.delete(driverPendingResponse.id);

    this.logger.log(`Carrera ${ride.id} aceptada por el conductora ${acceptRideDto.driver_id}`);

    const updatedRide = await this.ridesRepository.save(ride);

    await this.driverRepository.update(acceptRideDto.driver_id, {
      status: DriverStatus.ON_THE_WAY
    });
    const rideWithClient = await this.ridesRepository.findOne({
      where: { id: acceptRideDto.ride_id },
      relations: ['client', 'driver']
    });
    return rideWithClient;
  }

  async findRecent(
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    search?: string
  ): Promise<Ride[]> {
    const queryBuilder = this.ridesRepository.createQueryBuilder('ride')
      .leftJoinAndSelect('ride.client', 'client')
      .leftJoinAndSelect('ride.driver', 'driver');

    // Filtrar cuentas demo pero incluir carreras sin conductor asignado
    queryBuilder.andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false });
    
    // Aplicar filtros de fecha
    if (startDate) {
      queryBuilder.andWhere('ride.request_date >= :startDate', { 
        startDate: new Date(startDate) 
      });
    }

    if (endDate) {
      queryBuilder.andWhere('ride.request_date <= :endDate', { 
        endDate: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      });
    }

    // Aplicar búsqueda si se proporciona
    if (search) {
      queryBuilder.andWhere(
        '(ride.origin ILIKE :search OR ride.destination ILIKE :search OR ride.tracking_code ILIKE :search OR ' +
        'CONCAT(driver.first_name, \' \', driver.last_name) ILIKE :search OR ' +
        'CONCAT(client.first_name, \' \', client.last_name) ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    return queryBuilder
      .orderBy('ride.request_date', 'DESC')
      .take(limit)
      .getMany();
  }

  async findActive(): Promise<Ride[]> {
    try {
      return await this.ridesRepository.find({
        where: [
          { status: RideStatus.PENDING },
          { status: RideStatus.IN_PROGRESS },
          { status: RideStatus.ON_THE_WAY }
        ],
        relations: ['client', 'driver'],
        order: { request_date: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Error al obtener carreras activas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getRequestStats(period: string = 'today'): Promise<any> {
    try {
      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }

      const baseQueryBuilder = this.ridesRepository.createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.request_date >= :startDate AND ride.request_date <= :endDate', {
          startDate,
          endDate
        })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false });

      const totalRequests = await baseQueryBuilder.getCount();

      const completedRequests = await this.ridesRepository.createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.request_date >= :startDate AND ride.request_date <= :endDate', {
          startDate,
          endDate
        })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere('ride.status = :status', { status: RideStatus.COMPLETED })
        .getCount();

      const cancelledRequests = await this.ridesRepository.createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.request_date >= :startDate AND ride.request_date <= :endDate', {
          startDate,
          endDate
        })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere('ride.status = :status', { status: RideStatus.CANCELLED })
        .getCount();

      const pendingRequests = await this.ridesRepository.createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.request_date >= :startDate AND ride.request_date <= :endDate', {
          startDate,
          endDate
        })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere('ride.status IN (:...statuses)', { 
          statuses: [RideStatus.PENDING, RideStatus.IN_PROGRESS, RideStatus.ON_THE_WAY] 
        })
        .getCount();

      const revenueResult = await this.ridesRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .select('SUM(ride.price)', 'total')
        .addSelect('AVG(ride.price)', 'average')
        .addSelect('AVG(ride.distance)', 'avgDistance')
        .addSelect('AVG(ride.duration)', 'avgDuration')
        .where('ride.request_date >= :startDate AND ride.request_date <= :endDate', {
          startDate,
          endDate
        })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('ride.price IS NOT NULL')
        .getRawOne();

      const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
      const cancellationRate = totalRequests > 0 ? (cancelledRequests / totalRequests) * 100 : 0;

      return {
        totalRequests,
        completedRequests,
        cancelledRequests,
        pendingRequests,
        completionRate: Math.round(completionRate * 10) / 10,
        cancellationRate: Math.round(cancellationRate * 10) / 10,
        totalRevenue: parseFloat(revenueResult?.total || 0),
        averageFare: parseFloat(revenueResult?.average || 0),
        averageDistance: parseFloat(revenueResult?.avgDistance || 0),
        averageDuration: parseFloat(revenueResult?.avgDuration || 0)
      };
    } catch (error) {
      this.logger.error(`Error al obtener estadísticas de carreras: ${error.message}`, error.stack);
      throw error;
    }
  }
}