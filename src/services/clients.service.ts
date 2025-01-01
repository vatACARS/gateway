import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/_lib/prisma.service';
import { Socket } from 'ws';

@Injectable()
export class ClientsService {
  private clients = new Map<string, Socket>();

  constructor(private prisma: PrismaService) {}

  addClient(clientId: string, client: Socket) {
    this.clients.set(clientId, client);
  }

  async removeClient(client: Socket) {
    this.clients.delete((client as any)._id);

    if (!(client as any)._station) return;
    const station = await this.prisma.station.findUnique({
      where: { logonCode: (client as any)._station },
    });

    if (station) {
      this.prisma.acarsUser.update({
        where: { id: station.acarsUser },
        data: { isConnected: false },
      });
    }
  }

  getClient(clientId: string): Socket | undefined {
    return this.clients.get(clientId);
  }

  getAllClients(): Map<string, Socket> {
    return this.clients;
  }

  getClientByStationCode(stationCode: string): Socket | undefined {
    for (const client of this.clients.values()) {
      if ((client as any)._station === stationCode) {
        return client;
      }
    }
    return undefined;
  }
}
