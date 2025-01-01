import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { PrismaService } from 'src/_lib/prisma.service';

@Module({
  providers: [ClientsService, PrismaService],
  exports: [ClientsService],
})
export class ClientsModule {}
