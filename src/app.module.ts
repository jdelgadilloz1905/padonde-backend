import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { TrackingModule } from './modules/tracking/tracking.module';
import { AuthModule } from './modules/auth/auth.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { ClientsModule } from './modules/clients/clients.module';
import { RidesModule } from './modules/rides/rides.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { TwilioModule } from './modules/twilio/twilio.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminDashboardModule } from './modules/admin/admin-dashboard.module';
import { CommentsModule } from './modules/comments/comments.module';
import { CancellationsModule } from './modules/cancellations/cancellations.module';
import { EmailModule } from './modules/email/email.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { ChatHistoryModule } from './modules/chat-history/chat-history.module';
import { ScheduledRidesModule } from './modules/scheduled-rides/scheduled-rides.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PhoneNumbersModule } from './modules/phone-numbers/phone-numbers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(databaseConfig),
    TrackingModule,
    AuthModule,
    DriversModule,
    ClientsModule,
    RidesModule,
    UploadsModule,
    TwilioModule,
    CommissionsModule,
    AnalyticsModule,
    AdminDashboardModule,
    CommentsModule,
    CancellationsModule,
    EmailModule,
    RatingsModule,
    IncidentsModule,
    ChatHistoryModule,
    ScheduledRidesModule,
    NotificationsModule,
    PhoneNumbersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
