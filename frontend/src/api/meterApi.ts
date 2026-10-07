import axios from 'axios';
import type { 
  MeterSearchResponse, 
  MeterLocationResponse, 
  ConsumptionResponse 
} from '../types/meter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: API_BASE,
});

export const meterApi = {
  searchMeters: async (q: string, page: number): Promise<MeterSearchResponse> => {
    const response = await client.get('/meters', { params: { q, page } });
    return response.data;
  },
  
  getMeterLocation: async (meterId: string): Promise<MeterLocationResponse> => {
    const response = await client.get(`/meters/${meterId}/location`);
    return response.data;
  },

  getMeterConsumption: async (meterId: string): Promise<ConsumptionResponse> => {
    const response = await client.get(`/meters/${meterId}/consumption`);
    return response.data;
  }
};
