import { Controller, Get } from '@nestjs/common';

import { DataService } from './data.service';

@Controller()
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('/data/network')
  getNetworkData(): object {
    return this.dataService.getNetworkData();
  }
}
