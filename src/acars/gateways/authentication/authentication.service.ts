import { Injectable } from '@nestjs/common';
import { AcarsUser, Prisma } from '@prisma/client';
import { PrismaService } from '../../../services/prisma.service';

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

  public async authenticateUserByToken(token: string): Promise<true | string> {
    const user = await this.getAcarsUser({ apiToken: token });
    if (!user) return 'User not found';
    if (user.isConnected) return 'User already connected';

    await this.prisma.acarsUser.update({
      where: { id: user.id },
      data: { isConnected: true },
    });

    return true;
  }

  public getAcarsUserByToken(token: string): Promise<AcarsUser> {
    return this.getAcarsUser({ apiToken: token });
  }
}
