const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  medicalInsurance: { type: Number, default: 0 },
  socialInsurance: { type: Number, default: 0 },
  name: { type: String, required: true },
  mealAllowance: { type: Number, default: 1500 },
  shiftType: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  workDays: { type: Number, required: true },
  totalSalaryWithAllowances: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  basicBonus: { type: Number, required: true, default: 2000 },
  bonusPercentage: { type: Number, required: true, default: 50 },
  annualLeaveBalance: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  remainingGracePeriod: { type: Number, default: 0 },
  violationTotal: { type: Number, default: 0 },
  violationInstallment: { type: Number, default: 0 },
  advanceTotal: { type: Number, default: 0 },
  advanceInstallment: { type: Number, default: 0 },
  occasionBonus: { type: Number, default: 0 },
  salaryAdjustments: {
    type: Map,
    of: {
      totalViolations: { type: Number, default: 0 },
      deductionViolationsInstallment: { type: Number, default: 0 },
      totalAdvances: { type: Number, default: 0 },
      deductionAdvancesInstallment: { type: Number, default: 0 },
      occasionBonus: { type: Number, default: 0 },
      mealAllowance: { type: Number, default: 0 },
      mealDeduction: { type: Number, default: 0 },
      remainingViolations: { type: Number, default: 0 },
      remainingAdvances: { type: Number, default: 0 },
    },
    default: {},
  },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
}, { timestamps: true, autoIndex: false });

// تحسين استجابات JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password; // إزالة كلمة المرور من الاستجابات
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
