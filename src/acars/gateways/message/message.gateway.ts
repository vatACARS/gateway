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
import { PrismaService } from '../../../services/prisma.service';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
@UseGuards(Guard)
@UseFilters(WsExceptionFilter)
export class MessageGateway {
  private readonly logger = new Logger(MessageGateway.name);

  constructor(
    private messageService: MessageService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    /*this.prisma.$use(async (params, next) => {
      if(params.model === "Message") {
        if(params.action === "create") {
          
        }
      }
    });*/
  }

  @SubscribeMessage(AuthorityCategory.Station)
  async handleMessage_Station /*client: Socket,
    data: {
      action: AuthorityAction;
      [key: string]: any;
    },*/() {}

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
      case AuthorityAction.SendCPDLCMessage:
        if (!data.recipient) {
          this.logger.warn(
            `${clientId} failed to send CPDLC message: missing recipient`,
          );
          return client.send(
            createResponse('error', data.requestId, 'Missing recipient.'),
          );
        }

        if (!data.message) {
          this.logger.warn(
            `${clientId} failed to send CPDLC message: missing message`,
          );
          return client.send(
            createResponse('error', data.requestId, 'Missing message.'),
          );
        }

        if (!data.responseCode) data.responseCode = ResponseCode.None;

        this.logger.log(
          `${clientId} ${client._station} --CPDLC-> ${data.recipient}\n${data.message}`,
        );

        const responseCpdlc: any /* TODO: DEFINE */ =
          await this.messageService.sendCPDLCMessage(
            client._userId,
            data.recipient,
            data.message,
            data.responseCode,
          );

        if (!responseCpdlc.success) {
          return client.send(
            createResponse('error', data.requestId, responseCpdlc.message),
          );
        }

        return client.send(
          createResponse('success', data.requestId, responseCpdlc),
        );

      default:
        this.logger.warn(`${clientId} sent an unknown action`);
        return client.send(
          createResponse('error', data.requestId, 'Unknown action.'),
        );
    }
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
      case AuthorityAction.SendTelexMessage:
        if (!data.recipient) {
          this.logger.warn(
            `${clientId} failed to send Telex message: missing recipient`,
          );
          return client.send(
            createResponse('error', data.requestId, 'Missing recipient.'),
          );
        }

        if (!data.message) {
          this.logger.warn(
            `${clientId} failed to send Telex message: missing message`,
          );
          return client.send(
            createResponse('error', data.requestId, 'Missing message.'),
          );
        }

        this.logger.log(
          `${clientId} ${client._station} --TELEX-> ${data.recipient}\n${data.message}`,
        );

        const responseTelex: any /* TODO: DEFINE */ =
          await this.messageService.sendTelexMessage(
            client._userId,
            data.recipient,
            data.message,
          );

        if (!responseTelex.success) {
          return client.send(
            createResponse('error', data.requestId, responseTelex.message),
          );
        }

        return client.send(
          createResponse('success', data.requestId, responseTelex),
        );

      default:
        this.logger.warn(`${clientId} sent an unknown action`);
        return client.send(
          createResponse('error', data.requestId, 'Unknown action.'),
        );
    }
  }

  @SubscribeMessage(AuthorityCategory.Administrative)
  async handleMessage_Administrative /*client: Socket,
    data: {
      action: AuthorityAction;
      [key: string]: any;
    },*/() {}
}
