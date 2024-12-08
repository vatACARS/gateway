import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
//import { Socket } from 'ws';
import { Guard } from '../../guard.gateway';
import { WsExceptionFilter } from '../../guard.exceptions';

import { AuthorityCategory /*, AuthorityAction*/ } from './message.enums';
import { MessageService } from './message.service';

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
@UseGuards(Guard)
@UseFilters(WsExceptionFilter)
export class MessageGateway {
  private readonly logger = new Logger(MessageGateway.name);

  constructor(private messageService: MessageService) {}

  @SubscribeMessage(AuthorityCategory.Station)
  async handleMessage_Station /*client: Socket,
    data: {
      Action: AuthorityAction;
      [key: string]: any;
    },*/() {}

  @SubscribeMessage(AuthorityCategory.CPDLC)
  async handleMessage_CPDLC /*client: Socket,
    data: {
      Action: AuthorityAction;
      [key: string]: any;
    },*/() {}

  @SubscribeMessage(AuthorityCategory.Telex)
  async handleMessage_Telex /*client: Socket,
    data: {
      Action: AuthorityAction;
      [key: string]: any;
    },*/() {}

  @SubscribeMessage(AuthorityCategory.Administrative)
  async handleMessage_Administrative /*client: Socket,
    data: {
      Action: AuthorityAction;
      [key: string]: any;
    },*/() {}
}
