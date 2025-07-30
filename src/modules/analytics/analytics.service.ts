import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Driver, DriverStatus } from '../../entities/driver.entity';
import { Client } from '../../entities/client.entity';
import { Ride, RideStatus } from '../../entities/ride.entity';
import { AnalyticsDashboardDto, RidesTotalDto, DriverStatisticsDto } from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Ride)
    private rideRepository: Repository<Ride>,
  ) {}

  async getDashboard(startDate?: string, endDate?: string): Promise<AnalyticsDashboardDto> {
    const dateFilter = this.getDateFilter(startDate, endDate);

    const [
      totalUsers,
      totalDrivers,
      totalRides,
      completedRides,
      activeRides,
      revenueData,
      avgRatingData,
      topDriversData,
    ] = await Promise.all([
      this.clientRepository.count(),
      this.driverRepository.count({ where: { is_demo_account: false } }),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status IN (:...statuses)', { statuses: [RideStatus.IN_PROGRESS, RideStatus.ON_THE_WAY] })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .select('SUM(ride.price)', 'total')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1', 
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getRawOne(),
      this.driverRepository
        .createQueryBuilder('driver')
        .select('AVG(driver.average_rating)', 'avg')
        .where('driver.active = :active', { active: true })
        .andWhere('driver.is_demo_account = :isDemoAccount', { isDemoAccount: false })
        .getRawOne(),
      this.driverRepository
        .createQueryBuilder('driver')
        .leftJoin('driver.rides', 'ride')
        .select([
          'driver.id as id',
          'CONCAT(driver.first_name, \' \', driver.last_name) as name',
          'driver.average_rating as rating',
          'COUNT(ride.id) as totalRides'
        ])
        .where('driver.active = :active', { active: true })
        .andWhere('driver.is_demo_account = :isDemoAccount', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .groupBy('driver.id')
        .orderBy('driver.average_rating', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    // Simular actividad reciente
    const recentActivity = [
      {
        type: 'ride_completed',
        description: 'Viaje completado exitosamente',
        timestamp: new Date(),
      },
      {
        type: 'driver_registered',
        description: 'Nuevo conductora registrado',
        timestamp: new Date(Date.now() - 3600000), // 1 hora atrás
      },
    ];

    return {
      totalUsers,
      totalDrivers,
      totalRides,
      completedRides,
      activeRides,
      totalRevenue: Number(revenueData?.total || 0),
      averageRating: Number(avgRatingData?.avg || 0),
      topDrivers: topDriversData.map(driver => ({
        id: driver.id,
        name: driver.name,
        rating: Number(driver.rating),
        totalRides: Number(driver.totalRides),
      })),
      recentActivity,
    };
  }

  async getRidesTotal(startDate?: string, endDate?: string): Promise<RidesTotalDto> {
    const dateFilter = this.getDateFilter(startDate, endDate);
    
    const [
      total,
      completed,
      cancelled,
      inProgress,
      pending,
      todayTotal,
      weekTotal,
      monthTotal,
    ] = await Promise.all([
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status = :status', { status: RideStatus.CANCELLED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status IN (:...statuses)', { statuses: [RideStatus.IN_PROGRESS, RideStatus.ON_THE_WAY] })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status = :status', { status: RideStatus.PENDING })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('DATE(ride.created_at) = CURRENT_DATE')
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.created_at >= :weekAgo', { weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.created_at >= :monthAgo', { monthAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
    ]);

    return {
      total,
      completed,
      cancelled,
      inProgress,
      pending,
      todayTotal,
      weekTotal,
      monthTotal,
    };
  }

  async getDriverStatistics(startDate?: string, endDate?: string): Promise<DriverStatisticsDto> {
    const dateFilter = this.getDateFilter(startDate, endDate);

    const [
      totalDrivers,
      activeDrivers,
      avgRatingData,
      totalTripsData,
      topPerformersData,
    ] = await Promise.all([
      this.driverRepository.count({ where: { is_demo_account: false } }),
      this.driverRepository.count({ where: { status: DriverStatus.AVAILABLE, is_demo_account: false } }),
      this.driverRepository
        .createQueryBuilder('driver')
        .select('AVG(driver.average_rating)', 'avg')
        .where('driver.active = :active', { active: true })
        .andWhere('driver.is_demo_account = :isDemoAccount', { isDemoAccount: false })
        .getRawOne(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .select('COUNT(*)', 'total')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .getRawOne(),
      this.driverRepository
        .createQueryBuilder('driver')
        .leftJoin('driver.rides', 'ride', 'ride.status = :status', { status: RideStatus.COMPLETED })
        .select([
          'driver.id as id',
          'CONCAT(driver.first_name, \' \', driver.last_name) as name',
          'driver.average_rating as rating',
          'COUNT(ride.id) as trips',
          'SUM(ride.price) as revenue'
        ])
        .where('driver.active = :active', { active: true })
        .andWhere('driver.is_demo_account = :isDemoAccount', { isDemoAccount: false })
        .andWhere(dateFilter ? 'ride.created_at BETWEEN :startDate AND :endDate' : '1=1',
          dateFilter ? { startDate: new Date(startDate), endDate: new Date(endDate) } : {})
        .groupBy('driver.id')
        .having('COUNT(ride.id) > 0')
        .orderBy('COUNT(ride.id)', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    const totalTrips = Number(totalTripsData?.total || 0);
    const averageTripsPerDriver = activeDrivers > 0 ? totalTrips / activeDrivers : 0;

    return {
      totalDrivers,
      activeDrivers,
      averageRating: Number(avgRatingData?.avg || 0),
      totalTrips,
      averageTripsPerDriver: Number(averageTripsPerDriver.toFixed(2)),
      topPerformers: topPerformersData.map(driver => ({
        id: driver.id,
        name: driver.name,
        rating: Number(driver.rating),
        trips: Number(driver.trips),
        revenue: Number(driver.revenue || 0),
      })),
    };
  }

  private getDateFilter(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) return null;
    
    return {
      created_at: Between(
        new Date(startDate),
        new Date(new Date(endDate).setHours(23, 59, 59, 999))
      )
    };
  }
}