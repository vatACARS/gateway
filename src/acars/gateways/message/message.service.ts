import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/_lib/prisma.service';
import { ClientsService } from 'src/services/clients.service';
import { createResponse } from 'src/_lib/apiResponse';
import { v4 as uuidv4 } from 'uuid';
import { AuthorityAction, AuthorityCategory } from './message.enums';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
  ) {}

  async sendCPDLCMessage(
    sender: string,
    recipient: string,
    message: string,
    responseCode: string,
  ) {
    if (!sender || !recipient || !message || !responseCode)
      return { success: false, message: 'Missing required fields' };
    const senderStation = await this.prisma.station.findUnique({
      where: { acarsUser: sender },
    });
    if (!senderStation) return { success: false, message: 'Invalid sender' };

    let receiverStation = await this.prisma.station.findUnique({
      where: { logonCode: recipient },
    });
    if (!receiverStation) {
      receiverStation = await this.prisma.station.create({
        data: {
          logonCode: recipient,
        },
      });
    }

    await this.prisma.message.create({
      data: {
        senderUser: {
          connect: { id: senderStation.id },
        },
        receipientUser: {
          connect: { id: receiverStation.id },
        },
        message,
        responseCode,
        type: 'cpdlc',
      },
    });

    const user = await this.prisma.acarsUser.findUnique({
      where: { id: senderStation.acarsUser },
      include: { oauthAccounts: true },
    });
    const hoppiesToken = user.oauthAccounts.find(
      (o) => o.provider === 'hoppies',
    )?.accessToken;

    if (hoppiesToken) {
      const data = await fetch(
        'http://www.hoppie.nl/acars/system/connect.html',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            logon: hoppiesToken,
            from: senderStation.logonCode,
            to: recipient,
            type: 'CPDLC',
            packet: '/data2/1/1/N/TEST',
          }),
        },
      );
      console.log(await data.text());
    }

    const recipientSocket =
      this.clientsService.getClientByStationCode(recipient);
    if (recipientSocket)
      recipientSocket.send(
        createResponse('success', uuidv4().split('-')[0], '', {
          gateway: AuthorityCategory.CPDLC,
          action: AuthorityAction.ReceiveCPDLCMessage,
          cpdlc: {
            sender: senderStation.logonCode,
            responseCode,
            message,
          },
        }),
      );

    return { success: true, message: 'Message sent' };
  }

  async sendTelexMessage(sender: string, recipient: string, message: string) {
    if (!sender || !recipient || !message)
      return { success: false, message: 'Missing required fields' };
    const senderStation = await this.prisma.station.findUnique({
      where: { acarsUser: sender },
    });
    if (!senderStation) return { success: false, message: 'Invalid sender' };

    let receiverStation = await this.prisma.station.findUnique({
      where: { logonCode: recipient },
    });
    if (!receiverStation) {
      receiverStation = await this.prisma.station.create({
        data: {
          logonCode: recipient,
        },
      });
    }

    await this.prisma.message.create({
      data: {
        senderUser: {
          connect: { id: senderStation.id },
        },
        receipientUser: {
          connect: { id: receiverStation.id },
        },
        message,
        type: 'telex',
      },
    });

    const recipientSocket =
      this.clientsService.getClientByStationCode(recipient);
    if (recipientSocket)
      recipientSocket.send(
        createResponse('success', uuidv4().split('-')[0], '', {
          gateway: AuthorityCategory.Telex,
          action: AuthorityAction.ReceiveTelexMessage,
          telex: {
            sender: senderStation.logonCode,
            message,
          },
        }),
      );

    return { success: true, message: 'Message sent' };
  }
}
