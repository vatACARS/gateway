import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/_lib/prisma.service';
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
    where: Prisma.StationWhereUniqueInput,
  ): Promise<Station> {
    return this.prisma.station.delete({ where });
  }

  // Public functions
  public getStationByCode = async (code: string): Promise<Station | null> =>
    this.getStation({ logonCode: code });

  public async createStationAndAssignUser(
    logonCode: string,
    stationData: Prisma.StationCreateInput,
    userId: string,
  ): Promise<Station> {
    const existingStation = await this.prisma.station.findUnique({
      where: { logonCode },
    });
    if (existingStation) {
      if (existingStation.acarsUser)
        throw new BadRequestException(
          `Station with logonCode "${logonCode}" already is occupied.`,
        );
    } else {
      const newStation = await this.createStation(stationData);
      await this.prisma.station.update({
        where: { id: newStation.id },
        data: {
          user: {
            connect: { id: userId },
          },
        },
      });

      return newStation;
    }
  }
}
