import { StationService } from './station.service';

export const defineDeleteStation = (agenda, stationService: StationService) => {
  agenda.define('delete_station', async (job) => {
    const { stationCode } = job.attrs.data;

    try {
      const station = await stationService.getStation({ code: stationCode });
      if (!station) return;

      await stationService.deleteStation({ code: stationCode });
    } catch {}
  });
};
