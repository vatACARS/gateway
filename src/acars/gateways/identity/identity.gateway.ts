import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Socket } from 'ws';
import { Guard } from '../../guard.gateway';
import { WsExceptionFilter } from '../../guard.exceptions';

import { AuthorityCategory, AuthorityAction } from './identity.enums';
import { StationService } from './identity.service';

import { createResponse } from '../../../_lib/apiResponse';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
@UseGuards(Guard)
@UseFilters(WsExceptionFilter)
export class IdentityGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(IdentityGateway.name);

  constructor(private stationService: StationService) {}

  @SubscribeMessage(AuthorityCategory.Identity)
  async handleStation(
    client: Socket,
    data: {
      action: AuthorityAction;
      requestId: string;
      [key: string]: any;
    },
  ) {
    const clientId = (client as any)._id;

    if (!data.requestId) {
      this.logger.warn(`${clientId} sent a request with no requestId`);
      return client.send(
        createResponse('error', 'gateway', 'Missing requestId.'),
      );
    }

    if (!data.action) {
      this.logger.warn(`${clientId} sent a request with no AuthorityAction`);
      return client.send(
        createResponse('error', data.requestId, 'Missing GatewayAction.'),
      );
    }

    this.logger.log(`${clientId} actioned ${AuthorityAction[data.action]}`);

    switch (data.action) {
      case AuthorityAction.RegisterClient:
        if (!data.stationCode) {
          this.logger.warn(
            `${clientId} failed to provision station: missing stationCode`,
          );
          return client.send(
            createResponse(
              'error',
              data.requestId,
              'Missing StationCode in request.',
            ),
          );
        }

        const station = await this.stationService.createStationAndAssignUser(
          data.stationCode,
          {},
          client._userId,
        );

        if (!station) {
          this.logger.warn(
            `${clientId} failed to provision station "${data.stationCode}"`,
          );
          return client.send(
            createResponse(
              'error',
              data.requestId,
              `Provisioning ${data.stationCode} failed.`,
            ),
          );
        }

        this.logger.log(
          `${clientId} logged into station "${data.stationCode}"`,
        );
        (client as any)._station = station.logonCode;
        return client.send(
          createResponse(
            'success',
            data.requestId,
            `Successfully provisioned ${data.stationCode} and assigned it to you.`,
          ),
        );
    }
  }

  handleDisconnect(client: Socket) {
    if ((client as any)._station) {
      this.stationService.deallocateStationFromUser((client as any)._userId);
      this.logger.log(`${client._id} deallocated from ${client._station}`);
    }
  }
}
