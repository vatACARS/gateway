/*
import { Test } from '@nestjs/testing';
import { AcarsGateway } from './acars.gateway';
import { INestApplication } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';


import { AgendaService } from '../_lib/agenda.service';
import { PrismaService } from '../_lib/prisma.service';
import { AppService } from '../app.service';
import {
  AuthenticationGateway,
  IdentityGateway,
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
*/

describe('ACARSGateway', () => {
  /*let gateway: AcarsGateway;
  let app: INestApplication;
  let ioClient: Socket;*/

  it('is todo', () => expect(true).toBe(true));

  /*beforeAll(async () => {
    app = await createNestApp(
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
    );
    gateway = app.get<AcarsGateway>(AcarsGateway);
    ioClient = io('ws://localhost:3000/gateway', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
    console.log(app);

    await app.listen(3000);
    ioClient.connect();
    //await new Promise<void>((resolve) => ioClient.on('connect', resolve));
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should connect', async () => {
    ioClient.connect();
    await new Promise<void>((resolve) => ioClient.on('connect', resolve));
    expect(ioClient.connected).toBe(true);
  });

  it('should disconnect', async () => {
    ioClient.connect();
    await new Promise<void>((resolve) => ioClient.on('connect', resolve));
    ioClient.disconnect();
    expect(ioClient.connected).toBe(false);
  });

  it('should log connection and disconnection', async () => {
    const logSpy = jest.spyOn(gateway['logger'], 'log');
    ioClient.connect();
    await new Promise<void>((resolve) => ioClient.on('connect', resolve));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('connected'));

    ioClient.disconnect();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('disconnected'),
    );
  });

  it('should terminate unauthenticated clients after timeout', async () => {
    const warnSpy = jest.spyOn(gateway['logger'], 'warn');
    ioClient.connect();
    await new Promise<void>((resolve) => ioClient.on('connect', resolve));
    await new Promise((resolve) => setTimeout(resolve, 6000)); // Wait for timeout
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed to authenticate in time'),
    );
    expect(ioClient.connected).toBe(false);
  });*/
});
