import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../_lib/prisma.service';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

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
      },
    });

    return { success: true, message: 'Message sent' };
  }
}
