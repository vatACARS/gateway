import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcarsGateway } from './acars/acars.gateway';
import { DataModule } from './data/data.module';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaService } from './services/prisma.service';
import { AgendaService } from './services/agenda.service';

import {
  AuthenticationGateway,
  IdentityGateway,
  MessageGateway,
  AuthenticationService,
  StationService,
  MessageService,
} from './acars/gateways';
import { ClientsService } from './services/clients.service';

@Module({
  imports: [ScheduleModule.forRoot(), DataModule],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    AgendaService,
    ClientsService,

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
