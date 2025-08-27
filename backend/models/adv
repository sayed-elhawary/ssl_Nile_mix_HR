// backend/models/Advance.js
const mongoose = require('mongoose');

const advanceSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true },
  employeeName: { type: String, required: true },
  advanceAmount: { type: Number, required: true },
  advanceDate: { type: String, required: true },
  installmentMonths: { type: Number, required: true },
  monthlyInstallment: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  finalRepaymentDate: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Advance', advanceSchema);
