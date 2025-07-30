import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  Header,
  Res,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CommissionsService } from './commissions.service';
import { CommissionQueryDto } from './dto/commission-query.dto';
import { CommissionSummaryDto } from './dto/commission-summary.dto';
import { CommissionDetailDto } from './dto/commission-detail.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('commissions')
@Controller('commissions')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class CommissionsController {
  private readonly logger = new Logger(CommissionsController.name);

  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Obtener resumen de comisiones por conductora',
    description: 'Lista todos los conductoras con sus estadísticas de comisiones agrupadas'
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen de comisiones obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CommissionSummaryDto' }
        },
        total: { type: 'number', description: 'Total de conductoras' },
        page: { type: 'number', description: 'Página actual' },
        totalPages: { type: 'number', description: 'Total de páginas' },
        totalCommissions: { type: 'number', description: 'Total de comisiones generales' },
        totalBilled: { type: 'number', description: 'Total facturado general' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async getCommissionsSummary(@Query() query: CommissionQueryDto) {
    return this.commissionsService.getCommissionsSummary(query);
  }

  @Get('driver/:driverId')
  @ApiOperation({ 
    summary: 'Obtener detalles de comisiones de un conductora específico',
    description: 'Muestra el detalle de todas las carreras y comisiones de un conductora'
  })
  @ApiParam({ name: 'driverId', description: 'ID de la conductora' })
  @ApiResponse({
    status: 200,
    description: 'Detalles de comisiones obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CommissionDetailDto' }
        },
        total: { type: 'number', description: 'Total de carreras' },
        page: { type: 'number', description: 'Página actual' },
        totalPages: { type: 'number', description: 'Total de páginas' },
        driverInfo: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            phone: { type: 'string' }
          }
        },
        summary: {
          type: 'object',
          properties: {
            totalRides: { type: 'number' },
            totalBilled: { type: 'number' },
            totalCommissions: { type: 'number' },
            averageCommissionPercentage: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async getDriverCommissionDetails(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Query() query: CommissionQueryDto,
  ) {
    return this.commissionsService.getDriverCommissionDetails(driverId, query);
  }

  @Get('export')
  @ApiOperation({ 
    summary: 'Exportar comisiones a CSV',
    description: 'Genera un archivo CSV con todas las comisiones según los filtros aplicados'
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo CSV generado exitosamente',
    headers: {
      'Content-Type': {
        description: 'Tipo de contenido del archivo',
        schema: { type: 'string', example: 'text/csv' }
      },
      'Content-Disposition': {
        description: 'Disposición del contenido para descarga',
        schema: { type: 'string', example: 'attachment; filename="comisiones_2024-01-01_2024-01-31.csv"' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  @Header('Content-Type', 'text/csv')
  async exportCommissions(
    @Query() query: CommissionQueryDto,
    @Res() res: Response,
  ) {
    try {
      const { data, filename } = await this.commissionsService.exportCommissions(query);

      // Convertir datos a CSV
      if (data.length === 0) {
        res.status(204).send('No hay datos para exportar');
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escapar comillas y envolver en comillas si contiene comas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);

      this.logger.log(`Archivo de comisiones exportado: ${filename}, ${data.length} registros`);
    } catch (error) {
      this.logger.error(`Error al exportar comisiones: ${error.message}`, error.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Error al generar el archivo de exportación' 
      });
    }
  }

  @Get('statistics')
  @ApiOperation({ 
    summary: 'Obtener estadísticas generales de comisiones',
    description: 'Proporciona estadísticas agregadas y métricas clave sobre las comisiones'
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalDrivers: { type: 'number', description: 'Total de conductoras con comisiones' },
        totalRides: { type: 'number', description: 'Total de carreras completadas' },
        totalBilled: { type: 'number', description: 'Total facturado' },
        totalCommissions: { type: 'number', description: 'Total de comisiones generadas' },
        averageCommissionPercentage: { type: 'number', description: 'Porcentaje promedio de comisión' },
        topDrivers: {
          type: 'array',
          description: 'Top 5 conductoras por comisiones',
          items: {
            type: 'object',
            properties: {
              driverId: { type: 'number' },
              driverName: { type: 'string' },
              totalCommissions: { type: 'number' },
              totalRides: { type: 'number' }
            }
          }
        },
        monthlyStats: {
          type: 'array',
          description: 'Estadísticas mensuales de los últimos 12 meses',
          items: {
            type: 'object',
            properties: {
              month: { type: 'string', example: '2024-01' },
              totalCommissions: { type: 'number' },
              totalRides: { type: 'number' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async getCommissionsStatistics(@Query() query: CommissionQueryDto) {
    return this.commissionsService.getCommissionsStatistics(query);
  }
} 