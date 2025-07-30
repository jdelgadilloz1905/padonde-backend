import { IsNotEmpty, IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

export enum IncidentType {
  TECHNICAL = 'technical',
  SAFETY = 'safety',
  PAYMENT = 'payment',
  CUSTOMER_SERVICE = 'customer_service',
  OTHER = 'other'
}

export class CreateIncidentDto {
  @IsNotEmpty()
  @IsNumber()
  driver_id: number;

  @IsOptional()
  @IsNumber()
  ride_id?: number;

  @IsNotEmpty()
  @IsEnum(IncidentType)
  incident_type: IncidentType;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  priority?: 'low' | 'medium' | 'high' | 'critical';
} 