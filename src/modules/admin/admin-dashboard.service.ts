import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository, LessThan } from 'typeorm';
import { Driver, DriverStatus } from '../../entities/driver.entity';
import { Client } from '../../entities/client.entity';
import { Ride, RideStatus } from '../../entities/ride.entity';
import { DashboardMetricsDto, DriverStatsDto, RideStatsDto, RealtimeMetricsDto } from './dto/dashboard.dto';
import { ScheduledRide, ScheduledRideStatus } from 'src/entities/scheduled-ride.entity';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Ride)
    private rideRepository: Repository<Ride>,
    @InjectRepository(ScheduledRide)
    private scheduledRideRepository: Repository<ScheduledRide>,
  ) {}

  async getDashboardMetrics(): Promise<DashboardMetricsDto> {
    const totalDrivers = await this.driverRepository.count();
    const activeDrivers = await this.driverRepository.count({ where: { status: Not(DriverStatus.OFFLINE) } });
    const availableDrivers = await this.driverRepository.count({ where: { status: DriverStatus.AVAILABLE } });
    const totalClients = await this.clientRepository.count();
    const totalRides = await this.rideRepository.count();
    const completedRides = await this.rideRepository.count({ where: { status: RideStatus.COMPLETED } });
    const activeRides = await this.rideRepository.count({ where: { status: RideStatus.IN_PROGRESS } });

    const totalRevenueResult = await this.rideRepository.sum('price', { status: RideStatus.COMPLETED });
    const totalCommissionsResult = await this.rideRepository.sum('commission_amount', { status: RideStatus.COMPLETED });
    
    // Scheduled rides metrics
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const scheduledToday = await this.scheduledRideRepository.count({
      where: { scheduled_at: Between(startOfToday, endOfToday) }
    });
    
    const unassignedScheduled = await this.scheduledRideRepository.count({
      where: { driver_id: IsNull(), status: Not(ScheduledRideStatus.CANCELLED) }
    });

    const totalScheduledPast = await this.scheduledRideRepository.count({
      where: { status: Not(ScheduledRideStatus.PENDING), scheduled_at: LessThan(today) }
    });
    const completedScheduled = await this.scheduledRideRepository.count({
      where: { status: ScheduledRideStatus.COMPLETED, scheduled_at: LessThan(today) }
    });
    const scheduledCompletionRate = totalScheduledPast > 0 ? (completedScheduled / totalScheduledPast) * 100 : 0;

    return {
      totalDrivers,
      activeDrivers,
      availableDrivers,
      totalClients,
      totalRides,
      completedRides,
      activeRides,
      totalRevenue: totalRevenueResult || 0,
      totalCommissions: totalCommissionsResult || 0,
      scheduledToday,
      unassignedScheduled,
      scheduledCompletionRate: parseFloat(scheduledCompletionRate.toFixed(2)),
    };
  }

  async getDriverStats(): Promise<DriverStatsDto> {
    const [
      totalDrivers,
      activeDrivers,
      availableDrivers,
      busyDrivers,
      offlineDrivers,
      avgRatingData,
      topDriversData,
    ] = await Promise.all([
      this.driverRepository.count(),
      this.driverRepository.count({ where: { active: true } }),
      this.driverRepository.count({ where: { status: DriverStatus.AVAILABLE } }),
      this.driverRepository.count({ where: { status: DriverStatus.BUSY } }),
      this.driverRepository.count({ where: { status: DriverStatus.OFFLINE } }),
      this.driverRepository
        .createQueryBuilder('driver')
        .select('AVG(driver.average_rating)', 'avg')
        .where('driver.active = :active', { active: true })
        .getRawOne(),
      this.driverRepository
        .createQueryBuilder('driver')
        .leftJoin('driver.rides', 'ride')
        .select([
          'driver.id as id',
          'driver.first_name as firstName',
          'driver.last_name as lastName', 
          'driver.average_rating as averageRating',
          'COUNT(ride.id) as totalRides'
        ])
        .where('driver.active = :active', { active: true })
        .groupBy('driver.id')
        .orderBy('driver.average_rating', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    return {
      totalDrivers,
      activeDrivers,
      availableDrivers,
      busyDrivers,
      offlineDrivers,
      averageRating: Number(avgRatingData?.avg || 0),
      topRatedDrivers: topDriversData.map(driver => ({
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        averageRating: Number(driver.averageRating),
        totalRides: Number(driver.totalRides),
      })),
    };
  }

  async getRideStats(): Promise<RideStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalRides,
      completedRides,
      cancelledRides,
      activeRides,
      pendingRides,
      todayRides,
      weekRides,
      monthRides,
      avgDistanceData,
      avgDurationData,
      revenueData,
      commissionsData,
    ] = await Promise.all([
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status = :status', { status: RideStatus.CANCELLED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status IN (:...statuses)', { statuses: [RideStatus.IN_PROGRESS, RideStatus.ON_THE_WAY] })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.status = :status', { status: RideStatus.PENDING })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.created_at >= :today', { today })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.created_at >= :weekAgo', { weekAgo })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .where('ride.created_at >= :monthAgo', { monthAgo })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .select('AVG(ride.distance)', 'avg')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getRawOne(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .select('AVG(ride.duration)', 'avg')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getRawOne(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .select('SUM(ride.price)', 'total')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getRawOne(),
      this.rideRepository
        .createQueryBuilder('ride')
        .leftJoin('ride.driver', 'driver')
        .select('SUM(ride.commission_amount)', 'total')
        .where('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere('(driver.is_demo_account = :isDemoAccount OR driver.id IS NULL)', { isDemoAccount: false })
        .getRawOne(),
    ]);

    return {
      totalRides,
      completedRides,
      cancelledRides,
      activeRides,
      pendingRides,
      todayRides,
      weekRides,
      monthRides,
      averageRideDistance: Number(avgDistanceData?.avg || 0),
      averageRideDuration: Number(avgDurationData?.avg || 0),
      totalRevenue: Number(revenueData?.total || 0),
      totalCommissions: Number(commissionsData?.total || 0),
    };
  }

  async getRealtimeMetrics(): Promise<RealtimeMetricsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeDrivers,
      availableDrivers,
      activeRides,
      pendingRides,
      completedTodayRides,
      todayRevenueData,
      avgWaitTimeData,
    ] = await Promise.all([
      this.driverRepository.count({ 
        where: [
          { status: DriverStatus.AVAILABLE },
          { status: DriverStatus.BUSY },
          { status: DriverStatus.ON_THE_WAY }
        ]
      }),
      this.driverRepository.count({ where: { status: DriverStatus.AVAILABLE } }),
      this.rideRepository.count({ 
        where: [
          { status: RideStatus.IN_PROGRESS },
          { status: RideStatus.ON_THE_WAY }
        ]
      }),
      this.rideRepository.count({ where: { status: RideStatus.PENDING } }),
      this.rideRepository
        .createQueryBuilder('ride')
        .where('ride.created_at >= :today', { today })
        .andWhere('ride.status = :status', { status: RideStatus.COMPLETED })
        .getCount(),
      this.rideRepository
        .createQueryBuilder('ride')
        .select('SUM(ride.price)', 'total')
        .where('ride.created_at >= :today', { today })
        .andWhere('ride.status = :status', { status: RideStatus.COMPLETED })
        .getRawOne(),
      this.rideRepository
        .createQueryBuilder('ride')
        .select('AVG(EXTRACT(EPOCH FROM (ride.assignment_date - ride.request_date)))', 'avg')
        .where('ride.assignment_date IS NOT NULL')
        .andWhere('ride.created_at >= :today', { today })
        .getRawOne(),
    ]);

    // Determinar estado del sistema
    let systemStatus: 'operational' | 'warning' | 'critical' = 'operational';
    
    if (availableDrivers === 0) {
      systemStatus = 'critical';
    } else if (availableDrivers < 5 || pendingRides > 10) {
      systemStatus = 'warning';
    }

    return {
      activeDrivers,
      availableDrivers,
      activeRides,
      pendingRides,
      completedTodayRides,
      todayRevenue: Number(todayRevenueData?.total || 0),
      onlineClients: 0, // Placeholder - necesitaría implementar tracking de clientes online
      averageWaitTime: Number(avgWaitTimeData?.avg || 0),
      systemStatus,
    };
  }
}