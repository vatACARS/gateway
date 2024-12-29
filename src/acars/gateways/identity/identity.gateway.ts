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
  private pendingLogins = new Map<string, string>();

  constructor(private stationService: StationService) { }

  @SubscribeMessage(AuthorityCategory.Identity)
  async handleIdentity(
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

        this.pendingLogins.set(clientId, data.stationCode);

        try {
          const station = await this.stationService.createStationAndAssignUser(
            data.stationCode,
            {},
            client._userId,
          );

          if (!station || !this.pendingLogins.has(clientId)) {
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
        } catch (error) {
          this.logger.error(`Error during login for ${clientId}: ${error.message}`);
          return client.send(
            createResponse(
              'error',
              data.requestId,
              'An error occurred during the login process.',
            ),
          );
        } finally {
          this.pendingLogins.delete(clientId);
        }
        break;

      case AuthorityAction.Logout:
        if (this.pendingLogins.has(clientId)) {
          const stationCode = this.pendingLogins.get(clientId);
          this.logger.warn(`${clientId} logged out during login to station "${stationCode}"`);

          this.stationService.cleanupPendingLogin(clientId, stationCode);

          return this.pendingLogins.delete(clientId);
        }

        if (!(client as any)._station) {
          this.logger.warn(
            `${clientId} attempted to logout without being logged in`,
          );
          return client.send(
            createResponse(
              'error',
              data.requestId,
              'You are not logged into a station.',
            ),
          );
        }

        this.stationService.deallocateStationFromUser(client._userId);
        this.logger.log(
          `${clientId} logged out of station "${(client as any)._station}"`,
        );
        delete (client as any)._station;
        return client.send(
          createResponse(
            'success',
            data.requestId,
            'Successfully logged out of station.',
          ),
        );
        break;
    }
  }

  handleDisconnect(client: Socket) {
    let clientId = (client as any).id;

    if (this.pendingLogins.has(clientId)) {
      const stationCode = this.pendingLogins.get(clientId);
      this.logger.warn(`${clientId} disconnected during login to station "${stationCode}"`);
  
      this.stationService.cleanupPendingLogin(clientId, stationCode).catch((err) => {
        this.logger.error(`Failed to clean up pending login for ${clientId}: ${err.message}`);
      });
  
      this.pendingLogins.delete(clientId);
    }

    if ((client as any)._station) {
      this.stationService.deallocateStationFromUser((client as any)._userId);
      this.logger.log(`${client._id} deallocated from ${client._station}`);
    }
  }
}
