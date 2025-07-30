import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhoneNumber } from '../../entities/phone-number.entity';
import { CreatePhoneNumberDto } from './dto/create-phone-number.dto';

@Injectable()
export class PhoneNumbersService {
  constructor(
    @InjectRepository(PhoneNumber)
    private phoneNumberRepository: Repository<PhoneNumber>,
  ) {}

  async create(createPhoneNumberDto: CreatePhoneNumberDto): Promise<PhoneNumber> {
    const { phone_number } = createPhoneNumberDto;
    
    // Verificar si el número ya existe
    const existingNumber = await this.phoneNumberRepository.findOne({
      where: { phone_number },
    });

    if (existingNumber) {
      throw new ConflictException('El número telefónico ya está registrado');
    }

    const phoneNumber = this.phoneNumberRepository.create({
      phone_number,
    });

    return this.phoneNumberRepository.save(phoneNumber);
  }

  async exists(phone_number: string): Promise<{ exists: boolean; phoneNumber?: PhoneNumber }> {
    const phoneNumber = await this.phoneNumberRepository.findOne({
      where: { phone_number },
    });

    return {
      exists: !!phoneNumber,
      phoneNumber: phoneNumber || undefined,
    };
  }

  async remove(phone_number: string): Promise<{ deleted: boolean; message: string }> {
    const phoneNumber = await this.phoneNumberRepository.findOne({
      where: { phone_number },
    });

    if (!phoneNumber) {
      throw new NotFoundException('Número telefónico no encontrado');
    }

    await this.phoneNumberRepository.remove(phoneNumber);
    
    return {
      deleted: true,
      message: 'Número telefónico eliminado exitosamente',
    };
  }

  async findAll(): Promise<PhoneNumber[]> {
    return this.phoneNumberRepository.find({
      order: { created_at: 'DESC' },
    });
  }
} 