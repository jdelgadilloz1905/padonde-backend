import { Temporal } from 'temporal-polyfill';

/**
 * Utilidades para manejo de fechas y zonas horarias usando Temporal API
 * Zona horaria por defecto: America/Chicago (Kansas City)
 */
export class TimezoneUtil {
  // Zona horaria por defecto para Kansas City
  private static readonly DEFAULT_TIMEZONE = 'America/Chicago';

  /**
   * Obtiene la zona horaria por defecto del sistema
   */
  static getDefaultTimezone(): string {
    return this.DEFAULT_TIMEZONE;
  }

  /**
   * Convierte una fecha UTC a la zona horaria local (Kansas City)
   */
  static utcToLocal(utcDate: Date | string, timezone: string = this.DEFAULT_TIMEZONE): Temporal.ZonedDateTime {
    const instant = typeof utcDate === 'string' 
      ? Temporal.Instant.from(utcDate)
      : Temporal.Instant.fromEpochMilliseconds(utcDate.getTime());
    
    return instant.toZonedDateTimeISO(timezone);
  }

  /**
   * Convierte una fecha local a UTC
   */
  static localToUtc(localDateTime: string | Temporal.PlainDateTime, timezone: string = this.DEFAULT_TIMEZONE): Date {
    let zonedDateTime: Temporal.ZonedDateTime;
    
    if (typeof localDateTime === 'string') {
      // Si es string, asumimos que es ISO format
      const plainDateTime = Temporal.PlainDateTime.from(localDateTime);
      zonedDateTime = plainDateTime.toZonedDateTime(timezone);
    } else {
      zonedDateTime = localDateTime.toZonedDateTime(timezone);
    }
    
    return new Date(zonedDateTime.epochMilliseconds);
  }

  /**
   * Obtiene la fecha actual en la zona horaria local
   */
  static now(timezone: string = this.DEFAULT_TIMEZONE): Temporal.ZonedDateTime {
    return Temporal.Now.zonedDateTimeISO(timezone);
  }

  /**
   * Obtiene el inicio del día siguiente en la zona horaria local
   */
  static getTomorrowStart(timezone: string = this.DEFAULT_TIMEZONE): { start: Date; end: Date } {
    const now = this.now(timezone);
    const tomorrow = now.add({ days: 1 });
    const tomorrowStart = tomorrow.startOfDay();
    const tomorrowEnd = tomorrowStart.add({ days: 1 }).subtract({ nanoseconds: 1 });
    
    return {
      start: new Date(tomorrowStart.epochMilliseconds),
      end: new Date(tomorrowEnd.epochMilliseconds)
    };
  }

  /**
   * Verifica si una fecha está dentro de un rango de tiempo específico
   */
  static isWithinTimeWindow(
    targetDate: Date | string,
    windowMinutes: number,
    timezone: string = this.DEFAULT_TIMEZONE
  ): boolean {
    const now = this.now(timezone);
    const target = this.utcToLocal(targetDate, timezone);
    
    const diffMinutes = Math.abs(
      Temporal.Duration.from(now.until(target)).total({ unit: 'minutes' })
    );
    
    return diffMinutes <= windowMinutes;
  }

  /**
   * Obtiene viajes que deben ejecutarse en una ventana de tiempo específica
   */
  static getTimeWindow(
    centerTime: Date | Temporal.ZonedDateTime,
    windowMinutes: number,
    timezone: string = this.DEFAULT_TIMEZONE
  ): { start: Date; end: Date } {
    let center: Temporal.ZonedDateTime;
    
    if (centerTime instanceof Date) {
      center = this.utcToLocal(centerTime, timezone);
    } else {
      center = centerTime;
    }
    
    // Convertir minutos decimales a segundos para evitar error de temporal-polyfill
    const totalSeconds = Math.round(windowMinutes * 60);
    
    const start = center.subtract({ seconds: totalSeconds });
    const end = center.add({ seconds: totalSeconds });
    
    return {
      start: new Date(start.epochMilliseconds),
      end: new Date(end.epochMilliseconds)
    };
  }

