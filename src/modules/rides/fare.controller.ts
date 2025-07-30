import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  ParseIntPipe,
  Logger,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FareService } from './fare.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Zone } from '../../entities/zone.entity';

@ApiTags('zones')
@Controller('zones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FareController {
  private readonly logger = new Logger(FareController.name);

  constructor(private readonly fareService: FareService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Crear una nueva zona de tarifa',
    description: 'Crea una nueva zona con configuración de tarifa. Puede usar rate_type para definir si usa tarifa plana o por minuto.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Zona creada exitosamente',
    schema: {
      example: {
        id: 1,
        name: "Centro",
        price_per_minute: 3.50,
        minimum_fare: 15.00,
        flat_rate: 25.00,
        rate_type: "flat_rate",
        night_rate_percentage: 20.00,
        weekend_rate_percentage: 15.00,
        commission_percentage: 10.00,
        active: true,
        has_special_clients: false,
        created_at: "2025-01-25T10:00:00Z",
        updated_at: "2025-01-25T10:00:00Z"
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos - Verificar formato de campos requeridos' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido' })
  async create(@Body() createZoneDto: CreateZoneDto): Promise<Zone> {
    return this.fareService.createZone(createZoneDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las zonas activas' })
  @ApiResponse({ status: 200, description: 'Lista de zonas obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiQuery({ type: PaginationQueryDto })
  async findAll(@Query() paginationQuery: PaginationQueryDto &{inactive: boolean}): Promise<{ 
    data: Zone[], 
    total: number, 
    page: number, 
    limit: number, 
    totalPages: number 
  }> {
    return this.fareService.findAllZones(paginationQuery.page, paginationQuery.limit, paginationQuery.inactive);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener una zona por ID',
    description: 'Obtiene los detalles completos de una zona incluyendo su configuración de tarifa (rate_type).'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID único de la zona',
    type: 'number',
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Zona encontrada',
    schema: {
      example: {
        id: 1,
        name: "Centro",
        price_per_minute: 3.50,
        minimum_fare: 15.00,
        flat_rate: 25.00,
        rate_type: "flat_rate",
        night_rate_percentage: 20.00,
        weekend_rate_percentage: 15.00,
        commission_percentage: 10.00,
        active: true,
        has_special_clients: true,
        created_at: "2025-01-25T10:00:00Z",
        updated_at: "2025-01-25T10:00:00Z",
        specialClients: []
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido' })
  @ApiResponse({ status: 404, description: 'Zona no encontrada' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Zone> {
    return this.fareService.findOneZone(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una zona' })
  @ApiParam({ name: 'id', description: 'ID de la zona' })
  @ApiResponse({ status: 200, description: 'Zona actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Zona no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateZoneDto: UpdateZoneDto,
  ): Promise<Zone> {
    return this.fareService.updateZone(id, updateZoneDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una zona' })
  @ApiParam({ name: 'id', description: 'ID de la zona' })
  @ApiResponse({ status: 200, description: 'Zona desactivada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Zona no encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
     return this.fareService.deleteZone(id);
  }

  @Post('calculate-fare-priorities')
  @ApiOperation({ 
    summary: 'Calcular tarifa con sistema de prioridades',
    description: `Calcula la tarifa usando el sistema completo de prioridades:
    1. Cliente VIP con vip_rate_type='flat_rate' → tarifa plana del cliente
    2. Cliente VIP con vip_rate_type='minute_rate' → tarifa por minuto del cliente  
    3. Cliente en zona especial → tarifa especial zona-cliente
    4. Zona con rate_type='flat_rate' → tarifa plana de la zona
    5. Zona con rate_type='minute_rate' → tarifa por minuto de la zona
    6. Cálculo por defecto → price_per_minute de la zona`
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tarifa calculada exitosamente',
    schema: {
      example: {
        baseFare: 25.00,
        finalFare: 32.50,
        zoneId: 1,
        zoneName: "Centro",
        commissionPercentage: 10.00,
        commissionAmount: 2.50,
        calculationType: "client_vip_flat_rate",
        clientType: "vip_flat",
        breakdown: {
          timeCost: 0,
          nightSurcharge: 0,
          weekendSurcharge: 0
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos - Verificar coordenadas y duración' })
  @ApiResponse({ status: 404, description: 'Cliente o zona no encontrados' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido' })
  async calculateFareWithPriorities(
    @Body() body: {
      clientId: number;
      originCoordinates: string;
      duration: number;
    }
  ) {
    const { clientId, originCoordinates, duration } = body;
    
    this.logger.log(`Calculando tarifa con prioridades - Cliente: ${clientId}, Duración: ${duration} min`);
    
    return this.fareService.calculateFareWithPriorities(
      clientId,
      originCoordinates,
      duration
    );
  }
} 