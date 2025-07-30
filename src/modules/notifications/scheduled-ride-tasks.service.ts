import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { ScheduledRide, ScheduledRideStatus } from '../../entities/scheduled-ride.entity';
import { Driver, DriverStatus } from '../../entities/driver.entity';
import { Ride, RideStatus } from '../../entities/ride.entity';
import { NotificationsService } from './notifications.service';
import { RidesService } from '../rides/rides.service';
import { TimezoneUtil } from './utils/timezone.util';

@Injectable()
export class ScheduledRideTasksService {
  private readonly logger = new Logger(ScheduledRideTasksService.name);

  constructor(
    @InjectRepository(ScheduledRide)
    private scheduledRidesRepository: Repository<ScheduledRide>,
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
    private notificationsService: NotificationsService,
    private ridesService: RidesService,
  ) {}

  /**
   * Tarea nocturna: Envía recordatorios a conductoras con viajes programados para mañana
   * Se ejecuta todos los días a las 22:00 (10:00 PM) en zona horaria de Kansas City
   */
  @Cron('0 22 * * *', {
    name: 'daily-reminders',
    timeZone: 'America/Chicago', // Kansas City timezone
  })
  async sendDailyReminders(): Promise<void> {
    try {
      const timezone = TimezoneUtil.getDefaultTimezone();
      this.logger.log(`🌙 Iniciando tarea nocturna: Envío de recordatorios diarios (${timezone})`);

      // Calcular el rango de fechas para "mañana" en la zona horaria local
      const { start: tomorrow, end: tomorrowEnd } = TimezoneUtil.getTomorrowStart(timezone);
      
      this.logger.log(`📅 Buscando viajes para: ${TimezoneUtil.formatLocal(tomorrow)} - ${TimezoneUtil.formatLocal(tomorrowEnd)}`);
      
      // Debug de fechas
      TimezoneUtil.debugDate(tomorrow, timezone);

      // Buscar viajes programados para mañana con conductora asignado
      const scheduledRides = await this.scheduledRidesRepository.find({
        where: {
          scheduled_at: Between(tomorrow, tomorrowEnd),
          status: In([ScheduledRideStatus.PENDING, ScheduledRideStatus.ASSIGNED]),
          driver_id: MoreThanOrEqual(1), // Solo viajes con conductora asignado
        },
        relations: ['driver'],
      });

      this.logger.log(`📋 Encontrados ${scheduledRides.length} viajes programados para mañana`);
      
      // Log detallado de cada viaje encontrado
      scheduledRides.forEach(ride => {
        const rideInfo = TimezoneUtil.dbDateToTimezoneInfo(ride.scheduled_at, timezone);
        this.logger.log(`  🚗 Viaje ${ride.id}: ${rideInfo.localString} (en ${rideInfo.timeUntil.hours}h ${rideInfo.timeUntil.minutes}m)`);
      });

      if (scheduledRides.length === 0) {
        this.logger.log('✅ No hay viajes programados para mañana. Tarea completada.');
        return;
      }

      // Enviar recordatorios a cada conductora
      let successCount = 0;
      let failureCount = 0;

      for (const scheduledRide of scheduledRides) {
        if (scheduledRide.driver) {
          try {
            const success = await this.notificationsService.sendDailyReminderToDriver(
              scheduledRide.driver,
              scheduledRide
            );

            if (success) {
              successCount++;
              this.logger.log(`✅ Recordatorio enviado al conductora ${scheduledRide.driver.id}`);
            } else {
              failureCount++;
              this.logger.warn(`❌ Fallo al enviar recordatorio al conductora ${scheduledRide.driver.id}`);
            }
          } catch (error) {
            failureCount++;
            this.logger.error(`❌ Error enviando recordatorio al conductora ${scheduledRide.driver.id}: ${error.message}`);
          }
        } else {
          this.logger.warn(`⚠️ Viaje programado ${scheduledRide.id} no tiene conductora asignado`);
        }
      }

      this.logger.log(
        `🌙 Tarea nocturna completada: ${successCount} éxitos, ${failureCount} fallos de ${scheduledRides.length} total`
      );
    } catch (error) {
      this.logger.error(`❌ Error en tarea nocturna de recordatorios: ${error.message}`, error.stack);
    }
  }

