const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  medicalInsurance: { type: Number, required: true },
  socialInsurance: { type: Number, required: true },
  name: { type: String, required: true },
  mealAllowance: { type: Number, required: true },
  shiftType: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  workDays: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  basicBonus: { type: Number, required: true },
  bonusPercentage: { type: Number, required: true },
  annualLeaveBalance: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  remainingGracePeriod: { type: Number, default: 0 },
  violationTotal: { type: Number, default: 0 },
  violationInstallment: { type: Number, default: 0 },
  advanceTotal: { type: Number, default: 0 },
  advanceInstallment: { type: Number, default: 0 },
  occasionBonus: { type: Number, default: 0 },
});

module.exports = mongoose.model('User', userSchema);
