const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Shift = require('../models/Shift');
const Attendance = require('../models/Attendance');
const jwt = require('jsonwebtoken');
const router = express.Router();

// دالة لتقريب الأرقام إلى خانتين عشريتين
const roundNumber = (num) => Number(num.toFixed(2));

// تسجيل الدخول
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

router.get('/', async (req, res) => {
  try {
    const users = await User.find().populate('shiftType');
    res.json(users);
  } catch (err) {
    console.error('Error in GET /user:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.get('/shifts', async (req, res) => {
  try {
    const shifts = await Shift.find();
    res.json(shifts);
  } catch (err) {
    console.error('Error in GET /shifts:', err);
    res.status(500).json({ success: false, message: `حدث خطأ أثناء جلب الشيفتات: ${err.message}` });
  }
});

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

router.put('/update/:id', async (req, res) => {
  try {
    const { password, ...otherData } = req.body;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(req.params.id, { ...otherData, password: hashedPassword });
    } else {
      await User.findByIdAndUpdate(req.params.id, otherData);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /update/:id:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.put('/update-many', async (req, res) => {
  try {
    const { updates, shiftType, excludedUsers, annualIncreasePercentage } = req.body;
    let filter = shiftType ? { shiftType } : {};
    if (excludedUsers && excludedUsers.length > 0) {
      filter._id = { $nin: excludedUsers };
    }
    if (annualIncreasePercentage) {
      await User.updateMany(filter, [
        {
          $set: {
            basicSalary: { $multiply: ['$basicSalary', 1 + annualIncreasePercentage / 100] },
            netSalary: {
              $add: [
                { $multiply: ['$basicSalary', 1 + annualIncreasePercentage / 100] },
                '$basicBonus',
                '$mealAllowance',
              ],
            },
          },
        },
      ]);
    } else {
      await User.updateMany(filter, updates);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /update-many:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /delete/:id:', err);
    res.status(500).json({ success: false, message: `حدث خطأ أثناء الحذف: ${err.message}` });
  }
});

router.put('/update-salary-adjustment/:employeeCode/:monthYear', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'غير مصرح: التوكن غير موجود' });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'انتهت صلاحية التوكن، يرجى تسجيل الدخول مرة أخرى' });
      }
      return res.status(401).json({ success: false, message: 'التوكن غير صالح', error: err.message });
    }

    const { employeeCode, monthYear } = req.params;
    const { totalViolations, deductionViolationsInstallment, totalAdvances, deductionAdvancesInstallment, occasionBonus } = req.body;

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

    if (!user.salaryAdjustments) {
      user.salaryAdjustments = new Map();
    }

    user.salaryAdjustments.set(monthYear, {
      totalViolations: totalViolations || 0,
      deductionViolationsInstallment: deductionViolationsInstallment || 0,
      totalAdvances: totalAdvances || 0,
      deductionAdvancesInstallment: deductionAdvancesInstallment || 0,
      occasionBonus: occasionBonus || 0
    });

    user.violationTotal = totalViolations || user.violationTotal || 0;
    user.violationInstallment = deductionViolationsInstallment || user.violationInstallment || 0;
    user.advanceTotal = totalAdvances || user.advanceTotal || 0;
    user.advanceInstallment = deductionAdvancesInstallment || user.advanceInstallment || 0;
    user.occasionBonus = occasionBonus || user.occasionBonus || 0;

    await user.save();

    return res.status(200).json({ success: true, message: 'تم تعديل تعديلات الراتب بنجاح' });
  } catch (error) {
    console.error('خطأ في updateSalaryAdjustment:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التعديل', error: error.message });
  }
});

