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

import { ClientsService } from 'src/services/clients.service';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
export class AcarsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AcarsGateway.name);
  private authenticationTimeouts: Map<string, NodeJS.Timeout> = new Map();

  @WebSocketServer()
  server: Server;

  constructor(private clientsService: ClientsService) {}

  afterInit() {
    this.logger.log('Gateway is online.');
  }

  async handleConnection(client: Socket) {
    const socketId = uuidv4().split('-')[0];
    client._socketId = socketId;
    this.logger.log(`${socketId} connected.`);

    const authTimeout = setTimeout(() => {
      if (!client._authenticated) {
        this.logger.warn(`${socketId} failed to authenticate in time.`);
        client.terminate();
      }
    }, 5000);

    this.clientsService.addClient(socketId, client);
    this.authenticationTimeouts.set(socketId, authTimeout);
  }

  handleDisconnect(client: Socket) {
    const socketId = client._socketId;
    const authTimeout = this.authenticationTimeouts.get(socketId);
    if (authTimeout) clearTimeout(authTimeout);
    this.clientsService.removeClient(client);
    this.logger.log(`${socketId} disconnected.`);
  }
}
