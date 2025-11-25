import { Router } from 'express';
import {
  markAttendance,
  getTodaySummary,
  getTodayAttendance,
  commitAttendance,
} from '../controllers/attendanceController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.post('/', markAttendance);
router.get('/today', getTodayAttendance);
router.get('/summary', getTodaySummary);
router.post('/commit', commitAttendance);

export default router;
