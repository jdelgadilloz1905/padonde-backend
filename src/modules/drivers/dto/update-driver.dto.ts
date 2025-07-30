import { IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateDriverDto } from './create-driver.dto';  
import { Transform } from 'class-transformer';
export class UpdateDriverDto extends CreateDriverDto {
  @ApiProperty({
    description: 'ID de la conductora',
    example: 1
  })
  @Transform(({ value }) => typeof value === 'string' ? parseInt(value) : value)
  @IsNumber()
  id?: number;
}

export class ToggleDriverActiveDto {
  @ApiProperty({
    description: 'Estado activo de la conductora',
    example: true,
    type: 'boolean'
  })
  @IsBoolean()
  active: boolean;
} 