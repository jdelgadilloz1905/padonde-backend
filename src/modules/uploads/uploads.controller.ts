import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  UseInterceptors, 
  UploadedFile, 
  ParseFilePipe, 
  MaxFileSizeValidator, 
  FileTypeValidator,
  UseGuards,
  Query,
  Param,
  Body,
  BadRequestException,
  Request
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DriverAuthGuard } from '../drivers/guards/driver-auth.guard';
import { CurrentDriver } from '../drivers/decorators/current-driver.decorator';
import { S3Service } from './s3.service';
import { DriverPhotosService } from './services/driver-photos.service';
import { UploadAdminPhotoDto } from './dto/upload-admin-photo.dto';
import { UploadExternalPhotoDto } from './dto/upload-external-photo.dto';
import { DriverPhotosResponseDto, AdminPhotoUploadResponseDto } from './dto/driver-photos-response.dto';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly s3Service: S3Service,
    private readonly driverPhotosService: DriverPhotosService,
  ) {}

  @Post('drivers/avatar')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir imagen de perfil de la conductora' })
  @ApiResponse({ status: 201, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDriverAvatar(
    @CurrentDriver() driver,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // 2MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Crear una clave única para el archivo
    const fileKey = `drivers/avatars/${driver.id}/${uuidv4()}-${file.originalname.replace(/\s/g, '-')}`;
    
    // Subir archivo a S3
    const fileUrl = await this.s3Service.uploadFile(file, fileKey);
    
    // Retornar la URL del archivo
    return { url: fileUrl };
  }

  @Post('admin/drivers/:id/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir imagen de perfil de un conductora (Admin)' })
  @ApiResponse({ status: 201, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDriverAvatarByAdmin(
    @Param('id') driverId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // 2MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Crear una clave única para el archivo
    const fileKey = `drivers/avatars/${driverId}/${uuidv4()}-${file.originalname.replace(/\s/g, '-')}`;
    
    // Subir archivo a S3
    const fileUrl = await this.s3Service.uploadFile(file, fileKey);
    
    // Retornar la URL del archivo
    return { url: fileUrl };
  }

  @Post('drivers/documents')
  @UseGuards(DriverAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir documento de conductora' })
  @ApiResponse({ status: 201, description: 'Documento subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ 
    name: 'type', 
    description: 'Tipo de documento', 
    required: true,
    enum: ['license', 'id_document', 'vehicle_photo'] 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDriverDocument(
    @CurrentDriver() driver,
    @Query('type') docType: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Validar tipo de documento
    if (!['license', 'id_document', 'vehicle_photo'].includes(docType)) {
      throw new BadRequestException('Tipo de documento inválido');
    }
    
    // Crear una clave única para el archivo
    const fileKey = `drivers/documents/${driver.id}/${docType}/${uuidv4()}-${file.originalname.replace(/\s/g, '-')}`;
    
    // Subir archivo a S3
    const fileUrl = await this.s3Service.uploadFile(file, fileKey);
    
    // Retornar la URL del archivo
    return { url: fileUrl };
  }

  @Get('presigned-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar URL prefirmada para subir archivo directamente desde el cliente' })
  @ApiResponse({ status: 200, description: 'URL prefirmada generada exitosamente' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiQuery({ name: 'filename', description: 'Nombre del archivo', required: true })
  @ApiQuery({ name: 'contentType', description: 'Tipo de contenido (MIME)', required: true })
  @ApiQuery({ name: 'path', description: 'Ruta en S3 (opcional)', required: false })
  async getPresignedUrl(
    @Query('filename') filename: string,
    @Query('contentType') contentType: string,
    @Query('path') path = '',
  ) {
    if (!filename || !contentType) {
      throw new BadRequestException('Se requiere nombre de archivo y tipo de contenido');
    }
    
    // Preparar ruta y nombre del archivo
    const sanitizedFilename = filename.replace(/\s/g, '-');
    const fileKey = path ? `${path}/${uuidv4()}-${sanitizedFilename}` : `uploads/${uuidv4()}-${sanitizedFilename}`;
    
    // Generar URL prefirmada
    const presignedUrl = await this.s3Service.generatePresignedUrl(fileKey, contentType);
    
    return { 
      presignedUrl,
      fileKey,
      publicUrl: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`
    };
  }

  // ===================================
  // NUEVOS ENDPOINTS PARA ADMIN
  // ===================================

  @Post('admin/drivers/:id/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir foto de conductora (Admin desde Frontend)' })
  @ApiResponse({ status: 201, description: 'Foto subida exitosamente', type: AdminPhotoUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Archivo inválido o parámetros incorrectos' })
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
        photo_type: {
          type: 'string',
          enum: ['profile', 'vehicle', 'document', 'verification'],
        },
        description: {
          type: 'string',
        },
        set_as_primary: {
          type: 'boolean',
        },
        replace_existing: {
          type: 'boolean',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDriverPhotoByAdmin(
    @Param('id') driverId: string,
    @Body() uploadDto: UploadAdminPhotoDto,
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB para admin
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AdminPhotoUploadResponseDto> {
    const adminEmail = req.user?.email || 'admin@sistema.com';
    return this.driverPhotosService.uploadPhotoForAdmin(
      parseInt(driverId),
      file,
      uploadDto,
      adminEmail,
    );
  }

  @Get('admin/drivers/:id/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todas las fotos de un conductora (Admin)' })
  @ApiResponse({ status: 200, description: 'Fotos obtenidas exitosamente', type: DriverPhotosResponseDto })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async getDriverPhotosByAdmin(
    @Param('id') driverId: string,
  ): Promise<DriverPhotosResponseDto> {
    return this.driverPhotosService.getDriverPhotos(parseInt(driverId));
  }

  @Delete('admin/drivers/:id/photos/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar foto específica de conductora (Admin)' })
  @ApiResponse({ status: 200, description: 'Foto eliminada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido: rol insuficiente' })
  @ApiResponse({ status: 404, description: 'conductora o foto no encontrado' })
  @ApiQuery({ name: 'index', description: 'Índice de la foto en el array (opcional)', required: false })
  async deleteDriverPhotoByAdmin(
    @Param('id') driverId: string,
    @Param('type') photoType: string,
    @Query('index') photoIndex?: string,
  ): Promise<{ success: boolean; message: string }> {
    const index = photoIndex ? parseInt(photoIndex) : undefined;
    await this.driverPhotosService.deleteDriverPhoto(parseInt(driverId), photoType, index);
    return {
      success: true,
      message: `Foto ${photoType} eliminada exitosamente`,
    };
  }

  // ===================================
  // NUEVOS ENDPOINTS PARA N8N (EXTERNOS)
  // ===================================

  @Post('external/drivers/:id/photo')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para n8n u otros sistemas externos',
    required: true,
  })
  @ApiOperation({ summary: 'Subir foto de conductora desde sistema externo (n8n)' })
  @ApiResponse({ status: 201, description: 'Foto subida exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o parámetros incorrectos' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
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
        photo_type: {
          type: 'string',
          enum: ['profile', 'vehicle', 'document'],
        },
        source: {
          type: 'string',
        },
        workflow_id: {
          type: 'string',
        },
        metadata: {
          type: 'object',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDriverPhotoExternal(
    @Param('id') driverId: string,
    @Body() uploadDto: UploadExternalPhotoDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // 2MB para externos
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }), // Solo imágenes para externos
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.driverPhotosService.uploadPhotoExternal(
      parseInt(driverId),
      file,
      uploadDto,
    );
  }

  @Get('external/drivers/:id/photos')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para n8n u otros sistemas externos',
    required: true,
  })
  @ApiOperation({ summary: 'Obtener fotos de conductora desde sistema externo (n8n)' })
  @ApiResponse({ status: 200, description: 'Fotos obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
  @ApiResponse({ status: 404, description: 'conductora no encontrado' })
  async getDriverPhotosExternal(
    @Param('id') driverId: string,
  ) {
    const photos = await this.driverPhotosService.getDriverPhotos(parseInt(driverId));
    
    // Respuesta simplificada para sistemas externos
    return {
      success: true,
      driver_id: photos.driver_id,
      profile_picture: photos.profile_picture?.url || null,
      vehicle_photos: photos.vehicle_photos.map(p => p.url),
      document_photos: photos.document_photos.map(p => p.url),
      total_photos: photos.total_photos,
    };
  }

  @Post('external/drivers/:id/photo/:type')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para n8n u otros sistemas externos',
    required: true,
  })
  @ApiOperation({ summary: 'Actualizar foto específica desde sistema externo (n8n)' })
  @ApiResponse({ status: 200, description: 'Foto actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
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
        source: {
          type: 'string',
        },
        workflow_id: {
          type: 'string',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async updateDriverPhotoByTypeExternal(
    @Param('id') driverId: string,
    @Param('type') photoType: string,
    @Body() body: { source?: string; workflow_id?: string },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Validar tipo de foto
    if (!['profile', 'vehicle', 'document'].includes(photoType)) {
      throw new BadRequestException('Tipo de foto no válido');
    }

    const uploadDto: UploadExternalPhotoDto = {
      photo_type: photoType,
      source: body.source,
      workflow_id: body.workflow_id,
    };

    return this.driverPhotosService.uploadPhotoExternal(
      parseInt(driverId),
      file,
      uploadDto,
    );
  }
} 