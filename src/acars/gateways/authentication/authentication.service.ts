import { Injectable } from '@nestjs/common';
import { AcarsUser, Prisma } from '@prisma/client';
import { PrismaService } from '../../../_lib/prisma.service';

@Injectable()
export class AuthenticationService {
  constructor(private prisma: PrismaService) {}

  private async getAcarsUser(
    AcarsUserWhereUniqueInput: Prisma.AcarsUserWhereUniqueInput,
  ): Promise<AcarsUser | null> {
    return this.prisma.acarsUser.findUnique({
      where: AcarsUserWhereUniqueInput,
    });
  }

  public async authenticateUserByToken(token: string): Promise<boolean> {
    const user = await this.getAcarsUser({ apiToken: token });
    if (!user) return false;
    return true;
  }

  public getAcarsUserByToken(token: string): Promise<AcarsUser> {
    return this.getAcarsUser({ apiToken: token });
  }
}
