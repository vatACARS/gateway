import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Socket } from 'ws';
import { Guard } from '../../guard.gateway';
import { WsExceptionFilter } from '../../guard.exceptions';

import { AuthorityCategory, AuthorityAction } from './station.enums';
import { StationService } from './station.service';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
@UseGuards(Guard)
@UseFilters(WsExceptionFilter)
export class StationGateway {
  private readonly logger = new Logger(StationGateway.name);

  constructor(private stationService: StationService) {}

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
        if (!data.StationCode)
          return client.send(
            JSON.stringify({
              status: 'ERROR',
              message: 'Missing StationCode in request.',
            }),
          );
        this.logger.log(
          `${clientId} logged into station "${data.StationCode}"`,
        );
        const station = await this.stationService.createStationAndAssignUser(
          data.StationCode,
          {},
          '123',
        );
        if (!station)
          return client.send(
            JSON.stringify({
              status: 'ERROR',
              message: `Provisioning "${data.StationCode} failed.`,
            }),
          );
        (client as any)._station = station;
    }
  }
}
