import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Socket } from 'ws';
import { Guard } from 'src/acars/guard.gateway';
import { WsExceptionFilter } from 'src/acars/guard.exceptions';

import { AuthorityCategory, AuthorityAction } from './station.enums';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
@UseGuards(Guard)
@UseFilters(WsExceptionFilter)
export class StationGateway {
  private readonly logger = new Logger(StationGateway.name);

  @SubscribeMessage(AuthorityCategory.Client)
  async handleStation(
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
      case AuthorityAction.RegisterClient:
    }
  }
}
