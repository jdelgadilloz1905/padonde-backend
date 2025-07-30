import { PartialType } from '@nestjs/swagger';
import { CreateCommentDto } from './create-comment.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdateCommentDto extends PartialType(
  OmitType(CreateCommentDto, ['rideId'] as const)
) {} 