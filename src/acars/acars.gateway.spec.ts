import { Test } from '@nestjs/testing';
import { AcarsGateway } from './acars.gateway';
import { INestApplication } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';
import { AuthenticationGateway } from './authorities';

async function createNestApp(...gateways: any): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  return testingModule.createNestApplication();
}

describe('ChatGateway', () => {
  let gateway: AcarsGateway;
  let app: INestApplication;
  let ioClient: Socket;

  beforeAll(async () => {
    app = await createNestApp(AcarsGateway, AuthenticationGateway);
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
