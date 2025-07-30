import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, MoreThan, In } from 'typeorm';
import { ScheduledRide, ScheduledRideStatus } from 'src/entities/scheduled-ride.entity';
import { CreateScheduledRideDto } from './dto/create-scheduled-ride.dto';
import { Client } from 'src/entities/client.entity';
import { User } from 'src/entities/user.entity';
import { RecurringRide, RecurringType } from 'src/entities/recurring-ride.entity';
import { RidesService } from '../rides/rides.service';
import { FareService } from '../rides/fare.service';
import { QueryScheduledRidesDto } from './dto/query-scheduled-rides.dto';
import { UpdateScheduledRideDto } from './dto/update-scheduled-ride.dto';
import { Driver } from 'src/entities/driver.entity';
import { AssignDriverToScheduledRideDto } from './dto/assign-driver-to-scheduled-ride.dto';
import { WhatsAppNotificationService } from '../rides/whatsapp-notification.service';

@Injectable()
export class ScheduledRidesService {
  private readonly logger = new Logger(ScheduledRidesService.name);

  constructor(
    @InjectRepository(ScheduledRide)
    private scheduledRidesRepository: Repository<ScheduledRide>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(RecurringRide)
    private recurringRidesRepository: Repository<RecurringRide>,
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
    private ridesService: RidesService,
    private fareService: FareService,
    private whatsAppNotificationService: WhatsAppNotificationService,
  ) {}

  /**
   * Cleans phone number by removing all non-numeric characters except the leading +
   */
  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all Unicode control characters and formatting characters
    let cleaned = phone.replace(/[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/g, '');
    
    // Remove all non-numeric characters except + at the beginning
    cleaned = cleaned.replace(/[^\d+]/g, '');
    
    // Ensure only one + at the beginning
    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.substring(1).replace(/\+/g, '');
    } else {
      cleaned = cleaned.replace(/\+/g, '');
    }
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Método para extraer las coordenadas de una cadena WKT Point
   */
  private extractCoordsFromWKT(wktPoint: string): { longitude: number, latitude: number } {
    try {
      // Ejemplo de formato: POINT(-99.12345 19.43215)
      const coordsString = wktPoint.replace('POINT(', '').replace(')', '');
      const [lon, lat] = coordsString.split(' ').map(Number);
      
      return { longitude: lon, latitude: lat };
    } catch (error) {
      this.logger.error(`Error al extraer coordenadas de WKT: ${error.message}`, error.stack);
      throw new BadRequestException('Formato de coordenadas inválido');
    }
  }

  /**
   * Método para convertir WKT a GeoJSON
   */
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

  /**
   * Método para convertir coordenadas de DTO a GeoJSON
   */
  private coordinatesToGeoJSON(lng: number, lat: number): any {
    return {
      type: 'Point',
      coordinates: [lng, lat]
    };
  }

  /**
   * Formatea un número para asegurar que tenga máximo 2 decimales
   * @param value Número a formatear
   * @returns Número formateado con máximo 2 decimales
   */
  private formatDecimalValue(value: number): number {
    return Number(value.toFixed(2));
  }

