import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentAuthorDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Juan Pérez' })
  name: string;

  @ApiProperty({ example: 'juan@example.com' })
  email: string;
}

export class CommentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Excelente servicio, muy puntual' })
  content: string;

  @ApiPropertyOptional({ example: 5 })
  rating?: number;

  @ApiProperty({ type: CommentAuthorDto })
  author: CommentAuthorDto;

  @ApiProperty({ example: 1 })
  rideId: number;

  @ApiProperty({ example: '2023-12-01T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T10:00:00Z' })
  updatedAt: Date;
} 