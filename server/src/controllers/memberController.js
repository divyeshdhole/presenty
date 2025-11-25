import Member from '../models/Member.js';
import Attendance from '../models/Attendance.js';

export const createMember = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const normalizedName = name.trim();

    const existing = await Member.findOne({ name: normalizedName });
    if (existing) {
      return res.status(409).json({ message: 'Member already exists' });
    }

    const member = await Member.create({ name: normalizedName });
    return res.status(201).json(member);
  } catch (error) {
    next(error);
  }
};

export const listMembers = async (_req, res, next) => {
  try {
    const members = await Member.find({}).sort({ name: 1 });
    res.json(members);
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Member id is required' });
    }

    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    await Attendance.deleteMany({ member: member._id });
    await member.deleteOne();

    res.json({ message: 'Member deleted' });
  } catch (error) {
    next(error);
  }
};
