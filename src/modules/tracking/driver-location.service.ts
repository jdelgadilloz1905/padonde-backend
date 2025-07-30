import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DriverLocation } from '../../entities/driver-location.entity';
import { Driver, DriverStatus } from '../../entities/driver.entity';
import { GeocodingService } from '../rides/geocoding.service';

@Injectable()
export class DriverLocationService {
  private readonly logger = new Logger(DriverLocationService.name);

  constructor(
    @InjectRepository(DriverLocation)
    private driverLocationRepository: Repository<DriverLocation>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    private geocodingService: GeocodingService,
  ) {}

  async saveDriverLocation(data: {
    driverId: number;
    location: { type: string; coordinates: number[] };
    speed?: number;
    direction?: number;
    rideId?: number;
  }): Promise<DriverLocation> {
    const { driverId, location, speed, direction, rideId } = data;

    try {
      // Validar que las coordenadas sean números válidos
      const longitude = location.coordinates[0];
      const latitude = location.coordinates[1];

      if (longitude === undefined || latitude === undefined || 
          isNaN(longitude) || isNaN(latitude)) {
        throw new BadRequestException('Coordenadas inválidas: latitud y longitud deben ser números válidos');
      }

      // Validar que las coordenadas estén en rangos válidos
      if (longitude < -180 || longitude > 180) {
        throw new BadRequestException('Longitud fuera de rango: debe estar entre -180 y 180');
      }

      if (latitude < -90 || latitude > 90) {
        throw new BadRequestException('Latitud fuera de rango: debe estar entre -90 y 90');
      }

      // Formato WKT para el punto geográfico
      const wktPoint = `POINT(${longitude} ${latitude})`;
      
      this.logger.log(`Actualizando ubicación para conductora ${driverId}: ${wktPoint}`);
      
      // PASO 1: Actualizar la ubicación actual de la conductora en la tabla drivers
      const updateResult = await this.driverRepository.query(
        `UPDATE drivers SET 
         current_location = ST_SetSRID(ST_GeomFromText($1), 4326)::geography, 
         last_update = $2 
         WHERE id = $3 AND active = true
         RETURNING id, first_name, last_name`,
        [wktPoint, new Date(), driverId]
      );

      // Verificar que el conductora existe y está activo
      if (!updateResult || updateResult.length === 0) {
        throw new BadRequestException(`conductora ${driverId} no encontrado o inactivo`);
      }

      this.logger.log(
        `✅ Ubicación actualizada en tabla drivers para ${updateResult[0].first_name} ${updateResult[0].last_name} (ID: ${driverId})`
      );

      // PASO 2: Crear registro histórico en la tabla locations
      const locationRecord = this.driverLocationRepository.create({
        driver_id: driverId,
        ride_id: rideId,
        speed,
        direction
      });

      // Guardar la ubicación usando un comando SQL directo para asegurar el formato correcto
      const savedLocation = await this.driverLocationRepository.query(
        `INSERT INTO locations(driver_id, ride_id, location, speed, direction, timestamp) 
         VALUES($1, $2, ST_SetSRID(ST_GeomFromText($3), 4326)::geography, $4, $5, $6) RETURNING *`,
        [driverId, rideId || null, wktPoint, speed || null, direction || null, new Date()]
      );

      this.logger.log(
        `📍 Registro histórico guardado en tabla locations para conductora ${driverId}` +
        (rideId ? ` (Viaje: ${rideId})` : '')
      );

      // Actualizar el objeto del registro con los datos guardados
      Object.assign(locationRecord, savedLocation[0]);

      return locationRecord;
    } catch (error) {
      this.logger.error(`Error saving driver location: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDriverLocations(driverId: number, limit: number = 10): Promise<DriverLocation[]> {
    return this.driverLocationRepository.find({
      where: { driver_id: driverId },
      order: { timestamp: 'DESC' },
      take: limit
    });
  }

  async getActiveDriversLocations() {
    try {
      // Get all active drivers with their current locations using direct SQL query
      // to ensure we get the location in the right format
      const drivers = await this.driverRepository.query(`
        SELECT 
          d.id, 
          d.first_name, 
          d.last_name, 
          d.phone_number, 
          d.vehicle, 
          d.model, 
          d.color, 
          d.license_plate, 
          d.status, 
          d.max_passengers,
          d.has_child_seat,
          ST_AsGeoJSON(d.current_location)::json AS current_location, 
          d.last_update
        FROM drivers d
        LEFT JOIN "driver-pending-response" dpr ON d.id = dpr.driver_id
        WHERE 
          d.active = true 
          AND d.status != 'offline' 
          AND d.current_location IS NOT NULL
          AND dpr.id IS NULL
      `);

      this.logger.log(`Obtenidos ${drivers.length} conductoras activos`);
      
      // Process locations into a more usable format
      const processedDrivers = await Promise.all(drivers.map(async (driver) => {
        let location = null;
        let streetName = 'Ubicación no disponible';
        
        try {
          // Si current_location es un objeto JSON directo (desde ST_AsGeoJSON)
          if (driver.current_location && typeof driver.current_location === 'object') {
            const coordinates = driver.current_location.coordinates || [];
            if (coordinates.length >= 2) {
              location = {
                longitude: coordinates[0],
                latitude: coordinates[1]
              };
            }
          } 
          // Si es un string (formato antiguo), intentamos parsearlo
          else if (typeof driver.current_location === 'string') {
            const pointMatch = driver.current_location.match(/POINT\(([^ ]+) ([^)]+)\)/);
            if (pointMatch) {
              location = {
                longitude: parseFloat(pointMatch[1]),
                latitude: parseFloat(pointMatch[2])
              };
            }
          }

          // Obtener el nombre de la calle usando geocodificación inversa
          if (location && location.latitude && location.longitude) {
            try {
              const addressInfo = await this.geocodingService.reverseGeocode(
                location.latitude,
                location.longitude
              );
              streetName = addressInfo.street ||
                          addressInfo.fullAddress ||
                          'Calle no identificada';
            } catch (geocodeError) {
              this.logger.warn(
                `No se pudo obtener el nombre de la calle para el conductora ${driver.id}: ${geocodeError.message}`
              );
              streetName = 'Calle no disponible';
            }
          }
        } catch (err) {
          this.logger.warn(`Error al parsear la ubicación de la conductora ${driver.id}: ${err.message}`);
          location = null;
        }

        this.logger.debug(`Ubicación de la conductora ${driver.id}: ${JSON.stringify(location)} en ${streetName}`);

        return {
          driverId: driver.id,
          name: `${driver.first_name} ${driver.last_name}`,
          phone: driver.phone_number,
          vehicle: `${driver.vehicle} ${driver.model || ''} ${driver.color || ''}`.trim(),
          plate: driver.license_plate,
          status: driver.status,
          maxPassengers: driver.max_passengers || 4,
          hasChildSeat: driver.has_child_seat || false,
          location,
          streetName,
          lastUpdate: driver.last_update
        };
      }));

      return processedDrivers;
    } catch (error) {
      this.logger.error(`Error getting active drivers locations: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDriverLocationHistory(driverId: number, startDate: Date, endDate: Date) {
    return this.driverLocationRepository.find({
      where: {
        driver_id: driverId,
        timestamp: Between(startDate, endDate)
      },
      order: { timestamp: 'ASC' }
    });
  }

  async setDriverOnline(driverId: number) {
    await this.driverRepository.update(driverId, { status: DriverStatus.AVAILABLE });
  }
}