  async create(createScheduledRideDto: CreateScheduledRideDto, user: User): Promise<ScheduledRide> {
    this.logger.log(`Creating a new scheduled ride for client phone: ${createScheduledRideDto.client_phone}`);

    // Clean the phone number
    const cleanedPhone = this.cleanPhoneNumber(createScheduledRideDto.client_phone);
    this.logger.log(`Cleaned phone number: ${cleanedPhone}`);

    let client: Client;
    if (createScheduledRideDto.client_id) {
      client = await this.clientsRepository.findOne({ where: { id: createScheduledRideDto.client_id }});
      if (!client) {
        throw new NotFoundException(`Client with ID ${createScheduledRideDto.client_id} not found.`);
      }
    } else {
      client = await this.clientsRepository.findOne({ where: { phone_number: cleanedPhone }});
      if (!client) {
        client = this.clientsRepository.create({
          phone_number: cleanedPhone,
          first_name: createScheduledRideDto.client_name,
          last_name: '', // Assuming last name is not provided in this flow
          active: true,
        });
        await this.clientsRepository.save(client);
        this.logger.log(`Created new client with ID ${client.id}`);
      }
    }

    const { pickup_coordinates, destination_coordinates, driver_id, recurring, recurrent_price } = createScheduledRideDto;
    
    const { distance, duration } = await this.ridesService.calculateDistanceAndDuration(
      pickup_coordinates.lng,
      pickup_coordinates.lat,
      destination_coordinates.lng,
      destination_coordinates.lat,
    );

    const fare = await this.fareService.calculateFareWithPriorities(
      client.id,
      `POINT(${pickup_coordinates.lng} ${pickup_coordinates.lat})`,
      duration
    );

    let recurringRide: RecurringRide | null = null;
    if (recurring) {
      recurringRide = await this.createRecurringRide(recurring, user.id);
    }

    const newScheduledRide = this.scheduledRidesRepository.create({
      ...createScheduledRideDto,
      client_id: client.id, 
      driver_id: driver_id,
      client_name: client.first_name,
      client_phone: cleanedPhone,
      pickup_coordinates: this.coordinatesToGeoJSON(pickup_coordinates.lng, pickup_coordinates.lat),
      destination_coordinates: this.coordinatesToGeoJSON(destination_coordinates.lng, destination_coordinates.lat),
      estimated_duration: this.formatDecimalValue(duration),
      estimated_cost: this.formatDecimalValue(fare.finalFare),
      created_by_id: user.id,
      status: ScheduledRideStatus.PENDING,
      recurring_ride_id: recurringRide?.id || null,
      recurrent_price: recurrent_price ? this.formatDecimalValue(recurrent_price) : null,
    });

    const savedRide = await this.scheduledRidesRepository.save(newScheduledRide);

    // Generate additional rides for recurring pattern
    if (recurringRide) {
      await this.generateRecurringRides(savedRide, recurringRide, createScheduledRideDto);
    }

    return savedRide;
  }

  /**
   * Creates a recurring ride pattern
   */
  private async createRecurringRide(recurring: any, userId: number): Promise<RecurringRide> {
    const recurringRide = this.recurringRidesRepository.create({
      type: recurring.type as RecurringType,
      start_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      end_date: recurring.end_date ? new Date(recurring.end_date).toISOString().split('T')[0] : null,
      days_of_week: recurring.days_of_week || [],
    });

    return await this.recurringRidesRepository.save(recurringRide);
  }

