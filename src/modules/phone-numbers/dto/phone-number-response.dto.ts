import { ApiProperty } from '@nestjs/swagger';

export class PhoneNumberResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  phone_number: string;

  @ApiProperty()
  created_at: Date;
}

export class PhoneNumberExistsResponseDto {
  @ApiProperty()
  exists: boolean;

  @ApiProperty({ required: false })
  phone_number?: string;

  @ApiProperty({ required: false })
  created_at?: Date;
} 