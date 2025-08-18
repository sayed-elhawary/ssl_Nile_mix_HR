const mongoose = require('mongoose');

const bonusAdjustmentSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true },
  monthYear: { type: String, required: true },
  bindingValue: { type: Number, default: 0 },
  productionValue: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('BonusAdjustment', bonusAdjustmentSchema);
