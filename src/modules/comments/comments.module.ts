import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment } from '../../entities/comment.entity';
import { Ride } from '../../entities/ride.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Ride, User])],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {} 