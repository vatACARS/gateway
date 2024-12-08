import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcarsGateway } from './acars/acars.gateway';
import { DataModule } from './data/data.module';

import { AuthenticationGateway } from './acars/gateways';

@Module({
  imports: [DataModule],
  controllers: [AppController],
  providers: [AppService, AcarsGateway, AuthenticationGateway],
})
export class AppModule {}
