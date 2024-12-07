import { Logger } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { v4 as uuidv4 } from 'uuid';

import { Server, Socket } from 'ws';
import { AuthorityAction, AuthorityCategory } from './acars.gateway.enums';

interface BaseData {
  Action: AuthorityAction;
  [key: string]: any;
}

@WebSocketGateway({
  path: '/gateway',
  transports: ['websocket'],
})
export class AcarsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AcarsGateway.name);

  @WebSocketServer()
  private server: Server;

  private clients = new Map<
    string,
    { socket: Socket; authTimeout: NodeJS.Timeout }
  >();

  /**
   * Lifecycle Hook: Triggered when the gateway is initialized.
   */
  afterInit() {
    this.logger.log('Gateway is online.');
  }

  /**
   * Lifecycle Hook: Triggered when a client connects.
   * Starts an authentication timeout to log off unauthenticated clients.
   */
  handleConnection(client: Socket) {
    const clientId = uuidv4();
    (client as any)._id = clientId;
    this.logger.log(`${clientId} connected.`);

    // Start authentication timeout
    const authTimeout = setTimeout(() => {
      this.logAndTerminate(client, 'Failed to authenticate in time.');
    }, 5000);

    // Store client and its timeout
    this.clients.set(clientId, { socket: client, authTimeout });
  }

  /**
   * Lifecycle Hook: Triggered when a client disconnects.
   * Ensures resources like timeouts are cleaned up.
   */
  handleDisconnect(client: Socket) {
    const clientId = (client as any)._id;
    this.logger.log(`${clientId} disconnected.`);

    // Clear authentication timeout if it exists
    const clientData = this.clients.get(clientId);
    if (clientData?.authTimeout) {
      clearTimeout(clientData.authTimeout);
    }

    // Remove client from the map
    this.clients.delete(clientId);
  }

  /**
   * Message Handler: Processes authentication requests.
   * Verifies and authenticates the client based on the provided data.
   */
  @SubscribeMessage(AuthorityCategory.Authentication)
  async handleAuthentication(@MessageBody() data: BaseData, client: Socket) {
    const clientId = (client as any)._id;

    // Ensure the action is provided
    if (!data.Action) {
      return this.logger.warn(
        `${clientId} sent a request with no AuthorityAction.`,
      );
    }

    // Log the action
    this.logger.log(
      `${clientId} ${AuthorityCategory[AuthorityCategory.Authentication]}:${AuthorityAction[data.Action]}`,
    );

    // Handle specific actions
    switch (data.Action) {
      case AuthorityAction.Authenticate:
        return this.authenticateClient(client, data);
      default:
        return this.logger.warn(
          `${clientId} sent unknown AuthorityAction: ${data.Action}`,
        );
    }
  }

  /**
   * Authenticates a client.
   * Marks the client as authenticated and responds with a success message.
   */
  private authenticateClient(client: Socket, data: BaseData) {
    const clientId = (client as any)._id;

    if (!data.Token) {
      return this.logAndTerminate(
        client,
        'Failed authentication: missing token.',
      );
    }

    // Mark client as authenticated
    (client as any)._authenticated = true;

    // Clear authentication timeout
    const clientData = this.clients.get(clientId);
    if (clientData?.authTimeout) {
      clearTimeout(clientData.authTimeout);
    }

    this.logger.log(`${clientId} authenticated successfully.`);
    client.send(JSON.stringify({ status: 'OK', token: data.Token }));
  }

  /**
   * Logs a message and terminates a client connection.
   */
  private logAndTerminate(client: Socket, reason: string) {
    const clientId = (client as any)._id;
    this.logger.warn(`${clientId} ${reason}`);
    client.terminate();
  }
}
