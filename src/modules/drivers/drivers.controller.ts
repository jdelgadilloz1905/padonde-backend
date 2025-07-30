import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Query,
  BadRequestException,
  Logger,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UploadedFiles,
  NotFoundException
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto, ToggleDriverActiveDto } from './dto/update-driver.dto';
import { UpdateDriverDocumentsDto } from './dto/update-driver-documents.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { ReportIncidentDto } from './dto/report-incident.dto';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody, ApiQuery, ApiHeader, ApiConsumes } from '@nestjs/swagger';
import { DriverAuthGuard } from './guards/driver-auth.guard';
import { CurrentDriver } from './decorators/current-driver.decorator';
import { DriverRequestOtpDto } from './dto/driver-request-otp.dto';
import { DriverVerifyOtpDto } from './dto/driver-verify-otp.dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { DriverStatus } from '../../entities/driver.entity';
import { DailyMetricsResponseDto } from './dto/daily-metrics-response.dto';
import { S3Service } from '../uploads/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { RideHistoryQueryDto } from './dto/ride-history-query.dto';

@ApiTags('drivers')
@Controller('drivers')
export class DriversController {
  private readonly logger = new Logger(DriversController.name);

  constructor(
    private readonly driversService: DriversService,
    private readonly s3Service: S3Service,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo conductora' })
  @ApiResponse({ status: 201, description: 'conductora registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Conflicto: datos duplicados' })
  async create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todos los conductoras' })
  @ApiResponse({ status: 200, description: 'Lista de conductoras recuperada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Elementos por página', type: Number })
  @ApiQuery({ name: 'sort_by', required: false, description: 'Campo por el cual ordenar', enum: ['id', 'first_name', 'last_name', 'phone_number', 'registration_date', 'average_rating', 'status'] })
  @ApiQuery({ name: 'sort_order', required: false, description: 'Dirección de ordenamiento', enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado', enum: ['available', 'busy', 'offline', 'on_the_way'] })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre, apellido o teléfono' })
  @ApiQuery({ name: 'verified', required: false, description: 'Filtrar por verificación', type: Boolean })
  @ApiQuery({ name: 'active', required: false, description: 'Filtrar solo conductoras activos', type: Boolean })
  async findAll(@Query() queryParams: QueryDriversDto) {
    return this.driversService.findAll(queryParams);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener conductoras activos' })
  @ApiResponse({ status: 200, description: 'Lista de conductoras activos recuperada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Elementos por página', type: Number })
  @ApiQuery({ name: 'sort_by', required: false, description: 'Campo por el cual ordenar', enum: ['id', 'first_name', 'last_name', 'phone_number', 'registration_date', 'average_rating', 'status'] })
  @ApiQuery({ name: 'sort_order', required: false, description: 'Dirección de ordenamiento', enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado', enum: ['available', 'busy', 'offline', 'on_the_way'] })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre, apellido o teléfono' })
  @ApiQuery({ name: 'verified', required: false, description: 'Filtrar por verificación', type: Boolean })
  async findAllActive(@Query() queryParams: QueryDriversDto) {
    return this.driversService.findAllActive(queryParams);
  }

  @Get('profile')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil de la conductora autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil de la conductora recuperado',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        phone_number: { type: 'string' },
        email: { type: 'string' },
        verified: { type: 'boolean' },
        status: { type: 'string', enum: Object.values(DriverStatus) },
        profile_picture: { type: 'string' },
        registration_date: { type: 'string' },
        average_rating: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProfile(@CurrentDriver() driver) {
    // Obtener información actualizada de la conductora desde la base de datos
    return this.driversService.findOne(driver.id);
  }

  @Get('phone/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()

  @ApiOperation({ summary: 'Obtener un conductora por número de teléfono' })
  @ApiParam({ name: 'phone', description: 'Número de teléfono de la conductora' })
  @ApiResponse({ status: 200, description: 'conductora encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async findByPhone(@Param('phone') phone: string) {
    return this.driversService.findByPhone(phone);
  }

  @Get('n8n/phone/:phone')
  @UseGuards(ApiKeyGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
  })
  @ApiOperation({ summary: 'Obtener un conductora por número de teléfono' })
  @ApiParam({ name: 'phone', description: 'Número de teléfono de la conductora' })
  @ApiResponse({ status: 200, description: 'conductora encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async findByPhoneN8n(@Param('phone') phone: string) {
    return this.driversService.findByPhone(phone);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar datos de un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'conductora actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto: datos duplicados' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, updateDriverDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar completamente los datos de un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({
    status: 200,
    description: 'conductora actualizado completamente y datos completos devueltos',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        phone_number: { type: 'string' },
        email: { type: 'string' },
        profile_picture: { type: 'string' },
        vehicle: { type: 'string' },
        model: { type: 'string' },
        color: { type: 'string' },
        year: { type: 'number' },
        license_plate: { type: 'string' },
        driver_license: { type: 'string' },
        id_document: { type: 'string' },
        status: { type: 'string', enum: Object.values(DriverStatus) },
        current_location: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            coordinates: { type: 'array', items: { type: 'number' } }
          }
        },
        last_update: { type: 'string' },
        registration_date: { type: 'string' },
        average_rating: { type: 'string' },
        active: { type: 'boolean' },
        session_token: { type: 'string' },
        verified: { type: 'boolean' },
        otp_code: { type: 'string' },
        otp_expiry: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto: datos duplicados' })
  async fullUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, updateDriverDto);
  }

  @Patch('profile/update')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil de la conductora autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 409, description: 'Conflicto: datos duplicados' })
  async updateProfile(
    @CurrentDriver() driver,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    return this.driversService.update(driver.id, updateDriverDto);
  }


  @Patch(':id/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivar un conductora desactivado' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'conductora reactivado exitosamente' })
  @ApiResponse({ status: 400, description: 'El conductora ya está activo' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async reactivateDriver(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.reactivateDriver(id);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'conductora verificado exitosamente' })
  @ApiResponse({ status: 400, description: 'El conductora ya está verificado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async verifyDriver(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.verifyDriver(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar estado de un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Estado inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: DriverStatus,
  ) {
    return this.driversService.updateDriverStatus(id, status);
  }

  @Patch(':id/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activar o desactivar el conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiBody({
    description: 'Estado activo de la conductora',
    schema: {
      type: 'object',
      properties: {
        active: {
          type: 'boolean',
          description: 'true para activar, false para desactivar',
          example: true
        }
      },
      required: ['active']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'conductora activado o desactivado exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        phone_number: { type: 'string' },
        active: { type: 'boolean' },
        status: { type: 'string', enum: Object.values(DriverStatus) }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async toggleDriverActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() toggleDto: ToggleDriverActiveDto,
  ) {
    return this.driversService.toggleDriverActive(id, toggleDto.active);
  }

  @Patch(':id/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar documentos de un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'Documentos actualizados exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async updateDocuments(
    @Param('id', ParseIntPipe) id: number,
    @Body() documentsDto: UpdateDriverDocumentsDto,
  ) {
    return this.driversService.updateDocuments(id, documentsDto);
  }

  @Patch('profile/documents')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar documentos de la conductora autenticado' })
  @ApiResponse({ status: 200, description: 'Documentos actualizados exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateMyDocuments(
    @CurrentDriver() driver,
    @Body() documentsDto: UpdateDriverDocumentsDto,
  ) {
    return this.driversService.updateDocuments(driver.id, documentsDto);
  }

  @Patch(':id/profile-picture')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar foto de perfil de un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'Foto de perfil actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async updateProfilePicture(
    @Param('id', ParseIntPipe) id: number,
    @Body() profilePictureDto: UpdateProfilePictureDto,
  ) {
    return this.driversService.updateProfilePicture(id, profilePictureDto);
  }

  @Patch('profile/picture')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar foto de perfil de la conductora autenticado' })
  @ApiResponse({ status: 200, description: 'Foto de perfil actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateMyProfilePicture(
    @CurrentDriver() driver,
    @Body() profilePictureDto: UpdateProfilePictureDto,
  ) {
    return this.driversService.updateProfilePicture(driver.id, profilePictureDto);
  }

  @Post('incidents/report')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reportar un incidente' })
  @ApiResponse({ status: 201, description: 'Incidente reportado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async reportIncident(
    @CurrentDriver() driver,
    @Body() reportDto: ReportIncidentDto,
  ) {
    return this.driversService.reportIncident(driver.id, reportDto);
  }
  @Get('statistics/profile/me')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener estadísticas de la conductora autenticado' })
  @ApiResponse({ status: 200, description: 'Estadísticas recuperadas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMyStatistics(@CurrentDriver() driver, @Query('today') today: string) {
    console.log(today);
    return this.driversService.getDriverStatistics(driver.id, (today ?? 'true') === 'true');
  }

  @Get('statistics/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener estadísticas de un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'Estadísticas recuperadas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async getDriverStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getDriverStatistics(id);
  }

  @Get('rides/history/me')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener historial completo de la conductora autenticado',
    description: 'Obtiene el historial completo de carreras de la conductora autenticado junto con sus carreras programadas futuras. Incluye información detallada de cada viaje completado y programado.'
  })
  @ApiResponse({
    status: 200,
    description: 'Historial completo obtenido exitosamente',
    schema: {
      example: {
        driver: {
          id: 789,
          first_name: "Carlos",
          last_name: "González",
          phone_number: "+5219876543210",
          license_plate: "ABC-123"
        },
        rides: [
          {
            id: 456,
            type: "completed",
            origin: "Calle A #123",
            destination: "Calle B #456",
            status: "completed",
            price: 25.50,
            commission_amount: 2.55,
            duration: 15,
            distance: 8.5,
            request_date: "2025-01-25T10:00:00Z",
            start_date: "2025-01-25T10:05:00Z",
            end_date: "2025-01-25T10:20:00Z",
            tracking_code: "RIDE123456",
            client: {
              id: 123,
              first_name: "Juan",
              last_name: "Pérez",
              phone_number: "+5219876543210"
            }
          }
        ],
        scheduled_rides: [
          {
            id: 78,
            type: "scheduled",
            origin: "Hotel Plaza #456",
            destination: "Aeropuerto Internacional",
            status: "confirmed",
            estimated_cost: 45.00,
            estimated_duration: 35,
            scheduled_at: "2025-01-26T08:30:00Z",
            priority: "normal",
            notes: "Cliente VIP - puntualidad importante",
            client: {
              id: 124,
              first_name: "María",
              last_name: "García",
              phone_number: "+5219987654321"
            }
          }
        ],
        total_rides: 150,
        total_earned: 3825.75,
        total_commission: 382.58,
        upcoming_rides: 3
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado - Token de conductora inválido' })
  async getMyRideHistory(
    @CurrentDriver() driver,
    @Query() query: RideHistoryQueryDto
  ) {
    return this.driversService.getDriverRideHistory(driver.id, query);
  }

  @Get(':id/rides')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener historial completo de un conductora específico',
    description: 'Obtiene el historial completo de carreras de un conductora específico junto con sus carreras programadas futuras. Incluye información detallada de cada viaje completado y programado.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la conductora',
    type: 'number',
    example: 789
  })
  @ApiResponse({
    status: 200,
    description: 'Historial completo obtenido exitosamente',
    schema: {
      example: {
        driver: {
          id: 789,
          first_name: "Carlos",
          last_name: "González",
          phone_number: "+5219876543210",
          license_plate: "ABC-123"
        },
        rides: [
          {
            id: 456,
            type: "completed",
            origin: "Calle A #123",
            destination: "Calle B #456",
            origin_coordinates: "POINT(-100.3161 25.6866)",
            destination_coordinates: "POINT(-100.3089 25.6794)",
            status: "completed",
            price: 25.50,
            commission_amount: 2.55,
            duration: 15,
            distance: 8.5,
            request_date: "2025-01-25T10:00:00Z",
            start_date: "2025-01-25T10:05:00Z",
            end_date: "2025-01-25T10:20:00Z",
            tracking_code: "RIDE123456",
            client: {
              id: 123,
              first_name: "Juan",
              last_name: "Pérez",
              phone_number: "+5219876543210"
            }
          }
        ],
        scheduled_rides: [
          {
            id: 78,
            type: "scheduled",
            origin: "Hotel Plaza #456",
            destination: "Aeropuerto Internacional",
            origin_coordinates: "POINT(-100.3089 25.6794)",
            destination_coordinates: "POINT(-100.2354 25.7781)",
            status: "confirmed",
            estimated_cost: 45.00,
            estimated_duration: 35,
            scheduled_at: "2025-01-26T08:30:00Z",
            priority: "normal",
            notes: "Cliente VIP - puntualidad importante",
            created_at: "2025-01-25T14:30:00Z",
            client: {
              id: 124,
              first_name: "María",
              last_name: "García",
              phone_number: "+5219987654321"
            }
          }
        ],
        total_rides: 150,
        total_earned: 3825.75,
        total_commission: 382.58,
        upcoming_rides: 3
      }
    }
  })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - rol insuficiente' })
  async getDriverRideHistory(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getDriverRideHistory(id);
  }



  @Get('current-ride')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener carrera activa de la conductora autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Carrera activa obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        hasActiveRide: { type: 'boolean' },
        ride: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'number' },
            tracking_code: { type: 'string' },
            origin: { type: 'string' },
            destination: { type: 'string' },
            origin_coordinates: { type: 'object', description: 'Coordenadas de origen' },
            destination_coordinates: { type: 'object', description: 'Coordenadas de destino' },
            status: { type: 'string' },
            price: { type: 'number' },
            distance: { type: 'number', description: 'Distancia en kilómetros' },
            duration: { type: 'number', description: 'Duración estimada en minutos' },
            client: {
              type: 'object',
              properties: {
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                phone_number: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getCurrentRide(@CurrentDriver() driver) {
    const currentRide = await this.driversService.getCurrentRide(driver.id);

    return {
      success: true,
      hasActiveRide: !!currentRide,
      ride: currentRide ? {
        id: currentRide.id,
        tracking_code: currentRide.tracking_code,
        origin: currentRide.origin,
        destination: currentRide.destination,
        origin_coordinates: currentRide.origin_coordinates,
        destination_coordinates: currentRide.destination_coordinates,
        status: currentRide.status,
        price: currentRide.price,
        distance: currentRide.distance,
        created_at: currentRide.created_at,
        duration: currentRide.duration,
        request_date: currentRide.request_date,
        client: currentRide.client ? {
          first_name: currentRide.client.first_name,
          last_name: currentRide.client.last_name,
          phone_number: currentRide.client.phone_number
        } : null
      } : null
    };
  }

  @Post('request-otp')
  @ApiOperation({
    summary: 'Solicitar código OTP para inicio de sesión',
    description: 'Envía código OTP por SMS. Para Android, incluir platform y app_hash para detección automática.'
  })
  @ApiResponse({ status: 200, description: 'Código OTP enviado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al enviar OTP' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async requestOtp(@Body() requestOtpDto: DriverRequestOtpDto) {
    const success = await this.driversService.requestOtp(
      requestOtpDto.phone_number.replace('+', ''),
      requestOtpDto.platform,
      requestOtpDto.app_hash
    );
    return { success };
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verificar código OTP e iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso, retorna token de sesión' })
  @ApiResponse({ status: 400, description: 'Código OTP inválido o expirado' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async verifyOtp(@Body() verifyOtpDto: DriverVerifyOtpDto) {
    return this.driversService.verifyOtp(verifyOtpDto.phone_number.replace('+', ''), verifyOtpDto.otp_code);
  }

  @Post('validate-token')
  @ApiOperation({ summary: 'Validar token de conductora' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' }
      },
      required: ['token']
    }
  })
  @ApiResponse({ status: 200, description: 'Token válido' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  async validateToken(@Body() body: { token: string }) {
    const driver = await this.driversService.validateDriverToken(body.token);

    if (!driver) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return driver;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener un conductora por ID' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'conductora encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.findOne(id);
  }

  @Post('profile/update-avatar-with-url')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar foto de perfil de la conductora usando URL de imagen ya subida' })
  @ApiResponse({ status: 200, description: 'Foto de perfil actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profile_picture: {
          type: 'string',
          description: 'URL de la imagen de perfil',
          example: 'https://bucket-name.s3.region.amazonaws.com/drivers/avatars/123/image.jpg'
        }
      }
    }
  })
  async updateAvatarWithUrl(
    @CurrentDriver() driver,
    @Body('profile_picture') profilePictureUrl: string,
  ) {
    if (!profilePictureUrl) {
      throw new BadRequestException('URL de imagen no proporcionada');
    }

    return this.driversService.updateProfilePicture(driver.id, { profile_picture: profilePictureUrl });
  }

  @Post(':id/update-avatar-with-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar foto de perfil de un conductora usando URL de imagen ya subida (Admin)' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'Foto de perfil actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profile_picture: {
          type: 'string',
          description: 'URL de la imagen de perfil',
          example: 'https://bucket-name.s3.region.amazonaws.com/drivers/avatars/123/image.jpg'
        }
      }
    }
  })
  async updateAvatarWithUrlByAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body('profile_picture') profilePictureUrl: string,
  ) {
    if (!profilePictureUrl) {
      throw new BadRequestException('URL de imagen no proporcionada');
    }

    return this.driversService.updateProfilePicture(id, { profile_picture: profilePictureUrl });
  }

  @Post('start-trip')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar viaje - cambiar carrera de in_progress a on_the_way' })
  @ApiResponse({
    status: 200,
    description: 'Viaje iniciado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        ride: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            tracking_code: { type: 'string' },
            status: { type: 'string' },
            start_date: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'No se encontró carrera en progreso' })
  async startTrip(@CurrentDriver() driver) {
    const updatedRide = await this.driversService.startTrip(driver.id);

    return {
      success: true,
      message: 'Viaje iniciado exitosamente',
      ride: {
        id: updatedRide.id,
        tracking_code: updatedRide.tracking_code,
        status: updatedRide.status,
        start_date: updatedRide.start_date,
        origin: updatedRide.origin,
        destination: updatedRide.destination
      }
    };
  }

  @Post('complete-trip')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Completar viaje - cambiar carrera de on_the_way a completed' })
  @ApiResponse({
    status: 200,
    description: 'Viaje completado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        ride: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            tracking_code: { type: 'string' },
            status: { type: 'string' },
            end_date: { type: 'string' },
            price: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'No se encontró carrera en camino' })
  async completeTrip(@CurrentDriver() driver) {
    const updatedRide = await this.driversService.completeTrip(driver.id);

    return {
      success: true,
      message: 'Viaje completado exitosamente',
      ride: {
        id: updatedRide.id,
        tracking_code: updatedRide.tracking_code,
        status: updatedRide.status,
        end_date: updatedRide.end_date,
        price: updatedRide.price,
        origin: updatedRide.origin,
        destination: updatedRide.destination
      }
    };
  }

  @Get('track/:trackingCode')
  @ApiOperation({
    summary: 'Obtener información pública de seguimiento de carrera',
    description: 'Endpoint público para rastrear una carrera usando su código de seguimiento. Muestra información solo si la carrera está activa o fue completada/cancelada hace menos de 12 horas.'
  })
  @ApiParam({
    name: 'trackingCode',
    description: 'Código de seguimiento de la carrera',
    example: 'ABC123XYZ'
  })
  @ApiResponse({
    status: 200,
    description: 'Información de seguimiento obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        ride: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            tracking_code: { type: 'string' },
            origin: { type: 'string' },
            destination: { type: 'string' },
            origin_coordinates: { type: 'object' },
            destination_coordinates: { type: 'object' },
            status: { type: 'string' },
            price: { type: 'number' },
            distance: { type: 'number' },
            duration: { type: 'number' },
            request_date: { type: 'string' },
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            client: {
              type: 'object',
              properties: {
                first_name: { type: 'string' },
                phone_number: { type: 'string', description: 'Parcialmente oculto por privacidad' }
              }
            }
          }
        },
        driver: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'number' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            vehicle: { type: 'string' },
            model: { type: 'string' },
            color: { type: 'string' },
            license_plate: { type: 'string' },
            phone_number: { type: 'string', description: 'Parcialmente oculto por privacidad' },
            current_location: {
              type: 'object',
              nullable: true,
              properties: {
                longitude: { type: 'number' },
                latitude: { type: 'number' },
                last_update: { type: 'string' }
              }
            },
            average_rating: { type: 'number' }
          }
        },
        is_active: { type: 'boolean' },
        last_updated: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Código de seguimiento no válido o información no disponible' })
  async getPublicTrackingInfo(@Param('trackingCode') trackingCode: string) {
    return this.driversService.getPublicTrackingInfo(trackingCode);
  }



  @Delete('profile/active')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar temporalmente el conductora autenticado (cambiar estado a offline)' })
  @ApiResponse({ status: 200, description: 'conductora desactivado temporalmente - estado cambiado a offline' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async deactivateMyProfile(@CurrentDriver() driver) {
    return this.driversService.updateDriverStatus(driver.id, DriverStatus.OFFLINE);
  }
  @Post('profile/active')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar conductora autenticado (cambiar estado a available)' })
  @ApiResponse({ status: 200, description: 'conductora activado - estado cambiado a available' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async activateMyProfile(@CurrentDriver() driver) {
    return this.driversService.updateDriverStatus(driver.id, DriverStatus.AVAILABLE);
  }

  @Post(':id/active')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar conductora (cambiar estado a available)' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'conductora activado - estado cambiado a available' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async activateDriver(@Param('id', ParseIntPipe) id: number, @CurrentDriver() currentDriver) {
    // Verificar que el conductora solo pueda activarse a sí mismo
    if (currentDriver.id !== id) {
      throw new UnauthorizedException('Solo puedes activar tu propia cuenta');
    }
    return this.driversService.updateDriverStatus(id, DriverStatus.AVAILABLE);
  }



  @Get(':id/metrics/today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener métricas diarias de un conductora específico' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({
    status: 200,
    description: 'Métricas diarias obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        today: {
          type: 'object',
          properties: {
            completedRides: { type: 'number', example: 5 },
            dailyEarnings: { type: 'number', example: 1250.00 },
            averageRideValue: { type: 'number', example: 250.00 },
            onlineHours: { type: 'number', example: 8.5 }
          }
        },
        thisMonth: {
          type: 'object',
          properties: {
            completedRides: { type: 'number', example: 120 },
            totalEarnings: { type: 'number', example: 25600.00 },
            averagePerRide: { type: 'number', example: 213.33 },
            totalHours: { type: 'number', example: 185.5 },
            monthlyBonus: { type: 'number', example: 500.00 }
          }
        },
        timestamp: { type: 'string', format: 'date-time' },
        driverId: { type: 'number', example: 7 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async getDailyMetrics(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getDailyMetrics(id);
  }

  @Get('metrics/my-daily')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener métricas diarias de la conductora autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Métricas diarias de la conductora autenticado obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        today: {
          type: 'object',
          properties: {
            completedRides: { type: 'number', example: 5 },
            dailyEarnings: { type: 'number', example: 1250.00 },
            averageRideValue: { type: 'number', example: 250.00 },
            onlineHours: { type: 'number', example: 8.5 }
          }
        },
        thisMonth: {
          type: 'object',
          properties: {
            completedRides: { type: 'number', example: 120 },
            totalEarnings: { type: 'number', example: 25600.00 },
            averagePerRide: { type: 'number', example: 213.33 },
            totalHours: { type: 'number', example: 185.5 },
            monthlyBonus: { type: 'number', example: 500.00 }
          }
        },
        timestamp: { type: 'string', format: 'date-time' },
        driverId: { type: 'number', example: 7 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMyDailyMetrics(@CurrentDriver() driver) {
    return this.driversService.getDailyMetrics(driver.id);
  }

  @Post('test-completion-notification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Probar notificación de WhatsApp de viaje completado (Admin)',
    description: 'Endpoint de prueba para verificar que las notificaciones de WhatsApp de viaje completado funcionen correctamente'
  })
  @ApiBody({
    description: 'Datos para la prueba de notificación de viaje completado',
    schema: {
      type: 'object',
      required: ['clientPhone'],
      properties: {
        clientPhone: {
          type: 'string',
          description: 'Número de teléfono del cliente para enviar la prueba',
          example: '1234567890'
        },
        trackingCode: {
          type: 'string',
          description: 'Código de seguimiento de prueba (opcional)',
          example: 'TEST123'
        },
        origin: {
          type: 'string',
          description: 'Dirección de origen de prueba (opcional)',
          example: 'Calle Principal 123'
        },
        destination: {
          type: 'string',
          description: 'Dirección de destino de prueba (opcional)',
          example: 'Avenida Central 456'
        },
        price: {
          type: 'number',
          description: 'Precio de prueba (opcional)',
          example: 150.00
        },
        distance: {
          type: 'number',
          description: 'Distancia en km de prueba (opcional)',
          example: 5.2
        },
        duration: {
          type: 'number',
          description: 'Duración en minutos de prueba (opcional)',
          example: 15
        },
        driverName: {
          type: 'string',
          description: 'Nombre de la conductora de prueba (opcional)',
          example: 'Juan Pérez'
        },
        driverVehicle: {
          type: 'string',
          description: 'Vehículo de la conductora de prueba (opcional)',
          example: 'Toyota Corolla'
        },
        driverPlate: {
          type: 'string',
          description: 'Placa de la conductora de prueba (opcional)',
          example: 'ABC-123'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Notificación de viaje completado enviada exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al enviar notificación' })
  @ApiResponse({ status: 401, description: 'No autorizado - requiere login de administrador' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async testTripCompletionNotification(
    @Body() body: {
      clientPhone: string;
      trackingCode?: string;
      origin?: string;
      destination?: string;
      price?: number;
      distance?: number;
      duration?: number;
      driverName?: string;
      driverVehicle?: string;
      driverPlate?: string;
    }
  ) {
    try {
      const result = await this.driversService.testTripCompletionNotification(
        body.clientPhone,
        {
          trackingCode: body.trackingCode || 'TEST123',
          origin: body.origin || 'Dirección de origen de prueba',
          destination: body.destination || 'Dirección de destino de prueba',
          price: body.price || 150.00,
          distance: body.distance || 5.2,
          duration: body.duration || 15,
          driverName: body.driverName || 'Juan Pérez',
          driverVehicle: body.driverVehicle || 'Toyota Corolla',
          driverPlate: body.driverPlate || 'ABC-123'
        }
      );

      if (result) {
        this.logger.log(`Notificación de prueba de viaje completado enviada exitosamente a ${body.clientPhone}`);
        return {
          success: true,
          message: 'Notificación de viaje completado enviada exitosamente',
          clientPhone: body.clientPhone
        };
      } else {
        return {
          success: false,
          error: 'No se pudo enviar la notificación de viaje completado'
        };
      }
    } catch (error) {
      this.logger.error(`Error en prueba de notificación de viaje completado: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }



  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 204, description: 'conductora desactivado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.remove(id);
  }
  @Delete(':id/active')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar temporalmente el conductora (cambiar estado a offline)' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 200, description: 'conductora desactivado temporalmente - estado cambiado a offline' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async deactivateDriver(@Param('id', ParseIntPipe) id: number, @CurrentDriver() currentDriver) {
    this.logger.log(`Admin ${currentDriver.email} (ID: ${currentDriver.id}) deactivating driver ${id}`);
    return this.driversService.toggleDriverActive(id, false);
  }

  @Get('available-for-schedule/:dateTime')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Find available drivers for a given date and time' })
  @ApiParam({ name: 'dateTime', description: 'ISO-8601 date and time string' })
  @ApiQuery({ name: 'lat', description: 'Latitude for proximity search', required: false, type: Number })
  @ApiQuery({ name: 'lng', description: 'Longitude for proximity search', required: false, type: Number })
  findAvailableForSchedule(
    @Param('dateTime') dateTime: string,
    @Query('lat', new ParseIntPipe({ optional: true })) lat?: number,
    @Query('lng', new ParseIntPipe({ optional: true })) lng?: number,
  ) {
    return this.driversService.findAvailableForSchedule(dateTime, lat, lng);
  }

  @Post(':id/vehicle-documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir documentos del vehículo de un conductora' })
  @ApiParam({ name: 'id', description: 'ID de la conductora' })
  @ApiResponse({ status: 201, description: 'Documento subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        document_type: {
          type: 'string',
          enum: ['vehicle_photo', 'vehicle_registration', 'vehicle_insurance', 'vehicle_inspection'],
          description: 'Tipo de documento del vehículo',
        },
      },
    },
  })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'vehicle_insurance', maxCount: 1 }, 
    { name: 'vehicle_registration', maxCount: 1 }, 
    { name: 'vehicle_photo', maxCount: 1 }, 
    { name: 'driver_license', maxCount: 1 }]))
  async uploadVehicleDocument(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles(
     
    )
    files: {
      vehicle_insurance?: Express.Multer.File,
      vehicle_registration?: Express.Multer.File,
      vehicle_photo?: Express.Multer.File,
      driver_license?: Express.Multer.File,
    }
  ) {
    try {
      const driver = await this.driversService.findOne(id);
      if(!driver) {
        throw new NotFoundException(`conductora con ID ${id} no encontrado`);
      }
    const additional_photos = driver.additional_photos??{} as typeof driver.additional_photos;
    let driver_license = driver.driver_license??null;
      await Promise.all(Object.keys(files).map(async (key) => {
        
        const file = files[key]?.[0] as Express.Multer.File;
        const fileKey = `drivers/${id}/vehicle-documents/${key}/${uuidv4()}-${file.originalname.replace(/\s/g, '-')}`;
        const fileUrl = await this.s3Service.uploadFile(file, fileKey);
        if(key === 'vehicle_insurance') {
       additional_photos.vehicle_insurance = [ fileUrl];
        }
        if(key === 'vehicle_registration') {
          additional_photos.vehicle_registration = [fileUrl];
        }
        if(key === 'vehicle_photo') {
          additional_photos.vehicle_photos = [ fileUrl];
        } 
        if(key === 'driver_license') {
          driver_license = fileUrl;
        }
        return {
          url: fileUrl,
          driver_id: id,
        };
      }));
      console.log(additional_photos);
      console.log(driver_license);  
      await this.driversService.updateDocuments(id, {
        additional_photos: additional_photos as typeof driver.additional_photos,
        driver_license: driver_license,
      } as UpdateDriverDocumentsDto);

      return {
        success: true,
        driver_id: id,
      };
    } catch (error) {
      this.logger.error(`Error al subir documento del vehículo: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ========== ENDPOINT DE TESTING PARA SISTEMA DEMO ==========

  @Get('demo/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Validar que el sistema demo está funcionando para Apple TestFlight',
    description: 'Endpoint de testing para verificar que el conductora demo y los datos están correctamente configurados.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Sistema demo validado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Sistema demo funcionando correctamente',
        data: {
          demo_driver: {
            id: 123,
            first_name: 'Demo',
            last_name: 'Driver',
            phone_number: '+15550123',
            email: 'demo@taxirosa.com',
            is_demo_account: true,
            verified: true,
            active: true
          },
          demo_stats: {
            total_rides: 6,
            completed_rides: 5,
            active_rides: 1,
            total_earnings: 170.00
          },
          test_recommendations: [
            'Use phone: +15550123',
            'Use OTP: 123456 (or any 6-digit code)',
            'Driver has 5 completed rides + 1 active ride',
            'Total earnings: $170.00 from demo rides'
          ]
        }
      }
    }
  })
  async validateDemoSystem(): Promise<any> {
    try {
      this.logger.log('🧪 Testing demo system for Apple TestFlight validation');

      // 1. Verificar que el conductora demo existe
      const demoDriver = await this.driversService.findByPhone('+15550123');
      
      if (!demoDriver || !demoDriver.is_demo_account) {
        throw new NotFoundException('conductora demo no encontrado. Ejecute: npm run create-demo-data');
      }

      // 2. Obtener estadísticas de rides demo
      const demoStats = await this.driversService.getDemoRideStats(demoDriver.id);

      // 3. Verificar historial de rides
      const rideHistory = await this.driversService.getDriverRideHistory(demoDriver.id);

      return {
        success: true,
        message: '🎭 Sistema demo funcionando correctamente para Apple TestFlight',
        data: {
          demo_driver: {
            id: demoDriver.id,
            first_name: demoDriver.first_name,
            last_name: demoDriver.last_name,
            phone_number: demoDriver.phone_number,
            email: demoDriver.email,
            is_demo_account: demoDriver.is_demo_account,
            verified: demoDriver.verified,
            active: demoDriver.active,
            status: demoDriver.status,
            average_rating: demoDriver.average_rating
          },
          demo_stats: demoStats,
          ride_history_summary: {
            total_rides: rideHistory.rides?.length + rideHistory.scheduled_rides?.length || 0,
            historical_rides: rideHistory.rides?.length || 0,
            scheduled_rides: rideHistory.scheduled_rides?.length || 0,
            total_earned: rideHistory.total_earned || 0
          },
          test_instructions: [
            '📱 INSTRUCCIONES PARA APPLE TESTERS:',
            '1. Abrir app Taxi Rosa',
            '2. Introducir teléfono: +15550123',
            '3. Usar código OTP: 123456 (o cualquier código de 6 dígitos)',
            '4. Explorar dashboard, historial y funcionalidades',
            '5. El conductora tiene datos realistas de 5+ viajes completados'
          ],
          demo_features_available: [
            '✅ Login con bypass OTP',
            '✅ Dashboard con estadísticas reales',
            '✅ Historial de 5+ viajes completados',
            '✅ 1 carrera activa (in_progress)',
            '✅ Perfil completo de la conductora',
            '✅ Ratings y earnings realistas',
            '✅ WebSocket notifications (si aplicable)',
            '✅ Todas las funcionalidades core disponibles'
          ]
        }
      };

    } catch (error) {
      this.logger.error(`Error validating demo system: ${error.message}`, error.stack);
      throw new BadRequestException(`Error en sistema demo: ${error.message}`);
    }
  }

  // ========== FIN ENDPOINT DE TESTING DEMO ==========
}

