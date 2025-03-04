import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { randomInt } from 'crypto';
import { ClientsService } from './clients.service';
import { createResponse } from 'src/_lib/apiResponse';
import { v4 as uuidv4 } from 'uuid';
import {
  AuthorityAction,
  AuthorityCategory,
} from 'src/acars/acars.gateway.enums';

@Injectable()
export class HoppiesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HoppiesService.name);
  private pollingIntervals: { [userId: string]: NodeJS.Timeout } = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
  ) {}

  onModuleInit() {
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  private async fetchConnectedUsers() {
    return this.prisma.acarsUser.findMany({
      where: {
        isConnected: true,
        currPosition: { isNot: null },
      },
      include: {
        oauthAccounts: {
          where: { provider: 'hoppies' },
        },
        currPosition: true,
      },
    });
  }

  private async parseResponse(response: string) {
    const blockRegex = /\{(.*?)\}/g;
    const blocks = [];
    let match;
    while ((match = blockRegex.exec(response)) !== null) {
      blocks.push(match[1]);
    }

    return blocks.map((block) => {
      const parts = block.split(' ');
      const identifier = parts[0]; // e.g., "JST460"
      const messageType = parts[1]; // e.g., "telex"
      const message = parts.slice(2).join(' '); // Rest of the message
      return { identifier, messageType, message };
    });
  }

  private async parseCPDLCMessage(message: string) {
    const cpdlcRegex = /\/data2\/(\d+)\/(\d*)\/([YNERWU])\/(.+)/;
    const match = cpdlcRegex.exec(message);
    if (!match)
      return {
        messageId: 0,
        replyToId: 0,
        responseCode: 'N',
        content: 'ERROR: Failed to parse CPDLC message.',
      };

    const [, messageId, replyToId, responseCode, content] = match;

    return {
      messageId: parseInt(messageId, 10),
      replyToId: replyToId ? parseInt(replyToId, 10) : null,
      responseCode,
      content,
    };
  }

  private async pollUser(
    userId: string,
    accessToken: string,
    callsign: string,
  ) {
    try {
      const data = await fetch(
        'http://www.hoppie.nl/acars/system/connect.html',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            logon: accessToken,
            from: callsign,
            to: callsign,
            type: 'poll',
            packet: null,
          }),
        },
      ).then((data) => data.text());

      const messages = await this.parseResponse(data);
      const recipientSocket = this.clientsService.getClientByClientId(userId);
      if (recipientSocket) {
        for (const message of messages) {
          const cpdlcContent = await this.parseCPDLCMessage(message.message);

          recipientSocket.send(
            createResponse('success', uuidv4().split('-')[0], '', {
              gateway:
                message.messageType === 'telex'
                  ? AuthorityCategory.Telex
                  : AuthorityCategory.CPDLC,
              action:
                message.messageType === 'telex'
                  ? AuthorityAction.ReceiveTelexMessage
                  : AuthorityAction.ReceiveCPDLCMessage,
              cpdlc:
                message.messageType === 'telex'
                  ? null
                  : {
                      sender: message.identifier,
                      responseCode: cpdlcContent.responseCode,
                      replyToId: cpdlcContent.replyToId,
                      message: cpdlcContent.content,
                    },
              telex:
                message.messageType !== 'telex'
                  ? null
                  : {
                      sender: message.identifier,
                      message: message.message,
                    },
            }),
          );
        }
      }
    } catch (e) {
      this.logger.error(e.message);
    }
  }

  private schedulePolling(
    userId: string,
    accessToken: string,
    callsign: string,
  ) {
    const interval = randomInt(45000, 75000);

    this.pollingIntervals[userId] = setTimeout(
      async () => await this.pollUser(userId, accessToken, callsign),
      interval,
    );
  }

  private async startPolling() {
    const connectedUsers = await this.fetchConnectedUsers();
    this.logger.log(
      `Starting polling loop with ${connectedUsers.length} connected users.`,
    );

    connectedUsers.forEach((user) => {
      const hoppies = user.oauthAccounts[0];
      const station = user.currPosition;
      if (hoppies && station)
        this.schedulePolling(user.id, hoppies.accessToken, station.logonCode);
    });

    setTimeout(() => this.startPolling(), 75000);
  }

  private stopPolling() {
    Object.values(this.pollingIntervals).forEach(clearTimeout);
    this.pollingIntervals = {};
  }
}
