import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import DailyStatus from '../models/DailyStatus.js';
import { getTodayKey } from '../utils/date.js';
import { verifyAdminPassword, isAdminPasswordConfigured } from '../utils/adminPassword.js';

export const markAttendance = async (req, res, next) => {
  try {
    const { memberId, session, present } = req.body;

    if (!memberId || !['morning', 'evening'].includes(session)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const date = getTodayKey();
    const status = await ensureDailyStatus(date);

    if (session === 'morning' && status.morningLocked) {
      return res.status(423).json({ message: 'Morning attendance already committed' });
    }
    if (session === 'evening' && status.eveningLocked) {
      return res.status(423).json({ message: 'Evening attendance already committed' });
    }

    const updateField = session === 'morning' ? { morning: present } : { evening: present };

    const attendance = await Attendance.findOneAndUpdate(
      { member: memberId, date },
      { $set: updateField, member: memberId, date },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('member');

    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

export const getTodaySummary = async (_req, res, next) => {
  try {
    const date = getTodayKey();
    const members = await Member.countDocuments();
    const morningPresent = await Attendance.countDocuments({ date, morning: true });
    const eveningPresent = await Attendance.countDocuments({ date, evening: true });
    const status = await ensureDailyStatus(date);

    res.json({
      totalMembers: members,
      morningPresent,
      eveningPresent,
      locks: {
        morning: status.morningLocked,
        evening: status.eveningLocked,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayAttendance = async (_req, res, next) => {
  try {
    const date = getTodayKey();
    const attendances = await Attendance.find({ date }).populate('member').sort({ 'member.name': 1 });
    res.json(attendances);
  } catch (error) {
    next(error);
  }
};

export const commitAttendance = async (req, res, next) => {
  try {
    const { session, action, password } = req.body;

    if (!['morning', 'evening'].includes(session)) {
      return res.status(400).json({ message: 'Invalid session' });
    }

    if (!['lock', 'unlock'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (!isAdminPasswordConfigured()) {
      return res.status(500).json({ message: 'Admin password is not configured on the server' });
    }

    const validPassword = await verifyAdminPassword(password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    const date = getTodayKey();
    const status = await ensureDailyStatus(date);

    const locking = action === 'lock';
    const update = {};
    const timestamps = locking ? new Date() : null;

    if (session === 'morning') {
      update.morningLocked = locking;
      update.morningLockedAt = timestamps;
      update.morningLockedBy = locking ? 'admin' : null;
    } else {
      update.eveningLocked = locking;
      update.eveningLockedAt = timestamps;
      update.eveningLockedBy = locking ? 'admin' : null;
    }

    Object.assign(status, update);
    await status.save();

    res.json({
      message: locking ? 'Attendance committed' : 'Attendance unlocked',
      locks: {
        morning: status.morningLocked,
        evening: status.eveningLocked,
      },
    });
  } catch (error) {
    next(error);
  }
};

const ensureDailyStatus = async (date) => {
  return DailyStatus.findOneAndUpdate(
    { date },
    { $setOnInsert: { date } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
