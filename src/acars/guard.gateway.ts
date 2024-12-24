import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Socket } from 'ws';

import { Enum } from './gateways';

@Injectable()
export class Guard implements CanActivate {
  private readonly logger = new Logger(Guard.name);
  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const handler = context.getHandler().name;
    const event = context.switchToWs().getData()?.action || 'unknown';

    if (!(client as any)._authenticated) {
      this.logger.warn(
        `${(client as any)._id} (no auth) tried to use ${handler}:${Enum.AuthorityAction[event]}`,
      );
      return client.send(
        JSON.stringify({
          status: 'ERROR',
          message: 'You are not authenticated.',
        }),
      );
    }

    return true;
  }
}
