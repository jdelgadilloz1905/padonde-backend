import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride, RideStatus } from '../../entities/ride.entity';
import { Driver } from '../../entities/driver.entity';
import { CommissionSummaryDto } from './dto/commission-summary.dto';
import { CommissionDetailDto } from './dto/commission-detail.dto';
import { CommissionQueryDto } from './dto/commission-query.dto';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
  ) {}

  async getCommissionsSummary(query: CommissionQueryDto): Promise<{
    data: CommissionSummaryDto[];
    total: number;
    page: number;
    totalPages: number;
    totalCommissions: number;
    totalBilled: number;
  }> {
    try {
      const { page = 1, limit = 10, start_date, end_date, driver_name } = query;

      // Construir la consulta base
      let queryBuilder = this.ridesRepository
        .createQueryBuilder('ride')
        .leftJoinAndSelect('ride.driver', 'driver')
        .leftJoinAndSelect('ride.client', 'client')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('ride.commission_amount IS NOT NULL')
        .andWhere('ride.commission_amount > 0')
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false });

      // Aplicar filtros de fecha
      if (start_date) {
        queryBuilder.andWhere('ride.end_date >= :start_date', { 
          start_date: new Date(start_date) 
        });
      }

      if (end_date) {
        queryBuilder.andWhere('ride.end_date <= :end_date', { 
          end_date: new Date(end_date + ' 23:59:59') 
        });
      }

      // Filtrar por nombre de la conductora
      if (driver_name) {
        queryBuilder.andWhere(
          '(LOWER(driver.first_name) LIKE LOWER(:name) OR LOWER(driver.last_name) LIKE LOWER(:name))',
          { name: `%${driver_name}%` }
        );
      }

      // Agrupar por conductora y calcular estadísticas
      const summaryQuery = queryBuilder
        .select([
          'driver.id as driver_id',
          'driver.first_name as first_name',
          'driver.last_name as last_name',
          'driver.phone_number as driver_phone',
          'COUNT(ride.id) as total_rides',
          'SUM(ride.price) as total_billed',
          'AVG(ride.commission_percentage) as average_commission_percentage',
          'SUM(ride.commission_amount) as total_commissions',
          'MIN(ride.end_date) as first_ride_date',
          'MAX(ride.end_date) as last_ride_date'
        ])
        .groupBy('driver.id, driver.first_name, driver.last_name, driver.phone_number')
        .orderBy('total_commissions', 'DESC');

      // Contar total de conductoras
      const totalQuery = await summaryQuery.getRawMany();
      const total = totalQuery.length;

      // Aplicar paginación
      const results = await summaryQuery
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany();

      // Transformar resultados
      const data: CommissionSummaryDto[] = results.map(result => ({
        driver_id: parseInt(result.driver_id),
        driver_name: `${result.first_name} ${result.last_name}`,
        driver_phone: result.driver_phone,
        total_rides: parseInt(result.total_rides),
        total_billed: parseFloat(result.total_billed),
        average_commission_percentage: parseFloat(result.average_commission_percentage),
        total_commissions: parseFloat(result.total_commissions),
        first_ride_date: result.first_ride_date,
        last_ride_date: result.last_ride_date
      }));

      // Calcular totales generales
      const totalCommissions = totalQuery.reduce((sum, item) => sum + parseFloat(item.total_commissions), 0);
      const totalBilled = totalQuery.reduce((sum, item) => sum + parseFloat(item.total_billed), 0);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Resumen de comisiones obtenido: ${data.length} conductoras, página ${page}/${totalPages}`);

      return {
        data,
        total,
        page,
        totalPages,
        totalCommissions,
        totalBilled
      };
    } catch (error) {
      this.logger.error(`Error al obtener resumen de comisiones: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDriverCommissionDetails(
    driverId: number, 
    query: CommissionQueryDto
  ): Promise<{
    data: CommissionDetailDto[];
    total: number;
    page: number;
    totalPages: number;
    driverInfo: {
      id: number;
      name: string;
      phone: string;
    };
    summary: {
      totalRides: number;
      totalBilled: number;
      totalCommissions: number;
      averageCommissionPercentage: number;
    };
  }> {
    try {
      const { page = 1, limit = 10, start_date, end_date } = query;

      // Verificar que el conductora existe
      const driver = await this.driversRepository.findOne({
        where: { id: driverId }
      });

      if (!driver) {
        throw new NotFoundException(`conductora con ID ${driverId} no encontrado`);
      }

      // Construir consulta para detalles de comisiones
      let queryBuilder = this.ridesRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .leftJoinAndSelect('ride.client', 'client')
        .where('ride.driver_id = :driverId', { driverId })
        .andWhere('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('ride.commission_amount IS NOT NULL')
        .andWhere('ride.commission_amount > 0')
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false });

      // Aplicar filtros de fecha
      if (start_date) {
        queryBuilder.andWhere('ride.end_date >= :start_date', { 
          start_date: new Date(start_date) 
        });
      }

      if (end_date) {
        queryBuilder.andWhere('ride.end_date <= :end_date', { 
          end_date: new Date(end_date + ' 23:59:59') 
        });
      }

      // Contar total de registros
      const total = await queryBuilder.getCount();

      // Obtener registros con paginación
      const rides = await queryBuilder
        .orderBy('ride.end_date', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      // Transformar a DTO
      const data: CommissionDetailDto[] = rides.map(ride => ({
        date: ride.end_date,
        ride_id: ride.id,
        tracking_code: ride.tracking_code,
        client_name: ride.client ? `${ride.client.first_name} ${ride.client.last_name || ''}`.trim() : 'Cliente',
        client_phone: ride.client?.phone_number || '',
        origin: ride.origin,
        destination: ride.destination,
        amount: ride.price,
        commission_percentage: ride.commission_percentage,
        commission_amount: ride.commission_amount,
        distance: ride.distance,
        duration: ride.duration,
        payment_method: ride.payment_method
      }));

      // Calcular resumen para este conductora
      const summaryQuery = await this.ridesRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .select([
          'COUNT(ride.id) as total_rides',
          'SUM(ride.price) as total_billed',
          'SUM(ride.commission_amount) as total_commissions',
          'AVG(ride.commission_percentage) as average_commission_percentage'
        ])
        .where('ride.driver_id = :driverId', { driverId })
        .andWhere('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('ride.commission_amount IS NOT NULL')
        .andWhere('ride.commission_amount > 0')
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false });

      // Aplicar mismos filtros de fecha para el resumen
      if (start_date) {
        summaryQuery.andWhere('ride.end_date >= :start_date', { 
          start_date: new Date(start_date) 
        });
      }

      if (end_date) {
        summaryQuery.andWhere('ride.end_date <= :end_date', { 
          end_date: new Date(end_date + ' 23:59:59') 
        });
      }

      const summaryResult = await summaryQuery.getRawOne();

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Detalles de comisiones obtenidos para conductora ${driverId}: ${data.length} registros, página ${page}/${totalPages}`);

      return {
        data,
        total,
        page,
        totalPages,
        driverInfo: {
          id: driver.id,
          name: `${driver.first_name} ${driver.last_name}`,
          phone: driver.phone_number
        },
        summary: {
          totalRides: parseInt(summaryResult.total_rides) || 0,
          totalBilled: parseFloat(summaryResult.total_billed) || 0,
          totalCommissions: parseFloat(summaryResult.total_commissions) || 0,
          averageCommissionPercentage: parseFloat(summaryResult.average_commission_percentage) || 0
        }
      };
    } catch (error) {
      this.logger.error(`Error al obtener detalles de comisiones de la conductora ${driverId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async exportCommissions(query: CommissionQueryDto): Promise<{
    data: any[];
    filename: string;
  }> {
    try {
      const { start_date, end_date, driver_id, driver_name } = query;

      // Construir consulta para exportación (sin paginación)
      let queryBuilder = this.ridesRepository
        .createQueryBuilder('ride')
        .leftJoinAndSelect('ride.driver', 'driver')
        .leftJoinAndSelect('ride.client', 'client')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('ride.commission_amount IS NOT NULL')
        .andWhere('ride.commission_amount > 0')
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false });

      // Aplicar filtros
      if (start_date) {
        queryBuilder.andWhere('ride.end_date >= :start_date', { 
          start_date: new Date(start_date) 
        });
      }

      if (end_date) {
        queryBuilder.andWhere('ride.end_date <= :end_date', { 
          end_date: new Date(end_date + ' 23:59:59') 
        });
      }

      if (driver_id) {
        queryBuilder.andWhere('ride.driver_id = :driver_id', { driver_id });
      }

      if (driver_name) {
        queryBuilder.andWhere(
          '(LOWER(driver.first_name) LIKE LOWER(:name) OR LOWER(driver.last_name) LIKE LOWER(:name))',
          { name: `%${driver_name}%` }
        );
      }

      const rides = await queryBuilder
        .orderBy('ride.end_date', 'DESC')
        .getMany();

      // Transformar datos para exportación
      const data = rides.map(ride => ({
        'Fecha': ride.end_date?.toISOString().split('T')[0] || '',
        'ID Carrera': ride.id,
        'Código Seguimiento': ride.tracking_code,
        'conductora': ride.driver ? `${ride.driver.first_name} ${ride.driver.last_name}` : '',
        'Teléfono conductora': ride.driver?.phone_number || '',
        'Cliente': ride.client ? `${ride.client.first_name} ${ride.client.last_name || ''}`.trim() : 'Cliente',
        'Teléfono Cliente': ride.client?.phone_number || '',
        'Origen': ride.origin,
        'Destino': ride.destination,
        'Distancia (km)': ride.distance,
        'Duración (min)': ride.duration,
        'Monto Total': ride.price,
        '% Comisión': ride.commission_percentage,
        'Comisión': ride.commission_amount,
        'Método Pago': ride.payment_method
      }));

      // Generar nombre de archivo
      const dateRange = start_date && end_date 
        ? `_${start_date}_${end_date}` 
        : `_${new Date().toISOString().split('T')[0]}`;
      
      const filename = `comisiones${dateRange}.csv`;

      this.logger.log(`Exportación de comisiones generada: ${data.length} registros`);

      return {
        data,
        filename
      };
    } catch (error) {
      this.logger.error(`Error al exportar comisiones: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCommissionsStatistics(query: CommissionQueryDto): Promise<{
    totalDrivers: number;
    totalRides: number;
    totalBilled: number;
    totalCommissions: number;
    averageCommissionPercentage: number;
    topDrivers: Array<{
      driverId: number;
      driverName: string;
      totalCommissions: number;
      totalRides: number;
    }>;
    monthlyStats: Array<{
      month: string;
      totalCommissions: number;
      totalRides: number;
    }>;
  }> {
    try {
      const { start_date, end_date, driver_id, driver_name } = query;

      // Construir consulta base
      let baseQuery = this.ridesRepository
        .createQueryBuilder('ride')
        .leftJoinAndSelect('ride.driver', 'driver')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('ride.commission_amount IS NOT NULL')
        .andWhere('ride.commission_amount > 0')
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false });

      // Aplicar filtros de fecha
      if (start_date) {
        baseQuery.andWhere('ride.end_date >= :start_date', { 
          start_date: new Date(start_date) 
        });
      }

      if (end_date) {
        baseQuery.andWhere('ride.end_date <= :end_date', { 
          end_date: new Date(end_date + ' 23:59:59') 
        });
      }

      // Aplicar filtro por conductora ID
      if (driver_id) {
        baseQuery.andWhere('ride.driver_id = :driver_id', { driver_id });
      }

      // Aplicar filtro por nombre de conductora
      if (driver_name) {
        baseQuery.andWhere(
          '(LOWER(driver.first_name) LIKE LOWER(:name) OR LOWER(driver.last_name) LIKE LOWER(:name))',
          { name: `%${driver_name}%` }
        );
      }

      // Estadísticas generales
      const generalStats = await baseQuery
        .select([
          'COUNT(DISTINCT ride.driver_id) as total_drivers',
          'COUNT(ride.id) as total_rides',
          'SUM(ride.price) as total_billed',
          'SUM(ride.commission_amount) as total_commissions',
          'AVG(ride.commission_percentage) as average_commission_percentage'
        ])
        .getRawOne();

      // Top 5 conductoras por comisiones
      const topDriversQuery = baseQuery.clone()
        .select([
          'driver.id as driver_id',
          'driver.first_name as first_name',
          'driver.last_name as last_name',
          'SUM(ride.commission_amount) as total_commissions',
          'COUNT(ride.id) as total_rides'
        ])
        .groupBy('driver.id, driver.first_name, driver.last_name')
        .orderBy('total_commissions', 'DESC')
        .limit(5);

      const topDriversResult = await topDriversQuery.getRawMany();

      // Estadísticas mensuales
      const monthlyStatsQuery = baseQuery.clone()
        .select([
          "TO_CHAR(ride.end_date, 'YYYY-MM') as month",
          'SUM(ride.commission_amount) as total_commissions',
          'COUNT(ride.id) as total_rides'
        ])
        .groupBy("TO_CHAR(ride.end_date, 'YYYY-MM')")
        .orderBy('month', 'DESC')
        .limit(12);

      const monthlyStatsResult = await monthlyStatsQuery.getRawMany();

      // Transformar resultados
      const topDrivers = topDriversResult.map(driver => ({
        driverId: parseInt(driver.driver_id),
        driverName: `${driver.first_name} ${driver.last_name}`,
        totalCommissions: parseFloat(driver.total_commissions),
        totalRides: parseInt(driver.total_rides)
      }));

      const monthlyStats = monthlyStatsResult.map(stat => ({
        month: stat.month,
        totalCommissions: parseFloat(stat.total_commissions),
        totalRides: parseInt(stat.total_rides)
      }));

      this.logger.log('Estadísticas de comisiones calculadas exitosamente');

      return {
        totalDrivers: parseInt(generalStats.total_drivers) || 0,
        totalRides: parseInt(generalStats.total_rides) || 0,
        totalBilled: parseFloat(generalStats.total_billed) || 0,
        totalCommissions: parseFloat(generalStats.total_commissions) || 0,
        averageCommissionPercentage: parseFloat(generalStats.average_commission_percentage) || 0,
        topDrivers,
        monthlyStats
      };
    } catch (error) {
      this.logger.error(`Error al obtener estadísticas de comisiones: ${error.message}`, error.stack);
      throw error;
    }
  }
}