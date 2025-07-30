import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand,
  GetObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
  }

  /**
   * Genera URL de CloudFront si está habilitado, caso contrario retorna URL S3 directa
   * @param s3Key Clave del archivo en S3
   * @returns URL de CloudFront o S3
   */
  getCloudFrontUrl(s3Key: string): string {
    const cloudFrontEnabled = this.configService.get<string>('CLOUDFRONT_ENABLED') === 'true';
    const cloudFrontDomain = this.configService.get<string>('CLOUDFRONT_DOMAIN');
    
    if (cloudFrontEnabled && cloudFrontDomain) {
      this.logger.log(`Generando URL CloudFront para: ${s3Key}`);
      return `https://${cloudFrontDomain}/${s3Key}`;
    }
    
    // Fallback a URL S3 directa
    this.logger.log(`CloudFront no habilitado, usando URL S3 para: ${s3Key}`);
    return this.getS3DirectUrl(s3Key);
  }

  /**
   * Genera URL S3 directa
   * @param s3Key Clave del archivo en S3
   * @returns URL S3 directa
   */
  private getS3DirectUrl(s3Key: string): string {
    return `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${s3Key}`;
  }

  /**
   * Sube un archivo a S3
   * @param file Archivo a subir
   * @param key Clave única para el archivo en S3 (path)
   * @returns URL pública del archivo
   */
  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);
      
      // Generar URL usando CloudFront o S3 según configuración
      const fileUrl = this.getCloudFrontUrl(key);
      
      this.logger.log(`Archivo subido exitosamente a S3: ${key}`);
      this.logger.log(`URL de acceso: ${fileUrl}`);
      
      return fileUrl;
    } catch (error) {
      this.logger.error(`Error al subir archivo a S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Elimina un archivo de S3
   * @param key Clave del archivo a eliminar
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      
      this.logger.log(`Archivo eliminado exitosamente de S3: ${key}`);
    } catch (error) {
      this.logger.error(`Error al eliminar archivo de S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Genera una URL prefirmada para subir un archivo directamente desde el cliente
   * @param key Clave única para el archivo
   * @param expiresIn Tiempo en segundos de validez de la URL
   * @returns URL prefirmada
   */
  async generatePresignedUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      this.logger.log(`URL prefirmada generada: ${signedUrl}`);
      
      return signedUrl;
    } catch (error) {
      this.logger.error(`Error al generar URL prefirmada: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extraer la clave (key) de una URL de S3
   * @param url URL de S3
   * @returns Clave extraída
   */
  extractKeyFromUrl(url: string): string {
    const baseUrl = `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/`;
    return url.replace(baseUrl, '');
  }
} 