import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { PhoneNumbersService } from './phone-numbers.service';
import { CreatePhoneNumberDto } from './dto/create-phone-number.dto';
import { PhoneNumberResponseDto, PhoneNumberExistsResponseDto } from './dto/phone-number-response.dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

@ApiTags('phone-numbers')
@Controller('phone-numbers')
@UseGuards(ApiKeyGuard)
@ApiHeader({
  name: 'x-api-key',
  description: 'API Key para acceso del sistema n8n',
  required: true,
})
export class PhoneNumbersController {
  constructor(private readonly phoneNumbersService: PhoneNumbersService) {}

  @Get('check/:phone_number')
  @ApiOperation({
    summary: 'Verificar si un número telefónico está registrado',
    description: 'Endpoint para que n8n verifique si un número telefónico está en la base de datos y tome decisiones basadas en esta información.',
  })
  @ApiParam({
    name: 'phone_number',
    description: 'Número telefónico en formato internacional (ej: +573001234567)',
    example: '+573001234567',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificación completada',
    type: PhoneNumberExistsResponseDto,
    examples: {
      exists: {
        summary: 'Número encontrado',
        value: {
          exists: true,
          phone_number: '+573001234567',
          created_at: '2025-01-25T10:00:00Z'
        }
      },
      notExists: {
        summary: 'Número no encontrado',
        value: {
          exists: false
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  async checkPhoneNumber(@Param('phone_number') phone_number: string): Promise<PhoneNumberExistsResponseDto> {
    const result = await this.phoneNumbersService.exists(phone_number);
    
    if (result.exists && result.phoneNumber) {
      return {
        exists: true,
        phone_number: result.phoneNumber.phone_number,
        created_at: result.phoneNumber.created_at,
      };
    }
    
    return { exists: false };
  }

  @Post()
  @ApiOperation({
    summary: 'Agregar un número telefónico a la lista',
    description: 'Endpoint para que n8n agregue un número telefónico a la base de datos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Número telefónico agregado exitosamente',
    type: PhoneNumberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Formato de número inválido' })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  @ApiResponse({ status: 409, description: 'El número telefónico ya está registrado' })
  async addPhoneNumber(@Body() createPhoneNumberDto: CreatePhoneNumberDto): Promise<PhoneNumberResponseDto> {
    return this.phoneNumbersService.create(createPhoneNumberDto);
  }

  @Delete(':phone_number')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar un número telefónico de la lista',
    description: 'Endpoint para que n8n elimine un número telefónico de la base de datos.',
  })
  @ApiParam({
    name: 'phone_number',
    description: 'Número telefónico en formato internacional (ej: +573001234567)',
    example: '+573001234567',
  })
  @ApiResponse({
    status: 200,
    description: 'Número telefónico eliminado exitosamente',
    schema: {
      example: {
        deleted: true,
        message: 'Número telefónico eliminado exitosamente'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  @ApiResponse({ status: 404, description: 'Número telefónico no encontrado' })
  async removePhoneNumber(@Param('phone_number') phone_number: string) {
    return this.phoneNumbersService.remove(phone_number);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los números telefónicos (opcional)',
    description: 'Endpoint opcional para listar todos los números registrados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de números telefónicos obtenida exitosamente',
    type: [PhoneNumberResponseDto],
  })
  @ApiResponse({ status: 401, description: 'API Key no válida' })
  async getAllPhoneNumbers(): Promise<PhoneNumberResponseDto[]> {
    return this.phoneNumbersService.findAll();
  }
} 