import { Router } from 'express';
import { getMeters, getMeterLocation, getMeterConsumption } from '../controllers/meter.controller';

const router = Router();

router.get('/', getMeters);
router.get('/:meterId/location', getMeterLocation);
router.get('/:meterId/consumption', getMeterConsumption);

export default router;