  /**
   * Calcula el tiempo hasta un evento específico
   */
  static getTimeUntil(
    targetDate: Date | string,
    timezone: string = this.DEFAULT_TIMEZONE
  ): {
    totalMinutes: number;
    hours: number;
    minutes: number;
    isPast: boolean;
  } {
    const now = this.now(timezone);
    const target = this.utcToLocal(targetDate, timezone);
    
    const duration = now.until(target);
    const totalMinutes = duration.total({ unit: 'minutes' });
    const isPast = totalMinutes < 0;
    
    const absDuration = isPast ? duration.negated() : duration;
    
    return {
      totalMinutes: Math.abs(totalMinutes),
      hours: Math.floor(Math.abs(totalMinutes) / 60),
      minutes: Math.floor(Math.abs(totalMinutes) % 60),
      isPast
    };
  }

  /**
   * Formatea una fecha para mostrar en la zona horaria local
   */
  static formatLocal(
    date: Date | string,
    options: Intl.DateTimeFormatOptions = {},
    timezone: string = this.DEFAULT_TIMEZONE
  ): string {
    const zonedDateTime = this.utcToLocal(date, timezone);
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      ...options
    };
    
    return new Date(zonedDateTime.epochMilliseconds).toLocaleString('es-ES', defaultOptions);
  }

  /**
   * Obtiene la próxima ejecución de un cron job en la zona horaria local
   */
  static getNextCronExecution(
    cronExpression: string,
    timezone: string = this.DEFAULT_TIMEZONE
  ): Date {
    // Para el cron de las 22:00 (recordatorios diarios)
    if (cronExpression === '0 22 * * *') {
      const now = this.now(timezone);
      let next = now.with({ hour: 22, minute: 0, second: 0, millisecond: 0 });
      
      // Si ya pasó las 22:00 hoy, programar para mañana
      if (Temporal.ZonedDateTime.compare(now, next) >= 0) {
        next = next.add({ days: 1 });
      }
      
      return new Date(next.epochMilliseconds);
    }
    
    // Para otros cron expressions, retornar la próxima ejecución aproximada
    const now = this.now(timezone);
    return new Date(now.epochMilliseconds);
  }

  /**
   * Convierte una fecha de base de datos (UTC) a un objeto con información de zona horaria
   */
  static dbDateToTimezoneInfo(
    dbDate: Date,
    timezone: string = this.DEFAULT_TIMEZONE
  ): {
    utc: Date;
    local: Temporal.ZonedDateTime;
    localString: string;
    timeUntil: ReturnType<typeof TimezoneUtil.getTimeUntil>;
  } {
    const local = this.utcToLocal(dbDate, timezone);
    
    return {
      utc: dbDate,
      local,
      localString: this.formatLocal(dbDate, {}, timezone),
      timeUntil: this.getTimeUntil(dbDate, timezone)
    };
  }

  /**
   * Valida si una hora está dentro del horario de trabajo
   */
  static isWithinWorkingHours(
    date: Date | string,
    startHour: number = 6,
    endHour: number = 23,
    timezone: string = this.DEFAULT_TIMEZONE
  ): boolean {
    const zonedDateTime = this.utcToLocal(date, timezone);
    const hour = zonedDateTime.hour;
    
    return hour >= startHour && hour <= endHour;
  }

  /**
   * Debug: Muestra información detallada de una fecha
   */
  static debugDate(date: Date | string, timezone: string = this.DEFAULT_TIMEZONE): void {
    console.log('🕐 Debug de fecha:');
    console.log('  UTC:', date);
    console.log('  Local:', this.formatLocal(date, {}, timezone));
    console.log('  Zona horaria:', timezone);
    
    const timeInfo = this.getTimeUntil(date, timezone);
    console.log('  Tiempo hasta evento:', `${timeInfo.hours}h ${timeInfo.minutes}m`);
    console.log('  ¿Ya pasó?:', timeInfo.isPast);
  }
} 