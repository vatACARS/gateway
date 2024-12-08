import { Injectable, OnModuleInit } from '@nestjs/common';
import Agenda = require('agenda');

import { AuthenticationService } from 'src/acars/gateways/authentication/authentication.service';
import DefineAuthenticationTasks from 'src/acars/gateways/authentication/authentication.tasks';

@Injectable()
export class AgendaService implements OnModuleInit {
  agenda: any;

  constructor(private readonly authenticationService: AuthenticationService) {
    this.agenda = new Agenda.Agenda({
      db: { address: process.env.database_url, collection: 'tasks' },
    });
    this.agenda.start();
  }

  async onModuleInit() {
    DefineAuthenticationTasks(this.agenda);
  }
}
