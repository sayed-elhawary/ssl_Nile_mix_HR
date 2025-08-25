const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Shift = require('../models/Shift');
const Attendance = require('../models/Attendance');
const BonusAdjustment = require('../models/BonusAdjustment');
const Advance = require('../models/Advance'); // إضافة نموذج Advance
const jwt = require('jsonwebtoken');
const router = express.Router();

// دالة لتقريب الأرقام إلى خانتين عشريتين مع التحقق من القيمة
const roundNumber = (num, decimals = 2) => {
  if (num == null || isNaN(num)) {
    console.warn(`Warning: roundNumber received invalid value: ${num}`);
    return 0;
  }
  return Number(Number(num).toFixed(decimals));
};

// دالة للتحقق من المصادقة
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'التوكن غير موجود' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'انتهت صلاحية التوكن، يرجى تسجيل الدخول مرة أخرى' });
    }
    return res.status(401).json({ success: false, message: 'التوكن غير صالح', error: err.message });
  }
};

// تقرير الرواتب الشهري
// ... الكود الحالي للمتطلبات الأخرى (مثل login, get users, etc.) يبقى دون تغيير ...

// تقرير الرواتب الشهري
router.get('/monthly-salary-report', authenticateToken, async (req, res) => {
  try {
    const { yearMonth, employeeCode, shiftId } = req.query;

    // التحقق من صحة المدخلات
    if (!yearMonth) {
      return res.status(400).json({ success: false, message: 'يجب إدخال الشهر (YYYY-MM)' });
    }

    const [year, month] = yearMonth.split('-');
    if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'تنسيق الشهر غير صالح، استخدم YYYY-MM' });
    }

    const startDate = new Date(`${yearMonth}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    let userFilter = {};
    if (employeeCode) userFilter.employeeCode = employeeCode;
    if (shiftId) userFilter.shiftType = shiftId;

    const users = await User.find(userFilter).populate('shiftType');
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'لا يوجد موظفين بهذا الكود أو الشيفت' });
    }

    const shifts = await Shift.find();
    if (!shifts.length) {
      return res.status(404).json({ success: false, message: 'لا توجد شيفتات مسجلة' });
    }

    const reports = [];
    const totalsByEmployee = {};

    for (const user of users) {
      if (!user.shiftType || !user.shiftType._id) {
        console.warn(`User ${user.employeeCode} has no valid shiftType`);
        continue;
      }

      const shift = user.shiftType;

      if (!shift.baseHours || shift.baseHours <= 0) {
        console.warn(`Invalid baseHours for user ${user.employeeCode}: ${shift.baseHours}`);
        continue;
      }

      if (user.totalSalaryWithAllowances == null || user.basicSalary == null) {
        console.warn(`Invalid salary data for user ${user.employeeCode}: totalSalaryWithAllowances=${user.totalSalaryWithAllowances}, basicSalary=${user.basicSalary}`);
        continue;
      }

      // جلب سجلات السلف النشطة
      const advances = await Advance.find({
        employeeCode: user.employeeCode,
        status: 'active',
        advanceDate: { $lte: endDateStr },
        finalRepaymentDate: { $gte: startDateStr },
      });

      let totalAdvances = 0;
      let monthlyInstallment = 0;
      let remainingAdvances = 0;

      for (const advance of advances) {
        totalAdvances += Number(advance.advanceAmount || 0);
        monthlyInstallment += Number(advance.monthlyInstallment || 0);

        // حساب الأشهر المتبقية
        const advanceStart = new Date(advance.advanceDate);
        const currentMonth = new Date(yearMonth + '-01');
        const monthsPassed = (currentMonth.getFullYear() - advanceStart.getFullYear()) * 12 + currentMonth.getMonth() - advanceStart.getMonth();
        const monthsRemaining = Math.max(0, advance.installmentMonths - monthsPassed);
        const calculatedRemaining = Number(advance.advanceAmount) - (monthsPassed * Number(advance.monthlyInstallment));
        remainingAdvances += Math.max(0, calculatedRemaining);

        // تحديث حالة السلفة إذا كانت قد اكتملت
        if (calculatedRemaining <= 0) {
          advance.status = 'completed';
          await advance.save();
        }
      }

      const attendanceQuery = {
        employeeCode: user.employeeCode,
        date: { $gte: startDateStr, $lte: endDateStr },
      };
      const attendances = await Attendance.find(attendanceQuery).sort({ date: 1 });

      let totalAttendanceDays = 0;
      let totalWeeklyOffDays = 0;
      let totalOfficialLeaveDays = 0;
      let totalAbsentDays = 0;
      let totalOvertimeHours = 0;
      let totalDeductedHours = 0;
      let totalDeductedDays = 0;
      let totalAnnualLeaveDays = 0;
      let totalSickLeaveDeduction = 0;
      let totalSickLeaveDays = 0;
      let totalLeaveAllowance = 0;

      for (const att of attendances) {
        if (att.attendanceStatus === 'حاضر' || att.attendanceStatus === 'متأخر') totalAttendanceDays++;
        if (att.attendanceStatus === 'إجازة أسبوعية') totalWeeklyOffDays++;
        if (att.attendanceStatus === 'إجازة رسمية') totalOfficialLeaveDays++;
        if (att.attendanceStatus === 'غائب') totalAbsentDays++;
        totalOvertimeHours += Number(att.overtimeHours || 0);
        totalDeductedHours += (att.deductedHours && att.deductedHours < 100) ? Number(att.deductedHours) : 0;
        totalDeductedDays += Number(att.deductedDays || 0);
        if (att.attendanceStatus === 'إجازة سنوية') totalAnnualLeaveDays++;
        if (att.attendanceStatus === 'إجازة مرضية') {
          totalSickLeaveDeduction += Number(att.deductedDays || 0);
          totalSickLeaveDays++;
        }
        if (att.leaveAllowance === 'نعم') totalLeaveAllowance += 1;
      }

      const adjustment = user.salaryAdjustments?.get(yearMonth) || {
        totalViolations: user.violationTotal || 0,
        deductionViolationsInstallment: user.violationInstallment || 0,
        totalAdvances: totalAdvances,
        deductionAdvancesInstallment: monthlyInstallment,
        occasionBonus: user.occasionBonus || 0,
        remainingAdvances: remainingAdvances,
      };

      const mealDeductionPerDay = 50;
      const mealDeductionDays = totalAbsentDays + totalAnnualLeaveDays + totalOfficialLeaveDays + totalSickLeaveDays;
      const mealDeduction = roundNumber(Math.min(mealDeductionDays * mealDeductionPerDay, user.mealAllowance || 0));
      const remainingMealAllowance = roundNumber((user.mealAllowance || 0) - mealDeduction);

      const dailyRate = roundNumber(user.totalSalaryWithAllowances / 30);
      const hourlyRate = roundNumber(user.totalSalaryWithAllowances / (30 * shift.baseHours));

      const hasMinutesDeduction = shift.deductions ? shift.deductions.some(d => d.type === 'minutes') : false;
      const deductedDaysAmount = roundNumber(totalDeductedDays * dailyRate);
      const deductedHoursAmount = hasMinutesDeduction ? roundNumber(totalDeductedHours * hourlyRate) : 0;
      const sickDeductionAmount = roundNumber(totalSickLeaveDeduction * dailyRate);
      const overtimeAmount = roundNumber(totalOvertimeHours * (shift.overtimeBasis === 'basicSalary' ? (user.basicSalary / (30 * shift.baseHours)) : hourlyRate));
      const leaveAllowanceAmount = roundNumber(totalLeaveAllowance * dailyRate);

      const totalDeductions = roundNumber(
        (user.medicalInsurance || 0) +
        (user.socialInsurance || 0) +
        deductedDaysAmount +
        deductedHoursAmount +
        (adjustment.deductionViolationsInstallment || 0) +
        (adjustment.deductionAdvancesInstallment || monthlyInstallment) +
        sickDeductionAmount +
        mealDeduction
      );

      const totalAdditions = roundNumber(
        user.totalSalaryWithAllowances +
        (user.mealAllowance || 0) +
        (adjustment.occasionBonus || 0) +
        overtimeAmount +
        leaveAllowanceAmount
      );

      const net = roundNumber(totalAdditions - totalDeductions);

      totalsByEmployee[user.employeeCode] = {
        employeeCode: user.employeeCode,
        employeeName: user.name,
        totalSalaryWithAllowances: roundNumber(user.totalSalaryWithAllowances),
        basicSalary: roundNumber(user.basicSalary),
        medicalInsurance: roundNumber(user.medicalInsurance || 0),
        socialInsurance: roundNumber(user.socialInsurance || 0),
        mealAllowance: roundNumber(user.mealAllowance || 0),
        mealDeduction: roundNumber(mealDeduction),
        remainingMealAllowance: roundNumber(remainingMealAllowance),
        shiftName: shift.shiftName,
        totalAttendanceDays,
        totalWeeklyOffDays,
        totalLeaveAllowance,
        totalAbsentDays,
        totalDeductedHours: roundNumber(totalDeductedHours),
        totalAnnualLeaveDays,
        totalSickLeaveDeduction: roundNumber(totalSickLeaveDeduction),
        annualLeaveBalance: user.annualLeaveBalance || 0,
        totalOfficialLeaveDays,
        totalDeductedDays: roundNumber(totalDeductedDays),
        totalOvertimeHours: roundNumber(totalOvertimeHours),
        occasionBonus: roundNumber(adjustment.occasionBonus || 0),
        totalViolationsFull: roundNumber(adjustment.totalViolations || 0),
        totalViolations: roundNumber((adjustment.totalViolations || 0) - (adjustment.deductionViolationsInstallment || 0)),
        violationDeduction: roundNumber(adjustment.deductionViolationsInstallment || 0),
        totalLoansFull: roundNumber(totalAdvances),
        totalLoans: roundNumber(remainingAdvances),
        loanDeduction: roundNumber(monthlyInstallment),
        totalDeductions: roundNumber(totalDeductions),
        totalOvertimeAmount: roundNumber(totalAdditions),
        finalSalary: roundNumber(net),
        deductedDaysAmount: roundNumber(deductedDaysAmount),
      };

      reports.push(totalsByEmployee[user.employeeCode]);
    }

    res.json({
      success: true,
      message: 'تم جلب تقرير الراتب الشهري بنجاح',
      data: reports,
      totals: Object.values(totalsByEmployee),
    });
  } catch (err) {
    console.error('Error in GET /user/monthly-salary-report:', {
      message: err.message,
      stack: err.stack,
      query: req.query,
    });
    res.status(500).json({ success: false, message: `حدث خطأ: ${err.message}` });
  }
});

// ... باقي الكود الحالي للوظائف الأخرى يبقى دون تغيير ...
// باقي الدوال بدون تغيير
router.post('/login', async (req, res) => {
  try {
    const { employeeCode, password } = req.body;

    if (!employeeCode || !password) {
      return res.status(400).json({ success: false, message: 'كود الموظف وكلمة المرور مطلوبان' });
    }

    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(401).json({ success: false, message: 'كود الموظف غير صحيح' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign({ userId: user._id, employeeCode: user.employeeCode }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    return res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        employeeCode: user.employeeCode,
        name: user.name,
        department: user.department
      }
    });
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل الدخول', error: error.message });
  }
});

// جلب جميع المستخدمين
router.get('/', async (req, res) => {
  try {
    const users = await User.find().populate('shiftType');
    res.json(users);
  } catch (err) {
    console.error('Error in GET /user:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

// جلب جميع الشيفتات
router.get('/shifts', async (req, res) => {
  try {
    const shifts = await Shift.find();
    res.json(shifts);
  } catch (err) {
    console.error('Error in GET /shifts:', err);
    res.status(500).json({ success: false, message: `حدث خطأ أثناء جلب الشيفتات: ${err.message}` });
  }
});

// إنشاء مستخدم جديد
router.post('/create', async (req, res) => {
  try {
    const { password, ...otherData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ ...otherData, password: hashedPassword });
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /create:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

// تحديث مستخدم
router.put('/update/:id', async (req, res) => {
  try {
    const { password, ...otherData } = req.body;

    // تحويل القيم إلى أرقام إذا كانت موجودة
    const updates = {};
    if (otherData.totalSalaryWithAllowances !== undefined) updates.totalSalaryWithAllowances = parseFloat(otherData.totalSalaryWithAllowances) || 0;
    if (otherData.basicSalary !== undefined) updates.basicSalary = parseFloat(otherData.basicSalary) || 0;
    if (otherData.bonusPercentage !== undefined) updates.bonusPercentage = parseFloat(otherData.bonusPercentage) || 0;
    if (otherData.basicBonus !== undefined) updates.basicBonus = parseFloat(otherData.basicBonus) || 0;
    if (otherData.mealAllowance !== undefined) updates.mealAllowance = parseFloat(otherData.mealAllowance) || 0;
    if (otherData.medicalInsurance !== undefined) updates.medicalInsurance = parseFloat(otherData.medicalInsurance) || 0;
    if (otherData.socialInsurance !== undefined) updates.socialInsurance = parseFloat(otherData.socialInsurance) || 0;
    if (otherData.annualLeaveBalance !== undefined) updates.annualLeaveBalance = parseFloat(otherData.annualLeaveBalance) || 0;

    // حساب netSalary
    updates.netSalary = roundNumber(
      (updates.totalSalaryWithAllowances || 0) +
      ((updates.basicBonus || 0) * (updates.bonusPercentage || 0) / 100) +
      (updates.mealAllowance || 0) -
      (updates.medicalInsurance || 0) -
      (updates.socialInsurance || 0)
    );

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.password = hashedPassword;
    }

    await User.findByIdAndUpdate(req.params.id, updates);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /update/:id:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

// تحديث عدة مستخدمين
router.put('/update-many', async (req, res) => {
  try {
    const { updates, shiftType, excludedUsers, annualIncreasePercentage, basicIncreasePercentage } = req.body;
    let filter = shiftType ? { shiftType } : {};
    if (excludedUsers && excludedUsers.length > 0) {
      filter._id = { $nin: excludedUsers };
    }

    // تحديث النسبة السنوية للراتب الإجمالي
    if (annualIncreasePercentage !== undefined && !isNaN(annualIncreasePercentage)) {
      const users = await User.find(filter);
      for (const user of users) {
        const currentTotalSalary = user.totalSalaryWithAllowances || 0;
        const newTotalSalary = roundNumber(currentTotalSalary * (1 + parseFloat(annualIncreasePercentage) / 100));
        const newNetSalary = roundNumber(
          newTotalSalary +
          ((user.basicBonus || 0) * (user.bonusPercentage || 0) / 100) +
          (user.mealAllowance || 0) -
          (user.medicalInsurance || 0) -
          (user.socialInsurance || 0)
        );
        await User.findByIdAndUpdate(user._id, {
          totalSalaryWithAllowances: newTotalSalary,
          netSalary: newNetSalary,
        });
      }
      return res.json({ success: true });
    }

    // تحديث النسبة السنوية للراتب الأساسي
    if (basicIncreasePercentage !== undefined && !isNaN(basicIncreasePercentage)) {
      const users = await User.find(filter);
      for (const user of users) {
        const currentBasicSalary = user.basicSalary || 0;
        const newBasicSalary = roundNumber(currentBasicSalary * (1 + parseFloat(basicIncreasePercentage) / 100));
        await User.findByIdAndUpdate(user._id, {
          basicSalary: newBasicSalary,
        });
      }
      return res.json({ success: true });
    }

    // تحويل القيم إلى أرقام للتعديلات الأخرى
    const sanitizedUpdates = {};
    if (updates?.bonusPercentage !== undefined) sanitizedUpdates.bonusPercentage = parseFloat(updates.bonusPercentage) || 0;
    if (updates?.basicBonus !== undefined) sanitizedUpdates.basicBonus = parseFloat(updates.basicBonus) || 0;
    if (updates?.mealAllowance !== undefined) sanitizedUpdates.mealAllowance = parseFloat(updates.mealAllowance) || 0;
    if (updates?.medicalInsurance !== undefined) sanitizedUpdates.medicalInsurance = parseFloat(updates.medicalInsurance) || 0;
    if (updates?.socialInsurance !== undefined) sanitizedUpdates.socialInsurance = parseFloat(updates.socialInsurance) || 0;
    if (updates?.annualLeaveBalance !== undefined) sanitizedUpdates.annualLeaveBalance = parseFloat(updates.annualLeaveBalance) || 0;

    // تحديث netSalary لكل مستخدم إذا كانت هناك تحديثات تؤثر عليه
    if (
      sanitizedUpdates.bonusPercentage !== undefined ||
      sanitizedUpdates.basicBonus !== undefined ||
      sanitizedUpdates.mealAllowance !== undefined ||
      sanitizedUpdates.medicalInsurance !== undefined ||
      sanitizedUpdates.socialInsurance !== undefined
    ) {
      await User.updateMany(filter, [
        {
          $set: {
            ...sanitizedUpdates,
            netSalary: {
              $round: [
                {
                  $add: [
                    '$totalSalaryWithAllowances',
                    {
                      $multiply: [
                        sanitizedUpdates.basicBonus || '$basicBonus',
                        sanitizedUpdates.bonusPercentage || '$bonusPercentage',
                        0.01,
                      ],
                    },
                    sanitizedUpdates.mealAllowance || '$mealAllowance',
                    { $subtract: [0, sanitizedUpdates.medicalInsurance || '$medicalInsurance'] },
                    { $subtract: [0, sanitizedUpdates.socialInsurance || '$socialInsurance'] },
                  ],
                },
                2,
              ],
            },
          },
        },
      ]);
    } else if (sanitizedUpdates.annualLeaveBalance !== undefined) {
      // تحديث رصيد الإجازة فقط إذا لم تكن هناك تحديثات أخرى
      await User.updateMany(filter, { $set: sanitizedUpdates });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /update-many:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

// حذف مستخدم
router.delete('/delete/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /delete/:id:', err);
    res.status(500).json({ success: false, message: `حدث خطأ أثناء الحذف: ${err.message}` });
  }
});

// تحديث تعديلات الراتب
router.put('/update-salary-adjustment/:employeeCode/:monthYear', authenticateToken, async (req, res) => {
  try {
    const { employeeCode, monthYear } = req.params;
    const { totalViolations, deductionViolationsInstallment, totalAdvances, deductionAdvancesInstallment, occasionBonus } = req.body;

    // التحقق من وجود المعلمات المطلوبة
    if (!employeeCode || !monthYear) {
      return res.status(400).json({ success: false, message: 'كود الموظف والشهر مطلوبان', data: null });
    }
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ success: false, message: 'تنسيق الشهر غير صالح، استخدم YYYY-MM', data: null });
    }

    // التحقق من وجود الموظف
    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود', data: null });
    }

    // التحقق من صحة القيم
    if (
      totalViolations === undefined ||
      deductionViolationsInstallment === undefined ||
      totalAdvances === undefined ||
      deductionAdvancesInstallment === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول (إجمالي المخالفات، خصم المخالفات، إجمالي السلف، خصم السلف) مطلوبة',
        data: null,
      });
    }
    if (
      totalViolations < 0 ||
      deductionViolationsInstallment < 0 ||
      totalAdvances < 0 ||
      deductionAdvancesInstallment < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'القيم لا يمكن أن تكون سالبة',
        data: null,
      });
    }
    if (deductionViolationsInstallment > totalViolations) {
      return res.status(400).json({
        success: false,
        message: 'قسط المخالفات لا يمكن أن يكون أكبر من إجمالي المخالفات',
        data: null,
      });
    }
    if (deductionAdvancesInstallment > totalAdvances) {
      return res.status(400).json({
        success: false,
        message: 'قسط السلف لا يمكن أن يكون أكبر من إجمالي السلف',
        data: null,
      });
    }

    // جلب السلف النشطة من نموذج Advance
    const startDate = `${monthYear}-01`;
    const endDate = new Date(parseInt(monthYear.split('-')[0]), parseInt(monthYear.split('-')[1]), 0).toISOString().split('T')[0];
    const activeAdvances = await Advance.find({
      employeeCode,
      advanceDate: { $lte: endDate },
      finalRepaymentDate: { $gte: startDate },
      status: 'active'
    });
    console.log(`Found ${activeAdvances.length} active advances for ${employeeCode}:`, activeAdvances);

    let newAdvancesSum = 0;
    let activeMonthlySum = 0;

    for (const advance of activeAdvances) {
      if (!advance.isIncluded) {
        newAdvancesSum += advance.advanceAmount;
        advance.isIncluded = true;
        await advance.save();
        console.log(`Marked advance ${advance._id} as included for ${employeeCode}`);
      }
      if (advance.lastDeductionMonth !== monthYear) {
        activeMonthlySum += advance.monthlyInstallment;
        const newRemainingAmount = advance.remainingAmount - advance.monthlyInstallment;
        advance.remainingAmount = Math.max(newRemainingAmount, 0);
        advance.lastDeductionMonth = monthYear;
        if (advance.remainingAmount === 0) {
          advance.status = 'completed';
        }
        await advance.save();
        console.log(`Updated advance ${advance._id} for ${employeeCode}: remainingAmount=${advance.remainingAmount}, status=${advance.status}, lastDeductionMonth=${monthYear}`);
      } else {
        console.log(`Advance ${advance._id} for ${employeeCode} already deducted for ${monthYear}`);
      }
    }

    // دمج القيم اليدوية مع السلف التلقائية
    const prevMonth = `${parseInt(monthYear.split('-')[0]) - (parseInt(monthYear.split('-')[1]) === 1 ? 1 : 0)}-${((parseInt(monthYear.split('-')[1]) - 1) || 12).toString().padStart(2, '0')}`;
    const prevAdjustment = user.salaryAdjustments?.get(prevMonth);
    const prevRemainingAdvances = prevAdjustment?.remainingAdvances || 0;
    const effectiveTotalAdvances = prevRemainingAdvances + newAdvancesSum + Number(totalAdvances);
    const effectiveDeductionAdvances = Number(deductionAdvancesInstallment) + activeMonthlySum;

    // تحديث تعديلات الراتب
    user.salaryAdjustments = user.salaryAdjustments || new Map();
    user.salaryAdjustments.set(monthYear, {
      totalViolations: Number(totalViolations) || 0,
      deductionViolationsInstallment: Number(deductionViolationsInstallment) || 0,
      totalAdvances: effectiveTotalAdvances,
      deductionAdvancesInstallment: Math.min(effectiveDeductionAdvances, effectiveTotalAdvances),
      occasionBonus: Number(occasionBonus) || 0,
      bindingValue: user.salaryAdjustments.get(monthYear)?.bindingValue || 0,
      productionValue: user.salaryAdjustments.get(monthYear)?.productionValue || 0,
      remainingViolations: Number(totalViolations) - Number(deductionViolationsInstallment),
      remainingAdvances: effectiveTotalAdvances - Math.min(effectiveDeductionAdvances, effectiveTotalAdvances)
    });

    user.violationTotal = Number(totalViolations) || user.violationTotal || 0;
    user.violationInstallment = Number(deductionViolationsInstallment) || user.violationInstallment || 0;
    user.advanceTotal = effectiveTotalAdvances;
    user.advanceInstallment = Math.min(effectiveDeductionAdvances, effectiveTotalAdvances);
    user.occasionBonus = Number(occasionBonus) || user.occasionBonus || 0;

    await user.save();

    // إرجاع الاستجابة مع البيانات المحدثة
    return res.status(200).json({
      success: true,
      message: 'تم تعديل تعديلات الراتب بنجاح',
      data: {
        totalViolationsFull: Number(totalViolations) || 0,
        violationDeduction: Number(deductionViolationsInstallment) || 0,
        totalLoansFull: effectiveTotalAdvances,
        loanDeduction: Math.min(effectiveDeductionAdvances, effectiveTotalAdvances),
        totalViolations: Number(totalViolations) - Number(deductionViolationsInstallment),
        totalLoans: effectiveTotalAdvances - Math.min(effectiveDeductionAdvances, effectiveTotalAdvances),
        occasionBonus: Number(occasionBonus) || 0
      }
    });
  } catch (error) {
    console.error('خطأ في updateSalaryAdjustment:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التعديل',
      error: error.message,
      data: null
    });
  }
});

// تحديث تعديلات الحافز
router.put('/update-bonus-adjustment/:employeeCode/:monthYear', authenticateToken, async (req, res) => {
  try {
    const { employeeCode, monthYear } = req.params;
    const { bindingValue, productionValue } = req.body;

    if (!employeeCode || !monthYear) {
      return res.status(400).json({ success: false, message: 'كود الموظف والشهر مطلوبان' });
    }

    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ success: false, message: 'تنسيق الشهر غير صالح، استخدم YYYY-MM' });
    }

    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    const bonusAdjustment = await BonusAdjustment.findOneAndUpdate(
      { employeeCode, monthYear },
      { bindingValue: parseFloat(bindingValue) || 0, productionValue: parseFloat(productionValue) || 0 },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, message: 'تم تعديل الحافز بنجاح', data: bonusAdjustment });
  } catch (error) {
    console.error('خطأ في updateBonusAdjustment:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التعديل', error: error.message });
  }
});

// تقرير الحافز الشهري
router.get('/monthly-bonus-report', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, employeeCode, shiftId } = req.query;

    // التحقق من صحة المدخلات
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'يجب إدخال تاريخ البداية والنهاية' });
    }

    // التحقق من تنسيق التاريخ
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'تنسيق التاريخ غير صالح، استخدم YYYY-MM-DD' });
    }

    const monthYear = startDate.slice(0, 7); // استخراج YYYY-MM
    const totalWorkDays = 30; // افتراض أن عدد أيام العمل الشهري ثابت (30 يومًا)

    // بناء استعلام الموظفين
    let userFilter = {};
    if (employeeCode) userFilter.employeeCode = employeeCode;
    if (shiftId) userFilter.shiftType = shiftId;

    const users = await User.find(userFilter).populate('shiftType');
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'لا يوجد موظفين بهذا الكود أو الشيفت' });
    }

    const reports = [];

    for (const user of users) {
      if (!user.shiftType || !user.shiftType._id) {
        console.warn(`User ${user.employeeCode} has no valid shiftType`);
        continue;
      }

      const shift = user.shiftType;

      // استعلام سجلات الحضور
      const attendanceQuery = {
        employeeCode: user.employeeCode,
        date: { $gte: startDate, $lte: endDate },
        attendanceStatus: { $in: ['حاضر', 'متأخر'] }
      };
      const attendances = await Attendance.find(attendanceQuery);

      let totalAttendanceDays = attendances.length;

      // حساب إجمالي الأيام المخصومة من حقل deductedDays
      const deductedDaysQuery = {
        employeeCode: user.employeeCode,
        date: { $gte: startDate, $lte: endDate },
        deductedDays: { $gt: 0 } // جلب السجلات اللي فيها deductedDays أكبر من 0
      };
      const deductedDaysRecords = await Attendance.find(deductedDaysQuery).sort({ date: 1 });

      let totalDeductedDays = 0;
      const processedDates = new Set(); // لتجنب تكرار الخصومات لنفس اليوم

      for (const record of deductedDaysRecords) {
        // تحويل التاريخ إلى string بصيغة YYYY-MM-DD
        let recordDate;
        if (record.date instanceof Date) {
          recordDate = record.date.toISOString().split('T')[0];
        } else if (typeof record.date === 'string') {
          recordDate = record.date; // افتراض أن التاريخ بالفعل بصيغة YYYY-MM-DD
        } else {
          console.warn(`Invalid date format for record: ${record._id}, skipping`);
          continue; // تخطي السجل لو التاريخ غير صالح
        }

        if (processedDates.has(recordDate)) {
          continue; // تجنب تكرار الخصم لنفس اليوم
        }
        processedDates.add(recordDate);

        if (record.deductedDays && record.deductedDays > 0) {
          totalDeductedDays += record.deductedDays;
        }
      }

      // جلب تعديلات الحافز
      const adjustment = await BonusAdjustment.findOne({ employeeCode: user.employeeCode, monthYear }) || {
        bindingValue: 0,
        productionValue: 0
      };

      // حساب الحافز
      const basicBonus = roundNumber(user.basicBonus || 2000);
      const bonusPercentage = roundNumber(user.bonusPercentage || 50);
      const bonusValue = roundNumber(basicBonus * (bonusPercentage / 100));
      const dailyBonusRate = roundNumber(bonusValue / totalWorkDays);
      const deductionAmount = roundNumber(totalDeductedDays * dailyBonusRate);
      const totalDeductions = deductionAmount;
      const netBonus = roundNumber(bonusValue + adjustment.bindingValue + adjustment.productionValue - totalDeductions);

      reports.push({
        employeeCode: user.employeeCode,
        name: user.name,
        basicBonus,
        shiftType: shift.shiftName,
        bonusPercentage,
        totalAttendanceDays,
        totalDeductedDays: roundNumber(totalDeductedDays, 2), // تقريب لـ 2 عشري
        totalDeductions,
        bindingValue: roundNumber(adjustment.bindingValue),
        productionValue: roundNumber(adjustment.productionValue),
        netBonus
      });
    }

    res.json(reports);
  } catch (err) {
    console.error('Error in GET /user/monthly-bonus-report:', {
      message: err.message,
      stack: err.stack,
      query: req.query
    });
    res.status(500).json({ success: false, message: `حدث خطأ: ${err.message}` });
  }
});

module.exports = router;
