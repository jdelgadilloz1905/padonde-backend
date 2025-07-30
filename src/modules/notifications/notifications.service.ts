import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledRide } from '../../entities/scheduled-ride.entity';
import { Driver } from '../../entities/driver.entity';
import { Ride } from '../../entities/ride.entity';
import { TwilioService } from '../twilio/twilio.service';
import { WhatsAppNotificationService } from '../rides/whatsapp-notification.service';
import { TimezoneUtil } from './utils/timezone.util';

export interface NotificationMessage {
  title: string;
  body: string;
  scheduledRideId?: number;
  rideId?: number;
  timestamp: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(ScheduledRide)
    private scheduledRidesRepository: Repository<ScheduledRide>,
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
    private twilioService: TwilioService,
    private whatsAppNotificationService: WhatsAppNotificationService,
  ) {}

  /**
   * Envía recordatorio a conductora sobre viaje programado para mañana
   */
  async sendDailyReminderToDriver(driver: Driver, scheduledRide: ScheduledRide): Promise<boolean> {
    try {
      const timezone = TimezoneUtil.getDefaultTimezone();
      const rideInfo = TimezoneUtil.dbDateToTimezoneInfo(scheduledRide.scheduled_at, timezone);
      const timeString = TimezoneUtil.formatLocal(scheduledRide.scheduled_at, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }, timezone);

             const message = `🚗 *Recordatorio Taxi Rosa*\n\n` +
         `Hola ${driver.first_name}! 👋\n\n` +
         `Tienes un viaje programado para mañana:\n\n` +
         `⏰ *Hora:* ${timeString} (Kansas City)\n` +
         `📍 *Origen:* ${scheduledRide.pickup_location}\n` +
         `🎯 *Destino:* ${scheduledRide.destination}\n` +
         `👤 *Cliente:* ${scheduledRide.client_name}\n` +
         `🕐 *En:* ${rideInfo.timeUntil.hours}h ${rideInfo.timeUntil.minutes}m\n\n` +
         `¡No olvides estar listo! 🚀\n\n` +
         `_Taxi Rosa - Tu compañero de viaje_`;

             // Intentar enviar por WhatsApp primero
       let whatsappSent = false;
       try {
         whatsappSent = await this.whatsAppNotificationService.sendTestMessage(
           driver.phone_number,
           message
         );
       } catch (error) {
         this.logger.warn(`WhatsApp falló para conductora ${driver.id}: ${error.message}`);
       }

             // Si WhatsApp falla, enviar por SMS
       if (!whatsappSent) {
         const smsMessage = `🚗 Recordatorio Taxi Rosa: Tienes un viaje programado mañana a las ${timeString} (Kansas City). Origen: ${scheduledRide.pickup_location}. Cliente: ${scheduledRide.client_name}. En ${rideInfo.timeUntil.hours}h ${rideInfo.timeUntil.minutes}m`;
         
         try {
           await this.twilioService.sendOtp(driver.phone_number, smsMessage);
           this.logger.log(`SMS enviado como fallback al conductora ${driver.id}`);
           return true;
         } catch (smsError) {
           this.logger.error(`Error enviando SMS al conductora ${driver.id}: ${smsError.message}`);
           return false;
         }
       }

      this.logger.log(`Recordatorio enviado exitosamente al conductora ${driver.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando recordatorio al conductora ${driver.id}: ${error.message}`, error.stack);
      return false;
    }
  }

     /**
    * Envía notificación WebSocket al conductora 30 minutos antes del viaje
    * TODO: Integrar con TrackingGateway cuando se resuelva la dependencia circular
    */
   async sendWebSocketNotification(driverId: number, message: NotificationMessage): Promise<void> {
     try {
       // Por ahora solo logeamos la notificación
       // TODO: Integrar con TrackingGateway
       this.logger.log(`📱 [WebSocket] Notificación programada para conductora ${driverId}: ${message.title}`);
       this.logger.log(`📱 [WebSocket] Mensaje: ${message.body}`);
       
       // En una futura iteración, se enviará via WebSocket
     } catch (error) {
       this.logger.error(`Error enviando notificación WebSocket al conductora ${driverId}: ${error.message}`, error.stack);
     }
   }

  /**
   * Envía notificación de viaje activado al conductora
   */
  async sendRideActivatedNotification(driver: Driver, ride: Ride): Promise<boolean> {
    try {
      const message = `🚗 *¡Viaje Activado!*\n\n` +
        `Hola ${driver.first_name}! 🚀\n\n` +
        `Tu viaje programado ha sido activado:\n\n` +
        `📍 *Origen:* ${ride.origin}\n` +
        `🎯 *Destino:* ${ride.destination}\n` +
        `👤 *Cliente:* ${ride.client?.first_name || 'Cliente'}\n` +
        `📞 *Teléfono:* ${ride.client?.phone_number || 'No disponible'}\n\n` +
        `¡Dirígete al punto de origen! 🏁\n\n` +
        `_Taxi Rosa - Tu compañero de viaje_`;

             // Enviar por WhatsApp
       const whatsappSent = await this.whatsAppNotificationService.sendTestMessage(
         driver.phone_number,
         message
       );

       // También enviar notificación WebSocket
       // TODO: Integrar con TrackingGateway
       this.logger.log(`📱 [WebSocket] Viaje activado para conductora ${driver.id}: ${ride.origin} → ${ride.destination}`);
       
       // También enviar notificación WebSocket programada
       await this.sendWebSocketNotification(driver.id, {
         title: '¡Viaje Activado!',
         body: `Tu viaje programado ha sido activado. Dirígete a ${ride.origin}`,
         rideId: ride.id,
         timestamp: new Date()
       });

      this.logger.log(`Notificación de viaje activado enviada al conductora ${driver.id}`);
      return whatsappSent;
    } catch (error) {
      this.logger.error(`Error enviando notificación de viaje activado al conductora ${driver.id}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Envía notificación de alerta 30 minutos antes del viaje
   */
  async sendUpcomingRideAlert(driver: Driver, scheduledRide: ScheduledRide): Promise<boolean> {
    try {
      const timezone = TimezoneUtil.getDefaultTimezone();
      const rideInfo = TimezoneUtil.dbDateToTimezoneInfo(scheduledRide.scheduled_at, timezone);
      const timeString = TimezoneUtil.formatLocal(scheduledRide.scheduled_at, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }, timezone);

             const message = `⏰ *¡Alerta de Viaje!*\n\n` +
         `Hola ${driver.first_name}! 🚨\n\n` +
         `Tu viaje programado comienza en ${rideInfo.timeUntil.minutes} minutos:\n\n` +
         `⏰ *Hora:* ${timeString} (Kansas City)\n` +
         `📍 *Origen:* ${scheduledRide.pickup_location}\n` +
         `👤 *Cliente:* ${scheduledRide.client_name}\n\n` +
         `¡Prepárate para salir! 🚗💨\n\n` +
         `_Taxi Rosa - Tu compañero de viaje_`;

             // Enviar por WhatsApp
       const whatsappSent = await this.whatsAppNotificationService.sendTestMessage(
         driver.phone_number,
         message
       );

       // También enviar notificación WebSocket
       await this.sendWebSocketNotification(driver.id, {
         title: '¡Viaje en 30 minutos!',
         body: `Tu viaje programado comienza pronto. Prepárate para ir a ${scheduledRide.pickup_location}`,
         scheduledRideId: scheduledRide.id,
         timestamp: new Date()
       });

      this.logger.log(`Alerta de viaje próximo enviada al conductora ${driver.id}`);
      return whatsappSent;
    } catch (error) {
      this.logger.error(`Error enviando alerta de viaje próximo al conductora ${driver.id}: ${error.message}`, error.stack);
      return false;
    }
  }
} 