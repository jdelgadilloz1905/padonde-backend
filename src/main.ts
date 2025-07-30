import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS para permitir solicitudes desde cualquier origen
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configurar el prefijo global para las rutas de la API
  app.setGlobalPrefix('api/v1');

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Taxi Rosa API')
    .setDescription('API para la aplicación de Taxi Rosa')
    .setVersion('1.0')
    .addTag('auth', 'Autenticación')
    .addTag('drivers', 'Gestión de conductoras')
    .addTag('tracking', 'Seguimiento de ubicación')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();
