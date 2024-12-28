import { Logger } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'ws';

import { AuthorityCategory, AuthorityAction } from './authentication.enums';

import { createResponse } from '../../../_lib/apiResponse';
import { AuthenticationService } from './authentication.service';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
export class AuthenticationGateway {
  private readonly logger = new Logger(AuthenticationGateway.name);

  constructor(private authenticationService: AuthenticationService) {}

  @SubscribeMessage(AuthorityCategory.Authentication)
  async handleAuthentication(
    client: Socket,
    data: {
      action: AuthorityAction;
      requestId: string;
      [key: string]: any;
    },
  ) {
    const clientId = (client as any)._id;

    if (!data.requestId) {
      this.logger.warn(`${clientId} sent a request with no requestId.`);
      return client.send(
        createResponse('error', 'gateway', 'Missing requestId.'),
      );
    }

    if (!data.action) {
      this.logger.warn(`${clientId} sent a request with no AuthorityAction.`);
      return client.send(
        createResponse('error', data.requestId, 'Missing GatewayAction.'),
      );
    }

    this.logger.log(`${clientId} actioned ${AuthorityAction[data.action]}`);

    switch (data.action) {
      case AuthorityAction.Authenticate:
        if (!data.token) {
          this.logger.warn(`${clientId} failed authentication: missing token`);
          return client.send(
            createResponse('error', data.requestId, 'Authentication failed.'),
          );
        }
        if (
          !(await this.authenticationService.authenticateUserByToken(
            data.token,
          ))
        ) {
          this.logger.warn(`${clientId} failed authentication: invalid token`);
          return client.send(
            createResponse('error', data.requestId, 'Authentication failed.'),
          );
        }

        const user = await this.authenticationService.getAcarsUserByToken(
          data.token,
        );
        (client as any)._authenticated = true;
        (client as any)._token = data.token;
        (client as any)._userId = user.id;
        (client as any)._id = user.username;

        this.logger.log(
          `${clientId} authenticated successfully as ${(client as any)._id} (${(client as any)._userId})`,
        );
        client.send(
          createResponse('success', data.requestId, 'Logged in successfully.'),
        );
        break;

      default:
        this.logger.warn(
          `${clientId} sent unknown AuthorityAction: ${data.action}`,
        );
        client.send(
          createResponse(
            'error',
            data.requestId,
            `Unknown GatewayAction: '${data.action}'`,
          ),
        );
        break;
    }
  }
}
