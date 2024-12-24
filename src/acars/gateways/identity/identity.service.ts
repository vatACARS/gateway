import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../_lib/prisma.service';
import { Station, Prisma } from 'prisma';

@Injectable()
export class StationService {
  constructor(private prisma: PrismaService) {}

  private async getStation(
    StationWhereUniqueInput: Prisma.StationWhereUniqueInput,
  ): Promise<Station | null> {
    return this.prisma.station.findUnique({
      where: StationWhereUniqueInput,
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
    StationWhereUniqueInput: Prisma.StationWhereUniqueInput,
  ): Promise<Station> {
    return this.prisma.station.delete({ where: StationWhereUniqueInput });
  }

  // Public functions
  public getStationByCode = async (code: string): Promise<Station | null> =>
    this.getStation({ logonCode: code });

  public deleteStationByCode = async (code: string): Promise<boolean> => {
    const station = await this.getStation({ logonCode: code });
    if (!station) return false;
    this.deleteStation({ where: { logonCode: code } });
  };

  public async createStationAndAssignUser(
    logonCode: string,
    stationData: Prisma.StationCreateInput,
    userId: string,
  ): Promise<Station | null> {
    const existingStation = await this.prisma.station.findUnique({
      where: { logonCode },
    });
    if (existingStation) {
      if (existingStation.acarsUser) return null;
    } else {
      const newStation = await this.createStation({
        logonCode,
        ...stationData,
      });
      await this.prisma.station.update({
        where: { id: newStation.id },
        data: {
          user: {
            connect: { id: userId },
          },
        },
      });
      await this.prisma.acarsUser.update({
        where: { id: userId },
        data: {
          currPosition: {
            connect: { id: newStation.id },
          },
        },
      });

      return newStation;
    }
  }

  public async deallocateStationFromUser(userId: string): Promise<boolean> {
    const user = await this.prisma.acarsUser.findUnique({
      where: { id: userId },
      include: { currPosition: true },
    });
    if (!user) return false;
    if (!user.currPosition) return false;
    await this.prisma.acarsUser.update({
      where: { id: userId },
      data: {
        currPosition: {
          disconnect: true,
        },
      },
    });
    await this.deleteStation({ id: user.currPosition.id });
    return true;
  }
}
