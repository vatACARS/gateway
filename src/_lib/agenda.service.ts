import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Agenda = require('agenda');

import { AuthenticationService } from 'src/acars/gateways/authentication/authentication.service';

@Injectable()
export class AgendaService implements OnModuleInit, OnModuleDestroy {
  agenda: any;

  constructor(private readonly authenticationService: AuthenticationService) {
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
