import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket } from 'ws';

import { AuthorityCategory, AuthorityAction } from './authentication.enums';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
export class AuthenticationGateway {
  private readonly logger = new Logger(AuthenticationGateway.name);

  @SubscribeMessage(AuthorityCategory.Authentication)
  async handleAuthentication(
    client: Socket,
    data: {
      Action: AuthorityAction;
      [key: string]: any;
    },
  ) {
    const clientId = (client as any)._id;

    if (!data.Action) {
      this.logger.warn(`${clientId} sent a request with no AuthorityAction.`);
      return;
    }

    this.logger.log(`${clientId} actioned ${AuthorityAction[data.Action]}`);

    switch (data.Action) {
      case AuthorityAction.Authenticate:
        if (!data.Token) {
          this.logger.warn(`${clientId} failed authentication: missing token`);
          client.terminate();
          return;
        }
        (client as any)._authenticated = true;
        this.logger.log(`${clientId} authenticated successfully.`);
        client.send(JSON.stringify({ status: 'OK', token: data.Token }));
        break;

      default:
        this.logger.warn(
          `${clientId} sent unknown AuthorityAction: ${data.Action}`,
        );
        break;
    }
  }
}
