import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/_lib/prisma.service';

@Injectable()
export class AuthenticationService {
  constructor(private prisma: PrismaService) {}
}
