import { Injectable, ConflictException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository, SelectQueryBuilder } from 'typeorm';
import { Client } from '../../entities/client.entity';
import { Zone } from '../../entities/zone.entity';
import { ZoneClient } from '../../entities/zone-client.entity';
import { Ride } from '../../entities/ride.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { PaginatedClientsResponseDto, ClientSummaryDto } from './dto/paginated-clients-response.dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(Zone)
    private zonesRepository: Repository<Zone>,
    @InjectRepository(ZoneClient)
    private zoneClientsRepository: Repository<ZoneClient>,
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    try {
      // Verificar si ya existe un cliente con el mismo teléfono
      const existingClientByPhone = await this.clientsRepository.findOne({
        where: { phone_number: Like(`%${createClientDto.phone_number.split('@')[0]}%`) }
      });

      if (existingClientByPhone) {
        return existingClientByPhone; // Si ya existe, devolver el cliente existente
      }

      // Verificar si ya existe un cliente con el mismo email (si se proporciona)
      if (createClientDto.email) {
        const existingClientByEmail = await this.clientsRepository.findOne({
          where: { email: createClientDto.email }
        });

        if (existingClientByEmail) {
          throw new ConflictException('Ya existe un cliente con este correo electrónico');
        }
      }
      
      // Crear nuevo cliente
      const newClient = this.clientsRepository.create({
        ...createClientDto,
        active: true,
        registration_date: new Date(),
      });

      const savedClient = await this.clientsRepository.save(newClient);
      
      this.logger.log(`Nuevo cliente registrado con ID: ${savedClient.id}`);
      
      return savedClient;
    } catch (error) {
      this.logger.error(`Error al crear cliente: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByPhone(phone: string): Promise<Client | null> {
    try {
      const client = await this.clientsRepository.findOne({ 
        where: { phone_number: Like(`%${phone.split('@')[0]}%`) } 
      });
      
      return client;
    } catch (error) {
      this.logger.error(`Error al buscar cliente por teléfono: ${error.message}`, error.stack);
      throw error;
    }
  }

    
  async findOne(id: number): Promise<Client> {
    const client = await this.clientsRepository.findOne({ where: { id } });
    
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    
    return client;
  }

  /**
   * Obtiene una lista paginada de clientes con búsqueda y filtros
   */
  async findPaginated(queryDto: QueryClientsDto): Promise<PaginatedClientsResponseDto> {
    try {
      const { page, limit, search, active, sortBy, sortOrder, dateFrom, dateTo } = queryDto;
      
      // Calcular offset
      const offset = (page - 1) * limit;

      // Crear query builder con join a rides para contar carreras
      const queryBuilder = this.clientsRepository
        .createQueryBuilder('client')
        .leftJoin('client.rides', 'rides')
        .select([
          'client.id',
          'client.first_name',
          'client.last_name',
          'client.phone_number',
          'client.email',
          'client.active',
          'client.registration_date',
          'client.flat_rate',
          'client.minute_rate',
          'client.is_vip',
          'client.vip_rate_type',
          'client.notes',
        ])
        .addSelect('COUNT(rides.id)', 'total_rides')
        .addSelect('MAX(rides.created_at)', 'last_ride_date')
        .groupBy('client.id');

      // Aplicar filtros
      this.applyFilters(queryBuilder, { search, active, dateFrom, dateTo });

      // Aplicar ordenamiento
      this.applySorting(queryBuilder, sortBy, sortOrder);

      // Contar total de elementos (antes de paginación)
      const totalQueryBuilder = this.clientsRepository
        .createQueryBuilder('client');
      this.applyFilters(totalQueryBuilder, { search, active, dateFrom, dateTo });
      const totalItems = await totalQueryBuilder.getCount();

      // Aplicar paginación
      queryBuilder
        .offset(offset)
        .orderBy('client.registration_date', 'DESC')
        .addOrderBy('client.first_name', 'ASC')
        .limit(limit);

      // Ejecutar consulta
      const rawResults = await queryBuilder.getRawMany();

      // Mapear resultados
      const clients: ClientSummaryDto[] = rawResults.map(row => ({
        id: row.client_id,
        first_name: row.client_first_name,
        last_name: row.client_last_name,
        phone_number: row.client_phone_number,
        email: row.client_email,
        active: row.client_active,
        flat_rate: row.client_flat_rate ? parseFloat(row.client_flat_rate) : null,
        minute_rate: row.client_minute_rate ? parseFloat(row.client_minute_rate) : null,
        is_vip: row.client_is_vip || false,
        vip_rate_type: row.client_vip_rate_type || null,
        registration_date: row.client_registration_date,
        total_rides: parseInt(row.total_rides) || 0,
        last_ride_date: row.last_ride_date || null,
        notes: row.client_notes || null,
      }));

      // Calcular metadata de paginación
      const totalPages = Math.ceil(totalItems / limit);

      const meta = {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      };

      // Información de consulta
      const queryInfo = {
        searchTerm: search,
        filters: { active, dateFrom, dateTo },
        sortBy,
        sortOrder,
      };

      this.logger.log(`Consulta paginada de clientes: página ${page}/${totalPages}, ${totalItems} total`);

      return {
        data: clients,
        meta,
        queryInfo,
      };
    } catch (error) {
      this.logger.error(`Error en consulta paginada de clientes: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Aplica filtros al query builder
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<Client>,
    filters: { search?: string; active?: boolean; dateFrom?: string; dateTo?: string }
  ): void {
    const { search, active, dateFrom, dateTo } = filters;

    // Filtro de búsqueda
    if (search) {
      queryBuilder.andWhere(
        '(client.first_name ILIKE :search OR client.last_name ILIKE :search OR client.phone_number ILIKE :search OR client.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filtro de estado activo
    if (active !== undefined) {
      queryBuilder.andWhere('client.active = :active', { active });
    }

    // Filtros de fecha
    if (dateFrom) {
      queryBuilder.andWhere('client.registration_date >= :dateFrom', { 
        dateFrom: new Date(dateFrom) 
      });
    }

    if (dateTo) {
      queryBuilder.andWhere('client.registration_date <= :dateTo', { 
        dateTo: new Date(dateTo + ' 23:59:59') 
      });
    }
  }

  /**
   * Aplica ordenamiento al query builder
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<Client>,
    sortBy: string,
    sortOrder: 'ASC' | 'DESC'
  ): void {
    const validSortFields = ['registration_date', 'first_name', 'last_name', 'phone_number'];
    
    if (validSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`client.${sortBy}`, sortOrder);
    } else {
      // Ordenamiento por defecto
      queryBuilder.orderBy('client.registration_date', 'DESC');
    }
  }

  /**
   * Exporta clientes a CSV
   */
  async exportClients(queryDto: QueryClientsDto): Promise<{
    data: any[];
    filename: string;
  }> {
    try {
      const { search, active, dateFrom, dateTo } = queryDto;

      // Crear query builder para exportación (sin paginación)
      const queryBuilder = this.clientsRepository
        .createQueryBuilder('client')
        .leftJoin('client.rides', 'rides')
        .select([
          'client.id',
          'client.first_name',
          'client.last_name',
          'client.phone_number',
          'client.email',
          'client.active',
          'client.registration_date',
          'client.flat_rate',
          'client.minute_rate',
          'client.is_vip',
          'client.vip_rate_type',
          'client.notes',
        ])
        .addSelect('COUNT(rides.id)', 'total_rides')
        .addSelect('MAX(rides.created_at)', 'last_ride_date')
        .addSelect('MIN(rides.created_at)', 'first_ride_date')
        .groupBy('client.id');

      // Aplicar filtros
      this.applyFilters(queryBuilder, { search, active, dateFrom, dateTo });

      // Aplicar ordenamiento por fecha de registro (más recientes primero)
      this.applySorting(queryBuilder, 'registration_date', 'DESC');

      // Ejecutar consulta
      const rawResults = await queryBuilder.getRawMany();

      // Transformar datos para exportación
      const data = rawResults.map(row => ({
        'ID': row.client_id,
        'Nombre': row.client_first_name || '',
        'Apellido': row.client_last_name || '',
        'Nombre Completo': `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim() || 'Sin nombre',
        'Teléfono': row.client_phone_number || '',
        'Email': row.client_email || '',
        'Estado': row.client_active ? 'Activo' : 'Inactivo',
        'Cliente VIP': row.client_is_vip ? 'Sí' : 'No',
        'Tipo Tarifa VIP': row.client_vip_rate_type === 'flat_rate' ? 'Tarifa Plana' : 
                           row.client_vip_rate_type === 'minute_rate' ? 'Por Minuto' : '',
        'Tarifa Plana': row.client_flat_rate ? parseFloat(row.client_flat_rate).toFixed(2) : '',
        'Tarifa por Minuto': row.client_minute_rate ? parseFloat(row.client_minute_rate).toFixed(2) : '',
        'Notas': row.client_notes || '',
        'Fecha de Registro': row.client_registration_date ? 
          new Date(row.client_registration_date).toISOString().split('T')[0] : '',
        'Total de Carreras': parseInt(row.total_rides) || 0,
        'Primera Carrera': row.first_ride_date ? 
          new Date(row.first_ride_date).toISOString().split('T')[0] : 'Sin carreras',
        'Última Carrera': row.last_ride_date ? 
          new Date(row.last_ride_date).toISOString().split('T')[0] : 'Sin carreras',
        'Días desde Registro': row.client_registration_date ? 
          Math.floor((new Date().getTime() - new Date(row.client_registration_date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      }));

      // Generar nombre de archivo
      const dateRange = dateFrom && dateTo 
        ? `_${dateFrom}_${dateTo}` 
        : `_${new Date().toISOString().split('T')[0]}`;
      
      const statusFilter = active === true ? '_activos' : active === false ? '_inactivos' : '';
      const searchFilter = search ? `_busqueda-${search.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}` : '';
      
      const filename = `clientes${dateRange}${statusFilter}${searchFilter}.csv`;

      this.logger.log(`Exportación de clientes generada: ${data.length} registros`);

      return {
        data,
        filename
      };
    } catch (error) {
      this.logger.error(`Error al exportar clientes: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Actualiza un cliente existente
   */
  async update(id: number, updateClientDto: UpdateClientDto): Promise<Client> {
    try {
      const client = await this.findOne(id);
      
      // Validar datos de tarifa
      this.validateTariffData(updateClientDto);
      
      // Aplicar cambios
      Object.assign(client, updateClientDto);
      
      const updatedClient = await this.clientsRepository.save(client);
      
      this.logger.log(`Cliente actualizado: ID ${id}`);
      
      return updatedClient;
    } catch (error) {
      this.logger.error(`Error al actualizar cliente ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Desactiva un cliente (soft delete)
   */
  async remove(id: number): Promise<void> {
    try {
      const client = await this.findOne(id);
      
      // Soft delete - solo desactivar
      client.active = false;
      await this.clientsRepository.save(client);
      
      this.logger.log(`Cliente desactivado: ID ${id}`);
    } catch (error) {
      this.logger.error(`Error al desactivar cliente ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Asigna un cliente a una zona con tarifa especial
   */
  async assignToZone(clientId: number, zoneId: number, specialRate?: number): Promise<void> {
    try {
      // Verificar que cliente y zona existen
      const client = await this.findOne(clientId);
      const zone = await this.zonesRepository.findOne({ where: { id: zoneId, active: true } });
      
      if (!zone) {
        throw new NotFoundException(`Zona con ID ${zoneId} no encontrada`);
      }

      // Verificar si ya existe la relación
      const existing = await this.zoneClientsRepository.findOne({
        where: { client_id: clientId, zone_id: zoneId }
      });

      if (existing) {
        // Actualizar relación existente
        existing.special_flat_rate = specialRate;
        existing.active = true;
        await this.zoneClientsRepository.save(existing);
        this.logger.log(`Relación cliente-zona actualizada: Cliente ${clientId} - Zona ${zoneId}`);
      } else {
        // Crear nueva relación
        const zoneClient = this.zoneClientsRepository.create({
          client_id: clientId,
          zone_id: zoneId,
          special_flat_rate: specialRate,
          active: true,
        });
        
        await this.zoneClientsRepository.save(zoneClient);
        this.logger.log(`Cliente asignado a zona: Cliente ${clientId} - Zona ${zoneId}`);
      }

      // Actualizar flag de zona si es necesario
      if (!zone.has_special_clients) {
        zone.has_special_clients = true;
        await this.zonesRepository.save(zone);
      }

    } catch (error) {
      this.logger.error(`Error al asignar cliente ${clientId} a zona ${zoneId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remueve un cliente de una zona específica
   */
  async removeFromZone(clientId: number, zoneId: number): Promise<void> {
    try {
      const zoneClient = await this.zoneClientsRepository.findOne({
        where: { client_id: clientId, zone_id: zoneId }
      });

      if (!zoneClient) {
        throw new NotFoundException(`No existe relación entre cliente ${clientId} y zona ${zoneId}`);
      }

      // Soft delete - desactivar relación
      zoneClient.active = false;
      await this.zoneClientsRepository.save(zoneClient);

      this.logger.log(`Cliente removido de zona: Cliente ${clientId} - Zona ${zoneId}`);
    } catch (error) {
      this.logger.error(`Error al remover cliente ${clientId} de zona ${zoneId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene un cliente con sus relaciones de zonas especiales
   */
  async findOneWithZones(id: number): Promise<Client> {
    try {
      const client = await this.clientsRepository.findOne({
        where: { id },
        relations: ['specialZones']
      });

      if (!client) {
        throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      }

      return client;
    } catch (error) {
      this.logger.error(`Error al obtener cliente con zonas ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Valida los datos de tarifa del cliente
   */
  private validateTariffData(updateDto: UpdateClientDto): void {
    const { flat_rate, minute_rate, is_vip, vip_rate_type } = updateDto;

    // Si es VIP, debe tener al menos una tarifa personalizada
    if (is_vip && !flat_rate && !minute_rate) {
      throw new BadRequestException('Cliente VIP debe tener al menos una tarifa personalizada (flat_rate o minute_rate)');
    }

    // Si es VIP, debe tener un tipo de tarifa
    if (is_vip && !vip_rate_type) {
      throw new BadRequestException('Cliente VIP debe tener un tipo de tarifa');
    }

    // Si tiene tarifa personalizada, debe ser VIP
    if ((flat_rate || minute_rate) && is_vip === false) {
      throw new BadRequestException('Cliente con tarifas personalizadas debe ser marcado como VIP');
    }

    // Validar rangos de tarifas
    if (flat_rate !== undefined && flat_rate !== null) {
      if (isNaN(flat_rate) || flat_rate < 0 || flat_rate > 9999999.99) {
        throw new BadRequestException('La tarifa plana debe ser un número entre 0 y 9,999,999.99');
      }
    }

    if (minute_rate !== undefined && minute_rate !== null) {
      if (isNaN(minute_rate) || minute_rate < 0 || minute_rate > 9999.99) {
        throw new BadRequestException('La tarifa por minuto debe ser un número entre 0 y 9,999.99');
      }
    }
  }

  /**
   * Obtiene el historial completo de rides de un cliente
   */
  async getClientRideHistory(clientId: number): Promise<{
    client: {
      id: number;
      first_name: string;
      last_name: string;
      phone_number: string;
    };
    rides: any[];
    total_rides: number;
    total_spent: number;
  }> {
    try {
      // Verificar que el cliente existe
      const client = await this.findOne(clientId);

      // Obtener rides del cliente con información de la conductora
      const result = await this.ridesRepository
        .createQueryBuilder('ride')
        .leftJoinAndSelect('ride.driver', 'driver')
        .addSelect('ST_AsText(ride.origin_coordinates)', 'origin_coordinates_text')
        .addSelect('ST_AsText(ride.destination_coordinates)', 'destination_coordinates_text')
        .where('ride.client_id = :clientId', { clientId })
        .orderBy('ride.created_at', 'DESC')
        .getRawAndEntities();

      const rides = result.entities;
      const rawData = result.raw;

      // Calcular estadísticas
      const totalRides = rides.length;
      const totalSpent = rides
        .filter(ride => ride.price !== null)
        .reduce((sum, ride) => sum + parseFloat(ride.price.toString()), 0);

      // Formatear respuesta
      const formattedRides = rides.map((ride, index) => ({
        id: ride.id,
        origin: ride.origin,
        destination: ride.destination,
        origin_coordinates: rawData[index]?.origin_coordinates_text || null,
        destination_coordinates: rawData[index]?.destination_coordinates_text || null,
        status: ride.status,
        price: ride.price ? parseFloat(ride.price.toString()) : null,
        duration: ride.duration,
        distance: ride.distance ? parseFloat(ride.distance.toString()) : null,
        request_date: ride.request_date,
        start_date: ride.start_date,
        end_date: ride.end_date,
        payment_method: ride.payment_method,
        client_rating: ride.client_rating,
        driver_rating: ride.driver_rating,
        cancelled_by: ride.canceled_by,
        cancellation_reason: ride.cancellation_reason,
        tracking_code: ride.tracking_code,
        driver: ride.driver ? {
          id: ride.driver.id,
          first_name: ride.driver.first_name,
          last_name: ride.driver.last_name,
          license_plate: ride.driver.license_plate
        } : null
      }));

      this.logger.log(`Historial de rides obtenido para cliente ${clientId}: ${totalRides} carreras`);

      return {
        client: {
          id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          phone_number: client.phone_number
        },
        rides: formattedRides,
        total_rides: totalRides,
        total_spent: parseFloat(totalSpent.toFixed(2))
      };
    } catch (error) {
      this.logger.error(`Error al obtener historial de rides del cliente ${clientId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Elimina un cliente permanentemente si no tiene rides, o lo desactiva si tiene rides
   */
  async deleteOrDeactivateClient(id: number): Promise<{
    success: boolean;
    message: string;
    action: 'deleted' | 'deactivated';
    rides_count?: number;
  }> {
    try {
      // Verificar que el cliente existe
      const client = await this.findOne(id);

      // Contar rides del cliente
      const ridesCount = await this.ridesRepository
        .createQueryBuilder('ride')
        .where('ride.client_id = :clientId', { clientId: id })
        .getCount();

      if (ridesCount > 0) {
        // Cliente tiene rides, solo desactivar
        await this.clientsRepository.update(id, { active: false });
        
        this.logger.log(`Cliente ${id} desactivado - tiene ${ridesCount} carreras realizadas`);
        
        return {
          success: true,
          message: 'Cliente desactivado - No se puede eliminar porque tiene carreras realizadas',
          action: 'deactivated',
          rides_count: ridesCount
        };
      } else {
        // Cliente no tiene rides, eliminar permanentemente
        
        // Primero eliminar relaciones con zonas si existen
        await this.zoneClientsRepository.delete({ client_id: id });
        
        // Luego eliminar el cliente
        await this.clientsRepository.delete(id);
        
        this.logger.log(`Cliente ${id} eliminado permanentemente de la base de datos`);
        
        return {
          success: true,
          message: 'Cliente eliminado permanentemente de la base de datos',
          action: 'deleted'
        };
      }
    } catch (error) {
      this.logger.error(`Error al procesar eliminación del cliente ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Inactiva un cliente cambiando su estado a false
   */
  async toggleActiveClient(id: number): Promise<{
    success: boolean;
    message: string;
    client: {
      id: number;
      first_name: string;
      last_name: string;
      phone_number: string;
      active: boolean;
    };
  }> {
    let active = false;
    try {
      // Verificar que el cliente existe
      const client = await this.findOne(id);

      if (client.active) {
        // Inactivar el cliente
        await this.clientsRepository.update(id, { active: false });
        active = false;
      } else {
        // Activar el cliente
        await this.clientsRepository.update(id, { active: true });
        active = true;
      }

      this.logger.log(`Cliente ${id} ${client.active ? 'inactivado' : 'activado'} exitosamente`);
      
      return {
        success: true,
        message: `Cliente ${client.active ? 'inactivado' : 'activado'} exitosamente`,
        client: {
          id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          phone_number: client.phone_number,
          active: active
        }
      };
    } catch (error) {
      this.logger.error(`Error al ${active ? 'inactivar' : 'activar'}   cliente ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }
} 