import { Controller, Get } from '@nestjs/common';

import { DataService } from './data.service';

@Controller()
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('/data/network')
  getNetworkData(): object {
    return this.dataService.getNetworkData();
  }

  @Get('/data/connected')
  getConnectedData(): number {
    return this.dataService.getConnectedData();
  }

  @Get('/data/stations')
  getStationData(): object {
    return this.dataService.getStationData();
  }

  @Get('/data/messages')
  getMessageData(): object {
    return this.dataService.getMessageData();
  }
}
