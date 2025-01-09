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

  constructor(private readonly stationService: StationService) {}

  @SubscribeMessage(AuthorityCategory.Identity)
  async handleIdentity(
    client: Socket,
    data: {
      action: AuthorityAction;
      requestId: string;
      stationCode?: any;
    },
  ) {
    const clientId = this.getClientId(client);

    if (!data.requestId)
      return this.sendError(client, 'Missing requestId.', 'gateway');
    if (!data.action)
      return this.sendError(client, 'Missing AuthorityAction.', data.requestId);

    this.logger.log(`${clientId}/${AuthorityAction[data.action]}`);

    try {
      switch (data.action) {
        case AuthorityAction.RegisterClient:
          await this.handleRegisterClient(client, clientId, data);
          break;

        case AuthorityAction.Logout:
          await this.handleLogout(client, clientId, data);
          break;

        default:
          this.sendError(client, 'Invalid action.', data.requestId);
          break;
      }
    } catch (err) {
      this.logger.error(
        `${clientId}/${AuthorityAction[data.action]}: ${err.message}`,
      );
      this.sendError(client, 'An unexpected error occured.', data.requestId);
    }
  }

  async handleDisconnect(client: Socket) {
    const clientId = this.getClientId(client);

    if (this.pendingLogins.has(clientId))
      await this.cleanupPendingLogin(
        clientId,
        this.pendingLogins.get(clientId),
      );
    if (client._stationCode) await this.cleanupActiveStation(client);
  }

  private async handleRegisterClient(
    client: Socket,
    clientId: string,
    data: {
      requestId: string;
      stationCode?: string;
    },
  ) {
    if (!data.stationCode)
      return this.sendError(client, 'Missing StationCode', data.requestId);
    this.pendingLogins.set(clientId, data.stationCode);

    try {
      const station = await this.stationService.createStationAndAssignUser(
        data.stationCode,
        {},
        client._userId,
      );

      if (!station || !this.pendingLogins.has(clientId))
        throw new Error(
          `Failed to provision ${data.stationCode} for ${clientId}`,
        );

      this.logger.log(`${clientId}/${data.stationCode} provisioned.`);
      client._stationCode = station.logonCode;

      this.sendSuccess(
        client,
        `Provisioned ${data.stationCode} to you.`,
        data.requestId,
      );
    } catch (err) {
      this.logger.error(`${clientId}/${data.stationCode}: ${err.message}`);
      this.sendError(client, 'Provisioning station failed.', data.requestId);
    } finally {
      this.pendingLogins.delete(clientId);
    }
  }

  private async handleLogout(
    client: Socket,
    clientId: string,
    data: {
      requestId: string;
    },
  ) {
    if (this.pendingLogins.has(clientId)) {
      const stationCode = this.pendingLogins.get(clientId);
      await this.cleanupPendingLogin(clientId, stationCode);
      this.pendingLogins.delete(clientId);
      return;
    }

    if (!client._stationCode)
      return this.sendError(
        client,
        "You weren't provisioned a station.",
        data.requestId,
      );

    await this.cleanupActiveStation(client);
    this.sendSuccess(client, 'Logged out.', data.requestId);
  }

  private async cleanupPendingLogin(clientId: string, stationCode: string) {
    try {
      await this.stationService.cleanupPendingLogin(clientId, stationCode);
    } catch (err) {
      this.logger.error(
        `${clientId}/${stationCode}: Failed to cleanup pending login.`,
      );
    }
  }

  private async cleanupActiveStation(client: Socket) {
    const clientId = this.getClientId(client);

    try {
      await this.stationService.deallocateStationFromUser(client._userId);
      this.logger.log(`${clientId}/${client._stationCode} deallocated.`);
      delete client._stationCode;
    } catch (err) {
      this.logger.error(
        `${clientId}/${client._stationCode}: Failed to deallocate.`,
      );
    }
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
