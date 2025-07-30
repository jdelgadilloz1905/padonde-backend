import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { 
  AnalyticsDashboardDto, 
  RidesTotalDto, 
  DriverStatisticsDto,
  DateRangeDto 
} from './dto/analytics-response.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Obtener dashboard de analytics general' })
  @ApiResponse({ status: 200, description: 'Dashboard de analytics obtenido', type: AnalyticsDashboardDto })
  async getDashboard(@Query() dateRange: DateRangeDto): Promise<AnalyticsDashboardDto> {
    return this.analyticsService.getDashboard(dateRange.start_date, dateRange.end_date);
  }

  @Get('rides/total')
  @ApiOperation({ summary: 'Obtener totales de viajes' })
  @ApiResponse({ status: 200, description: 'Totales de viajes obtenidos', type: RidesTotalDto })
  async getRidesTotal(@Query() dateRange: DateRangeDto): Promise<RidesTotalDto> {
    return this.analyticsService.getRidesTotal(dateRange.start_date, dateRange.end_date);
  }

  @Get('drivers/statistics')
  @ApiOperation({ summary: 'Obtener estadísticas de conductoras' })
  @ApiResponse({ status: 200, description: 'Estadísticas de conductoras obtenidas', type: DriverStatisticsDto })
  async getDriverStatistics(@Query() dateRange: DateRangeDto): Promise<DriverStatisticsDto> {
    return this.analyticsService.getDriverStatistics(dateRange.start_date, dateRange.end_date);
  }

  @Get('rides/statistics')
  @ApiOperation({ summary: 'Obtener estadísticas de viajes' })
  @ApiResponse({ status: 200, description: 'Estadísticas de viajes obtenidas', type: RidesTotalDto })
  async getRidesStatistics(@Query() dateRange: DateRangeDto): Promise<RidesTotalDto> {
    return this.analyticsService.getRidesTotal(dateRange.start_date, dateRange.end_date);
  }
} 