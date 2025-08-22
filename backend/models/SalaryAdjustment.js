// backend/models/SalaryAdjustment.js
const mongoose = require('mongoose');

const salaryAdjustmentSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true },
  month: { type: String, required: true }, // YYYY-MM
  occasionBonus: { type: Number, default: 0 },
  totalViolations: { type: Number, default: 0 },
  deductionViolationsInstallment: { type: Number, default: 0 },
  totalAdvances: { type: Number, default: 0 },
  deductionAdvancesInstallment: { type: Number, default: 0 },
  remainingViolations: { type: Number, default: 0 },
  remainingAdvances: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('SalaryAdjustment', salaryAdjustmentSchema);
