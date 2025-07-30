import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { User } from '../../entities/user.entity';
import { Ride } from '../../entities/ride.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createCommentDto: CreateCommentDto, userId: number): Promise<Comment> {
    // Verificar que la carrera existe
    const ride = await this.rideRepository.findOne({
      where: { id: createCommentDto.rideId },
      relations: ['client', 'driver']
    });

    if (!ride) {
      throw new NotFoundException('Carrera no encontrada');
    }

    // Obtener información del usuario para verificar si es administrador
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar permisos: administradores pueden comentar cualquier carrera,
    // otros usuarios solo pueden comentar carreras en las que participaron
    const isAdmin = user.role === 'admin';
    const isParticipant = ride.client.id === userId || (ride.driver && ride.driver.id === userId);

    if (!isAdmin && !isParticipant) {
      throw new ForbiddenException('No puedes comentar una carrera en la que no participaste');
    }

    const comment = this.commentRepository.create({
      content: createCommentDto.content,
      rating: createCommentDto.rating,
      rideId: createCommentDto.rideId,
      authorId: userId,
      priority: createCommentDto.priority,
      internal: createCommentDto.isInternal || false,
    });

    return await this.commentRepository.save(comment);
  }

  async findAll(options: {
    requestId?: string;
    page: number;
    limit: number;
    includeInternal: boolean;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const { requestId, page, limit, includeInternal, sortBy, sortOrder } = options;
    
    const queryBuilder = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.ride', 'ride')
      .leftJoinAndSelect('ride.client', 'client')
      .leftJoinAndSelect('ride.driver', 'driver');

    // Filtrar por requestId si se proporciona
    if (requestId) {
      queryBuilder.andWhere('ride.id = :requestId', { requestId: parseInt(requestId) });
    }

    // Filtrar comentarios internos si no se incluyen
    if (!includeInternal) {
      queryBuilder.andWhere('comment.internal IS NOT TRUE');
    }

    // Aplicar ordenamiento
    const order = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    if (sortBy === 'createdAt') {
      queryBuilder.orderBy('comment.createdAt', order);
    } else {
      queryBuilder.orderBy(`comment.${sortBy}`, order);
    }

    // Aplicar paginación
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Ejecutar consulta
    const [comments, total] = await queryBuilder.getManyAndCount();

    return {
      data: comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findByRide(rideId: number): Promise<Comment[]> {
    return await this.commentRepository.find({
      where: { rideId },
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id }
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    return comment;
  }

  async update(id: number, updateCommentDto: UpdateCommentDto, userId: number): Promise<Comment> {
    const comment = await this.findOne(id);

    // Obtener información del usuario
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar permisos: administradores pueden editar cualquier comentario,
    // otros usuarios solo pueden editar sus propios comentarios
    const isAdmin = user.role === 'admin';
    const isAuthor = comment.authorId === userId;

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenException('Solo puedes editar tus propios comentarios');
    }

    await this.commentRepository.update(id, updateCommentDto);
    return await this.findOne(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const comment = await this.findOne(id);

    // Obtener información del usuario
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar permisos: administradores pueden eliminar cualquier comentario,
    // otros usuarios solo pueden eliminar sus propios comentarios
    const isAdmin = user.role === 'admin';
    const isAuthor = comment.authorId === userId;

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenException('Solo puedes eliminar tus propios comentarios');
    }

    await this.commentRepository.delete(id);
  }
} 