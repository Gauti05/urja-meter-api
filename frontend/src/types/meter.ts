export interface Meter {
  meterId: string;
  serialNo: string;
  make: string;
  phaseType: string;
  installStatus: string;
  dtCode: string;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
}

export interface MeterSearchResponse {
  data: Meter[];
  pagination: Pagination;
}

export interface MeterLocation {
  latitude: number;
  longitude: number;
}

export interface MeterLocationResponse {
  data: MeterLocation;
}

export interface ConsumptionReading {
  timestamp: string;
  kwh: number;
  kvah: number;
  voltR: number;
}

export interface ConsumptionResponse {
  data: ConsumptionReading[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
