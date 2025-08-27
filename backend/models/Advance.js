// backend/models/Advance.js
const mongoose = require('mongoose');

const advanceSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true },
  employeeName: { type: String, required: true },
  advanceAmount: { 
    type: Number, 
    required: true, 
    min: [0, 'مبلغ السلفة يجب أن يكون أكبر من 0'] 
  },
  advanceDate: { type: Date, required: true },
  installmentMonths: { 
    type: Number, 
    required: true, 
    min: [1, 'عدد الأشهر يجب أن يكون 1 على الأقل'] 
  },
  monthlyInstallment: { 
    type: Number, 
    required: true, 
    min: [0, 'القسط الشهري يجب أن يكون أكبر من 0'] 
  },
  remainingAmount: { 
    type: Number, 
    required: true, 
    min: [0, 'المبلغ المتبقي يجب أن يكون 0 أو أكبر'] 
  },
  finalRepaymentDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  isIncluded: { type: Boolean, default: false },
  lastDeductionMonth: { type: String, default: null },
  deductionHistory: [{
    month: { type: String, required: true }, // تنسيق YYYY-MM
    amount: { type: Number, required: true }, // المبلغ المخصوم
    deductionDate: { type: Date, default: Date.now }, // تاريخ الخصم
  }],
  notes: { type: String, default: '' },
  approvedBy: { type: String, default: null },
}, { timestamps: true });

// إضافة فهرس لتحسين الأداء
advanceSchema.index({ employeeCode: 1, status: 1 });

module.exports = mongoose.model('Advance', advanceSchema);