  /**
   * Tarea por minuto: Convierte scheduled_rides a rides cuando llega la hora
   * Se ejecuta cada minuto considerando la zona horaria de Kansas City
   */
  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'process-scheduled-rides',
  })
  async processScheduledRides(): Promise<void> {
    try {
      const timezone = TimezoneUtil.getDefaultTimezone();
      const now = TimezoneUtil.now(timezone);
      
      // Buscar viajes programados que deberían activarse ahora (con un margen de 1 minuto)
      const { start: timeWindow, end: currentTime } = TimezoneUtil.getTimeWindow(
        new Date(now.epochMilliseconds),
        1 // 1 minuto de ventana
      );

      const scheduledRides = await this.scheduledRidesRepository.find({
        where: {
          scheduled_at: Between(timeWindow, currentTime),
          status: In([ScheduledRideStatus.PENDING, ScheduledRideStatus.ASSIGNED]),
          driver_id: MoreThanOrEqual(1),
        },
        relations: ['driver', 'client'],
      });

      if (scheduledRides.length === 0) {
        // No logear si no hay viajes para evitar spam en logs
        return;
      }

      this.logger.log(`⏰ Procesando ${scheduledRides.length} viajes programados para activar (${TimezoneUtil.formatLocal(new Date(), {}, timezone)})`);
      
      // Log detallado de cada viaje a activar
      scheduledRides.forEach(ride => {
        const rideInfo = TimezoneUtil.dbDateToTimezoneInfo(ride.scheduled_at, timezone);
        this.logger.log(`  🚗 Activando viaje ${ride.id}: programado para ${rideInfo.localString}`);
      });

      for (const scheduledRide of scheduledRides) {
        try {
          await this.convertScheduledRideToRide(scheduledRide);
          this.logger.log(`✅ Viaje programado ${scheduledRide.id} convertido a ride exitosamente`);
        } catch (error) {
          this.logger.error(`❌ Error convirtiendo viaje programado ${scheduledRide.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error en tarea de procesamiento por minuto: ${error.message}`, error.stack);
    }
  }

  /**
   * Tarea cada 5 minutos: Envía notificaciones WebSocket 30 minutos antes del viaje
   * Considera la zona horaria de Kansas City
   */
  @Cron('*/5 * * * *', {
    name: 'upcoming-ride-notifications',
  })
  async sendUpcomingRideNotifications(): Promise<void> {
    try {
      const timezone = TimezoneUtil.getDefaultTimezone();
      const now = TimezoneUtil.now(timezone);
      // Buscar viajes que comenzarán en 30 minutos (con margen de ±2.5 minutos)
      const thirtyMinutesFromNow1Hour = now.add({ hours: 1 });
      const thirtyMinutesFromNow3Hours = now.add({ hours: 3 });
      const { start: startWindow, end: endWindow } = TimezoneUtil.getTimeWindow(
        new Date(thirtyMinutesFromNow1Hour.epochMilliseconds),
        2.5 // 2.5 minutos de margen
      );
      const { start: startWindow2, end: endWindow2 } = TimezoneUtil.getTimeWindow(
        new Date(thirtyMinutesFromNow3Hours.epochMilliseconds),
        2.5 // 2.5 minutos de margen
      );
  
      const upcomingRides = await this.scheduledRidesRepository.find({
        where: [{
          scheduled_at: Between(startWindow, endWindow),
          status: In([ScheduledRideStatus.PENDING, ScheduledRideStatus.ASSIGNED]),
          driver_id: MoreThanOrEqual(1),
        },{
          scheduled_at: Between(startWindow2, endWindow2),
          status: In([ScheduledRideStatus.PENDING, ScheduledRideStatus.ASSIGNED]),
          driver_id: MoreThanOrEqual(1),
        }],
        relations: ['driver'],
      });
  
      if (upcomingRides.length === 0) {
        return;
      }

      this.logger.log(`🔔 Enviando alertas para ${upcomingRides.length} viajes que comienzan en 30 minutos (${TimezoneUtil.formatLocal(new Date(), {}, timezone)})`);
      
      // Log detallado de cada viaje próximo
      upcomingRides.forEach(ride => {
        const rideInfo = TimezoneUtil.dbDateToTimezoneInfo(ride.scheduled_at, timezone);
        this.logger.log(`  🔔 Alerta para viaje ${ride.id}: ${rideInfo.localString} (en ${rideInfo.timeUntil.hours}h ${rideInfo.timeUntil.minutes}m)`);
      });

      for (const scheduledRide of upcomingRides) {
        if (scheduledRide.driver) {
          try {
            await this.notificationsService.sendUpcomingRideAlert(
              scheduledRide.driver,
              scheduledRide
            );
            this.logger.log(`🔔 Alerta enviada al conductora ${scheduledRide.driver.id} para viaje ${scheduledRide.id}`);
          } catch (error) {
            this.logger.error(`❌ Error enviando alerta al conductora ${scheduledRide.driver.id}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error en tarea de notificaciones próximas: ${error.message}`, error.stack);
    }
  }

  /**
   * Convierte un ScheduledRide a Ride y actualiza los estados correspondientes
   */
  private async convertScheduledRideToRide(scheduledRide: ScheduledRide): Promise<Ride> {
    try {

      // Crear nuevo ride basado en el scheduled_ride
      const newRide = this.ridesRepository.create({
        client_id: scheduledRide.client_id,
        driver_id: scheduledRide.driver_id,
        origin: scheduledRide.pickup_location,
        destination: scheduledRide.destination,
        origin_coordinates: scheduledRide.pickup_coordinates,
        destination_coordinates: scheduledRide.destination_coordinates,
        status: RideStatus.IN_PROGRESS,
        price: Number(scheduledRide.estimated_cost),
        distance: 0, // Se calculará después
        duration: Number(scheduledRide.estimated_duration) || 0,
        tracking_code: this.generateTrackingCode(),
        created_at: new Date(),
      });

      // Guardar el nuevo ride
      const savedRide = await this.ridesRepository.save(newRide);

      // Actualizar el scheduled_ride con el ride_id y cambiar estado
      await this.scheduledRidesRepository.update(scheduledRide.id, {
        ride_id: savedRide.id,
        status: ScheduledRideStatus.COMPLETED, // Marcar como completado el proceso de programación
      });

      // Actualizar estado de la conductora a "on_the_way"
      if (scheduledRide.driver_id) {
        await this.driversRepository.update(scheduledRide.driver_id, {
          status: DriverStatus.ON_THE_WAY,
        });
      }

      // Enviar notificación al conductora
      if (scheduledRide.driver) {
        await this.notificationsService.sendRideActivatedNotification(
          scheduledRide.driver,
          savedRide
        );
      }

      this.logger.log(
        `🚗 Viaje programado ${scheduledRide.id} convertido a ride ${savedRide.id} exitosamente`
      );

      return savedRide;
    } catch (error) {
      this.logger.error(
        `❌ Error convirtiendo viaje programado ${scheduledRide.id} a ride: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Genera un código de tracking único para el ride
   */
  private generateTrackingCode(): string {
    const prefix = 'SR'; // Scheduled Ride
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Método para testing: Ejecutar manualmente la tarea nocturna
   */
  async runDailyRemindersManually(): Promise<void> {
    this.logger.log('🧪 Ejecutando tarea nocturna manualmente para testing');
    await this.sendDailyReminders();
  }

  /**
   * Método para testing: Ejecutar manualmente el procesamiento de viajes
   */
  async runProcessScheduledRidesManually(): Promise<void> {
    this.logger.log('🧪 Ejecutando procesamiento de viajes manualmente para testing');
    await this.processScheduledRides();
  }
} 