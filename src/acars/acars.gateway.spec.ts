import { Test } from '@nestjs/testing';
import { AcarsGateway } from './acars.gateway';
import { INestApplication } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';

import { AgendaService } from '../_lib/agenda.service';
import { PrismaService } from '../_lib/prisma.service';
import {
  AuthenticationGateway,
  StationGateway,
  MessageGateway,
  AuthenticationService,
  StationService,
  MessageService,
} from './gateways';

async function createNestApp(...gateways: any): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  return testingModule.createNestApplication();
}

describe('ACARSGateway', () => {
  let gateway: AcarsGateway;
  let app: INestApplication;
  let ioClient: Socket;

  beforeAll(async () => {
    app = await createNestApp(
      AcarsGateway,
      AgendaService,
      PrismaService,
      AuthenticationGateway,
      StationGateway,
      MessageGateway,
      AuthenticationService,
      StationService,
      MessageService,
    );
    gateway = app.get<AcarsGateway>(AcarsGateway);
    ioClient = io('http://localhost:3000', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    app.listen(3000);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should connect', async () => {
    ioClient.connect();
  });
});
