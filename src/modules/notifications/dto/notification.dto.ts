import { IsString, IsNumber, IsOptional, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  DAILY_REMINDER = 'daily_reminder',
  UPCOMING_RIDE = 'upcoming_ride',
  RIDE_ACTIVATED = 'ride_activated',
  WEBSOCKET_ALERT = 'websocket_alert',
}

export enum NotificationChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  WEBSOCKET = 'websocket',
  EMAIL = 'email',
}

export class NotificationDto {
  @ApiProperty({
    description: 'Tipo de notificación',
    enum: NotificationType,
    example: NotificationType.DAILY_REMINDER,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Canal de notificación',
    enum: NotificationChannel,
    example: NotificationChannel.WHATSAPP,
  })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    description: 'Título de la notificación',
    example: 'Recordatorio de viaje programado',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Cuerpo del mensaje',
    example: 'Tienes un viaje programado para mañana a las 08:00',
  })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'ID de la conductora destinatario',
    example: 123,
  })
  @IsNumber()
  driverId: number;

  @ApiProperty({
    description: 'ID del viaje programado',
    example: 456,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  scheduledRideId?: number;

  @ApiProperty({
    description: 'ID del viaje activo',
    example: 789,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  rideId?: number;

  @ApiProperty({
    description: 'Fecha y hora de la notificación',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;
}

export class SendNotificationDto {
  @ApiProperty({
    description: 'ID de la conductora destinatario',
    example: 123,
  })
  @IsNumber()
  driverId: number;

  @ApiProperty({
    description: 'Título de la notificación',
    example: 'Recordatorio importante',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Mensaje de la notificación',
    example: 'No olvides tu viaje programado para mañana',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Tipo de notificación',
    enum: NotificationType,
    example: NotificationType.DAILY_REMINDER,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Canal preferido de notificación',
    enum: NotificationChannel,
    example: NotificationChannel.WHATSAPP,
  })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    description: 'ID del viaje programado (opcional)',
    example: 456,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  scheduledRideId?: number;

  @ApiProperty({
    description: 'ID del viaje activo (opcional)',
    example: 789,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  rideId?: number;
}

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Indica si la notificación fue enviada exitosamente',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje de respuesta',
    example: 'Notificación enviada exitosamente',
  })
  message: string;

  @ApiProperty({
    description: 'ID de la notificación (si aplica)',
    example: 'notification_123456',
    required: false,
  })
  @IsOptional()
  notificationId?: string;

  @ApiProperty({
    description: 'Canal utilizado para enviar la notificación',
    enum: NotificationChannel,
    example: NotificationChannel.WHATSAPP,
  })
  channel: NotificationChannel;

  @ApiProperty({
    description: 'Fecha y hora de envío',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: Date;
}

export class ScheduledRideNotificationDto {
  @ApiProperty({
    description: 'ID del viaje programado',
    example: 456,
  })
  @IsNumber()
  scheduledRideId: number;

  @ApiProperty({
    description: 'ID de la conductora',
    example: 123,
  })
  @IsNumber()
  driverId: number;

  @ApiProperty({
    description: 'Título de la notificación',
    example: 'Viaje programado próximo',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Cuerpo del mensaje',
    example: 'Tu viaje programado comienza en 30 minutos',
  })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Hora programada del viaje',
    example: '2024-01-15T08:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  scheduledTime: Date;

  @ApiProperty({
    description: 'Ubicación de origen',
    example: 'Centro Comercial Sambil',
  })
  @IsString()
  pickupLocation: string;

  @ApiProperty({
    description: 'Ubicación de destino',
    example: 'Aeropuerto Internacional',
  })
  @IsString()
  destination: string;

  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Juan Pérez',
  })
  @IsString()
  clientName: string;
} 