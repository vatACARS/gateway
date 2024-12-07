import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcarsGateway } from './acars/acars.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AcarsGateway],
})
export class AppModule {}
