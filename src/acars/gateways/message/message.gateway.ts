import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Socket } from 'ws';
import { Guard } from '../../guard.gateway';
import { WsExceptionFilter } from '../../guard.exceptions';

import {
  AuthorityCategory,
  AuthorityAction,
  ResponseCode,
} from './message.enums';
import { MessageService } from './message.service';
import { createResponse } from '../../../_lib/apiResponse';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
@UseGuards(Guard)
@UseFilters(WsExceptionFilter)
export class MessageGateway {
  private readonly logger = new Logger(MessageGateway.name);

  constructor(private messageService: MessageService) {}

  @SubscribeMessage(AuthorityCategory.CPDLC)
  async handleMessage_CPDLC(
    client: Socket,
    data: {
      action: AuthorityAction;
      requestId: string;
      recipient: string;
      message: string;
      responseCode: ResponseCode;
    },
  ): Promise<void> {
    await this.handleMessage(
      client,
      data,
      this.messageService.sendCPDLCMessage.bind(this.messageService),
      'CPDLC',
    );
  }

  @SubscribeMessage(AuthorityCategory.Telex)
  async handleMessage_Telex(
    client: Socket,
    data: {
      action: AuthorityAction;
      requestId: string;
      recipient: string;
      message: string;
    },
  ): Promise<void> {
    await this.handleMessage(
      client,
      data,
      this.messageService.sendTelexMessage.bind(this.messageService),
      'TELEX',
    );
  }

  @SubscribeMessage(AuthorityCategory.Station)
  async handleMessage_Station(): Promise<void> {}

  @SubscribeMessage(AuthorityCategory.Administrative)
  async handleMessage_Administrative(): Promise<void> {}

  private async handleMessage(
    client: Socket,
    data: {
      action: AuthorityAction;
      requestId: string;
      recipient?: string;
      message?: string;
      responseCode?: ResponseCode;
    },
    handler: (
      userId: string,
      recipient: string,
      message: string,
      responseCode?: ResponseCode,
    ) => Promise<{ success: boolean; message: string | any }>,
    logPrefix: string,
  ): Promise<void> {
    const clientId = this.getClientId(client);

    if (!data.requestId)
      return this.sendError(client, `Missing requestId.`, 'gateway');
    if (!data.action)
      return this.sendError(client, 'Missing AuthorityAction.', data.requestId);

    this.logger.log(`${clientId}/${AuthorityAction[data.action]}`);

    if (!data.recipient)
      return this.sendError(client, 'Missing recipient.', data.recipient);
    if (!data.message)
      return this.sendError(client, 'Missing message.', data.requestId);

    data.responseCode = data.responseCode || ResponseCode.None;

    this.logger.log(
      `${clientId}/${client._stationCode} --${logPrefix}--> ${data.recipient}: ${data.message.replaceAll('\n', '#')}`,
    );

    const response = await handler(
      client._userId,
      data.recipient,
      data.message,
      data.responseCode,
    );

    if (!response.success)
      return this.sendError(client, response.message, data.requestId);
    return this.sendSuccess(client, response.message, data.requestId);
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
