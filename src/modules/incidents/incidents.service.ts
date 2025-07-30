import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from '../../entities/incident.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto, IncidentStatus } from './dto/update-incident.dto';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
  ) {}

  async create(createIncidentDto: CreateIncidentDto): Promise<Incident> {
    const incident = this.incidentRepository.create({
      ...createIncidentDto,
      status: IncidentStatus.OPEN,
    });
    return await this.incidentRepository.save(incident);
  }

  async findAll(): Promise<Incident[]> {
    return await this.incidentRepository.find({
      relations: ['driver', 'ride'],
      order: { report_date: 'DESC' },
    });
  }

  async findByDriver(driverId: number): Promise<Incident[]> {
    return await this.incidentRepository.find({
      where: { driver_id: driverId },
      relations: ['driver', 'ride'],
      order: { report_date: 'DESC' },
    });
  }

  async findByStatus(status: IncidentStatus): Promise<Incident[]> {
    return await this.incidentRepository.find({
      where: { status },
      relations: ['driver', 'ride'],
      order: { report_date: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({
      where: { id },
      relations: ['driver', 'ride'],
    });

    if (!incident) {
      throw new NotFoundException(`Incidente con ID ${id} no encontrado`);
    }

    return incident;
  }

  async update(id: number, updateIncidentDto: UpdateIncidentDto): Promise<Incident> {
    const incident = await this.findOne(id);
    
    // Si se está resolviendo el incidente, agregar fecha de resolución
    if (updateIncidentDto.status === IncidentStatus.RESOLVED && 
        incident.status !== IncidentStatus.RESOLVED) {
      updateIncidentDto['resolution_date'] = new Date();
    }

    Object.assign(incident, updateIncidentDto);
    return await this.incidentRepository.save(incident);
  }

  async remove(id: number): Promise<void> {
    const incident = await this.findOne(id);
    await this.incidentRepository.remove(incident);
  }

  async getStatistics() {
    const total = await this.incidentRepository.count();
    const open = await this.incidentRepository.count({ 
      where: { status: IncidentStatus.OPEN } 
    });
    const inProgress = await this.incidentRepository.count({ 
      where: { status: IncidentStatus.IN_PROGRESS } 
    });
    const resolved = await this.incidentRepository.count({ 
      where: { status: IncidentStatus.RESOLVED } 
    });
    const closed = await this.incidentRepository.count({ 
      where: { status: IncidentStatus.CLOSED } 
    });

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      pendingResolution: open + inProgress,
    };
  }
} 