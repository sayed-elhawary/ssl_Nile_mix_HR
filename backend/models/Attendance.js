const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true },
  employeeName: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: { type: String }, // HH:mm
  checkOut: { type: String }, // HH:mm or null
  checkInDate: { type: String }, // YYYY-MM-DD
  checkOutDate: { type: String }, // YYYY-MM-DD
  shiftType: { type: String, enum: ['morning', 'evening', '24/24'], required: true },
  isCrossDay: { type: Boolean, default: false },
  shiftName: { type: String, required: true },
  workDays: { type: [Number], required: true },
  delayMinutes: { type: Number, default: 0 },
  gracePeriod: { type: Number, required: true },
  remainingGracePeriod: { type: Number, default: 0 },
  deductedHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  deductedDays: { type: Number, default: 0 },
  leaveBalance: { type: Number, default: 0 },
  attendanceStatus: {
    type: String,
    enum: ['حاضر', 'متأخر', 'غائب', 'إجازة أسبوعية', 'إجازة رسمية', 'إجازة سنوية', 'إجازة مرضية'],
    required: true
  },
  leaveAllowance: { type: String, default: 'لا يوجد' },
  sickLeaveDeduction: {
    type: String,
    enum: ['none', 'quarter', 'half', 'full'],
    default: 'none' // القيمة الافتراضية هي 'none' بدلاً من null
  },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  isOfficialLeave: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
