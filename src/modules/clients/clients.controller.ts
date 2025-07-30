import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Delete,
  Patch,
  Body, 
  Param, 
  UseGuards, 
  NotFoundException,
  Query,
  Header,
  Res,
  Logger,
  ParseIntPipe
} from '@nestjs/common';
import { Response } from 'express';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AssignClientZoneDto } from './dto/assign-client-zone.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { PaginatedClientsResponseDto } from './dto/paginated-clients-response.dto';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiHeader, 
  ApiBearerAuth,
  ApiQuery,
  ApiProduces,
  ApiConsumes
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  private readonly logger = new Logger(ClientsController.name);

  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener lista paginada de clientes (Admin)',
    description: 'Permite obtener una lista paginada de clientes con filtros avanzados. Incluye información sobre tarifas especiales, historial de viajes y estado VIP.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de clientes obtenida exitosamente',
    type: PaginatedClientsResponseDto,
    schema: {
      example: {
        data: [
          {
            id: 123,
            first_name: "Juan",
            last_name: "Pérez", 
            phone_number: "+584121234567",
            email: "juan.perez@email.com",
            active: true,
            flat_rate: 25.50,
            minute_rate: 2.50,
            is_vip: true,
            vip_rate_type: "flat_rate",
            registration_date: "2025-01-25T10:00:00Z",
            total_rides: 15,
            last_ride_date: "2025-01-24T15:30:00Z",
            notes: "Cliente frecuente"
          }
        ],
        meta: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 156,
          totalPages: 16,
          hasPreviousPage: false,
          hasNextPage: true
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido o expirado' })
  @ApiResponse({ status: 403, description: 'Prohibido - Rol insuficiente (requiere admin u operador)' })
  async findPaginated(@Query() queryDto: QueryClientsDto): Promise<PaginatedClientsResponseDto> {
    return this.clientsService.findPaginated(queryDto);
  }

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true,
    schema: {
      type: 'string',
      example: 'your-api-key-here'
    }
  })
  @ApiOperation({ 
    summary: 'Crear o actualizar un cliente (N8N)',
    description: 'Crea un nuevo cliente o actualiza uno existente basado en el número de teléfono. Si el cliente ya existe, actualiza sus datos. Endpoint para sistema n8n.'
  })
  @ApiConsumes('application/json')
  @ApiResponse({ 
    status: 201, 
    description: 'Cliente creado o actualizado exitosamente',
    schema: {
      example: {
        id: 123,
        first_name: "Juan",
        last_name: "Pérez",
        phone_number: "+5219876543210",
        email: "juan@example.com",
        usual_address: "Calle Principal 123",
        address_reference: "Casa azul con portón negro",
        notes: "Cliente frecuente",
        active: true,
        is_vip: false,
        flat_rate: null,
        minute_rate: null,
        registration_date: "2025-01-25T10:00:00Z"
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos - Revisar formato de campos requeridos' })
  @ApiResponse({ status: 401, description: 'API Key no válida o faltante' })
  async create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create({
      ...createClientDto,
      phone_number: `+${createClientDto.phone_number.split('@')[0].replace('+', '')}`,
      email: createClientDto.email||undefined
    });
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Crear o actualizar un cliente (Admin)',
    description: 'Permite a los administradores crear un nuevo cliente o actualizar uno existente basado en el número de teléfono. Si el cliente ya existe, actualiza sus datos.'
  })
  @ApiConsumes('application/json')
  @ApiResponse({ 
    status: 201, 
    description: 'Cliente creado o actualizado exitosamente',
    schema: {
      example: {
        id: 123,
        first_name: "Juan",
        last_name: "Pérez",
        phone_number: "+5219876543210",
        email: "juan@example.com",
        usual_address: "Calle Principal 123",
        address_reference: "Casa azul con portón negro",
        notes: "Cliente frecuente",
        active: true,
        is_vip: false,
        flat_rate: null,
        minute_rate: null,
        registration_date: "2025-01-25T10:00:00Z"
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos - Revisar formato de campos requeridos' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido o expirado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async createByAdmin(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create({
      ...createClientDto,
      phone_number: `+${createClientDto.phone_number.split('@')[0].replace('+', '')}`,
      email: createClientDto.email||undefined
    });
  }

  @Get('phone/:phone')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso del sistema n8n',
    required: true
  })
  @ApiOperation({ 
    summary: 'Verificar si existe un cliente por número de teléfono (N8N)',
    description: 'Busca un cliente por su número de teléfono y retorna si existe junto con sus datos completos incluidas las tarifas especiales. Endpoint para sistema n8n.'
  })
  @ApiParam({ 
    name: 'phone', 
    description: 'Número de teléfono del cliente (puede incluir código de país)',
    example: '+5219876543210'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Consulta realizada exitosamente',
    schema: {
      example: {
        exists: true,
        client: {
          id: 123,
          first_name: "Juan",
          last_name: "Pérez",
          phone_number: "+5219876543210",
          email: "juan@example.com",
          active: true,
          is_vip: true,
          flat_rate: 25.50,
          minute_rate: 2.50,
          usual_address: "Calle Principal 123",
          notes: "Cliente VIP"
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  async findByPhone(@Param('phone') phone: string) {
    const client = await this.clientsService.findByPhone(phone);
    return {
      exists: !!client,
      client: client
    };
  }

  @Get('admin/phone/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Verificar si existe un cliente por número de teléfono (Admin)',
    description: 'Permite a los administradores buscar un cliente por su número de teléfono y retorna si existe junto con sus datos completos incluidas las tarifas especiales.'
  })
  @ApiParam({ 
    name: 'phone', 
    description: 'Número de teléfono del cliente (puede incluir código de país)',
    example: '+5219876543210'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Consulta realizada exitosamente',
    schema: {
      example: {
        exists: true,
        client: {
          id: 123,
          first_name: "Juan",
          last_name: "Pérez",
          phone_number: "+5219876543210",
          email: "juan@example.com",
          active: true,
          is_vip: true,
          flat_rate: 25.50,
          minute_rate: 2.50,
          usual_address: "Calle Principal 123",
          notes: "Cliente VIP"
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido o expirado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador u operador' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findByPhoneAdmin(@Param('phone') phone: string) {
    const client = await this.clientsService.findByPhone(phone);
    return {
      exists: !!client,
      client: client
    };
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Exportar clientes a CSV',
    description: 'Genera un archivo CSV con todos los clientes según los filtros aplicados. Incluye campos de tarifas especiales y información VIP.'
  })
  @ApiProduces('text/csv')
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
        schema: { type: 'string', example: 'attachment; filename="clientes_2025-01-01.csv"' }
      }
    }
  })
  @ApiResponse({ status: 204, description: 'No hay datos para exportar' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador u operador' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor al generar el archivo' })
  @Header('Content-Type', 'text/csv')
  async exportClients(
    @Query() query: QueryClientsDto,
    @Res() res: Response,
  ) {
    try {
      const { data, filename } = await this.clientsService.exportClients(query);

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

      this.logger.log(`Archivo de clientes exportado: ${filename}, ${data.length} registros`);
    } catch (error) {
      this.logger.error(`Error al exportar clientes: ${error.message}`, error.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Error al generar el archivo de exportación' 
      });
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener cliente por ID con sus zonas especiales',
    description: 'Obtiene un cliente específico por su ID incluyendo información detallada sobre tarifas especiales, zonas asignadas y historial.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID único del cliente',
    type: 'number',
    example: 123
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cliente encontrado',
    schema: {
      example: {
        id: 123,
        first_name: "Juan",
        last_name: "Pérez",
        phone_number: "+5219876543210",
        email: "juan@example.com",
        active: true,
        is_vip: true,
        flat_rate: 25.50,
        minute_rate: 2.50,
        usual_address: "Calle Principal 123",
        notes: "Cliente VIP con tarifas especiales",
        specialZones: [
          {
            id: 1,
            name: "Centro",
            special_flat_rate: 30.00
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - rol insuficiente' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findOneWithZones(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Actualizar cliente existente',
    description: 'Actualiza la información de un cliente existente incluyendo tarifas especiales, estado VIP y datos personales.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID único del cliente a actualizar',
    type: 'number',
    example: 123
  })
  @ApiConsumes('application/json')
  @ApiResponse({ 
    status: 200, 
    description: 'Cliente actualizado exitosamente',
    schema: {
      example: {
        id: 123,
        first_name: "Juan Carlos",
        last_name: "Pérez",
        phone_number: "+5219876543210",
        email: "juan.carlos@example.com",
        active: true,
        is_vip: true,
        flat_rate: 30.00,
        minute_rate: 3.00,
        usual_address: "Calle Actualizada 456",
        notes: "Cliente VIP actualizado"
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos - Revisar formato de campos' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - rol insuficiente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto
  ) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Get(':id/rides')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener historial de rides de un cliente',
    description: 'Obtiene el historial completo de carreras de un cliente específico con información detallada.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID único del cliente',
    type: 'number',
    example: 123
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Historial de rides obtenido exitosamente',
    schema: {
      example: {
        client: {
          id: 123,
          first_name: "Juan",
          last_name: "Pérez",
          phone_number: "+5219876543210"
        },
        rides: [
          {
            id: 456,
            origin: "Calle A #123",
            destination: "Calle B #456",
            status: "completed",
            price: 25.50,
            duration: 15,
            distance: 8.5,
            request_date: "2025-01-25T10:00:00Z",
            start_date: "2025-01-25T10:05:00Z",
            end_date: "2025-01-25T10:20:00Z",
            driver: {
              id: 789,
              first_name: "Carlos",
              last_name: "González"
            }
          }
        ],
        total_rides: 25,
        total_spent: 650.50
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - rol insuficiente' })
  async getClientRideHistory(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.getClientRideHistory(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Eliminar o desactivar un cliente (Admin)',
    description: 'Elimina permanentemente un cliente si no tiene carreras, o lo desactiva si tiene carreras realizadas. Solo administradores pueden usar este endpoint.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del cliente a eliminar/desactivar',
    example: 123
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cliente procesado exitosamente',
    schema: {
      example: {
        success: true,
        message: "Cliente desactivado - No se puede eliminar porque tiene carreras realizadas",
        action: "deactivated",
        rides_count: 15
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido o expirado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.deleteOrDeactivateClient(id);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Inactivar un cliente (Admin)',
    description: 'Inactiva un cliente cambiando su estado activo a false. El cliente seguirá existiendo en la base de datos pero no será considerado activo. Solo administradores pueden usar este endpoint.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del cliente a inactivar',
    example: 123
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cliente inactivado exitosamente',
    schema: {
      example: {
        success: true,
        message: "Cliente inactivado exitosamente",
        client: {
          id: 123,
          first_name: "Juan",
          last_name: "Pérez",
          phone_number: "+584121234567",
          active: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cliente ya estaba inactivo',
    schema: {
      example: {
        success: true,
        message: "El cliente ya estaba inactivo",
        client: {
          id: 123,
          first_name: "Juan",
          last_name: "Pérez", 
          phone_number: "+584121234567",
          active: false
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido o expirado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async toggleActiveClient(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.toggleActiveClient(id);
  }

  @Post(':clientId/zones/:zoneId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Asignar cliente a zona con tarifa especial',
    description: 'Asigna un cliente a una zona específica con una tarifa especial opcional. Permite establecer precios personalizados por zona para clientes VIP.'
  })
  @ApiParam({ 
    name: 'clientId', 
    description: 'ID único del cliente',
    type: 'number',
    example: 123
  })
  @ApiParam({ 
    name: 'zoneId', 
    description: 'ID único de la zona',
    type: 'number',
    example: 1
  })
  @ApiConsumes('application/json')
  @ApiResponse({ 
    status: 201, 
    description: 'Cliente asignado a zona exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Cliente asignado a zona exitosamente'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos - Verificar IDs y tarifa especial' })
  @ApiResponse({ status: 404, description: 'Cliente o zona no encontrados' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async assignToZone(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('zoneId', ParseIntPipe) zoneId: number,
    @Body() assignClientZoneDto: AssignClientZoneDto
  ) {
    await this.clientsService.assignToZone(
      clientId, 
      zoneId, 
      assignClientZoneDto.special_flat_rate
    );
    return { 
      success: true,
      message: 'Cliente asignado a zona exitosamente' 
    };
  }

  @Delete(':clientId/zones/:zoneId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Remover cliente de zona específica',
    description: 'Remueve la asignación de un cliente a una zona específica eliminando cualquier tarifa especial asociada.'
  })
  @ApiParam({ 
    name: 'clientId', 
    description: 'ID único del cliente',
    type: 'number',
    example: 123
  })
  @ApiParam({ 
    name: 'zoneId', 
    description: 'ID único de la zona',
    type: 'number',
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cliente removido de zona exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Cliente removido de zona exitosamente'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Cliente, zona o relación no encontrados' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - requiere rol de administrador' })
  async removeFromZone(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('zoneId', ParseIntPipe) zoneId: number
  ) {
    await this.clientsService.removeFromZone(clientId, zoneId);
    return { 
      success: true,
      message: 'Cliente removido de zona exitosamente' 
    };
  }
} 