import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import { Socket } from 'ws';

@Injectable()
export class ClientsService {
  private clients = new Map<string, Socket>();

  constructor(private prisma: PrismaService) {}

  addClient(socketId: string, client: Socket) {
    this.clients.set(socketId, client);
  }

  async removeClient(client: Socket) {
    this.clients.delete(client._socketId);

    if (client._userId) {
      await this.prisma.acarsUser.update({
        where: { id: client._userId },
        data: { isConnected: false },
      });
    }
  }

  getClientByClientId(clientId: string): Socket | undefined {
    return this.clients.get(clientId);
  }

  getAllClients(): Map<string, Socket> {
    return this.clients;
  }

  getClientByStationCode(stationCode: string): Socket | undefined {
    for (const client of this.clients.values()) {
      if (client._station === stationCode) {
        return client;
      }
    }
    return undefined;
  }
}
