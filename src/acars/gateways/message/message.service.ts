import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import { ClientsService } from 'src/services/clients.service';
import { createResponse } from 'src/_lib/apiResponse';
import { AuthorityAction, AuthorityCategory } from './message.enums';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
  ) { }

  async sendCPDLCMessage(
    sender: string,
    recipient: string,
    message: string,
    responseCode: string,
    replyToId: number | null,
  ) {
    if (!sender || !recipient || !message || !responseCode)
      return { success: false, message: 'Missing required fields' };

    try {
      const senderStation = await this.validateSender(sender);
      const receiverStation = await this.findReceiver(recipient);

      await this.prisma.station.update({
        where: {
          acarsUser: sender,
        },
        data: {
          txCount: {
            increment: 1,
          },
        },
      });

      await this.prisma.message.create({
        data: {
          senderUser: {
            connect: { id: senderStation.id },
          },
          receipientUser: receiverStation
            ? { connect: { id: receiverStation.id } }
            : undefined,
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

      if (hoppiesToken)
        await fetch('http://www.hoppie.nl/acars/system/connect.html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            logon: hoppiesToken,
            from: senderStation.logonCode,
            to: recipient,
            type: 'CPDLC',
            packet: `/data2/${senderStation.txCount + 1}/${replyToId}/${responseCode}/${message}`,
          }),
        });

      await this.sendToRecipientSocket(
        recipient,
        AuthorityCategory.CPDLC,
        AuthorityAction.ReceiveCPDLCMessage,
        {
          cpdlc: {
            sender: senderStation.logonCode,
            responseCode,
            replyToId,
            message,
          },
        },
      );

      return { success: true, message: 'Message sent' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async sendTelexMessage(sender: string, recipient: string, message: string) {
    if (!sender || !recipient || !message)
      return { success: false, message: 'Missing required fields' };

    try {
      const senderStation = await this.validateSender(sender);
      const receiverStation = await this.findReceiver(recipient);

      await this.prisma.message.create({
        data: {
          senderUser: {
            connect: { id: senderStation.id },
          },
          receipientUser: receiverStation
            ? { connect: { id: receiverStation.id } }
            : undefined,
          message,
          type: 'telex',
        },
      });

      const user = await this.prisma.acarsUser.findUnique({
        where: { id: senderStation.acarsUser },
        include: { oauthAccounts: true },
      });

      const hoppiesToken = user.oauthAccounts.find(
        (o) => o.provider === 'hoppies',
      )?.accessToken;

      if (hoppiesToken)
        await fetch(
          'http://www.hoppie.nl/acars/system/connect.html',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              logon: hoppiesToken,
              from: senderStation.logonCode,
              to: recipient,
              type: 'telex',
              packet: message,
            }),
          },
        );

      await this.sendToRecipientSocket(
        recipient,
        AuthorityCategory.Telex,
        AuthorityAction.ReceiveTelexMessage,
        {
          telex: {
            sender: senderStation.logonCode,
            message,
          },
        },
      );

      return { success: true, message: 'Message sent' };
    } catch (err) {
      return { success: true, message: err.message };
    }
  }

  private async validateSender(sender: string) {
    const senderStation = await this.prisma.station.findUnique({
      where: { acarsUser: sender },
    });
    if (!senderStation) throw new Error('Invalid sender');
    return senderStation;
  }

  private async findReceiver(recipient: string) {
    return await this.prisma.station.findUnique({
      where: { logonCode: recipient },
    });
  }

  private async sendToRecipientSocket(
    recipient: string,
    gateway: AuthorityCategory,
    action: AuthorityAction,
    payload: Record<string, any>,
  ) {
    const recipientSocket =
      this.clientsService.getClientByStationCode(recipient);
    if (!recipientSocket) return;

    recipientSocket.send(
      createResponse('success', 'gateway', '', {
        gateway,
        action,
        ...payload,
      }),
    );
  }
}