router.get('/monthly-salary-report', async (req, res) => {
  try {
    const { month, year, employeeCode, shiftId } = req.query;

    if (!month || !year || isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'يجب إدخال شهر وسنة صالحين' });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const monthYear = `${year}-${month.padStart(2, '0')}`;

    let userFilter = {};
    if (employeeCode) userFilter.employeeCode = employeeCode;
    if (shiftId) userFilter.shiftType = shiftId;

    const users = await User.find(userFilter).populate('shiftType');
    const reports = [];

    for (const user of users) {
      if (!user.shiftType) {
        console.warn(`User ${user.employeeCode} has no valid shiftType`);
        continue;
      }

      const shift = user.shiftType;

      if (!shift.baseHours || shift.baseHours <= 0) {
        console.warn(`Invalid baseHours for user ${user.employeeCode}`);
        continue;
      }

      const attendanceQuery = {
        employeeCode: user.employeeCode,
        date: { $gte: startDate, $lte: endDate }
      };
      const attendances = await Attendance.find(attendanceQuery);

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
        totalOvertimeHours += att.overtimeHours || 0;
        totalDeductedHours += (att.deductedHours && att.deductedHours < 100) ? att.deductedHours : 0;
        totalDeductedDays += att.deductedDays || 0;
        if (att.attendanceStatus === 'إجازة سنوية') totalAnnualLeaveDays++;
        if (att.attendanceStatus === 'إجازة مرضية') {
          totalSickLeaveDeduction += att.deductedDays || 0;
          totalSickLeaveDays++;
        }
        if (att.leaveAllowance === 'نعم') totalLeaveAllowance += 1;
      }

      const adjustment = user.salaryAdjustments.get(monthYear) || {
        totalViolations: user.violationTotal || 0,
        deductionViolationsInstallment: user.violationInstallment || 0,
        totalAdvances: user.advanceTotal || 0,
        deductionAdvancesInstallment: user.advanceInstallment || 0,
        occasionBonus: user.occasionBonus || 0
      };

      const mealDeductionPerDay = 50;
      const mealDeductionDays = totalAbsentDays + totalAnnualLeaveDays + totalOfficialLeaveDays + totalSickLeaveDays;
      const mealDeduction = roundNumber(Math.min(mealDeductionDays * mealDeductionPerDay, user.mealAllowance));
      const remainingMealAllowance = roundNumber(user.mealAllowance - mealDeduction);

      const dailyRate = roundNumber(user.basicSalary / 30);
      const hourlyRate = roundNumber(user.basicSalary / (30 * shift.baseHours));

      const hasMinutesDeduction = shift.deductions ? shift.deductions.some(d => d.type === 'minutes') : false;
      const deductedDaysAmount = roundNumber(totalDeductedDays * dailyRate);
      const deductedHoursAmount = hasMinutesDeduction ? roundNumber(totalDeductedHours * hourlyRate) : 0;
      const sickDeductionAmount = roundNumber(totalSickLeaveDeduction * dailyRate);
      const overtimeAmount = roundNumber(totalOvertimeHours * hourlyRate);
      const leaveAllowanceAmount = roundNumber(totalLeaveAllowance * dailyRate);

      const totalDeductions = roundNumber(
        user.medicalInsurance +
        user.socialInsurance +
        deductedDaysAmount +
        deductedHoursAmount +
        adjustment.deductionViolationsInstallment +
        adjustment.deductionAdvancesInstallment +
        sickDeductionAmount +
        mealDeduction
      );

      const totalAdditions = roundNumber(
        user.basicSalary +
        user.mealAllowance +
        adjustment.occasionBonus +
        overtimeAmount +
        leaveAllowanceAmount
      );

      const net = roundNumber(totalAdditions - totalDeductions);

      reports.push({
        employeeCode: user.employeeCode,
        name: user.name,
        basicSalary: roundNumber(user.basicSalary),
        medicalInsurance: roundNumber(user.medicalInsurance),
        socialInsurance: roundNumber(user.socialInsurance),
        mealAllowance: roundNumber(user.mealAllowance),
        mealDeduction: roundNumber(mealDeduction),
        remainingMealAllowance: roundNumber(remainingMealAllowance),
        shiftType: shift.shiftName,
        totalAttendanceDays,
        totalWeeklyOffDays,
        totalLeaveAllowance,
        totalAbsentDays,
        totalDeductedHours: roundNumber(totalDeductedHours),
        totalAnnualLeaveDays,
        totalSickLeaveDeduction: roundNumber(totalSickLeaveDeduction),
        annualLeaveBalance: user.annualLeaveBalance,
        totalOfficialLeaveDays,
        totalDeductedDays: roundNumber(totalDeductedDays),
        totalOvertimeHours: roundNumber(totalOvertimeHours),
        occasionBonus: roundNumber(adjustment.occasionBonus),
        totalViolations: roundNumber(adjustment.totalViolations),
        deductionViolationsInstallment: roundNumber(adjustment.deductionViolationsInstallment),
        totalAdvances: roundNumber(adjustment.totalAdvances),
        deductionAdvancesInstallment: roundNumber(adjustment.deductionAdvancesInstallment),
        totalDeductions: totalDeductions,
        totalAdditions: totalAdditions,
        netSalary: net
      });
    }

    res.json(reports);
  } catch (err) {
    console.error('Error in GET /monthly-salary-report:', {
      message: err.message,
      stack: err.stack,
      query: req.query
    });
    res.status(500).json({ success: false, message: `حدث خطأ: ${err.message}` });
  }
});

module.exports = router;
