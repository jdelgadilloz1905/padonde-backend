import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email del usuario' })
  @IsEmail()
  email: string;
} 