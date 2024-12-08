import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticationService } from './gateways/authentication/authentication.service';
import { Socket } from 'ws';

@Injectable()
export class Guard implements CanActivate {
  constructor(private readonly authService: AuthenticationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    if (!(client as any)._authenticated)
      throw new UnauthorizedException('User is not authenticated');

    return true;
  }
}
