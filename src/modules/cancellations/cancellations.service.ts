import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CancellationReason } from '../../entities/cancellation-reason.entity';
import { Ride } from '../../entities/ride.entity';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { RideStatus } from '../../entities/ride.entity';
import { ChatHistoryService } from '../chat-history/chat-history.service';

@Injectable()
export class CancellationsService {
  private readonly logger = new Logger(CancellationsService.name);

  constructor(
    @InjectRepository(CancellationReason)
    private readonly cancellationReasonRepository: Repository<CancellationReason>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  async getCancellationReasons(userType: 'client' | 'driver'): Promise<CancellationReason[]> {
    return await this.cancellationReasonRepository.find({
      where: [
        { userType: userType, isActive: true },
        { userType: 'both', isActive: true }
      ],
      order: { reason: 'ASC' }
    });
  }

  async cancelRide(rideId: number, cancelRideDto: CancelRideDto, userId: number, userRole: string): Promise<Ride> {
    // Verificar que el motivo de cancelación existe
    const reason = await this.cancellationReasonRepository.findOne({
      where: { id: cancelRideDto.reasonId, isActive: true }
    });

    if (!reason) {
      throw new NotFoundException('Motivo de cancelación no encontrado');
    }

    // Verificar que la carrera existe
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['client', 'driver']
    });

    if (!ride) {
      throw new NotFoundException('Carrera no encontrada');
    }

    // Verificar que el usuario puede cancelar la carrera
    const isClient = userRole === 'client' && ride.client && ride.client.id === userId;
    const isDriver = userRole === 'driver' && ride.driver && ride.driver.id === userId;
    
    if (!isClient && !isDriver) {
      throw new ForbiddenException('No puedes cancelar esta carrera');
    }

    // Verificar que la carrera se puede cancelar
    if (ride.status === RideStatus.COMPLETED || ride.status === RideStatus.CANCELLED) {
      throw new BadRequestException('No se puede cancelar una carrera que ya está completada o cancelada');
    }

    // Verificar que el motivo es válido para el tipo de usuario
    const userType = userRole === 'client' ? 'client' : 'driver';
    if (reason.userType !== userType && reason.userType !== 'both') {
      throw new BadRequestException('Este motivo de cancelación no es válido para tu tipo de usuario');
    }

    // Actualizar la carrera
    await this.rideRepository.update(rideId, {
      status: RideStatus.CANCELLED,
      cancellation_reason: reason.reason,
      cancellationComment: cancelRideDto.additionalComment || null,
      cancelledBy: userRole,
      cancelledAt: new Date()
    });

    const updatedRide = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['client', 'driver']
    });

    // Borrar historial de chat del cliente cuando se cancele la carrera
    if (ride.client && ride.client.phone_number) {
      try {
        await this.chatHistoryService.clearClientChatHistory(ride.client.phone_number);
        this.logger.log(
          `Historial de chat borrado para cliente ${ride.client.phone_number} ` +
          `tras cancelación de carrera ${ride.tracking_code} por ${userRole}`
        );
      } catch (chatError) {
        // Log el error pero no fallar la cancelación
        this.logger.error(
          `Error al borrar historial de chat del cliente: ${chatError.message}`,
          chatError.stack
        );
      }
    }

    return updatedRide;
  }

  async createCancellationReason(reason: string, description: string, userType: string): Promise<CancellationReason> {
    const cancellationReason = this.cancellationReasonRepository.create({
      reason,
      description,
      userType,
      isActive: true
    });

    return await this.cancellationReasonRepository.save(cancellationReason);
  }

  async updateCancellationReason(id: number, updates: Partial<CancellationReason>): Promise<CancellationReason> {
    const reason = await this.cancellationReasonRepository.findOne({ where: { id } });
    
    if (!reason) {
      throw new NotFoundException('Motivo de cancelación no encontrado');
    }

    await this.cancellationReasonRepository.update(id, updates);
    return await this.cancellationReasonRepository.findOne({ where: { id } });
  }

  async deleteCancellationReason(id: number): Promise<void> {
    const reason = await this.cancellationReasonRepository.findOne({ where: { id } });
    
    if (!reason) {
      throw new NotFoundException('Motivo de cancelación no encontrado');
    }

    await this.cancellationReasonRepository.update(id, { isActive: false });
  }
} 