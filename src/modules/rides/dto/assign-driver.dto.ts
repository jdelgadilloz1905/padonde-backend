import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AssignDriverDto {
  @ApiProperty({ description: 'ID de la conductora a asignar' })
  @Transform(({ value }) => parseInt(value))
  @IsNotEmpty()
  @IsNumber()
  driver_id: number;

  @ApiProperty({ description: 'Notas sobre la asignación', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
} 