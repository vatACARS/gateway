import { Injectable } from '@nestjs/common';
import { Socket } from 'ws';

@Injectable()
export class ClientsService {
  private clients = new Map<string, Socket>();

  addClient(clientId: string, client: Socket) {
    this.clients.set(clientId, client);
  }

  removeClient(clientId: string) {
    this.clients.delete(clientId);
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
