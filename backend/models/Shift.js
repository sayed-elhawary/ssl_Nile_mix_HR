const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  shiftName: {
    type: String,
    required: [true, 'اسم الشيفت مطلوب'],
    trim: true,
    index: true, // إضافة فهرس لتحسين البحث
  },
  shiftType: {
    type: String,
    enum: {
      values: ['morning', 'evening', '24/24'],
      message: 'نوع الشيفت يجب أن يكون morning، evening، أو 24/24',
    },
    required: [true, 'نوع الشيفت مطلوب'],
    index: true, // إضافة فهرس لتحسين الفلترة
  },
  startTime: {
    type: String,
    required: [
      function() {
        return this.shiftType === 'morning' || this.shiftType === 'evening';
      },
      'وقت البداية مطلوب للشيفتات الصباحية والمسائية',
    ],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'يجب أن يكون وقت البداية بصيغة HH:mm'], // تحقق من صيغة الوقت
  },
  endTime: {
    type: String,
    required: [
      function() {
        return this.shiftType === 'morning' || this.shiftType === 'evening';
      },
      'وقت النهاية مطلوب للشيفتات الصباحية والمسائية',
    ],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'يجب أن يكون وقت النهاية بصيغة HH:mm'],
  },
  isCrossDay: {
    type: Boolean,
    default: function() {
      return this.shiftType === 'evening';
    },
    description: 'يحدد ما إذا كان الشيفت يمتد عبر يومين (افتراضي true للشيفت المسائي)',
  },
  baseHours: {
    type: Number,
    required: [true, 'ساعات العمل الأساسية مطلوبة'],
    min: [1, 'ساعات العمل الأساسية يجب أن تكون أكبر من 0'],
  },
  maxOvertimeHours: {
    type: Number,
    required: [
      function() {
        return this.shiftType === '24/24';
      },
      'الحد الأقصى لساعات العمل الإضافية مطلوب لشيفتات 24/24',
    ],
    default: function() {
      return this.shiftType === '24/24' ? 20 : 5;
    },
    min: [0, 'الحد الأقصى لساعات العمل الإضافية يجب أن يكون 0 أو أكبر'],
  },
  workDays: {
    type: [Number],
    required: [true, 'أيام العمل مطلوبة'],
    validate: {
      validator: function(arr) {
        return (
          arr.length > 0 &&
          arr.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        );
      },
      message: 'أيام العمل يجب أن تكون مصفوفة من الأرقام بين 0 و6 وغير فارغة',
    },
  },
  gracePeriod: {
    type: Number,
    required: [true, 'فترة السماح مطلوبة'],
    min: [0, 'فترة السماح يجب أن تكون 0 أو أكبر'],
  },
  deductions: [
    {
      start: {
        type: String,
        required: [
          function() {
            return this.parent().shiftType === 'morning' || this.parent().shiftType === 'evening';
          },
          'وقت بداية الخصم مطلوب للشيفتات الصباحية والمسائية',
        ],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'يجب أن يكون وقت بداية الخصم بصيغة HH:mm'],
      },
      end: {
        type: String,
        required: [
          function() {
            return this.parent().shiftType === 'morning' || this.parent().shiftType === 'evening';
          },
          'وقت نهاية الخصم مطلوب للشيفتات الصباحية والمسائية',
        ],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'يجب أن يكون وقت نهاية الخصم بصيغة HH:mm'],
      },
      duration: {
        type: Number,
        required: [
          function() {
            return this.parent().shiftType === '24/24';
          },
          'مدة الخصم مطلوبة لشيفتات 24/24',
        ],
        min: [0, 'مدة الخصم يجب أن تكون 0 أو أكبر'],
      },
      deductionAmount: {
        type: Number,
        required: [
          function() {
            return this.parent().shiftType === '24/24';
          },
          'قيمة الخصم مطلوبة لشيفتات 24/24',
        ],
        min: [0, 'قيمة الخصم يجب أن تكون 0 أو أكبر'],
      },
      deductedHours: {
        type: Number,
        default: 0,
        min: [0, 'ساعات الخصم يجب أن تكون 0 أو أكبر'],
      },
      type: {
        type: String,
        enum: {
          values: ['quarter', 'half', 'full', 'minutes'],
          message: 'نوع الخصم يجب أن يكون quarter، half، full، أو minutes',
        },
        required: [true, 'نوع الخصم مطلوب'],
      },
    },
  ],
  sickLeaveDeduction: {
    type: String,
    enum: {
      values: ['none', 'quarter', 'half', 'full'],
      message: 'نوع خصم الإجازة المرضية يجب أن يكون none، quarter، half، أو full',
    },
    required: [true, 'نوع خصم الإجازة المرضية مطلوب'],
  },
  overtimeBasis: {
    type: String,
    enum: {
      values: ['basicSalary', 'totalSalaryWithAllowances'],
      message: 'أساس الساعات الإضافية يجب أن يكون basicSalary أو totalSalaryWithAllowances',
    },
    default: 'basicSalary',
  },
  overtimeMultiplier: {
    type: Number,
    enum: {
      values: [1, 1.5, 2],
      message: 'مضاعف الساعات الإضافية يجب أن يكون 1، 1.5، أو 2',
    },
    default: 1,
  },
  fridayOvertimeBasis: {
    type: String,
    enum: {
      values: ['basicSalary', 'totalSalaryWithAllowances'],
      message: 'أساس الساعات الإضافية يوم الجمعة يجب أن يكون basicSalary أو totalSalaryWithAllowances',
    },
    default: 'basicSalary',
  },
  fridayOvertimeMultiplier: {
    type: Number,
    enum: {
      values: [1, 1.5, 2],
      message: 'مضاعف الساعات الإضافية يوم الجمعة يجب أن يكون 1، 1.5، أو 2',
    },
    default: 1,
  },
}, { timestamps: true });

// إضافة تحقق مخصص لضمان اتساق deductions مع shiftType
shiftSchema.pre('validate', function(next) {
  if (this.shiftType === '24/24') {
    this.deductions.forEach((deduction) => {
      if (deduction.start || deduction.end) {
        this.invalidate('deductions', 'حقول start و end غير مطلوبة لشيفتات 24/24');
      }
      if (!deduction.duration || !deduction.deductionAmount) {
        this.invalidate('deductions', 'حقول duration و deductionAmount مطلوبة لشيفتات 24/24');
      }
    });
  } else {
    this.deductions.forEach((deduction) => {
      if (deduction.duration || deduction.deductionAmount) {
        this.invalidate('deductions', 'حقول duration و deductionAmount غير مطلوبة للشيفتات الصباحية والمسائية');
      }
      if (!deduction.start || !deduction.end) {
        this.invalidate('deductions', 'حقول start و end مطلوبة للشيفتات الصباحية والمسائية');
      }
    });
  }
  next();
});

module.exports = mongoose.model('Shift', shiftSchema);
