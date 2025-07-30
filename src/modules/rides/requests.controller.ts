import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RidesService } from './rides.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestResponseDto, RequestStatsDto, AssignDriverToRequestDto } from './dto/request-response.dto';
import { RecentRidesQueryDto } from './dto/pagination-query.dto';

@ApiTags('requests')
@Controller('requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RequestsController {
  constructor(private readonly ridesService: RidesService) {}

  @Get('recent')
  @ApiOperation({ summary: 'Obtener carreras recientes' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de carreras recientes', 
    type: [RequestResponseDto] 
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getRecentRequests(@Query() query: RecentRidesQueryDto) {
    return await this.ridesService.findRecent(
      query.limit,
      query.start_date,
      query.end_date,
      query.search
    );
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener carreras activas' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de carreras activas (pendientes y en progreso)', 
    type: [RequestResponseDto] 
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getActiveRequests() {
    return await this.ridesService.findActive();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de carreras' })
  @ApiQuery({ 
    name: 'period', 
    required: false, 
    type: 'string', 
    description: 'Período de tiempo (today, week, month)',
    example: 'today' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas de carreras', 
    type: RequestStatsDto 
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getRequestStats(@Query('period') period: string = 'today') {
    return await this.ridesService.getRequestStats(period);
  }

  @Post(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Asignar conductora a una carrera' })
  @ApiParam({ 
    name: 'id', 
    description: 'ID de la carrera',
    type: 'number',
    example: 44
  })
  @ApiBody({
    description: 'Datos de la conductora a asignar',
    type: AssignDriverToRequestDto,
    examples: {
      example1: {
        summary: 'Asignar conductora',
        description: 'Ejemplo de asignación de conductora a una carrera',
        value: {
          driverId: 1
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'conductora asignado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'conductora asignado exitosamente' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            driver_id: { type: 'number' },
            status: { type: 'string' },
            tracking_code: { type: 'string' },
            origin: { type: 'string' },
            destination: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'BadRequest - Estado de carrera inválido, conductora no disponible, o datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'NotFound - Carrera o conductora no encontrado' })
  async assignDriverToRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignDriverDto: AssignDriverToRequestDto
  ) {
    // No usar try-catch aquí para que las excepciones de NestJS se propaguen correctamente
    // y devuelvan los códigos de estado HTTP apropiados (400, 404, etc.)
    const updatedRide = await this.ridesService.assignDriver(
      id, 
      assignDriverDto.driverId,
      `Asignado manualmente por administrador`
    );

    return {
      success: true,
      message: 'conductora asignado exitosamente',
      data: {
        id: updatedRide.id,
        driver_id: updatedRide.driver_id,
        status: updatedRide.status,
        tracking_code: updatedRide.tracking_code,
        origin: updatedRide.origin,
        destination: updatedRide.destination,
        client_id: updatedRide.client_id,
        price: updatedRide.price,
        distance: updatedRide.distance,
        duration: updatedRide.duration,
        request_date: updatedRide.request_date
      }
    };
  }
} 