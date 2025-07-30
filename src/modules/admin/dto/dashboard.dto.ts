import { ApiProperty } from '@nestjs/swagger';

export class DashboardMetricsDto {
  @ApiProperty({ description: 'Total de conductoras registrados' })
  totalDrivers: number;

  @ApiProperty({ description: 'Conductoras activos' })
  activeDrivers: number;

  @ApiProperty({ description: 'Conductoras disponibles' })
  availableDrivers: number;

  @ApiProperty({ description: 'Total de clientes registrados' })
  totalClients: number;

  @ApiProperty({ description: 'Total de viajes' })
  totalRides: number;

  @ApiProperty({ description: 'Viajes completados' })
  completedRides: number;

  @ApiProperty({ description: 'Viajes en progreso' })
  activeRides: number;

  @ApiProperty({ description: 'Ingresos totales' })
  totalRevenue: number;

  @ApiProperty({ description: 'Comisiones totales' })
  totalCommissions: number;

  @ApiProperty({ description: 'Carreras programadas para hoy' })
  scheduledToday: number;

  @ApiProperty({ description: 'Carreras programadas sin asignar' })
  unassignedScheduled: number;

  @ApiProperty({ description: 'Tasa de cumplimiento de carreras programadas' })
  scheduledCompletionRate: number;
}

export class DriverStatsDto {
  @ApiProperty()
  totalDrivers: number;

  @ApiProperty()
  activeDrivers: number;

  @ApiProperty()
  availableDrivers: number;

  @ApiProperty()
  busyDrivers: number;

  @ApiProperty()
  offlineDrivers: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  topRatedDrivers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    averageRating: number;
    totalRides: number;
  }>;
}

export class RideStatsDto {
  @ApiProperty()
  totalRides: number;

  @ApiProperty()
  completedRides: number;

  @ApiProperty()
  cancelledRides: number;

  @ApiProperty()
  activeRides: number;

  @ApiProperty()
  pendingRides: number;

  @ApiProperty()
  todayRides: number;

  @ApiProperty()
  weekRides: number;

  @ApiProperty()
  monthRides: number;

  @ApiProperty()
  averageRideDistance: number;

  @ApiProperty()
  averageRideDuration: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  totalCommissions: number;
}

export class RealtimeMetricsDto {
  @ApiProperty()
  activeDrivers: number;

  @ApiProperty()
  availableDrivers: number;

  @ApiProperty()
  activeRides: number;

  @ApiProperty()
  pendingRides: number;

  @ApiProperty()
  completedTodayRides: number;

  @ApiProperty()
  todayRevenue: number;

  @ApiProperty()
  onlineClients: number;

  @ApiProperty()
  averageWaitTime: number;

  @ApiProperty()
  systemStatus: 'operational' | 'warning' | 'critical';
} 