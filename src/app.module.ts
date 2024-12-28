import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcarsGateway } from './acars/acars.gateway';
import { DataModule } from './data/data.module';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaService } from './_lib/prisma.service';
import { AgendaService } from './_lib/agenda.service';

import {
  AuthenticationGateway,
  IdentityGateway,
  MessageGateway,
  AuthenticationService,
  StationService,
  MessageService,
} from './acars/gateways';

@Module({
  imports: [ScheduleModule.forRoot(), DataModule],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    AgendaService,

    AcarsGateway,

    AuthenticationGateway,
    IdentityGateway,
    MessageGateway,

    AuthenticationService,
    StationService,
    MessageService,
  ],
})
export class AppModule {}
