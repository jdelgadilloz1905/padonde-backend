import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardMetricsDto, DriverStatsDto, RideStatsDto, RealtimeMetricsDto } from './dto/dashboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('admin/dashboard')
@Controller('admin/dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Obtener métricas generales del dashboard' })
  @ApiResponse({ status: 200, description: 'Métricas obtenidas exitosamente', type: DashboardMetricsDto })
  async getMetrics(): Promise<DashboardMetricsDto> {
    return this.adminDashboardService.getDashboardMetrics();
  }

  @Get('drivers-stats')
  @ApiOperation({ summary: 'Obtener estadísticas de conductoras' })
  @ApiResponse({ status: 200, description: 'Estadísticas de conductoras obtenidas', type: DriverStatsDto })
  async getDriverStats(): Promise<DriverStatsDto> {
    return this.adminDashboardService.getDriverStats();
  }

  @Get('rides-stats')
  @ApiOperation({ summary: 'Obtener estadísticas de viajes' })
  @ApiResponse({ status: 200, description: 'Estadísticas de viajes obtenidas', type: RideStatsDto })
  async getRideStats(): Promise<RideStatsDto> {
    return this.adminDashboardService.getRideStats();
  }

  @Get('realtime-metrics')
  @ApiOperation({ summary: 'Obtener métricas en tiempo real' })
  @ApiResponse({ status: 200, description: 'Métricas en tiempo real obtenidas', type: RealtimeMetricsDto })
  async getRealtimeMetrics(): Promise<RealtimeMetricsDto> {
    return this.adminDashboardService.getRealtimeMetrics();
  }
} 