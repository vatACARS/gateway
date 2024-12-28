import { Module } from '@nestjs/common';

import { DataController } from './data.controller';
import { DataService } from './data.service';
import { PrismaService } from 'src/_lib/prisma.service';

@Module({
  imports: [],
  controllers: [DataController],
  providers: [PrismaService, DataService],
})
export class DataModule {}
