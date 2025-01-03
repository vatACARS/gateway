import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../_lib/prisma.service';

@Injectable()
export class DataService {
  private connectedData: any = {};
  private networkData: any = {};
  private messageData: any = {};
  private stationData: any = {};

  constructor(private prisma: PrismaService) {
    this.fetchNetworkData();
    this.fetchACARSData();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async fetchNetworkData() {
    const response = await fetch(
      'https://vatsim-radar.com/api/data/vatsim/data',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
      .then((resp) => resp.json())
      .catch((err) => console.log(err));

    this.networkData = response;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async fetchACARSData() {
    this.connectedData = await this.prisma.acarsUser.findMany({
      where: { isConnected: true },
    });
    this.messageData = await this.prisma.message.findMany();
    this.stationData = await this.prisma.station.findMany();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async deleteOldMessages() {
    await this.prisma.message.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 60 * 120 * 1000),
        },
      },
    });
  }

  getConnectedData = () => this.connectedData.length;

  getNetworkData = () => this.networkData;

  getStationData = () => this.stationData;

  getMessageData = () => this.messageData;
}
