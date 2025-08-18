const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  shiftName: { type: String, required: true }, // اسم الشيفت مطلوب
  shiftType: { type: String, enum: ['morning', 'evening', '24/24'], required: true }, // تغيير إلى morning و evening
  startTime: {
    type: String,
    required: function() { return this.shiftType === 'morning' || this.shiftType === 'evening'; } // مطلوب للصباحي والمسائي
  },
  endTime: {
    type: String,
    required: function() { return this.shiftType === 'morning' || this.shiftType === 'evening'; } // مطلوب للصباحي والمسائي
  },
  isCrossDay: {
    type: Boolean,
    default: function() { return this.shiftType === 'evening'; } // افتراضي true للشيفت المسائي
  }, // إضافة حقل لتحديد ما إذا كان الشيفت يمتد عبر يومين
  baseHours: { type: Number, required: true }, // ساعات العمل الأساسية
  maxOvertimeHours: {
    type: Number,
    required: function() { return this.shiftType === '24/24'; },
    default: function() { return this.shiftType === '24/24' ? 20 : 5; } // 20 لـ 24/24، 5 للصباحي/المسائي
  },
  // ✅ أيام العمل كأرقام من 0 إلى 6
  workDays: { type: [Number], required: true }, // أيام العمل
  gracePeriod: { type: Number, required: true }, // فترة السماح
  deductions: [{
    start: {
      type: String,
      required: function() { return this.parent().shiftType === 'morning' || this.parent().shiftType === 'evening'; } // مطلوب للصباحي/المسائي
    },
    end: {
      type: String,
      required: function() { return this.parent().shiftType === 'morning' || this.parent().shiftType === 'evening'; } // مطلوب للصباحي/المسائي
    },
    duration: {
      type: Number,
      required: function() { return this.parent().shiftType === '24/24'; } // مطلوب لشيفتات 24/24
    },
    deductionAmount: {
      type: Number,
      required: function() { return this.parent().shiftType === '24/24'; } // مطلوب لشيفتات 24/24
    },
    deductedHours: { type: Number, default: 0 },
    type: { type: String, enum: ['quarter', 'half', 'full', 'minutes'], required: true },
  }],
  sickLeaveDeduction: { type: String, enum: ['none', 'quarter', 'half', 'full'], required: true },
  // جديد: حقول لحساب الساعات الإضافية
  overtimeBasis: { type: String, enum: ['basicSalary', 'totalSalaryWithAllowances'], default: 'basicSalary' },
  overtimeMultiplier: { type: Number, enum: [1, 1.5, 2], default: 1 },
  fridayOvertimeBasis: { type: String, enum: ['basicSalary', 'totalSalaryWithAllowances'], default: 'basicSalary' },
  fridayOvertimeMultiplier: { type: Number, enum: [1, 1.5, 2], default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);
