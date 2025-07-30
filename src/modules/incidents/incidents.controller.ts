import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto, IncidentStatus } from './dto/update-incident.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DriverAuthGuard } from '../drivers/guards/driver-auth.guard';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @UseGuards(DriverAuthGuard)
  create(@Body() createIncidentDto: CreateIncidentDto) {
    return this.incidentsService.create(createIncidentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('status') status?: IncidentStatus) {
    if (status) {
      return this.incidentsService.findByStatus(status);
    }
    return this.incidentsService.findAll();
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  getStatistics() {
    return this.incidentsService.getStatistics();
  }

  @Get('driver/:driverId')
  @UseGuards(JwtAuthGuard)
  findByDriver(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.incidentsService.findByDriver(driverId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateIncidentDto: UpdateIncidentDto,
  ) {
    return this.incidentsService.update(id, updateIncidentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.incidentsService.remove(id);
  }
} 