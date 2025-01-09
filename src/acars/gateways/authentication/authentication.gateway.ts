import { Logger } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'ws';

import { AuthorityCategory, AuthorityAction } from './authentication.enums';

import { createResponse } from '../../../_lib/apiResponse';
import { AuthenticationService } from './authentication.service';
import { ClientsService } from 'src/services/clients.service';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
export class AuthenticationGateway {
  private readonly logger = new Logger(AuthenticationGateway.name);

  constructor(
    private authenticationService: AuthenticationService,
    private clientsService: ClientsService,
  ) {}

  @SubscribeMessage(AuthorityCategory.Authentication)
  async handleAuthentication(
    client: Socket,
    data: {
      action: AuthorityAction;
      requestId: string;
      token?: string;
      [key: string]: any;
    },
  ) {
    const clientId = this.getClientId(client);

    if (!data.requestId)
      return this.sendError(client, `Missing requestId.`, 'gateway');
    if (!data.action)
      return this.sendError(client, 'Missing AuthorityAction.', data.requestId);

    this.logger.log(`${clientId}/${AuthorityAction[data.action]}`);

    switch (data.action) {
      case AuthorityAction.Authenticate:
        await this.authenticateClient(client, data, clientId);
        break;

      default:
        this.sendError(client, 'Invalid action.', data.requestId);
        break;
    }
  }

  private async authenticateClient(
    client: Socket,
    data: {
      requestId: string;
      token?: string;
    },
    clientId: string,
  ): Promise<void> {
    if (!data.token)
      return this.sendError(client, 'Authentication failed.', data.requestId);

    const authResult = await this.authenticationService.authenticateUserByToken(
      data.token,
    );
    if (!authResult)
      return this.sendError(
        client,
        `Authentication failed: ${authResult}`,
        data.requestId,
      );

    const user = await this.authenticationService.getAcarsUserByToken(
      data.token,
    );
    this.updateClientState(client, clientId, data.token, user);
    this.sendSuccess(client, 'Logged in successfully.', data.requestId);
  }

  private updateClientState(
    client: Socket,
    clientId: string,
    token: string,
    user: {
      id: string;
      username: string;
    },
  ): void {
    client._authenticated = true;
    client._token = token;
    client._userId = user.id;
    client._username = user.username;

    this.clientsService.removeClient(clientId);
    this.clientsService.addClient(clientId, client);
  }

  private sendError(client: Socket, message: string, requestId: string) {
    client.send(createResponse('error', requestId, message));
  }

  private sendSuccess(client: Socket, message: string, requestId: string) {
    client.send(createResponse('success', requestId, message));
  }

  private getClientId(client: Socket): string {
    return client._socketId || 'unknown-client';
  }
}
