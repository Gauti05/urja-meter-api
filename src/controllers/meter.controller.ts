import { Request, Response, NextFunction } from 'express';
import { searchMeters } from '../services/meter.service';

export const getMeters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qParam = req.query.q;
    let q = '';

    if (qParam !== undefined) {
      if (typeof qParam !== 'string') {
        res.status(400).json({
          error: {
            code: 'INVALID_QUERY',
            message: 'q must be a string',
          },
        });
        return;
      }
      q = qParam;
    }

    const pageParam = req.query.page;
    
    let page = 1;
    if (pageParam !== undefined) {
      page = Number(pageParam);
      if (!Number.isInteger(page) || page < 1) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAGE',
            message: 'page must be a positive integer',
          },
        });
        return;
      }
    }

    const response = await searchMeters(q, page);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getMeterLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { meterId } = req.params;
    if (!meterId || typeof meterId !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_METER_ID',
          message: 'meterId is required',
        },
      });
      return;
    }

    const { getMeterLocation: serviceGetMeterLocation } = await import('../services/meter.service');
    const response = await serviceGetMeterLocation(meterId);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getMeterConsumption = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { meterId } = req.params;
    if (!meterId || typeof meterId !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_METER_ID',
          message: 'meterId is required',
        },
      });
      return;
    }

    const { getMeterConsumption: serviceGetMeterConsumption } = await import('../services/meter.service');
    const response = await serviceGetMeterConsumption(meterId);
    res.json(response);
  } catch (error) {
    next(error);
  }
};
