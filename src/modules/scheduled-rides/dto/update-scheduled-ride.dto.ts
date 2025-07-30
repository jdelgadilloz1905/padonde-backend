import { PartialType } from '@nestjs/swagger';
import { CreateScheduledRideDto } from './create-scheduled-ride.dto';

export class UpdateScheduledRideDto extends PartialType(CreateScheduledRideDto) {} 