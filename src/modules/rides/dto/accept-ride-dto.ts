import { IsNumber} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptRideDto {
  @ApiProperty({ description: 'ID de la carrera' })
  @IsNumber()
  ride_id: number;

  @ApiProperty({ description: 'ID de la conductora' })
  @IsNumber()
  driver_id: number;
}