import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from '../../entities/zone.entity';
import { Client } from '../../entities/client.entity';
import { ZoneClient } from '../../entities/zone-client.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class FareService {
  private readonly logger = new Logger(FareService.name);

  constructor(
    @InjectRepository(Zone)
    private zonesRepository: Repository<Zone>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(ZoneClient)
    private zoneClientsRepository: Repository<ZoneClient>,
  ) {}

  async createZone(createZoneDto: CreateZoneDto): Promise<Zone> {
    try {
      const zone = this.zonesRepository.create({
        ...createZoneDto,
        area: JSON.parse(createZoneDto.area)
      });
      return await this.zonesRepository.save(zone);
    } catch (error) {
      this.logger.error(`Error al crear zona: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAllZones(page = 1, limit = 10, inactive = false): Promise<{ data: Zone[], total: number, page: number, limit: number, totalPages: number }> {
    try {
      const [data, total] = await this.zonesRepository.findAndCount({
        where: { active: inactive ? undefined : true },
        take: limit,
        skip: (page - 1) * limit,
        order: { id: 'ASC' }
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
      this.logger.error(`Error al obtener zonas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOneZone(id: number): Promise<Zone> {
    const zone = await this.zonesRepository.findOne({
      where: { id }
    });
    
    if (!zone) {
      throw new NotFoundException(`Zona con ID ${id} no encontrada`);
    }
    
    return zone;
  }

  async updateZone(id: number, updateZoneDto: UpdateZoneDto): Promise<Zone> {
    try {
      const zone = await this.findOneZone(id);
      
      Object.assign(zone, {
        ...updateZoneDto,
        area: JSON.parse(updateZoneDto.area)
      });
      return await this.zonesRepository.save(zone);
    } catch (error) {
      this.logger.error(`Error al actualizar zona: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteZone(id: number): Promise<void> {
    try {
      const zone = await this.findOneZone(id);
      if(!zone){
        throw new NotFoundException(`Zona con ID ${id} no encontrada`);
      }
      await this.zonesRepository.delete(id);
      this.logger.log(`Zona ${id} eliminada`);
    } catch (error) {
      this.logger.error(`Error al eliminar zona: ${error.message}`, error.stack);
      throw error;
    }
  }

  async calculateFare(
    originCoordinates: string,
    duration: number,
  ): Promise<{
    baseFare: number;
    finalFare: number;
    zoneId: number;
    zoneName: string;
    commissionPercentage: number;
    commissionAmount: number;
    breakdown: {
      timeCost: number;
      nightSurcharge: number;
      weekendSurcharge: number;
    };
  }> {
    try {
      // Determinar la zona basada en las coordenadas de origen
      const zone = await this.findZoneForCoordinates(originCoordinates);
      
      if (!zone) {
        throw new NotFoundException('No se encontró una zona de tarifa para las coordenadas proporcionadas');
      }

      // Calcular el costo por tiempo
      const timeCost = duration * zone.price_per_minute;

      // Calcular tarifa base (el costo por tiempo o la tarifa mínima, el que sea mayor)
      const baseFare = Math.max(
        zone.minimum_fare,
        timeCost
      );

      // Determinar si es horario nocturno (entre 10 PM y 5 AM)
      const isNightTime = this.isNightTime();
      const nightSurcharge = isNightTime 
        ? baseFare * (zone.night_rate_percentage / 100)
        : 0;

      // Determinar si es fin de semana
      const isWeekend = this.isWeekend();
      const weekendSurcharge = isWeekend
        ? baseFare * (zone.weekend_rate_percentage / 100)
        : 0;

      // Calcular tarifa antes de comisión
      const fareBeforeCommission = baseFare + nightSurcharge + weekendSurcharge;

      // Calcular comisión
      const commissionPercentage = zone.commission_percentage || 10.00;
      const commissionAmount = fareBeforeCommission * (commissionPercentage / 100);

      // Calcular tarifa final incluyendo la comisión
      const finalFare = fareBeforeCommission + commissionAmount;

      this.logger.log(`Cálculo de tarifa para zona ${zone.name}: ${finalFare} (incluye comisión: ${commissionAmount}) - Duración: ${duration} min`);

      return {
        baseFare,
        finalFare,
        zoneId: zone.id,
        zoneName: zone.name,
        commissionPercentage,
        commissionAmount,
        breakdown: {
          timeCost,
          nightSurcharge,
          weekendSurcharge,
        },
      };
    } catch (error) {
      this.logger.error(`Error al calcular tarifa: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async findZoneForCoordinates(coordinates: string): Promise<Zone | null> {
    // Extraer coordenadas del formato WKT
    const coords = this.extractCoordsFromWKT(coordinates);
    
    // Buscar la zona que contiene estas coordenadas
    const zone = await this.zonesRepository
      .createQueryBuilder('zone')
      .where('ST_Intersects(zone.area, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography)', {
        lon: coords.longitude,
        lat: coords.latitude,
      })
      .andWhere('zone.active = :active', { active: true })
      .getOne();

    return zone;
  }

  private extractCoordsFromWKT(wkt: string): { latitude: number; longitude: number } {
    const match = wkt.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!match) {
      throw new BadRequestException('Formato de coordenadas inválido');
    }
    return {
      longitude: parseFloat(match[1]),
      latitude: parseFloat(match[2]),
    };
  }

  private isNightTime(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 22 || hour < 5; // 10 PM a 5 AM
  }

  private isWeekend(): boolean {
    const now = new Date();
    const day = now.getDay();
    return day === 0 || day === 6; // Domingo (0) o Sábado (6)
  }

  /**
   * Calcula tarifa con sistema de prioridades
   * PRIORIDADES:
   * 1. Cliente VIP con vip_rate_type='flat_rate' y flat_rate → usar tarifa plana del cliente
   * 2. Cliente VIP con vip_rate_type='minute_rate' y minute_rate → usar tarifa por minuto del cliente
   * 3. Cliente en zona especial → usar tarifa especial zona-cliente
   * 4. Zona con rate_type='flat_rate' y flat_rate → usar tarifa plana de la zona
   * 5. Zona con rate_type='minute_rate' → usar price_per_minute de la zona (cálculo tradicional)
   * 6. Cálculo por defecto → usar price_per_minute de la zona
   */
  async calculateFareWithPriorities(
    clientId: number,
    originCoordinates: string,
    duration: number,
  ): Promise<{
    baseFare: number;
    finalFare: number;
    zoneId: number;
    zoneName: string;
    commissionPercentage: number;
    commissionAmount: number;
    calculationType: string;
    clientType: string;
    breakdown: {
      timeCost: number;
      nightSurcharge: number;
      weekendSurcharge: number;
    };
  }> {
    try {
      // 1. Obtener cliente
      const client = await this.getClientWithRelations(clientId);
      
      if (!client) {
        throw new NotFoundException(`Cliente con ID ${clientId} no encontrado`);
      }

      // 2. Determinar zona
      const zone = await this.findZoneForCoordinates(originCoordinates);
      
      if (!zone) {
        throw new NotFoundException('No se encontró una zona de tarifa para las coordenadas proporcionadas');
      }

      // 3. Aplicar lógica de prioridades
      let baseFare: number;
      let calculationType: string;
      let clientType: string;

      if (client.is_vip && client.vip_rate_type === 'flat_rate' && client.flat_rate) {
        // PRIORIDAD 1: Cliente VIP con tarifa plana
        baseFare = client.flat_rate;
        calculationType = 'client_vip_flat_rate';
        clientType = 'vip_flat';
        this.logger.log(`Usando tarifa VIP plana del cliente: ${baseFare} para cliente ${clientId}`);
      } else if (client.is_vip && client.vip_rate_type === 'minute_rate' && client.minute_rate) {
        // PRIORIDAD 2: Cliente VIP con tarifa por minuto
        const timeCost = duration * client.minute_rate;
        baseFare = Math.max(timeCost, zone.minimum_fare);
        calculationType = 'client_vip_minute_rate';
        clientType = 'vip_minute';
        this.logger.log(`Usando tarifa VIP por minuto del cliente: ${client.minute_rate}/min para cliente ${clientId}`);
      } else {
        // Verificar si tiene tarifa especial en esta zona
        const specialRate = await this.getSpecialZoneRate(clientId, zone.id);
        
        if (specialRate) {
          // PRIORIDAD 3: Tarifa especial zona-cliente
          baseFare = specialRate;
          calculationType = 'zone_special_client_rate';
          clientType = 'zone_special';
          this.logger.log(`Usando tarifa especial zona-cliente: ${baseFare} para cliente ${clientId} en zona ${zone.id}`);
        } else if (zone.rate_type === 'flat_rate' && zone.flat_rate) {
          // PRIORIDAD 4: Zona con tarifa plana
          baseFare = zone.flat_rate;
          calculationType = 'zone_flat_rate';
          clientType = 'regular_zone_flat';
          this.logger.log(`Usando tarifa plana de zona: ${baseFare} para zona ${zone.id}`);
        } else if (zone.rate_type === 'minute_rate' || !zone.rate_type) {
          // PRIORIDAD 5: Zona con tarifa por minuto (tradicional)
          const timeCost = duration * zone.price_per_minute;
          baseFare = Math.max(timeCost, zone.minimum_fare);
          calculationType = 'zone_minute_rate';
          clientType = 'regular_zone_minute';
          this.logger.log(`Usando tarifa por minuto de zona: ${zone.price_per_minute}/min para zona ${zone.id}`);
        } else {
          // PRIORIDAD 6: Cálculo por defecto (fallback)
          const timeCost = duration * zone.price_per_minute;
          baseFare = Math.max(timeCost, zone.minimum_fare);
          calculationType = 'default_per_minute';
          clientType = 'regular_default';
          this.logger.log(`Usando cálculo por defecto: ${zone.price_per_minute}/min para zona ${zone.id}`);
        }
      }

      // 4. Aplicar recargos solo si no es tarifa plana
      let nightSurcharge = 0;
      let weekendSurcharge = 0;
      let timeCost = 0;

      if (calculationType === 'client_vip_minute_rate' || 
          calculationType === 'zone_minute_rate' || 
          calculationType === 'default_per_minute') {
        // Solo aplicar recargos a cálculos por tiempo
        const isNightTime = this.isNightTime();
        const isWeekend = this.isWeekend();

        nightSurcharge = isNightTime ? baseFare * (zone.night_rate_percentage / 100) : 0;
        weekendSurcharge = isWeekend ? baseFare * (zone.weekend_rate_percentage / 100) : 0;
        
        timeCost = calculationType === 'client_vip_minute_rate' 
          ? duration * client.minute_rate 
          : duration * zone.price_per_minute;
      }

      // 5. Calcular tarifa antes de comisión
      let finalFare = baseFare + nightSurcharge + weekendSurcharge;
      if(finalFare % 5 !== 0){
        //redondear a multiples de 5
        finalFare = Math.round(finalFare / 5) * 5;
      }

      // 6. Calcular comisión
      const commissionPercentage = zone.commission_percentage || 10.00;
      const commissionAmount = finalFare*(commissionPercentage/100)
    
      
      

      // 8. Calcular tarifa final

      this.logger.log(`Cálculo de tarifa completado - Cliente: ${clientId}, Zona: ${zone.name}, Tipo: ${calculationType}, Tarifa final: ${finalFare}`);

      return {
        baseFare,
        finalFare,
        zoneId: zone.id,
        zoneName: zone.name,
        commissionPercentage,
        commissionAmount,
        calculationType,
        clientType,
        breakdown: {
          timeCost,
          nightSurcharge,
          weekendSurcharge,
        },
      };
    } catch (error) {
      this.logger.error(`Error al calcular tarifa con prioridades: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene cliente con sus relaciones de zonas especiales
   */
  private async getClientWithRelations(clientId: number): Promise<Client | null> {
    try {
      return await this.clientsRepository.findOne({
        where: { id: clientId, active: true },
        relations: ['specialZones']
      });
    } catch (error) {
      this.logger.error(`Error al obtener cliente con relaciones ${clientId}: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Obtiene la tarifa especial de un cliente para una zona específica
   */
  private async getSpecialZoneRate(clientId: number, zoneId: number): Promise<number | null> {
    try {
      const zoneClient = await this.zoneClientsRepository.findOne({
        where: { 
          client_id: clientId, 
          zone_id: zoneId, 
          active: true 
        }
      });

      return zoneClient?.special_flat_rate || null;
    } catch (error) {
      this.logger.error(`Error al obtener tarifa especial zona-cliente ${clientId}-${zoneId}: ${error.message}`, error.stack);
      return null;
    }
  }

  private validatePriceIntervals(intervals: any[]): void {
    // Método eliminado ya que no usamos intervalos
    this.logger.log('Validación de intervalos obsoleta - ahora usamos precio por minuto');
  }
} 