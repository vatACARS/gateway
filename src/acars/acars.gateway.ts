import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import { AuthenticationGateway, StationGateway } from './gateways';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
export class AcarsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AcarsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly authenticationGateway: AuthenticationGateway,
    private readonly stationGateway: StationGateway,
  ) {}

  private clients = new Map<string, Socket>();

  afterInit() {
    this.logger.log('Gateway is online.');
  }

  handleConnection(client: Socket) {
    const clientId = uuidv4();
    (client as any)._id = clientId;
    this.logger.log(`${clientId} connected.`);

    // Set up authentication timeout
    setTimeout(() => {
      if (!(client as any)._authenticated) {
        this.logger.warn(`${clientId} failed to authenticate in time.`);
        client.terminate();
      }
    }, 5000);

    this.clients.set(clientId, client);
  }

  handleDisconnect(client: Socket) {
    const clientId = (client as any)._id;
    this.logger.log(`${clientId} disconnected.`);
    this.clients.delete(clientId);
  }
}
