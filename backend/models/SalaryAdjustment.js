const mongoose = require('mongoose');

const salaryAdjustmentSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true },
  month: { type: String, required: true }, // YYYY-MM
  occasionBonus: { type: Number, default: 0 },
  totalAdvances: { type: Number, default: 0 },
  deductionAdvancesInstallment: { type: Number, default: 0 },
  remainingAdvances: { type: Number, default: 0 },
  mealAllowance: { type: Number, default: 0 },
  mealDeduction: { type: Number, default: 0 },
  penalties: { type: Number, default: 0 }, // إضافة حقل الجزاءات
}, { timestamps: true });

module.exports = mongoose.model('SalaryAdjustment', salaryAdjustmentSchema);
