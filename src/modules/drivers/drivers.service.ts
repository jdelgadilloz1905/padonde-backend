import { Injectable, ConflictException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, Between, MoreThanOrEqual, Not, In } from 'typeorm';
import { Driver, DriverStatus } from '../../entities/driver.entity';
import { Ride } from '../../entities/ride.entity';
import { Incident } from '../../entities/incident.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateDriverDocumentsDto } from './dto/update-driver-documents.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { ReportIncidentDto } from './dto/report-incident.dto';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { DailyMetricsResponseDto } from './dto/daily-metrics-response.dto';
import { DailyMetrics, MonthlyMetrics } from './dto/driver-metrics.dto';
import * as bcrypt from 'bcrypt';
import { TwilioService } from '../twilio/twilio.service';
import { RideStatus } from '../../entities/ride.entity';
import { WhatsAppNotificationService } from '../rides/whatsapp-notification.service';
import { IncidentStatus } from '../incidents/dto/update-incident.dto';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { ScheduledRide, ScheduledRideStatus } from 'src/entities/scheduled-ride.entity';
import { RideHistoryQueryDto, DateRangeEnum, SortByEnum, SortOrderEnum } from './dto/ride-history-query.dto';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
    @InjectRepository(Incident)
    private incidentsRepository: Repository<Incident>,
    @InjectRepository(ScheduledRide)
    private scheduledRidesRepository: Repository<ScheduledRide>,
    private twilioService: TwilioService,
    private whatsAppNotificationService: WhatsAppNotificationService,
    private chatHistoryService: ChatHistoryService,
  ) {}

  async create(createDriverDto: CreateDriverDto): Promise<Driver> {
    try {
      // Verificar si ya existe un conductora con el mismo teléfono
      const existingDriverByPhone = await this.driversRepository.findOne({
        where: { 
          phone_number: createDriverDto.phone_number,
          is_demo_account: false
        }
      });

      if (existingDriverByPhone) {
        throw new ConflictException('Ya existe un conductora con este número de teléfono');
      }

      // Verificar si ya existe un conductora con el mismo email (si se proporciona)
      if (createDriverDto.email) {
        const existingDriverByEmail = await this.driversRepository.findOne({
          where: { 
            email: createDriverDto.email,
            is_demo_account: false
          }
        });

        if (existingDriverByEmail) {
          throw new ConflictException('Ya existe un conductora con este correo electrónico');
        }
      }

      // Verificar si ya existe un conductora con la misma placa
      const existingDriverByPlate = await this.driversRepository.findOne({
        where: { 
          license_plate: createDriverDto.license_plate,
          is_demo_account: false
        }
      });

      if (existingDriverByPlate) {
        throw new ConflictException('Ya existe un conductora con esta placa de vehículo');
      }
      // Crear nuevo conductora
      const newDriver = this.driversRepository.create({
        ...createDriverDto,
        verified: false,
        active: true, 
        status: DriverStatus.OFFLINE,
        registration_date: new Date(),
      });

      const savedDriver = await this.driversRepository.save(newDriver);
      
      this.logger.log(`Nuevo conductora registrado con ID: ${savedDriver.id}`);
      
      // Enviar mensaje de bienvenida automáticamente
      try {
        await this.whatsAppNotificationService.sendWelcomeMessageToDriver(
          savedDriver.phone_number,
          {
            firstName: savedDriver.first_name,
            lastName: savedDriver.last_name,
            licencePlate: savedDriver.license_plate,
            vehicle: savedDriver.vehicle
          }
        );
        this.logger.log(`Mensaje de bienvenida enviado al conductora ${savedDriver.phone_number}`);
      } catch (welcomeError) {
        // Log el error pero no fallar el registro de la conductora
        this.logger.error(
          `Error al enviar mensaje de bienvenida al conductora ${savedDriver.id}: ${welcomeError.message}`,
          welcomeError.stack,
          welcomeError.message
        );
      }
      
      return savedDriver;
    } catch (error) {
      this.logger.error(`Error al crear conductora: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(queryParams: QueryDriversDto = {}): Promise<{ data: Driver[], total: number, page: number, limit: number, totalPages: number }> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        sort_by = 'id', 
        sort_order = 'DESC',
        status,
        search,
        verified,
        active
      } = queryParams;
      
      // Configuración de paginación
      const skip = (page - 1) * limit;
      
      // Construir whereConditions para los filtros
      const whereConditions: any = {
          is_demo_account: false,
      };
      
      if (status) {
        whereConditions.status = status;
      }
      
      if (verified !== undefined) {
        whereConditions.verified = verified;
      }
      
      if (active !== undefined) {
        whereConditions.active = active;
      }
      
      // Si hay un término de búsqueda, buscar en nombre y apellido
      let searchCondition = {};
      if (search) {
        searchCondition = [
          { first_name: ILike(`%${search}%`), is_demo_account: false },
          { last_name: ILike(`%${search}%`), is_demo_account: false },
          { phone_number: ILike(`%${search}%`), is_demo_account: false }
        ];
      }
      
    

      // Ejecutar la consulta con paginación, ordenación y filtros
      const [data, total] = await this.driversRepository.findAndCount({
        where: search ? searchCondition : whereConditions,
        order:{
          registration_date: 'DESC',
          first_name: 'ASC',
          last_name: 'ASC',
        },
        skip,
        take: limit
      });
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.logger.error(`Error al obtener conductoras: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAllActive(queryParams: QueryDriversDto = {}): Promise<{ data: Driver[], total: number, page: number, limit: number, totalPages: number }> {
    // Asegurar que solo se devuelvan conductoras activos
    const newQueryParams = { 
      ...queryParams
    };
    
    try {
      const { 
        page = 1, 
        limit = 10, 
        sort_by = 'id', 
        sort_order = 'ASC',
        search,
      } = newQueryParams;
      
      // Configuración de paginación
      const skip = (page - 1) * limit;
      
      // Construir whereConditions para los filtros - EXCLUIR CUENTAS DEMO
      const whereConditions: any = { 
        active: true, 
        status: 'available', 
        verified: true,
        is_demo_account: false  // Excluir cuentas demo
      };
      
      // Si hay un término de búsqueda, buscar en nombre y apellido
      let searchConditions = [];
      if (search) {
        searchConditions = [
          { first_name: ILike(`%${search}%`), active: true, is_demo_account: false },
          { last_name: ILike(`%${search}%`), active: true, is_demo_account: false },
          { phone_number: ILike(`%${search}%`), active: true, is_demo_account: false }
        ];
      }
      
      // Configuración de ordenamiento
      const order: any = {};
      order[sort_by] = sort_order;

      // Ejecutar la consulta con paginación, ordenación y filtros
      const [data, total] = await this.driversRepository.findAndCount({
        where: search ? searchConditions : whereConditions,
        order,
        skip,
        take: limit
      });
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.logger.error(`Error al obtener conductoras activos: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<Driver> {
    const driver = await this.driversRepository.findOne({ where: { id } });
    if (!driver) {
      throw new NotFoundException(`conductora con ID ${id} no encontrado`);
    }
    
    return {
      ...driver,
      session_token: undefined,
      otp_code: undefined,
      verified: undefined,
      otp_expiry: undefined,
    };
  }

  /**
   * Buscar conductora por número de teléfono
   */
  async findByPhone(phone: string): Promise<Driver> {
    const driver = await this.driversRepository.findOne({
      relations: ['rides','pending_rides'],
      where: { 
        phone_number: Like(`%${phone.split('@')[0]}%`),
        is_demo_account: false
      } 
    });
    
    if (!driver) {
      throw new NotFoundException(`No se encontró conductora con número ${phone}`);
    }
    
    return {
      ...driver,
      session_token: null,
      otp_code: null,
      otp_expiry: null,
      rides: driver.rides,
      pending_rides: driver.pending_rides,
    };
  }

  /**
   * Obtener estadísticas de rides demo para validación Apple TestFlight
   */
  async getDemoRideStats(driverId: number): Promise<any> {
    try {
      const ridesStats = await this.ridesRepository
        .createQueryBuilder('ride')
        .select([
          'COUNT(*) as total_rides',
          'COUNT(CASE WHEN ride.status = :completed THEN 1 END) as completed_rides',
          'COUNT(CASE WHEN ride.status = :inProgress THEN 1 END) as active_rides',
          'COALESCE(SUM(CASE WHEN ride.status = :completed THEN ride.price ELSE 0 END), 0) as total_earnings'
        ])
        .where('ride.driver_id = :driverId', { driverId })
        .setParameters({ 
          completed: RideStatus.COMPLETED,
          inProgress: RideStatus.IN_PROGRESS
        })
        .getRawOne();

      return {
        total_rides: parseInt(ridesStats.total_rides) || 0,
        completed_rides: parseInt(ridesStats.completed_rides) || 0,
        active_rides: parseInt(ridesStats.active_rides) || 0,
        total_earnings: parseFloat(ridesStats.total_earnings) || 0
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas demo: ${error.message}`, error.stack);
      return {
        total_rides: 0,
        completed_rides: 0,
        active_rides: 0,
        total_earnings: 0
      };
    }
  }

  async update(id: number, updateDriverDto: UpdateDriverDto): Promise<Driver> {
    try {
      // Verificar si el conductora existe
      const driver = await this.findOne(id);
      
      // Verificar si se está actualizando el teléfono y si ya existe
      if (updateDriverDto.phone_number && updateDriverDto.phone_number !== driver.phone_number) {
        const existingDriverByPhone = await this.driversRepository.findOne({
          where: { 
            phone_number: Like(`%${updateDriverDto.phone_number.split('@')[0]}%`),
            is_demo_account: false
          }
        });

        if (existingDriverByPhone) {
          throw new ConflictException('Ya existe un conductora con este número de teléfono');
        }
      }

      // Verificar si se está actualizando el email y si ya existe
      if (updateDriverDto.email && updateDriverDto.email !== driver.email) {
        const existingDriverByEmail = await this.driversRepository.findOne({
          where: { 
            email: updateDriverDto.email,
            is_demo_account: false
          }
        });

        if (existingDriverByEmail) {
          throw new ConflictException('Ya existe un conductora con este correo electrónico');
        }
      }

      // Verificar si se está actualizando la placa y si ya existe
      if (updateDriverDto.license_plate && updateDriverDto.license_plate !== driver.license_plate) {
        const existingDriverByPlate = await this.driversRepository.findOne({
          where: { 
            license_plate: updateDriverDto.license_plate,
            is_demo_account: false
          }
        });

        if (existingDriverByPlate) {
          throw new ConflictException('Ya existe un conductora con esta placa de vehículo');
        }
      }

      // Actualizar conductora
      await this.driversRepository.update(id, { ...updateDriverDto, status: updateDriverDto.status as DriverStatus }  );
      
      // Obtener conductora actualizado
      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error al actualizar conductora ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const driver = await this.findOne(id);
    
    // No eliminamos realmente, solo desactivamos
    await this.driversRepository.update(id, { active: false });
    
    this.logger.log(`conductora con ID ${id} desactivado`);
  }

  async reactivateDriver(id: number): Promise<Driver> {
    const driver = await this.driversRepository.findOne({ where: { id } });
    
    if (!driver) {
      throw new NotFoundException(`conductora con ID ${id} no encontrado`);
    }
    
    if (driver.active) {
      throw new BadRequestException('Este conductora ya está activo');
    }
    
    await this.driversRepository.update(id, { active: true });
    
    this.logger.log(`conductora con ID ${id} reactivado`);
    
    return this.findOne(id);
  }

  async verifyDriver(id: number): Promise<Driver> {
    const driver = await this.findOne(id);
    
    if (driver.verified) {
      throw new BadRequestException('Este conductora ya está verificado');
    }
    
    await this.driversRepository.update(id, { verified: true });
    
    this.logger.log(`conductora con ID ${id} verificado`);
    
    return this.findOne(id);
  }

  async updateDriverStatus(id: number, status: DriverStatus): Promise<Driver> {
    const driver = await this.findOne(id);
    
    await this.driversRepository.update(id, { status });
    
    this.logger.log(`Estado de la conductora con ID ${id} actualizado a ${status}`);
    
    return this.findOne(id);
  }

  async toggleDriverActive(id: number, active: boolean): Promise<Driver> {
    const driver = await this.findOne(id);
    
    // Si se está desactivando el conductora, cambiar su estado a offline
    const updateData: Partial<Driver> = { active };
    if (!active) {
      updateData.status = DriverStatus.OFFLINE;
    }
    
    await this.driversRepository.update(id, updateData);
    
    this.logger.log(`Campo active de la conductora con ID ${id} actualizado a ${active}${!active ? ' y estado cambiado a offline' : ''}`);
    
    return this.findOne(id);
  }

  async updateDocuments(id: number, documentsDto: UpdateDriverDocumentsDto): Promise<Driver> {
    const driver = await this.findOne(id);
    if(!driver) {
      throw new NotFoundException(`conductora con ID ${id} no encontrado`);
    }

    await this.driversRepository.update(id, documentsDto);
    
    this.logger.log(`Documentos de la conductora con ID ${id} actualizados`);
    
    return this.findOne(id);
  }

  async updateProfilePicture(id: number, profilePictureDto: UpdateProfilePictureDto): Promise<Driver> {
    const driver = await this.findOne(id);
    
    await this.driversRepository.update(id, { profile_picture: profilePictureDto.profile_picture,
      profile_picture_url: profilePictureDto.profile_picture,
      profile_picture_s3_key: `drivers/${profilePictureDto.profile_picture.split('/drivers/').pop()}`
     });
    
    this.logger.log(`Foto de perfil de la conductora con ID ${id} actualizada`);
    
    return this.findOne(id);
  }

  async reportIncident(driverId: number, reportDto: ReportIncidentDto): Promise<Incident> {
    // Verificar si el conductora existe
    const driver = await this.findOne(driverId);
    
    // Verificar si existe la carrera (si se proporciona ID de carrera)
    if (reportDto.ride_id) {
      const rideId = parseInt(reportDto.ride_id, 10);
      const ride = await this.ridesRepository.findOne({
        where: { id: rideId }
      });
      
      if (!ride) {
        throw new NotFoundException(`Carrera con ID ${reportDto.ride_id} no encontrada`);
      }
    }
    
    // Crear nuevo incidente
    const newIncident = this.incidentsRepository.create({
      driver_id: driverId,
      ride_id: reportDto.ride_id ? parseInt(reportDto.ride_id, 10) : null,
      incident_type: reportDto.incident_type,
      title: reportDto.title,
      description: reportDto.description,
      status: IncidentStatus.OPEN,
    });
    
    const savedIncident = await this.incidentsRepository.save(newIncident);
    
    this.logger.log(`Nuevo incidente reportado con ID: ${savedIncident.id} por el conductora con ID: ${driverId}`);
    
    return savedIncident;
  }

  async getDriverStatistics(id: number, today = false): Promise<any> {
    const driver = await this.findOne(id);
    
    // Obtener estadísticas de viajes
    const totalRides = await this.ridesRepository.count({
      where: { driver_id: id, ...(today ? { request_date: MoreThanOrEqual(new Date(new Date().setHours(0, 0, 0, 0))) } : {}) }
    });
    
    const completedRides = await this.ridesRepository.count({
      where: { driver_id: id, status: RideStatus.COMPLETED, ...(today ? { request_date: MoreThanOrEqual(new Date(new Date().setHours(0, 0, 0, 0))) } : {}) }
    });
    
    const cancelledRides = await this.ridesRepository.count({
      where: { driver_id: id, status: RideStatus.CANCELLED, ...(today ? { request_date: MoreThanOrEqual(new Date(new Date().setHours(0, 0, 0, 0))) } : {}) }
    });
    
    // Calcular ingresos totales
    const ridesWithEarnings = await this.ridesRepository.find({
      where: { driver_id: id, status: RideStatus.COMPLETED, ...(today ? { request_date: MoreThanOrEqual(new Date(new Date().setHours(0, 0, 0, 0))) } : {}) },
      select: ['price', 'commission_amount']
    });
    
    const totalEarnings = ridesWithEarnings.reduce((sum, ride) => {
      const ridePrice = parseFloat(ride.price?.toString() || '0');
      const commission = parseFloat(ride.commission_amount?.toString() || '0');
      return sum + (ridePrice - commission);
    }, 0);
    
    return {
      total_rides: totalRides,
      completed_rides: completedRides,
      cancelled_rides: cancelledRides,
      completion_rate: totalRides > 0 ? (completedRides / totalRides) * 100 : 0,
      total_earnings: totalEarnings,
      average_rating: driver.average_rating
    };
  }

  async loginDriver(driver: any): Promise<any> {
    try {
      // Generar un token de sesión único para el conductora
      const sessionToken = await bcrypt.hash(driver.id + new Date().getTime().toString(), 10);
      
      // Actualizar el token de sesión y última actualización
      await this.driversRepository.update(
        { id: driver.id },
        { 
          session_token: sessionToken,
          last_update: new Date()
        }
      );
      
      return {
        access_token: sessionToken,
        driver: {
          id: driver.id,
          first_name: driver.first_name,
          last_name: driver.last_name,
          phone_number: driver.phone_number,
          email: driver.email,
          verified: driver.verified
        }
      };
    } catch (error) {
      this.logger.error(`Error en inicio de sesión de la conductora: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validateDriverToken(token: string): Promise<any> {
    try {
      const driver = await this.driversRepository.findOne({ 
        where: { 
          session_token: token,
          active: true
        } 
      });
      
      if (!driver) {
        return null;
      }
      
      return {
        id: driver.id,
        first_name: driver.first_name,
        last_name: driver.last_name,
        phone_number: driver.phone_number,
        email: driver.email,
        verified: driver.verified,
        status: driver.status,
        profile_picture: driver.profile_picture,
        registration_date: driver.registration_date,
        average_rating: driver.average_rating
      };
    } catch (error) {
      this.logger.error(`Error al validar token de conductora: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Método para generar un código OTP aleatorio de 6 dígitos
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Método para solicitar código OTP
  async requestOtp(phoneNumber: string, platform?: string, appHash?: string): Promise<boolean> {
    try {
      // 🎭 BYPASS DEMO PARA APPLE TESTFLIGHT
      if (phoneNumber === '+15550123' || phoneNumber === '15550123' || phoneNumber.includes('555-0123')) {
        this.logger.log('🎭 DEMO USER: Bypassing SMS for Apple TestFlight review');
        
        // Buscar conductora demo
        const demoDriver = await this.driversRepository.findOne({ 
          where: { 
            phone_number: '+15550123',
            is_demo_account: true,
            active: true
          } 
        });
        
        if (!demoDriver) {
          this.logger.error('🎭 DEMO USER: Demo driver not found in database');
          throw new NotFoundException('conductora demo no encontrado. Por favor contacte soporte.');
        }
        
        // Establecer código OTP fijo para demo (123456)
        const demoOtpExpiry = new Date();
        demoOtpExpiry.setMinutes(demoOtpExpiry.getMinutes() + 60); // 1 hora para demo
        
        await this.driversRepository.update(
          { id: demoDriver.id },
          {
            otp_code: '123456', // Código fijo para demo
            otp_expiry: demoOtpExpiry
          }
        );
        
        this.logger.log(`🎭 DEMO USER: Demo OTP set successfully for driver ID: ${demoDriver.id}`);
        return true;
      }

      // Buscar si el conductora existe (usuarios reales)
      const driver = await this.driversRepository.findOne({ 
        where: { 
          phone_number: Like(`%${phoneNumber.split('@')[0]}%`),
          active: true,
          is_demo_account: false
        } 
      });
      
      if (!driver) {
        this.logger.warn(`Intento de inicio de sesión fallido: conductora no encontrado - ${phoneNumber}`);
        throw new NotFoundException('No se encontró un conductora activo con este número de teléfono');
      }
      
      // Generar código OTP
      const otpCode = this.generateOtpCode();
      
      // Establecer la fecha de expiración (10 minutos a partir de ahora)
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
      
      // Guardar código OTP y su fecha de expiración
      await this.driversRepository.update(
        { id: driver.id },
        {
          otp_code: otpCode,
          otp_expiry: otpExpiry
        }
      );
      
      // Enviar el código OTP por SMS (Twilio)
      const smsAttempt = await this.twilioService.sendOtp(`+${phoneNumber}`, otpCode, platform, appHash);
      
      if (smsAttempt) {
        this.logger.log(`Código OTP enviado por SMS al conductora con ID: ${driver.id}`);
        return true;
      }
      
      // Si SMS falló, intentar enviar por WhatsApp como fallback
      this.logger.warn(`SMS falló para conductora ${driver.id}, intentando WhatsApp como fallback`);
      
      const whatsappAttempt = await this.whatsAppNotificationService.sendOtpViaWhatsApp(
        `+${phoneNumber}`, 
        otpCode,
        platform,
        appHash
      );
      
      if (whatsappAttempt) {
        this.logger.log(`Código OTP enviado por WhatsApp (fallback) al conductora con ID: ${driver.id}`);
        return true;
      }
      
      // Si ambos métodos fallaron
      this.logger.error(`Error crítico: No se pudo enviar OTP al conductora ${driver.id} ni por SMS ni por WhatsApp`);
      throw new BadRequestException('No se pudo enviar el código OTP. Por favor intente más tarde o contacte soporte.');
    } catch (error) {
      this.logger.error(`Error al solicitar OTP: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Método para validar el código OTP
  async verifyOtp(phoneNumber: string, otpCode: string): Promise<any> {
    try {
      // 🎭 BYPASS DEMO PARA APPLE TESTFLIGHT
      if (phoneNumber === '+15550123' || phoneNumber === '15550123' || phoneNumber.includes('555-0123')) {
        this.logger.log('🎭 DEMO USER: Validating demo OTP for Apple TestFlight');
        
        // Aceptar cualquier código de 6 dígitos o específicamente 123456
        if (otpCode === '123456' || (otpCode.length === 6 && /^\d{6}$/.test(otpCode))) {
          
          // Buscar conductora demo
          const demoDriver = await this.driversRepository.findOne({ 
            where: { 
              phone_number: '+15550123',
              is_demo_account: true,
              active: true
            } 
          });
          
          if (!demoDriver) {
            this.logger.error('🎭 DEMO USER: Demo driver not found during verification');
            throw new NotFoundException('conductora demo no encontrado');
          }
          
          // Generar token de sesión para demo
          const demoSessionToken = await bcrypt.hash(demoDriver.id + 'demo' + new Date().getTime().toString(), 10);
          
          // Actualizar token de sesión demo
          await this.driversRepository.update(
            { id: demoDriver.id },
            {
              session_token: demoSessionToken,
              last_update: new Date(),
              otp_code: null,
              otp_expiry: null
            }
          );
          
          this.logger.log(`🎭 DEMO USER: Demo login successful for driver ID: ${demoDriver.id}`);
          
          return {
            id: demoDriver.id,
            first_name: demoDriver.first_name,
            last_name: demoDriver.last_name,
            phone_number: demoDriver.phone_number,
            email: demoDriver.email,
            verified: demoDriver.verified,
            status: demoDriver.status,
            profile_picture: demoDriver.profile_picture,
            registration_date: demoDriver.registration_date,
            average_rating: demoDriver.average_rating,
            session_token: demoSessionToken,
            is_demo: true // 🎭 Flag importante para el frontend
          };
        } else {
          this.logger.warn('🎭 DEMO USER: Invalid demo OTP code provided');
          throw new BadRequestException('Código OTP demo inválido. Use 123456 o cualquier código de 6 dígitos.');
        }
      }

      // Validación normal para usuarios reales
      const driver = await this.driversRepository.findOne({ 
        where: { 
          phone_number:  Like(`%${phoneNumber.split('@')[0]}%`),
          active: true,
          is_demo_account: false
        } 
      });
      
      if (!driver) {
        this.logger.warn(`Verificación OTP fallida: conductora no encontrado - ${phoneNumber}`);
        throw new NotFoundException('No se encontró un conductora activo con este número de teléfono');
      }
      
      // Verificar que el código OTP exista y no haya expirado
      const now = new Date();
      if (!driver.otp_code || !driver.otp_expiry || driver.otp_expiry < now) {
        this.logger.warn(`Verificación OTP fallida: código expirado o no existente - ${phoneNumber}`);
        throw new BadRequestException('Código OTP expirado o no válido');
      }
      
      // Verificar que el código coincida
      if (driver.otp_code !== otpCode) {
        this.logger.warn(`Verificación OTP fallida: código incorrecto - ${phoneNumber}`);
        throw new BadRequestException('Código OTP incorrecto');
      }
      
      // Limpiar el código OTP una vez validado
      await this.driversRepository.update(
        { id: driver.id },
        {
          otp_code: null,
          otp_expiry: null
        }
      );
      
      // Generar un token de sesión único para el conductora
      const sessionToken = await bcrypt.hash(driver.id + new Date().getTime().toString(), 10);
      
      // Actualizar el token de sesión y última actualización
      await this.driversRepository.update(
        { id: driver.id },
        {
          session_token: sessionToken,
          last_update: new Date()
        }
      );
      
      this.logger.log(`conductora con ID ${driver.id} autenticado exitosamente con OTP`);
      
      return {
        id: driver.id,
        first_name: driver.first_name,
        last_name: driver.last_name,
        phone_number: driver.phone_number,
        email: driver.email,
        verified: driver.verified,
        status: driver.status,
        profile_picture: driver.profile_picture,
        registration_date: driver.registration_date,
        average_rating: driver.average_rating,
        session_token: sessionToken
      };
    } catch (error) {
      this.logger.error(`Error al verificar OTP: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCompletedRides(id: number): Promise<Ride[]> {
    return this.ridesRepository.find({
      where: { driver_id: id, status: RideStatus.COMPLETED }
    });
  }

  async getCancelledRides(id: number): Promise<Ride[]> {
    return this.ridesRepository.find({
      where: { driver_id: id, status: RideStatus.CANCELLED }
    });
  }

  async getRideHistory(id: number): Promise<Ride[]> {
    return this.ridesRepository.find({
      where: { driver_id: id, status: RideStatus.COMPLETED },
      order: { end_date: 'DESC' }
    });
  }

  async getCurrentRide(id: number): Promise<Ride | null> {
    try {
      const currentRide = await this.ridesRepository.findOne({
        where: { 
          driver_id: id, 
          status: In([RideStatus.IN_PROGRESS, RideStatus.ON_THE_WAY]) 
        },
        relations: ['client'],
        order: { request_date: 'DESC' }
      });

      this.logger.log(`Consultando carrera activa para conductora ${id}: ${currentRide ? `Carrera ${currentRide.id}` : 'Sin carrera activa'}`);
      
      return currentRide;
    } catch (error) {
      this.logger.error(`Error al obtener carrera activa de la conductora ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async startTrip(driverId: number): Promise<Ride> {
    try {
      // Buscar carrera activa de la conductora en estado IN_PROGRESS
      const currentRide = await this.ridesRepository.findOne({
        where: { 
          driver_id: driverId, 
          status: RideStatus.IN_PROGRESS 
        },
        relations: ['client']
      });

      if (!currentRide) {
        throw new NotFoundException('No se encontró una carrera en progreso para este conductora');
      }

      // Cambiar estado a ON_THE_WAY
      currentRide.status = RideStatus.ON_THE_WAY;
      if (!currentRide.start_date) {
        currentRide.start_date = new Date();
      }

      const updatedRide = await this.ridesRepository.save(currentRide);
      
      // Actualizar estado de la conductora a 'on_the_way'
      await this.driversRepository.update(driverId, { status: DriverStatus.ON_THE_WAY });

      this.logger.log(`conductora ${driverId} inició viaje para carrera ${currentRide.id}`);
      
      return updatedRide;
    } catch (error) {
      this.logger.error(`Error al iniciar viaje de la conductora ${driverId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async completeTrip(driverId: number): Promise<Ride> {
    try {
      // Buscar carrera activa de la conductora en estado ON_THE_WAY con relaciones completas
      const currentRide = await this.ridesRepository.findOne({
        where: { 
          driver_id: driverId, 
          status: RideStatus.ON_THE_WAY 
        },
        relations: ['client', 'driver']
      });

      if (!currentRide) {
        throw new NotFoundException('No se encontró una carrera en camino para este conductora');
      }

      // Cambiar estado a COMPLETED
      currentRide.status = RideStatus.COMPLETED;
      currentRide.end_date = new Date();

      const updatedRide = await this.ridesRepository.save(currentRide);
      
      // Actualizar estado de la conductora a 'available'
      await this.driversRepository.update(driverId, { status: DriverStatus.AVAILABLE });

      // Enviar mensaje de WhatsApp al cliente con la factura del viaje
      if (currentRide.client && currentRide.client.phone_number && currentRide.driver) {
        try {
          await this.whatsAppNotificationService.sendTripCompletionMessageToClient(
            currentRide.client.phone_number,
            {
              trackingCode: currentRide.tracking_code,
              origin: currentRide.origin,
              destination: currentRide.destination,
              price: Number(currentRide.price) || 0,
              distance: currentRide.distance ? Number(currentRide.distance) : undefined,
              duration: currentRide.duration ? Number(currentRide.duration) : undefined,
              driverName: `${currentRide.driver.first_name} ${currentRide.driver.last_name}`,
              driverVehicle: `${currentRide.driver.vehicle} ${currentRide.driver.model || ''}`.trim(),
              driverPlate: currentRide.driver.license_plate,
              completionDate: currentRide.end_date
            }
          );

          this.logger.log(
            `Mensaje de viaje completado enviado al cliente ${currentRide.client.phone_number} ` +
            `para la carrera ${currentRide.tracking_code}`
          );
        } catch (notificationError) {
          // Log el error pero no fallar la finalización del viaje
          this.logger.error(
            `Error al enviar mensaje de viaje completado al cliente: ${notificationError.message}`,
            notificationError.message
          );
        }
      }

      // Borrar historial de chat del cliente cuando se complete la carrera
      if (currentRide.client && currentRide.client.phone_number) {
        try {
          await this.chatHistoryService.clearClientChatHistory(currentRide.client.phone_number);
          this.logger.log(
            `Historial de chat borrado para cliente ${currentRide.client.phone_number} ` +
            `tras completar carrera ${currentRide.tracking_code}`
          );
        } catch (chatError) {
          // Log el error pero no fallar la finalización del viaje
          this.logger.error(
            `Error al borrar historial de chat del cliente: ${chatError.message}`,
            chatError.stack
          );
        }
      }

      this.logger.log(`conductora ${driverId} completó carrera ${currentRide.id}`);
      
      return updatedRide;
    } catch (error) {
      this.logger.error(`Error al completar viaje de la conductora ${driverId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPublicTrackingInfo(trackingCode: string): Promise<any> {
    try {
      const ride = await this.ridesRepository.findOne({
        where: { tracking_code: trackingCode },
        relations: ['client', 'driver']
      });

      if (!ride) {
        throw new NotFoundException('Código de seguimiento no válido');
      }

      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      // Verificar si la carrera está en estados activos
      const activeStates = [RideStatus.PENDING, RideStatus.IN_PROGRESS, RideStatus.ON_THE_WAY];
      const isActive = activeStates.includes(ride.status);

      // Verificar si es una carrera completada/cancelada hace menos de 12 horas
      const isRecentlyFinished = (ride.status === RideStatus.COMPLETED || ride.status === RideStatus.CANCELLED) && 
                                 ((ride.end_date && ride.end_date > twelveHoursAgo) || 
                                  (ride.cancelled_at && ride.cancelled_at > twelveHoursAgo));

      if (!isActive && !isRecentlyFinished) {
        throw new NotFoundException('La información de seguimiento ya no está disponible');
      }

      // Obtener ubicación actual de la conductora si está disponible
      let driverLocation = null;
      if (ride.driver && isActive) {
        try {
          const driver = await this.driversRepository.findOne({
            where: { id: ride.driver_id },
            select: ['current_location', 'last_update']
          });

          if (driver && driver.current_location) {
            // Extraer coordenadas de la ubicación de la conductora
            if (typeof driver.current_location === 'string') {
              const pointMatch = driver.current_location.match(/POINT\(([^ ]+) ([^)]+)\)/);
              if (pointMatch) {
                driverLocation = {
                  longitude: parseFloat(pointMatch[1]),
                  latitude: parseFloat(pointMatch[2]),
                  last_update: driver.last_update
                };
              }
            } else if (typeof driver.current_location === 'object' && (driver.current_location as any).coordinates) {
              const coords = (driver.current_location as any).coordinates;
              driverLocation = {
                longitude: coords[0],
                latitude: coords[1],
                last_update: driver.last_update
              };
            }
          }
        } catch (locationError) {
          this.logger.warn(`Error al obtener ubicación de la conductora ${ride.driver_id}: ${locationError.message}`);
        }
      }

      this.logger.log(`Información de seguimiento solicitada para carrera ${ride.id} con código ${trackingCode}`);

      return {
        success: true,
        ride: {
          id: ride.id,
          tracking_code: ride.tracking_code,
          origin: ride.origin,
          destination: ride.destination,
          origin_coordinates: ride.origin_coordinates,
          destination_coordinates: ride.destination_coordinates,
          status: ride.status,
          price: ride.price,
          distance: ride.distance,
          duration: ride.duration,
          request_date: ride.request_date,
          start_date: ride.start_date,
          end_date: ride.end_date,
          client: {
            first_name: ride.client?.first_name || 'Cliente',
            phone_number: ride.client?.phone_number?.substring(0, 3) + '****' + ride.client?.phone_number?.substring(7) || 'N/A'
          }
        },
        driver: ride.driver ? {
          id: ride.driver.id,
          first_name: ride.driver.first_name,
          last_name: ride.driver.last_name,
          vehicle: ride.driver.vehicle,
          model: ride.driver.model,
          color: ride.driver.color,
          license_plate: ride.driver.license_plate,
          phone_number: ride.driver.phone_number?.substring(0, 3) + '****' + ride.driver.phone_number?.substring(7) || 'N/A',
          current_location: driverLocation,
          average_rating: ride.driver.average_rating,
          profile_image: ride.driver.profile_picture_url
        } : null,
        is_active: isActive,
        last_updated: now
      };
    } catch (error) {
      this.logger.error(`Error al obtener información de seguimiento para código ${trackingCode}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDailyMetrics(driverId: number): Promise<DailyMetricsResponseDto> {
    try {
      // Verificar que el conductora existe
      const driver = await this.findOne(driverId);
      
      const now = new Date();
      
      // Rangos de fechas
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Carreras completadas hoy
      const todayRides = await this.ridesRepository.find({
        where: {
          driver_id: driverId,
          status: RideStatus.COMPLETED,
          end_date: Between(startOfDay, endOfDay)
        }
      });

      // Carreras completadas este mes
      const monthRides = await this.ridesRepository.find({
        where: {
          driver_id: driverId,
          status: RideStatus.COMPLETED,
          end_date: Between(startOfMonth, endOfMonth)
        }
      });

      // Cálculos diarios
      const dailyEarnings = todayRides.reduce((total, ride) => total + (ride.price || 0), 0);
      const averageRideValue = todayRides.length > 0 ? dailyEarnings / todayRides.length : 0;

      // Cálculos mensuales
      const totalEarnings = monthRides.reduce((total, ride) => total + (ride.price || 0), 0);
      const averagePerRide = monthRides.length > 0 ? totalEarnings / monthRides.length : 0;

      // Estimación de horas online (simplificada por ahora)
      // TODO: Implementar cálculo real basado en ubicaciones/sesiones
      const onlineHours = todayRides.length * 1.5; // Aproximación: 1.5 horas por carrera
      const totalHours = monthRides.length * 1.5;

      // Bonus del mes (ejemplo: 2% de ganancias si completa más de 100 carreras)
      const monthlyBonus = monthRides.length > 100 ? totalEarnings * 0.02 : 0;

      const dailyMetrics: DailyMetrics = {
        completedRides: todayRides.length,
        dailyEarnings: Number(dailyEarnings.toFixed(2)),
        averageRideValue: Number(averageRideValue.toFixed(2)),
        onlineHours: Number(onlineHours.toFixed(1))
      };

      const monthlyMetrics: MonthlyMetrics = {
        completedRides: monthRides.length,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        averagePerRide: Number(averagePerRide.toFixed(2)),
        totalHours: Number(totalHours.toFixed(1)),
        monthlyBonus: Number(monthlyBonus.toFixed(2))
      };

      const response: DailyMetricsResponseDto = {
        today: dailyMetrics,
        thisMonth: monthlyMetrics,
        timestamp: now,
        driverId: driverId
      };

      this.logger.log(`Métricas calculadas para conductora ${driverId}: ${todayRides.length} carreras hoy, ${monthRides.length} este mes`);
      
      return response;
    } catch (error) {
      this.logger.error(`Error al calcular métricas de la conductora ${driverId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async testTripCompletionNotification(
    clientPhone: string,
    rideInfo: {
      trackingCode: string;
      origin: string;
      destination: string;
      price: number;
      distance?: number;
      duration?: number;
      driverName: string;
      driverVehicle: string;
      driverPlate: string;
    }
  ): Promise<boolean> {
    try {
      return await this.whatsAppNotificationService.sendTripCompletionMessageToClient(
        clientPhone,
        {
          ...rideInfo,
          price: Number(rideInfo.price) || 0,
          distance: rideInfo.distance ? Number(rideInfo.distance) : undefined,
          duration: rideInfo.duration ? Number(rideInfo.duration) : undefined,
          completionDate: new Date()
        }
      );
    } catch (error) {
      this.logger.error(`Error al enviar notificación de prueba: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Obtiene el historial completo de rides de un conductora + carreras programadas futuras
   */
  async getDriverRideHistory(driverId: number, query?: RideHistoryQueryDto) {
    try {
      const driver = await this.findOne(driverId);
      if (!driver) {
        throw new NotFoundException(`conductora con ID ${driverId} no encontrado`);
      }

      // Construir el query base para rides
      const ridesQuery = this.ridesRepository.createQueryBuilder('ride')
        .leftJoinAndSelect('ride.client', 'client')
        .addSelect('ST_AsText(ride.origin_coordinates)', 'origin_coordinates_text')
        .addSelect('ST_AsText(ride.destination_coordinates)', 'destination_coordinates_text')
        .where('ride.driver_id = :driverId', { driverId });

      // Aplicar filtros de fecha
      if (query?.dateRange) {
        const now = new Date();
        switch (query.dateRange) {
          case DateRangeEnum.TODAY:
            ridesQuery.andWhere('DATE(ride.request_date) = DATE(:now)', { now });
            break;
          case DateRangeEnum.WEEK:
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            ridesQuery.andWhere('ride.request_date >= :weekAgo', { weekAgo });
            break;
          case DateRangeEnum.MONTH:
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            ridesQuery.andWhere('ride.request_date >= :monthAgo', { monthAgo });
            break;
        }
      }

      // Aplicar filtros de monto
      if (query?.minAmount) {
        ridesQuery.andWhere('ride.price >= :minAmount', { minAmount: query.minAmount });
      }
      if (query?.maxAmount) {
        ridesQuery.andWhere('ride.price <= :maxAmount', { maxAmount: query.maxAmount });
      }

      // Aplicar ordenamiento
      const sortField = query?.sortBy || SortByEnum.DATE;
      const sortOrder = (query?.sortOrder || SortOrderEnum.DESC).toUpperCase() as 'ASC' | 'DESC';
      
      switch (sortField) {
        case SortByEnum.DATE:
          ridesQuery.orderBy('ride.request_date', sortOrder);
          break;
        case SortByEnum.AMOUNT:
          ridesQuery.orderBy('ride.price', sortOrder);
          break;
        case SortByEnum.DISTANCE:
          ridesQuery.orderBy('ride.distance', sortOrder);
          break;
      }

      // Aplicar paginación
      const page = query?.page || 1;
      const limit = query?.limit || 10;
      const skip = (page - 1) * limit;

      ridesQuery
        .skip(skip)
        .take(limit);

      // Obtener el total de registros y los rides paginados
      const [result, total] = await ridesQuery.getManyAndCount();

      // ========== OBTENER CARRERAS PROGRAMADAS FUTURAS ==========
      const now = new Date();
      const scheduledRidesResult = await this.scheduledRidesRepository
        .createQueryBuilder('scheduledRide')
        .leftJoinAndSelect('scheduledRide.client', 'client')
        .addSelect('ST_AsText(scheduledRide.pickup_coordinates)', 'pickup_coordinates_text')
        .addSelect('ST_AsText(scheduledRide.destination_coordinates)', 'destination_coordinates_text')
        .where('scheduledRide.driver_id = :driverId', { driverId })
        .andWhere('scheduledRide.scheduled_at > :now', { now })
        .andWhere('scheduledRide.status NOT IN (:...excludedStatuses)', { 
          excludedStatuses: ['completed', 'cancelled'] 
        })
        .orderBy('scheduledRide.scheduled_at', 'ASC')
        .getRawAndEntities();

      const scheduledRides = scheduledRidesResult.entities;
      const scheduledRawData = scheduledRidesResult.raw;

      // ========== FORMATEAR RIDES HISTÓRICAS ==========
      const formattedRides = result.map((ride, index) => ({
        id: ride.id,
        type: 'completed',
        origin: ride.origin,
        destination: ride.destination,
        origin_coordinates: result[index]?.origin_coordinates || null,
        destination_coordinates: result[index]?.destination_coordinates || null,
        status: ride.status,
        price: ride.price ? parseFloat(ride.price.toString()) : null,
        commission_percentage: ride.commission_percentage ? parseFloat(ride.commission_percentage.toString()) : null,
        commission_amount: ride.commission_amount ? parseFloat(ride.commission_amount.toString()) : null,
        duration: ride.duration,
        distance: ride.distance ? parseFloat(ride.distance.toString()) : null,
        request_date: ride.request_date,
        start_date: ride.start_date,
        end_date: ride.end_date,
        payment_method: ride.payment_method,
        client_rating: ride.client_rating,
        driver_rating: ride.driver_rating,
        cancelled_by: ride.canceled_by,
        cancellation_reason: ride.cancellation_reason,
        tracking_code: ride.tracking_code,
        client: ride.client ? {
          id: ride.client.id,
          first_name: ride.client.first_name,
          last_name: ride.client.last_name,
          phone_number: ride.client.phone_number
        } : null
      }));

      // ========== FORMATEAR CARRERAS PROGRAMADAS ==========
      const formattedScheduledRides = scheduledRides.map((scheduledRide, index) => ({
        id: scheduledRide.id,
        type: 'scheduled',
        origin: scheduledRide.pickup_location,
        destination: scheduledRide.destination,
        origin_coordinates: scheduledRawData[index]?.pickup_coordinates_text || null,
        destination_coordinates: scheduledRawData[index]?.destination_coordinates_text || null,
        status: scheduledRide.status,
        estimated_cost: scheduledRide.estimated_cost ? parseFloat(scheduledRide.estimated_cost.toString()) : null,
        estimated_duration: scheduledRide.estimated_duration ? parseFloat(scheduledRide.estimated_duration.toString()) : null,
        scheduled_at: scheduledRide.scheduled_at,
        priority: scheduledRide.priority,
        notes: scheduledRide.notes,
        created_at: scheduledRide.created_at,
        client: scheduledRide.client ? {
          id: scheduledRide.client.id,
          first_name: scheduledRide.client.first_name,
          last_name: scheduledRide.client.last_name,
          phone_number: scheduledRide.client.phone_number
        } : {
          id: null,
          first_name: scheduledRide.client_name?.split(' ')[0] || 'Cliente',
          last_name: scheduledRide.client_name?.split(' ').slice(1).join(' ') || '',
          phone_number: scheduledRide.client_phone
        }
      }));

      // Calcular totales
      const totalEarned = formattedRides
        .filter(ride => ride.price !== null)
        .reduce((sum, ride) => sum + parseFloat(ride.price.toString()), 0);

      const totalCommission = formattedRides
        .filter(ride => ride.commission_amount !== null)
        .reduce((sum, ride) => sum + parseFloat(ride.commission_amount.toString()), 0);

      this.logger.log(
        `Historial completo obtenido para conductora ${driverId}: ` +
        `${total} carreras completadas, ${scheduledRides.length} carreras programadas`
      );

      return {
        driver: {
          id: driver.id,
          first_name: driver.first_name,
          last_name: driver.last_name,
          phone_number: driver.phone_number,
          license_plate: driver.license_plate
        },
        rides: formattedRides,
        scheduled_rides: formattedScheduledRides,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        },
        total_rides: total,
        total_earned: parseFloat(totalEarned.toFixed(2)),
        total_commission: parseFloat(totalCommission.toFixed(2)),
        upcoming_rides: scheduledRides.length
      };
    } catch (error) {
      this.logger.error(`Error al obtener historial completo de la conductora ${driverId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAvailableForSchedule(dateTime: string, lat?: number, lng?: number): Promise<Driver[]> {
    const requestedTime = new Date(dateTime);
    if (isNaN(requestedTime.getTime())) {
      throw new BadRequestException('Invalid date format.');
    }

    // Define a time window for checking conflicts (e.g., 1 hour before and after)
    const conflictWindowStart = new Date(requestedTime.getTime() - 60 * 60 * 1000);
    const conflictWindowEnd = new Date(requestedTime.getTime() + 60 * 60 * 1000);

    // Find drivers who have conflicting scheduled rides
    const conflictingRides = await this.scheduledRidesRepository.find({
      where: {
        scheduled_at: Between(conflictWindowStart, conflictWindowEnd),
        status: Not(In([ScheduledRideStatus.CANCELLED, ScheduledRideStatus.COMPLETED])),
      },
      select: ['driver_id'],
    });

    const busyDriverIds = conflictingRides
      .map(ride => ride.driver_id)
      .filter(id => id != null);

    // Find all active and verified drivers who are not in the busy list
    const queryBuilder = this.driversRepository.createQueryBuilder('driver')
      .where('driver.active = :active', { active: true })
      .andWhere('driver.verified = :verified', { verified: true })
      .andWhere('driver.is_demo_account = :isDemoAccount', { isDemoAccount: false });
    
    if (busyDriverIds.length > 0) {
      queryBuilder.andWhere('driver.id NOT IN (:...busyDriverIds)', { busyDriverIds });
    }

    const availableDrivers = await queryBuilder.getMany();

    if (lat && lng) {
      // Calculate distance for each driver and sort by it
      const driversWithDistance = availableDrivers.map(driver => {
        const driverLocation = driver.current_location as any; // Assuming 'POINT(lon lat)'
        if (driverLocation && driverLocation.coordinates) {
          const [driverLng, driverLat] = driverLocation.coordinates;
          const distance = this.calculateHaversineDistance(lat, lng, driverLat, driverLng);
          return { ...driver, distance };
        }
        return { ...driver, distance: Infinity }; // Drivers with no location are last
      });
      
      return driversWithDistance.sort((a, b) => a.distance - b.distance);
    }

    return availableDrivers;
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}