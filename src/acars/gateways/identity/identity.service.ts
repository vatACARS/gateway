import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../services/prisma.service';
import { Station, Prisma } from 'prisma';

@Injectable()
export class StationService {
  constructor(private prisma: PrismaService) {}

  private async getStation(
    where: Prisma.StationWhereUniqueInput,
  ): Promise<Station | null> {
    return this.prisma.station.findUnique({
      where: where,
    });
  }

  private async createStation(
    data: Prisma.StationCreateInput,
  ): Promise<Station> {
    return this.prisma.station.create({ data });
  }

  private async updateStation(params: {
    where: Prisma.StationWhereUniqueInput;
    data: Prisma.StationUpdateInput;
  }): Promise<Station> {
    const { where, data } = params;
    return this.prisma.station.update({
      data,
      where,
    });
  }

  private async deleteStation(
    where: Prisma.StationWhereUniqueInput,
  ): Promise<void> {
    await this.prisma.station.delete({ where: where });
  }

  // Public functions
  public getStationByCode = (code: string): Promise<Station | null> =>
    this.getStation({ logonCode: code });

  public deleteStationByCode = async (code: string): Promise<boolean> => {
    const station = await this.getStation({ logonCode: code });
    if (!station) return false;
    await this.deleteStation({ where: { logonCode: code } });
    return true;
  };

  public async createStationAndAssignUser(
    logonCode: string,
    stationData: Prisma.StationCreateInput,
    userId: string,
  ): Promise<Station | null> {
    return this.prisma.$transaction(async (prisma) => {
      const existingStation = await this.getStationByCode(logonCode);

      if (existingStation) {
        if (existingStation.acarsUser) return null;
      } else {
        const newStation = await this.createStation({
          logonCode,
          ...stationData,
        });

        await this.updateStationAssignment(prisma, newStation.id, userId);

        return newStation;
      }
    });
  }

  public async deallocateStationFromUser(userId: string): Promise<boolean> {
    const user = await this.prisma.acarsUser.findUnique({
      where: { id: userId },
      include: { currPosition: true },
    });

    if (!user || !user.currPosition) return false;
    const stationId = user.currPosition.id;

    await this.prisma.acarsUser.update({
      where: { id: userId },
      data: {
        currPosition: {
          disconnect: true,
        },
      },
    });

    await this.deleteStation({ id: stationId });
    return true;
  }

  public async cleanupPendingLogin(
    userId: string,
    stationCode: string,
    delayMs = 2000,
  ): Promise<boolean> {
    await new Promise((res) => setTimeout(res, delayMs));

    const station = await this.getStationByCode(stationCode);

    if (!station) return false;
    if (station.acarsUser !== userId) return false;

    try {
      await this.prisma.acarsUser.update({
        where: { id: userId },
        data: {
          currPosition: {
            disconnect: true,
          },
        },
      });

      await this.deleteStation({ logonCode: stationCode });
      return true;
    } catch (err) {
      return false;
    }
  }

  private async updateStationAssignment(
    prisma: Prisma.TransactionClient,
    stationId: string,
    userId: string,
  ): Promise<void> {
    await prisma.station.update({
      where: { id: stationId },
      data: {
        user: {
          connect: { id: userId },
        },
      },
    });

    await prisma.acarsUser.update({
      where: { id: userId },
      data: {
        currPosition: {
          connect: { id: stationId },
        },
      },
    });
  }
}
