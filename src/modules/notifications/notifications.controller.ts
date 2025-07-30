import { Controller, Post, UseGuards, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { ScheduledRideTasksService } from './scheduled-ride-tasks.service';
import { SendNotificationDto, NotificationResponseDto } from './dto/notification.dto';
import { TimezoneUtil } from './utils/timezone.util';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly scheduledRideTasksService: ScheduledRideTasksService,
  ) {}

  @Post('test/daily-reminders')
  @Roles('admin')
  @ApiOperation({ 
    summary: 'Ejecutar manualmente tarea de recordatorios diarios (Testing)',
    description: 'Ejecuta manualmente la tarea nocturna de recordatorios para testing. Solo administradores.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tarea ejecutada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Tarea de recordatorios diarios ejecutada manualmente',
        timestamp: '2024-01-15T10:30:00Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async testDailyReminders(): Promise<{ success: boolean; message: string; timestamp: Date }> {
    await this.scheduledRideTasksService.runDailyRemindersManually();
    return {
      success: true,
      message: 'Tarea de recordatorios diarios ejecutada manualmente',
      timestamp: new Date()
    };
  }

  @Post('test/process-scheduled-rides')
  @Roles('admin')
  @ApiOperation({ 
    summary: 'Ejecutar manualmente procesamiento de viajes programados (Testing)',
    description: 'Ejecuta manualmente la tarea de conversión de scheduled_rides a rides para testing. Solo administradores.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tarea ejecutada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Tarea de procesamiento de viajes ejecutada manualmente',
        timestamp: '2024-01-15T10:30:00Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async testProcessScheduledRides(): Promise<{ success: boolean; message: string; timestamp: Date }> {
    await this.scheduledRideTasksService.runProcessScheduledRidesManually();
    return {
      success: true,
      message: 'Tarea de procesamiento de viajes ejecutada manualmente',
      timestamp: new Date()
    };
  }

  @Get('cron-jobs/status')
  @Roles('admin', 'operator')
  @ApiOperation({ 
    summary: 'Obtener estado de tareas programadas',
    description: 'Obtiene información sobre el estado de las tareas programadas (cron jobs). Solo administradores y operadores.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado de tareas programadas',
    schema: {
      example: {
        success: true,
        cronJobs: [
          {
            name: 'daily-reminders',
            schedule: '0 22 * * *',
            description: 'Recordatorios diarios a las 22:00',
            timezone: 'America/Caracas',
            active: true
          },
          {
            name: 'process-scheduled-rides',
            schedule: '* * * * *',
            description: 'Procesamiento de viajes cada minuto',
            active: true
          },
          {
            name: 'upcoming-ride-notifications',
            schedule: '*/5 * * * *',
            description: 'Notificaciones de viajes próximos cada 5 minutos',
            active: true
          }
        ],
        timestamp: '2024-01-15T10:30:00Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador u operador' })
  async getCronJobsStatus(): Promise<{
    success: boolean;
    cronJobs: Array<{
      name: string;
      schedule: string;
      description: string;
      timezone?: string;
      active: boolean;
    }>;
    timestamp: Date;
  }> {
    return {
      success: true,
      cronJobs: [
        {
          name: 'daily-reminders',
          schedule: '0 22 * * *',
          description: 'Recordatorios diarios a las 22:00',
          timezone: 'America/Caracas',
          active: true
        },
        {
          name: 'process-scheduled-rides',
          schedule: '* * * * *',
          description: 'Procesamiento de viajes cada minuto',
          active: true
        },
        {
          name: 'upcoming-ride-notifications',
          schedule: '*/5 * * * *',
          description: 'Notificaciones de viajes próximos cada 5 minutos',
          active: true
        }
      ],
      timestamp: new Date()
    };
  }

  @Get('test/timezone-info')
  @Roles('admin', 'operator')
  @ApiOperation({ 
    summary: 'Obtener información de zona horaria y fechas (Testing)',
    description: 'Muestra información detallada sobre el manejo de fechas y zonas horarias del sistema. Para administradores y operadores.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Información de zona horaria',
    schema: {
      example: {
        success: true,
        timezone: 'America/Chicago',
        currentTime: {
          utc: '2024-01-15T22:30:00.000Z',
          local: '2024-01-15T16:30:00-06:00',
          formatted: '15/01/2024, 16:30:00'
        },
        tomorrow: {
          start: '2024-01-16T06:00:00.000Z',
          end: '2024-01-17T05:59:59.999Z',
          localStart: '16/01/2024, 00:00:00',
          localEnd: '16/01/2024, 23:59:59'
        },
        nextCronExecution: '2024-01-15T04:00:00.000Z',
        examples: {
          'UTC to Local': 'Convierte fechas de BD (UTC) a hora local',
          'Local to UTC': 'Convierte hora local a UTC para guardar en BD'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async getTimezoneInfo(): Promise<{
    success: boolean;
    timezone: string;
    currentTime: any;
    tomorrow: any;
    nextCronExecution: Date;
    examples: any;
  }> {
    const timezone = TimezoneUtil.getDefaultTimezone();
    const now = new Date();
    const { start: tomorrowStart, end: tomorrowEnd } = TimezoneUtil.getTomorrowStart(timezone);
    
    return {
      success: true,
      timezone,
      currentTime: {
        utc: now.toISOString(),
        local: TimezoneUtil.utcToLocal(now, timezone).toString(),
        formatted: TimezoneUtil.formatLocal(now, {}, timezone)
      },
      tomorrow: {
        start: tomorrowStart.toISOString(),
        end: tomorrowEnd.toISOString(),
        localStart: TimezoneUtil.formatLocal(tomorrowStart, {}, timezone),
        localEnd: TimezoneUtil.formatLocal(tomorrowEnd, {}, timezone)
      },
      nextCronExecution: TimezoneUtil.getNextCronExecution('0 22 * * *', timezone),
      examples: {
        'UTC to Local': 'Convierte fechas de BD (UTC) a hora local de Kansas City',
        'Local to UTC': 'Convierte hora local a UTC para guardar en BD',
        'Time Until': 'Calcula tiempo restante hasta un evento',
        'Working Hours': 'Valida si está dentro del horario de trabajo'
      }
    };
  }
} 