import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query, Put } from '@nestjs/common';
import { ScheduledRidesService } from './scheduled-rides.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateScheduledRideDto } from './dto/create-scheduled-ride.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';
import { QueryScheduledRidesDto } from './dto/query-scheduled-rides.dto';
import { UpdateScheduledRideDto } from './dto/update-scheduled-ride.dto';
import { AssignDriverToScheduledRideDto } from './dto/assign-driver-to-scheduled-ride.dto';

@ApiTags('scheduled-rides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scheduled-rides')
export class ScheduledRidesController {
  constructor(private readonly scheduledRidesService: ScheduledRidesService) {}

  @Post()
  @Roles('admin', 'operator')
  create(@Body() createScheduledRideDto: CreateScheduledRideDto, @CurrentUser() user: User) {
    return this.scheduledRidesService.create(createScheduledRideDto, user);
  }

  @Get()
  @Roles('admin', 'operator')
  findAll(@Query() queryParams: QueryScheduledRidesDto) {
    return this.scheduledRidesService.findAll(queryParams);
  }

  @Get(':id')
  @Roles('admin', 'operator')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scheduledRidesService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'operator')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateScheduledRideDto: UpdateScheduledRideDto) {
    return this.scheduledRidesService.update(id, updateScheduledRideDto);
  }

  @Delete(':id')
  @Roles('admin', 'operator')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.scheduledRidesService.delete(id);
  }

  @Get('calendar/day/:date')
  @Roles('admin', 'operator')
  getForDate(@Param('date') date: string) {
    return this.scheduledRidesService.getForDate(date);
  }

  @Get('calendar/month/:year/:month')
  @Roles('admin', 'operator')
  getForMonth(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.scheduledRidesService.getForMonth(year, month);
  }

  @Get('calendar/week/:date')
  @Roles('admin', 'operator')
  getForWeek(@Param('date') date: string) {
    return this.scheduledRidesService.getForWeek(date);
  }

  @Post(':id/assign')
  @Roles('admin', 'operator')
  assignDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignDriverDto: AssignDriverToScheduledRideDto
  ) {
    return this.scheduledRidesService.assignDriver(id, assignDriverDto);
  }

  @Delete(':id/unassign')
  @Roles('admin', 'operator')
  unassignDriver(@Param('id', ParseIntPipe) id: number) {
    return this.scheduledRidesService.unassignDriver(id);
  }

  @Get('upcoming')
  @Roles('admin', 'operator')
  findUpcoming(@Query('limit', new ParseIntPipe({ optional: true })) limit: number) {
    return this.scheduledRidesService.findUpcoming(limit);
  }

  @Post(':id/notify')
  @Roles('admin', 'operator')
  sendNotification(@Param('id', ParseIntPipe) id: number) {
    return this.scheduledRidesService.sendNotification(id);
  }

  // Endpoints will be implemented here based on the plan.
} 