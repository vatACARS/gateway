import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    await this.station.deleteMany();
    await this.message.deleteMany();
    await this.socketConnection.deleteMany();

    await this.acarsUser.updateMany({
      where: {
        isConnected: true,
      },
      data: {
        isConnected: false,
      },
    });
  }
}
