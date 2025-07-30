import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los comentarios con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de comentarios' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(
    @Query('requestId') requestId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('includeInternal') includeInternal: boolean = false,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    return await this.commentsService.findAll({
      requestId,
      page: Number(page),
      limit: Number(limit),
      includeInternal,
      sortBy,
      sortOrder
    });
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo comentario' })
  @ApiResponse({ status: 201, description: 'Comentario creado exitosamente', type: CommentResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No puedes comentar esta carrera (solo participantes y administradores)' })
  @ApiResponse({ status: 404, description: 'Carrera no encontrada' })
  async create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return await this.commentsService.create(createCommentDto, req.user.id);
  }

  @Get('request/:rideId')
  @ApiOperation({ summary: 'Obtener comentarios de una carrera' })
  @ApiResponse({ status: 200, description: 'Lista de comentarios', type: [CommentResponseDto] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findByRide(@Param('rideId', ParseIntPipe) rideId: number) {
    return await this.commentsService.findByRide(rideId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un comentario por ID' })
  @ApiResponse({ status: 200, description: 'Comentario encontrado', type: CommentResponseDto })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.commentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un comentario' })
  @ApiResponse({ status: 200, description: 'Comentario actualizado exitosamente', type: CommentResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo puedes editar tus propios comentarios (administradores pueden editar cualquiera)' })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req
  ) {
    return await this.commentsService.update(id, updateCommentDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un comentario' })
  @ApiResponse({ status: 200, description: 'Comentario eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo puedes eliminar tus propios comentarios (administradores pueden eliminar cualquiera)' })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.commentsService.remove(id, req.user.id);
    return { message: 'Comentario eliminado exitosamente' };
  }
} 