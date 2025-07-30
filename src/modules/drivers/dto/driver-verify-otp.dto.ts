import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DriverVerifyOtpDto {
  @ApiProperty({ description: 'Número de teléfono de la conductora', example: '+5219876543210' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;
  
  @ApiProperty({ description: 'Código OTP de verificación', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp_code: string;
} 