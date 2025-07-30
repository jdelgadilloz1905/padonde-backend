import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Driver } from '../../../entities/driver.entity';
import { S3Service } from '../s3.service';
import { UploadAdminPhotoDto } from '../dto/upload-admin-photo.dto';
import { UploadExternalPhotoDto, ExternalPhotoResponseDto } from '../dto/upload-external-photo.dto';
import { DriverPhotosResponseDto, PhotoMetadataDto, AdminPhotoUploadResponseDto } from '../dto/driver-photos-response.dto';

@Injectable()
export class DriverPhotosService {
  private readonly logger = new Logger(DriverPhotosService.name);

  constructor(
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
    private s3Service: S3Service,
  ) {}

  /**
   * Sube foto para conductora desde admin (frontend)
   */
  async uploadPhotoForAdmin(
    driverId: number,
    file: Express.Multer.File,
    config: UploadAdminPhotoDto,
    adminEmail: string,
  ): Promise<AdminPhotoUploadResponseDto> {
    try {
      this.logger.log(`Admin ${adminEmail} subiendo foto ${config.photo_type} para conductora ${driverId}`);

      // Verificar que el conductora existe
      const driver = await this.driversRepository.findOne({ where: { id: driverId } });
      if (!driver) {
        throw new NotFoundException(`conductora con ID ${driverId} no encontrado`);
      }

      // Generar clave S3 única
      const photoId = uuidv4();
      const fileExtension = file.originalname.split('.').pop();
      const s3Key = `drivers/photos/${driverId}/${config.photo_type}/${photoId}.${fileExtension}`;

      // Subir archivo a S3
      const photoUrl = await this.s3Service.uploadFile(file, s3Key);

      // Actualizar driver según tipo de foto
      await this.updateDriverPhotoData(driver, config.photo_type, photoUrl, s3Key, config);

      // Crear metadata de respuesta
      const photoMetadata: PhotoMetadataDto = {
        id: photoId,
        url: photoUrl,
        s3_key: s3Key,
        type: config.photo_type,
        description: config.description,
        is_primary: config.set_as_primary || config.photo_type === 'profile',
        uploaded_at: new Date().toISOString(),
        size_bytes: file.size,
        original_filename: file.originalname,
        uploaded_by: adminEmail,
      };

      this.logger.log(`Foto ${config.photo_type} subida exitosamente para conductora ${driverId} por admin ${adminEmail}`);

      return {
        success: true,
        data: photoMetadata,
        message: `Foto de ${config.photo_type} subida exitosamente`,
      };
    } catch (error) {
      this.logger.error(`Error subiendo foto admin: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Sube foto desde sistema externo (n8n)
   */
  async uploadPhotoExternal(
    driverId: number,
    file: Express.Multer.File,
    config: UploadExternalPhotoDto,
  ): Promise<ExternalPhotoResponseDto> {
    try {
      this.logger.log(`Sistema externo (${config.source || 'unknown'}) subiendo foto ${config.photo_type} para conductora ${driverId}`);

      // Verificar que el conductora existe
      const driver = await this.driversRepository.findOne({ where: { id: driverId } });
      if (!driver) {
        throw new NotFoundException(`conductora con ID ${driverId} no encontrado`);
      }

      // Generar clave S3 única
      const photoId = uuidv4();
      const fileExtension = file.originalname.split('.').pop();
      const s3Key = `drivers/photos/${driverId}/${config.photo_type}/external/${photoId}.${fileExtension}`;

      // Subir archivo a S3
      const photoUrl = await this.s3Service.uploadFile(file, s3Key);

      // Actualizar driver
      await this.updateDriverPhotoData(driver, config.photo_type, photoUrl, s3Key, { 
        set_as_primary: true,
        description: `Subida automática desde ${config.source || 'sistema externo'}`
      });

      this.logger.log(`Foto ${config.photo_type} subida exitosamente para conductora ${driverId} desde sistema externo`);

      return {
        success: true,
        photo_id: photoId,
        url: photoUrl,
        type: config.photo_type,
        uploaded_at: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error subiendo foto externa: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene todas las fotos de un conductora
   */
  async getDriverPhotos(driverId: number): Promise<DriverPhotosResponseDto> {
    try {
      const driver = await this.driversRepository.findOne({ where: { id: driverId } });
      if (!driver) {
        throw new NotFoundException(`conductora con ID ${driverId} no encontrado`);
      }

      const response: DriverPhotosResponseDto = {
        driver_id: driverId,
        vehicle_photos: [],
        document_photos: [],
        verification_photos: [],
        photos_updated_at: driver.photos_updated_at?.toISOString(),
        total_photos: 0,
      };

      // Foto de perfil principal
      if (driver.profile_picture_url) {
        response.profile_picture = {
          id: 'profile_main',
          url: driver.profile_picture_url,
          s3_key: driver.profile_picture_s3_key || '',
          type: 'profile',
          is_primary: true,
          uploaded_at: driver.photos_updated_at?.toISOString() || '',
        };
        response.total_photos++;
      }

      // Fotos adicionales desde JSONB
      if (driver.additional_photos) {
        const additionalPhotos = driver.additional_photos as any;

        // Procesar fotos del vehículo
        if (additionalPhotos.vehicle_photos?.length > 0) {
          response.vehicle_photos = additionalPhotos.vehicle_photos.map((url: string, index: number) => ({
            id: `vehicle_${index}`,
            url: url,
            s3_key: this.s3Service.extractKeyFromUrl(url),
            type: 'vehicle',
            is_primary: index === 0,
            uploaded_at: driver.photos_updated_at?.toISOString() || '',
          }));
          response.total_photos += response.vehicle_photos.length;
        }

        // Procesar fotos de documentos
        if (additionalPhotos.document_photos?.length > 0) {
          response.document_photos = additionalPhotos.document_photos.map((url: string, index: number) => ({
            id: `document_${index}`,
            url: url,
            s3_key: this.s3Service.extractKeyFromUrl(url),
            type: 'document',
            is_primary: index === 0,
            uploaded_at: driver.photos_updated_at?.toISOString() || '',
          }));
          response.total_photos += response.document_photos.length;
        }

        // Procesar fotos de verificación
        if (additionalPhotos.verification_photos?.length > 0) {
          response.verification_photos = additionalPhotos.verification_photos.map((url: string, index: number) => ({
            id: `verification_${index}`,
            url: url,
            s3_key: this.s3Service.extractKeyFromUrl(url),
            type: 'verification',
            is_primary: index === 0,
            uploaded_at: driver.photos_updated_at?.toISOString() || '',
          }));
          response.total_photos += response.verification_photos.length;
        }
      }

      return response;
    } catch (error) {
      this.logger.error(`Error obteniendo fotos de la conductora: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Elimina una foto específica
   */
  async deleteDriverPhoto(driverId: number, photoType: string, photoIndex?: number): Promise<void> {
    try {
      const driver = await this.driversRepository.findOne({ where: { id: driverId } });
      if (!driver) {
        throw new NotFoundException(`conductora con ID ${driverId} no encontrado`);
      }

      let s3KeyToDelete: string | null = null;

      if (photoType === 'profile') {
        s3KeyToDelete = driver.profile_picture_s3_key;
        driver.profile_picture = null;
        driver.profile_picture_url = null;
        driver.profile_picture_s3_key = null;
      } else {
        // Manejar fotos adicionales
        const additionalPhotos = driver.additional_photos as any || {};
        const photoArray = additionalPhotos[`${photoType}_photos`] || [];
        
        if (photoIndex !== undefined && photoIndex < photoArray.length) {
          s3KeyToDelete = this.s3Service.extractKeyFromUrl(photoArray[photoIndex]);
          photoArray.splice(photoIndex, 1);
          additionalPhotos[`${photoType}_photos`] = photoArray;
          driver.additional_photos = additionalPhotos;
        }
      }

      // Eliminar de S3 si se encontró la clave
      if (s3KeyToDelete) {
        await this.s3Service.deleteFile(s3KeyToDelete);
      }

      // Actualizar timestamp
      driver.photos_updated_at = new Date();
      await this.driversRepository.save(driver);

      this.logger.log(`Foto ${photoType} eliminada exitosamente para conductora ${driverId}`);
    } catch (error) {
      this.logger.error(`Error eliminando foto: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Actualiza los datos de foto en la entidad Driver
   */
  private async updateDriverPhotoData(
    driver: Driver,
    photoType: string,
    photoUrl: string,
    s3Key: string,
    config: any,
  ): Promise<void> {
    if (photoType === 'profile') {
      // Foto de perfil principal
      if (config.replace_existing || !driver.profile_picture_url) {
        driver.profile_picture = photoUrl; // Mantener compatibilidad
        driver.profile_picture_url = photoUrl;
        driver.profile_picture_s3_key = s3Key;
      }
    } else {
      // Fotos adicionales en JSONB
      const additionalPhotos = driver.additional_photos as any || {
        vehicle_photos: [],
        document_photos: [],
        verification_photos: [],
      };

      const photoArrayKey = `${photoType}_photos`;
      if (!additionalPhotos[photoArrayKey]) {
        additionalPhotos[photoArrayKey] = [];
      }

      // Agregar nueva foto al array correspondiente
      if (config.set_as_primary) {
        additionalPhotos[photoArrayKey].unshift(photoUrl); // Agregar al inicio
      } else {
        additionalPhotos[photoArrayKey].push(photoUrl); // Agregar al final
      }

      driver.additional_photos = additionalPhotos;
    }

    // Actualizar timestamp
    driver.photos_updated_at = new Date();
    await this.driversRepository.save(driver);
  }
} 