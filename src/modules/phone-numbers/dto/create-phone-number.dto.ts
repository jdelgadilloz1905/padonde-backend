import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePhoneNumberDto {
  @ApiProperty({
    example: '+573001234567',
    description: 'Número telefónico en formato internacional',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'El número telefónico debe estar en formato internacional válido (+573001234567)',
  })
  phone_number: string;
} 