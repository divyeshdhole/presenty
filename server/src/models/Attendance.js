import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    morning: {
      type: Boolean,
      default: false,
    },
    evening: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ member: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
