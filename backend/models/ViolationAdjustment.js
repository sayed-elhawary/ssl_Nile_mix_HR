const mongoose = require('mongoose');
const violationAdjustmentSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true },
  month: { type: String, required: true }, // YYYY-MM
  totalViolations: { type: Number, default: 0 },
  deductionViolationsInstallment: { type: Number, default: 0 },
  remainingViolations: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ViolationAdjustment', violationAdjustmentSchema);
