import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Agenda = require('agenda');

@Injectable()
export class AgendaService implements OnModuleInit, OnModuleDestroy {
  agenda: any;

  constructor() {
    this.agenda = new Agenda.Agenda({
      db: { address: process.env.database_url, collection: 'tasks' },
    });
  }

  async onModuleInit() {
    this.agenda.start();
  }

  async onModuleDestroy() {
    this.agenda.stop();
  }
}
