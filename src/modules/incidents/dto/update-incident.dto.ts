import { PartialType } from '@nestjs/mapped-types';
import { CreateIncidentDto } from './create-incident.dto';
import { IsOptional, IsEnum } from 'class-validator';

export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
} 