import { authenticatedUrjaGet } from '../clients/urjaClient';
import { 
  UpstreamMeterSearchResponse, 
  PublicMeterResponse,
  UpstreamMeterLocation,
  PublicMeterLocation,
  UpstreamEnergyResponse,
  PublicEnergyResponse
} from '../types/meter';

export const searchMeters = async (q: string, page: number): Promise<PublicMeterResponse> => {
  const responseData = await authenticatedUrjaGet<UpstreamMeterSearchResponse>('/portal/meters/search', {
    params: {
      q,
      page,
    },
  });

  const { data, total, page: responsePage, pageSize } = responseData;

  return {
    data,
    pagination: {
      total,
      page: responsePage,
      pageSize,
    },
  };
};

export const getMeterLocation = async (meterId: string): Promise<PublicMeterLocation> => {
  const responseData = await authenticatedUrjaGet<UpstreamMeterLocation>(`/portal/meters/${meterId}/geo`);
  const { toSafeNumber } = await import('../utils/normalizer');

  return {
    data: {
      latitude: toSafeNumber(responseData.data.latitude),
      longitude: toSafeNumber(responseData.data.longitude),
    },
  };
};

export const getMeterConsumption = async (meterId: string): Promise<PublicEnergyResponse> => {
  const responseData = await authenticatedUrjaGet<UpstreamEnergyResponse>(`/portal/meters/${meterId}/energy`);
  const { toSafeNumber } = await import('../utils/normalizer');

  return {
    data: responseData.data.map((reading) => ({
      timestamp: reading.timestamp,
      kwh: toSafeNumber(reading.kwh),
      kvah: toSafeNumber(reading.kvah),
      voltR: toSafeNumber(reading.voltR),
    })),
  };
};
