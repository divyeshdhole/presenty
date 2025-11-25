import mongoose from 'mongoose';

const dailyStatusSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
    },
    morningLocked: {
      type: Boolean,
      default: false,
    },
    morningLockedAt: Date,
    morningLockedBy: String,
    eveningLocked: {
      type: Boolean,
      default: false,
    },
    eveningLockedAt: Date,
    eveningLockedBy: String,
  },
  { timestamps: true }
);

export default mongoose.model('DailyStatus', dailyStatusSchema);