  /**
   * Generates additional scheduled rides based on recurring pattern
   */
  private async generateRecurringRides(
    originalRide: ScheduledRide,
    recurringRide: RecurringRide,
    createDto: CreateScheduledRideDto
  ): Promise<void> {
    const startDate = new Date(originalRide.scheduled_at);
    const endDate = recurringRide.end_date ? new Date(recurringRide.end_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year if no end date
    
    const ridesToCreate: Partial<ScheduledRide>[] = [];

    if (recurringRide.type === RecurringType.WEEKLY && recurringRide.days_of_week?.length > 0) {
      let currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + 1); // Start from next day

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (recurringRide.days_of_week.includes(dayOfWeek)) {
          const scheduledAt = new Date(currentDate);
          scheduledAt.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds());

          ridesToCreate.push({
            ...createDto,
            client_id: originalRide.client_id,
            driver_id: originalRide.driver_id,
            client_name: originalRide.client_name,
            client_phone: originalRide.client_phone,
            pickup_coordinates: originalRide.pickup_coordinates,
            destination_coordinates: originalRide.destination_coordinates,
            scheduled_at: scheduledAt,
            estimated_duration: this.formatDecimalValue(originalRide.estimated_duration),
            estimated_cost: this.formatDecimalValue(originalRide.estimated_cost),
            created_by_id: originalRide.created_by_id,
            status: ScheduledRideStatus.PENDING,
            recurring_ride_id: recurringRide.id,
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Guardar los viajes recurrentes en lotes de 50 para evitar sobrecarga
    const batchSize = 50;
    for (let i = 0; i < ridesToCreate.length; i += batchSize) {
      const batch = ridesToCreate.slice(i, i + batchSize);
      await this.scheduledRidesRepository.save(batch);
    }
  }

  async findAll(queryParams: QueryScheduledRidesDto): Promise<{ data: any[], total: number }> {
    const { page = 1, limit = 10, status, driver_id, client_id, start_date, end_date, search } = queryParams;

    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (driver_id) {
      where.driver_id = driver_id;
    }
    if (client_id) {
      where.client_id = client_id;
    }
    if (start_date && end_date) {
      where.scheduled_at = Between(new Date(start_date), new Date(end_date));
    }

    const queryBuilder = this.scheduledRidesRepository.createQueryBuilder('scheduled_ride')
      .leftJoinAndSelect('scheduled_ride.client', 'client')
      .leftJoinAndSelect('scheduled_ride.driver', 'driver')
      .leftJoin('scheduled_ride.created_by', 'user')
      .addSelect(['user.id', 'user.first_name', 'user.last_name', 'user.email', 'user.role'])
      .where(where);

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(scheduled_ride.client_name) LIKE LOWER(:search) OR scheduled_ride.client_phone LIKE :search OR LOWER(scheduled_ride.pickup_location) LIKE LOWER(:search) OR LOWER(scheduled_ride.destination) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    const [rawData, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('scheduled_ride.scheduled_at', 'DESC')
      .getManyAndCount();

    // Transformar la data para incluir el nombre de la conductora y filtrar datos sensibles
    const data = rawData.map(ride => ({
      ...ride,
      driver_name: ride.driver ? `${ride.driver.first_name} ${ride.driver.last_name}` : null,
      driver_phone: ride.driver ? ride.driver.phone_number : null,
      created_by: ride.created_by ? {
        id: ride.created_by.id,
        first_name: ride.created_by.first_name,
        last_name: ride.created_by.last_name,
        email: ride.created_by.email,
        role: ride.created_by.role
      } : null
    }));

    return { data, total };
  }

  private async findOneInternal(id: number): Promise<ScheduledRide> {
    const ride = await this.scheduledRidesRepository.findOne({
      where: { id },
      relations: ['client', 'driver', 'created_by'],
    });
    if (!ride) {
      throw new NotFoundException(`Scheduled ride with ID ${id} not found.`);
    }
    return ride;
  }

  async findOne(id: number): Promise<any> {
    const ride = await this.findOneInternal(id);

    // Transformar la data para incluir el nombre de la conductora y filtrar datos sensibles
    return {
      ...ride,
      driver_name: ride.driver ? `${ride.driver.first_name} ${ride.driver.last_name}` : null,
      driver_phone: ride.driver ? ride.driver.phone_number : null,
      created_by: ride.created_by ? {
        id: ride.created_by.id,
        first_name: ride.created_by.first_name,
        last_name: ride.created_by.last_name,
        email: ride.created_by.email,
        role: ride.created_by.role
      } : null
    };
  }

  async update(id: number, updateScheduledRideDto: UpdateScheduledRideDto): Promise<any> {
    delete updateScheduledRideDto.recurring;
    // Make sure ride exists
    await this.findOneInternal(id);
    
    const { pickup_coordinates, destination_coordinates, ...restOfDto } = updateScheduledRideDto;

    const updatePayload: any = { ...restOfDto };

    if (pickup_coordinates) {
      updatePayload.pickup_coordinates = this.coordinatesToGeoJSON(pickup_coordinates.lng, pickup_coordinates.lat);
    }

    if (destination_coordinates) {
      updatePayload.destination_coordinates = this.coordinatesToGeoJSON(destination_coordinates.lng, destination_coordinates.lat);
    }

    await this.scheduledRidesRepository.update(id, updatePayload);

    return this.findOne(id);
  }

    async delete(id: number): Promise<{ message: string }> {
      await this.scheduledRidesRepository.delete(id);
    return { message: `Scheduled ride with ID ${id} has been deleted.` };
  }

  async getForDate(date: string): Promise<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rides = await this.scheduledRidesRepository.find({
      where: {
        scheduled_at: Between(startOfDay, endOfDay),
        status: Not(ScheduledRideStatus.CANCELLED),
      },
      relations: ['client', 'driver'],
      order: {
        scheduled_at: 'ASC',
      },
    });

    // Transformar la data para incluir el nombre de la conductora
    return rides.map(ride => ({
      ...ride,
      driver_name: ride.driver ? `${ride.driver.first_name} ${ride.driver.last_name}` : null,
      driver_phone: ride.driver ? ride.driver.phone_number : null,
    }));
  }

  async getForMonth(year: number, month: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const rides = await this.scheduledRidesRepository.find({
      where: {
        scheduled_at: Between(startDate, endDate),
        status: Not(ScheduledRideStatus.CANCELLED),
      },
      select: ['id', 'scheduled_at', 'status', 'priority'],
    });

    // Group rides by day
    const ridesByDay = rides.reduce((acc, ride) => {
      const day = ride.scheduled_at.getDate();
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push({
        id: ride.id,
        status: ride.status,
        priority: ride.priority,
        time: ride.scheduled_at.toTimeString().substring(0, 5),
      });
      return acc;
    }, {});

    return ridesByDay;
  }

  async getForWeek(date: string): Promise<any[]> {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const rides = await this.scheduledRidesRepository.find({
      where: {
        scheduled_at: Between(weekStart, weekEnd),
        status: Not(ScheduledRideStatus.CANCELLED),
      },
      relations: ['client', 'driver'],
      order: {
        scheduled_at: 'ASC',
      },
    });

    // Transformar la data para incluir el nombre de la conductora
    return rides.map(ride => ({
      ...ride,
      driver_name: ride.driver ? `${ride.driver.first_name} ${ride.driver.last_name}` : null,
      driver_phone: ride.driver ? ride.driver.phone_number : null,
    }));
  }

  async assignDriver(id: number, assignDriverDto: AssignDriverToScheduledRideDto): Promise<any> {
    const ride = await this.findOneInternal(id);
    if (ride.status === ScheduledRideStatus.CANCELLED || ride.status === ScheduledRideStatus.COMPLETED) {
      throw new BadRequestException(`Cannot assign driver to a ride that is ${ride.status}.`);
    }

    const driver = await this.driversRepository.findOne({ where: { id: assignDriverDto.driver_id }});
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${assignDriverDto.driver_id} not found.`);
    }

    ride.driver_id = driver.id;
    ride.driver = driver;
    ride.status = ScheduledRideStatus.ASSIGNED;

    await this.scheduledRidesRepository.save(ride);
    return this.findOne(id);
  }

  async unassignDriver(id: number): Promise<any> {
    const ride = await this.findOneInternal(id);
    if (!ride.driver_id) {
      throw new BadRequestException('This ride does not have an assigned driver.');
    }
    if (ride.status === ScheduledRideStatus.CANCELLED || ride.status === ScheduledRideStatus.COMPLETED) {
      throw new BadRequestException(`Cannot unassign driver from a ride that is ${ride.status}.`);
    }

    ride.driver_id = null;
    ride.driver = null;
    ride.status = ScheduledRideStatus.CONFIRMED; // Or PENDING, depending on business logic. Confirmed seems reasonable.

    await this.scheduledRidesRepository.save(ride);
    return this.findOne(id);
  }

  async findUpcoming(limit: number = 10): Promise<any[]> {
    const rides = await this.scheduledRidesRepository.find({
      where: {
        scheduled_at: MoreThan(new Date()),
        status: Not(In([ScheduledRideStatus.CANCELLED, ScheduledRideStatus.COMPLETED])),
      },
      order: {
        scheduled_at: 'ASC',
      },
      take: limit,
      relations: ['client', 'driver'],
    });

    // Transformar la data para incluir el nombre de la conductora
    return rides.map(ride => ({
      ...ride,
      driver_name: ride.driver ? `${ride.driver.first_name} ${ride.driver.last_name}` : null,
      driver_phone: ride.driver ? ride.driver.phone_number : null,
    }));
  }

  async sendNotification(id: number): Promise<{ message: string }> {
    const ride = await this.findOneInternal(id);
    if (!ride) {
      throw new NotFoundException(`Scheduled ride with ID ${id} not found.`);
    }

    if (!ride.client_phone) {
      throw new BadRequestException(`Ride ${id} does not have a client phone number.`);
    }

    const message = `Recordatorio de su viaje programado: de ${ride.pickup_location} a ${ride.destination} a las ${ride.scheduled_at.toLocaleTimeString()}.`;

    // This is a generic test message sending. The WhatsApp service has more specific methods.
    // I'll use the test message method for now.
    await this.whatsAppNotificationService.sendTestMessage(ride.client_phone, message);

    return { message: `Notification sent for scheduled ride ${id}.`};
  }
} 