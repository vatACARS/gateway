import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcarsGateway } from './acars/acars.gateway';
import { DataModule } from './data/data.module';

@Module({
  imports: [DataModule],
  controllers: [AppController],
  providers: [AppService, AcarsGateway],
})
export class AppModule {}
