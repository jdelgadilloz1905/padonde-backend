import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CancellationsService } from './cancellations.service';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { CancellationReasonResponseDto } from './dto/cancellation-reason-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('cancellations')
@Controller('cancellations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CancellationsController {
  constructor(private readonly cancellationsService: CancellationsService) {}

  @Get('reasons')
  @ApiOperation({ summary: 'Obtener motivos de cancelación disponibles' })
  @ApiQuery({ 
    name: 'userType', 
    enum: ['client', 'driver'], 
    description: 'Tipo de usuario para filtrar motivos' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de motivos de cancelación', 
    type: [CancellationReasonResponseDto] 
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getCancellationReasons(@Query('userType') userType: 'client' | 'driver') {
    return await this.cancellationsService.getCancellationReasons(userType);
  }

  @Post('rides/:rideId/cancel')
  @ApiOperation({ summary: 'Cancelar una carrera' })
  @ApiResponse({ status: 200, description: 'Carrera cancelada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o carrera no se puede cancelar' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No puedes cancelar esta carrera' })
  @ApiResponse({ status: 404, description: 'Carrera o motivo de cancelación no encontrado' })
  async cancelRide(
    @Param('rideId', ParseIntPipe) rideId: number,
    @Body() cancelRideDto: CancelRideDto,
    @Request() req
  ) {
    return await this.cancellationsService.cancelRide(
      rideId, 
      cancelRideDto, 
      req.user.id, 
      req.user.role
    );
  }

  // Endpoints administrativos
  @Post('reasons')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Crear un nuevo motivo de cancelación (Solo admin)' })
  @ApiResponse({ status: 201, description: 'Motivo creado exitosamente', type: CancellationReasonResponseDto })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  async createCancellationReason(
    @Body() body: { reason: string; description: string; userType: string }
  ) {
    return await this.cancellationsService.createCancellationReason(
      body.reason,
      body.description,
      body.userType
    );
  }
} 