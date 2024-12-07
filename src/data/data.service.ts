import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class DataService {
  private networkData: any = {};

  constructor() {
    this.fetchNetworkData();
  }

  @Cron('0 * * * * *')
  async fetchNetworkData() {
    const response = await fetch(
      'https://vatsim-radar.com/api/data/vatsim/data',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
      .then((resp) => resp.json())
      .catch((err) => console.log(err));

    this.networkData = response;
  }

  getNetworkData = () => this.networkData;
}
