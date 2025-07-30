import { IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends CreateClientDto {
  @ApiProperty({ description: 'ID del cliente', example: 1 })
  @IsNumber()
  @IsOptional()
  id?: number;
}
