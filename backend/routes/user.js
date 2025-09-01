const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Shift = require('../models/Shift');
const Attendance = require('../models/Attendance');
const BonusAdjustment = require('../models/BonusAdjustment');
const Advance = require('../models/Advance');
const Violation = require('../models/Violation');
const SalaryAdjustment = require('../models/SalaryAdjustment');
const ViolationAdjustment = require('../models/ViolationAdjustment');
const jwt = require('jsonwebtoken');
const router = express.Router();

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 2) => {
  if (num == null || isNaN(num)) {
    console.warn(`Warning: roundNumber received invalid value: ${num}`);
    return 0;
  }
  return Number(Number(num).toFixed(decimals));
};

// دالة المصادقة
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

// نقطة نهاية جلب تقرير الراتب الشهري
router.get('/monthly-salary-report', authenticateToken, async (req, res) => {
  try {
    const { yearMonth, employeeCode, shiftId } = req.query;
    const userRole = req.user.role;
    const currentEmployeeCode = req.user.employeeCode;
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
    if (userRole === 'employee') {
      userFilter.employeeCode = currentEmployeeCode;
    } else if (userRole === 'admin') {
      if (employeeCode) userFilter.employeeCode = employeeCode;
      if (shiftId) userFilter.shiftType = shiftId;
    } else {
      console.warn(`Invalid role for user ${currentEmployeeCode}: ${userRole}`);
      return res.status(403).json({ success: false, message: 'دور المستخدم غير صالح' });
    }
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
      if (!['admin', 'employee'].includes(user.role)) {
        console.warn(`Skipping user ${user.employeeCode} due to invalid role: ${user.role}`);
        continue;
      }
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
      // حساب الشهر السابق
      let prevMonth = parseInt(month) - 1;
      let prevYear = parseInt(year);
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear--;
      }
      const prevMonthStr = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
      // معالجة المخالفات (Violations)
      let violationAdjustments = user.violationAdjustments?.get(yearMonth) || null;
      let violationAdjustment = await ViolationAdjustment.findOne({ employeeCode: user.employeeCode, month: yearMonth });
      // إعادة حساب المخالفات من Violation
      const violations = await Violation.find({
        employeeCode: user.employeeCode,
        date: { $gte: startDate, $lte: endDate }
      });
      if (!violations.length) {
        console.warn(`No violations found for ${user.employeeCode} in ${yearMonth}`);
      }
      const totalViolationsForMonth = violations.reduce((sum, violation) => sum + (violation.violationPrice || 0), 0);
      console.log(`Total violations for ${user.employeeCode} in ${yearMonth}: ${totalViolationsForMonth}`);
      // تحديث ViolationAdjustment بناءً على المخالفات الجديدة
      const prevViolationAdjustment = await ViolationAdjustment.findOne({ employeeCode: user.employeeCode, month: prevMonthStr });
      let prevRemainingViolations = prevViolationAdjustment ? roundNumber(prevViolationAdjustment.remainingViolations || 0) : 0;
      violationAdjustments = {
        totalViolations: roundNumber(prevRemainingViolations + totalViolationsForMonth),
        deductionViolationsInstallment: roundNumber(violationAdjustment?.deductionViolationsInstallment || 0),
        remainingViolations: roundNumber(prevRemainingViolations + totalViolationsForMonth - (violationAdjustment?.deductionViolationsInstallment || 0)),
      };
      violationAdjustment = await ViolationAdjustment.findOneAndUpdate(
        { employeeCode: user.employeeCode, month: yearMonth },
        violationAdjustments,
        { upsert: true, new: true }
      );
      user.violationAdjustments = user.violationAdjustments || new Map();
      user.violationAdjustments.set(yearMonth, violationAdjustments);
      user.violationTotal = roundNumber(violationAdjustments.totalViolations);
      user.violationInstallment = roundNumber(violationAdjustments.deductionViolationsInstallment);
      await user.save();
      console.log(`Updated violation adjustments for ${user.employeeCode} in ${yearMonth}:`, violationAdjustments);
      // معالجة السلف (Advances) والجزاءات
      let advanceAdjustments = {
        totalAdvances: 0,
        deductionAdvancesInstallment: 0,
        remainingAdvances: 0,
        occasionBonus: 0,
        mealAllowance: roundNumber(user.mealAllowance || 0),
        mealDeduction: 0,
        penalties: 0, // إضافة حقل الجزاءات
      };
      // التحقق إذا كان الشهر تم حسابه مسبقًا في SalaryAdjustment
      const existingSalaryAdjustment = await SalaryAdjustment.findOne({
        employeeCode: user.employeeCode,
        month: yearMonth,
      });
      if (existingSalaryAdjustment) {
        // إذا كان الشهر موجود في SalaryAdjustment، نستخدم القيم المخزنة
        advanceAdjustments = {
          totalAdvances: roundNumber(existingSalaryAdjustment.totalAdvances || 0),
          deductionAdvancesInstallment: roundNumber(existingSalaryAdjustment.deductionAdvancesInstallment || 0),
          remainingAdvances: roundNumber(existingSalaryAdjustment.remainingAdvances || 0),
          occasionBonus: roundNumber(existingSalaryAdjustment.occasionBonus || 0),
          mealAllowance: roundNumber(existingSalaryAdjustment.mealAllowance || 0),
          mealDeduction: roundNumber(existingSalaryAdjustment.mealDeduction || 0),
          penalties: roundNumber(existingSalaryAdjustment.penalties || 0), // إضافة حقل الجزاءات
        };
        console.log(`Using existing SalaryAdjustment for ${user.employeeCode} in ${yearMonth}:`, advanceAdjustments);
      } else {
        // إذا كان الشهر جديد، نحسب القيم
        const currentYearMonth = new Date().toISOString().slice(0, 7); // الشهر الحالي YYYY-MM
        const activeAdvances = await Advance.find({
          employeeCode: user.employeeCode,
          advanceDate: { $lte: endDate },
          finalRepaymentDate: { $gte: startDate },
          status: 'active',
        }).lean();
        let totalAdvancesFull = 0; // إجمالي مبلغ السلف الأصلي
        let totalAdvancesRemaining = 0; // المبلغ المتبقي بعد الخصومات
        let deductionAdvancesInstallment = 0; // قسط الشهر الحالي
        for (const advance of activeAdvances) {
          totalAdvancesFull += roundNumber(advance.advanceAmount || 0);
          // جمع الخصومات السابقة من deductionHistory حتى الشهر السابق
          const previousDeductions = advance.deductionHistory
            .filter((deduction) => deduction.month < yearMonth)
            .reduce((sum, deduction) => sum + roundNumber(deduction.amount || 0), 0);
          // المبلغ المتبقي = المبلغ الأصلي - الخصومات السابقة
          const remainingForAdvance = roundNumber(advance.advanceAmount - previousDeductions);
          // إضافة المبلغ المتبقي إلى الإجمالي
          totalAdvancesRemaining += remainingForAdvance;
          // حساب قسط الشهر الحالي إذا كان الشهر ضمن فترة السداد
          const advanceStartDate = new Date(advance.advanceDate);
          const currentDate = new Date(`${yearMonth}-01`);
          const monthsPassed = (currentDate.getFullYear() - advanceStartDate.getFullYear()) * 12 + currentDate.getMonth() - advanceStartDate.getMonth();
          let deductionForMonth = 0;
          if (monthsPassed >= 0 && monthsPassed < advance.installmentMonths && remainingForAdvance > 0) {
            // التحقق إذا تم خصم لهذا الشهر سابقًا
            const existingDeduction = advance.deductionHistory.find((d) => d.month === yearMonth);
            if (existingDeduction) {
              // إذا موجود، استخدم القيمة الفعلية
              deductionForMonth = roundNumber(existingDeduction.amount || 0);
            } else if (yearMonth === currentYearMonth) {
              // إذا مش موجود، والشهر هو الحالي، خصم الآن
              deductionForMonth = Math.min(roundNumber(advance.monthlyInstallment || 0), remainingForAdvance);
              // تحديث Advance لتسجيل الخصم (فقط إذا الشهر حالي)
              await Advance.findByIdAndUpdate(
                advance._id,
                {
                  remainingAmount: Math.max(roundNumber(remainingForAdvance - deductionForMonth), 0),
                  lastDeductionMonth: yearMonth,
                  status: remainingForAdvance - deductionForMonth <= 0 ? 'completed' : 'active',
                  $push: {
                    deductionHistory: {
                      month: yearMonth,
                      amount: deductionForMonth,
                      deductionDate: new Date(),
                    },
                  },
                },
                { new: true }
              );
            } else {
              // إذا الشهر ماضي أو مستقبل ومش مخصوم، set 0 (مش نخصم)
              deductionForMonth = 0;
            }
          }
          deductionAdvancesInstallment += deductionForMonth;
          // خصم القسط من المتبقي للعرض
          totalAdvancesRemaining = roundNumber(totalAdvancesRemaining - deductionForMonth);
        }
        // تحديث advanceAdjustments
        advanceAdjustments = {
          totalAdvances: totalAdvancesFull,
          deductionAdvancesInstallment: deductionAdvancesInstallment,
          remainingAdvances: totalAdvancesRemaining,
          occasionBonus: 0,
          mealAllowance: roundNumber(user.mealAllowance || 0),
          mealDeduction: 0,
          penalties: 0, // إضافة حقل الجزاءات
        };
        // حفظ القيم في SalaryAdjustment
        await SalaryAdjustment.findOneAndUpdate(
          { employeeCode: user.employeeCode, month: yearMonth },
          advanceAdjustments,
          { upsert: true, new: true }
        );
        console.log(`Created new SalaryAdjustment for ${user.employeeCode} in ${yearMonth}:`, advanceAdjustments);
      }
      // تحديث advanceAdjustments في User
      user.advanceAdjustments = user.advanceAdjustments || new Map();
      user.advanceAdjustments.set(yearMonth, advanceAdjustments);
      user.advanceTotal = roundNumber(advanceAdjustments.totalAdvances);
      user.advanceInstallment = roundNumber(advanceAdjustments.deductionAdvancesInstallment);
      await user.save();
      // حسابات الحضور
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
        if (att.attendanceStatus === 'إجازة مرضية') totalSickLeaveDays++;
        if (att.leaveAllowance === 'نعم') totalLeaveAllowance += 1;
      }
      const mealDeductionPerDay = 50;
      const mealDeductionDays = totalAbsentDays + totalAnnualLeaveDays + totalOfficialLeaveDays + totalSickLeaveDays;
      const mealDeduction = roundNumber(Math.min(mealDeductionDays * mealDeductionPerDay, user.mealAllowance || 0));
      const remainingMealAllowance = roundNumber((user.mealAllowance || 0) - mealDeduction);
      const dailyRate = roundNumber(user.totalSalaryWithAllowances / 30);
      const hourlyRate = roundNumber(user.totalSalaryWithAllowances / (30 * shift.baseHours));
      const hasMinutesDeduction = shift.deductions ? shift.deductions.some(d => d.type === 'minutes') : false;
      const deductedDaysAmount = roundNumber(totalDeductedDays * dailyRate);
      const deductedHoursAmount = hasMinutesDeduction ? roundNumber(totalDeductedHours * hourlyRate) : 0;
      const overtimeAmount = roundNumber(totalOvertimeHours * (shift.overtimeBasis === 'basicSalary' ? (user.basicSalary / (30 * shift.baseHours)) : hourlyRate));
      const leaveAllowanceAmount = roundNumber(totalLeaveAllowance * dailyRate);
      const totalDeductions = roundNumber(
        (user.medicalInsurance || 0) +
        (user.socialInsurance || 0) +
        deductedDaysAmount +
        deductedHoursAmount +
        (violationAdjustments.deductionViolationsInstallment || 0) +
        (advanceAdjustments.deductionAdvancesInstallment || 0) +
        mealDeduction +
        (advanceAdjustments.penalties || 0) // إضافة الجزاءات إلى إجمالي الخصومات
      );
      const totalAdditions = roundNumber(
        user.totalSalaryWithAllowances +
        (user.mealAllowance || 0) +
        (advanceAdjustments.occasionBonus || 0) +
        overtimeAmount +
        leaveAllowanceAmount
      );
      const net = roundNumber(totalAdditions - totalDeductions);
      console.log(`Final calculations for ${user.employeeCode} in ${yearMonth}:`, {
        totalDeductions,
        deductionsBreakdown: {
          medicalInsurance: user.medicalInsurance || 0,
          socialInsurance: user.socialInsurance || 0,
          deductedDaysAmount,
          deductedHoursAmount,
          deductionViolationsInstallment: violationAdjustments.deductionViolationsInstallment || 0,
          deductionAdvancesInstallment: advanceAdjustments.deductionAdvancesInstallment || 0,
          mealDeduction,
          penalties: advanceAdjustments.penalties || 0, // إضافة الجزاءات
        },
        totalAdditions,
        additionsBreakdown: {
          totalSalaryWithAllowances: user.totalSalaryWithAllowances,
          mealAllowance: user.mealAllowance || 0,
          occasionBonus: advanceAdjustments.occasionBonus || 0,
          overtimeAmount,
          leaveAllowanceAmount,
        },
        net,
      });
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
        totalSickLeaveDeduction: roundNumber(totalSickLeaveDays),
        annualLeaveBalance: user.annualLeaveBalance || 0,
        totalOfficialLeaveDays,
        totalDeductedDays: roundNumber(totalDeductedDays),
        totalOvertimeHours: roundNumber(totalOvertimeHours),
        occasionBonus: roundNumber(advanceAdjustments.occasionBonus || 0),
        totalViolationsFull: roundNumber(violationAdjustments.totalViolations || 0),
        totalViolations: roundNumber(violationAdjustments.remainingViolations || 0),
        violationDeduction: roundNumber(violationAdjustments.deductionViolationsInstallment || 0),
        totalLoansFull: roundNumber(advanceAdjustments.totalAdvances),
        totalLoans: roundNumber(advanceAdjustments.remainingAdvances),
        loanDeduction: roundNumber(advanceAdjustments.deductionAdvancesInstallment),
        penalties: roundNumber(advanceAdjustments.penalties || 0), // إضافة حقل الجزاءات
        totalDeductions: roundNumber(totalDeductions),
        totalOvertimeAmount: roundNumber(totalAdditions),
        finalSalary: roundNumber(net),
        deductedDaysAmount: roundNumber(deductedDaysAmount),
      };
      reports.push(totalsByEmployee[user.employeeCode]);
    }
    if (!reports.length) {
      return res.status(404).json({ success: false, message: 'لا توجد تقارير متاحة للموظفين المحددين' });
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

// تعديل تعديلات الراتب
router.put('/update-salary-adjustment/:employeeCode/:monthYear', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
    const { employeeCode, monthYear } = req.params;
    const { totalViolations, deductionViolationsInstallment, totalAdvances, deductionAdvancesInstallment, occasionBonus, penalties } = req.body;
    if (!employeeCode || !monthYear) {
      return res.status(400).json({ success: false, message: 'كود الموظف والشهر مطلوبان', data: null });
    }
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ success: false, message: 'تنسيق الشهر غير صالح، استخدم YYYY-MM', data: null });
    }
    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود', data: null });
    }
    // معالجة المخالفات
    if (totalViolations !== undefined || deductionViolationsInstallment !== undefined) {
      if (totalViolations === undefined || deductionViolationsInstallment === undefined) {
        return res.status(400).json({
          success: false,
          message: 'إجمالي المخالفات وخصم المخالفات مطلوبان',
          data: null,
        });
      }
      if (totalViolations < 0 || deductionViolationsInstallment < 0) {
        return res.status(400).json({
          success: false,
          message: 'قيم المخالفات لا يمكن أن تكون سالبة',
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
      const startDate = new Date(`${monthYear}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      const violations = await Violation.find({
        employeeCode,
        date: { $gte: startDate, $lte: endDate }
      });
      const calculatedTotalViolations = violations.reduce((sum, v) => sum + (v.violationPrice || 0), 0);
      const prevMonth = parseInt(monthYear.split('-')[1]) - 1 < 1
        ? `${parseInt(monthYear.split('-')[0]) - 1}-12`
        : `${monthYear.split('-')[0]}-${(parseInt(monthYear.split('-')[1]) - 1).toString().padStart(2, '0')}`;
      const prevViolationAdjustment = await ViolationAdjustment.findOne({ employeeCode, month: prevMonth });
      const prevRemainingViolations = prevViolationAdjustment ? roundNumber(prevViolationAdjustment.remainingViolations || 0) : 0;
      const violationAdjustment = await ViolationAdjustment.findOneAndUpdate(
        { employeeCode, month: monthYear },
        {
          totalViolations: roundNumber(Number(totalViolations) || calculatedTotalViolations),
          deductionViolationsInstallment: roundNumber(Number(deductionViolationsInstallment) || 0),
          remainingViolations: roundNumber(Number(totalViolations || calculatedTotalViolations) - Number(deductionViolationsInstallment || 0)),
        },
        { upsert: true, new: true }
      );
      user.violationAdjustments = user.violationAdjustments || new Map();
      user.violationAdjustments.set(monthYear, {
        totalViolations: violationAdjustment.totalViolations,
        deductionViolationsInstallment: violationAdjustment.deductionViolationsInstallment,
        remainingViolations: violationAdjustment.remainingViolations,
      });
      user.violationTotal = roundNumber(Number(totalViolations) || calculatedTotalViolations);
      user.violationInstallment = roundNumber(Number(deductionViolationsInstallment) || 0);
      await user.save();
    }
    // معالجة السلف والجزاءات
    if (totalAdvances !== undefined || deductionAdvancesInstallment !== undefined || occasionBonus !== undefined || penalties !== undefined) {
      if (totalAdvances === undefined || deductionAdvancesInstallment === undefined) {
        return res.status(400).json({
          success: false,
          message: 'إجمالي السلف وخصم السلف مطلوبان',
          data: null,
        });
      }
      if (totalAdvances < 0 || deductionAdvancesInstallment < 0 || (penalties !== undefined && penalties < 0)) {
        return res.status(400).json({
          success: false,
          message: 'قيم السلف أو الجزاءات لا يمكن أن تكون سالبة',
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
      const salaryAdjustment = await SalaryAdjustment.findOneAndUpdate(
        { employeeCode, month: monthYear },
        {
          totalAdvances: roundNumber(Number(totalAdvances) || 0),
          deductionAdvancesInstallment: roundNumber(Number(deductionAdvancesInstallment) || 0),
          occasionBonus: roundNumber(Number(occasionBonus) || 0),
          remainingAdvances: roundNumber(Number(totalAdvances) - Number(deductionAdvancesInstallment)),
          mealAllowance: roundNumber(user.mealAllowance || 0),
          mealDeduction: 0,
          penalties: roundNumber(Number(penalties) || 0), // إضافة حقل الجزاءات
        },
        { upsert: true, new: true }
      );
      user.advanceAdjustments = user.advanceAdjustments || new Map();
      user.advanceAdjustments.set(monthYear, {
        totalAdvances: salaryAdjustment.totalAdvances,
        deductionAdvancesInstallment: salaryAdjustment.deductionAdvancesInstallment,
        remainingAdvances: salaryAdjustment.remainingAdvances,
        occasionBonus: salaryAdjustment.occasionBonus,
        mealAllowance: salaryAdjustment.mealAllowance,
        mealDeduction: salaryAdjustment.mealDeduction,
        penalties: salaryAdjustment.penalties, // إضافة حقل الجزاءات
      });
      user.advanceTotal = roundNumber(Number(totalAdvances) || user.advanceTotal || 0);
      user.advanceInstallment = roundNumber(Number(deductionAdvancesInstallment) || user.advanceInstallment || 0);
      user.occasionBonus = roundNumber(Number(occasionBonus) || user.occasionBonus || 0);
      await user.save();
    }
    const violationAdjustment = await ViolationAdjustment.findOne({ employeeCode, month: monthYear });
    const salaryAdjustment = await SalaryAdjustment.findOne({ employeeCode, month: monthYear });
    return res.status(200).json({
      success: true,
      message: 'تم تعديل تعديلات الراتب بنجاح',
      data: {
        totalViolationsFull: roundNumber(violationAdjustment?.totalViolations || 0),
        violationDeduction: roundNumber(violationAdjustment?.deductionViolationsInstallment || 0),
        totalViolations: roundNumber(violationAdjustment?.remainingViolations || 0),
        totalLoansFull: roundNumber(salaryAdjustment?.totalAdvances || 0),
        loanDeduction: roundNumber(salaryAdjustment?.deductionAdvancesInstallment || 0),
        totalLoans: roundNumber(salaryAdjustment?.remainingAdvances || 0),
        occasionBonus: roundNumber(salaryAdjustment?.occasionBonus || 0),
        penalties: roundNumber(salaryAdjustment?.penalties || 0), // إضافة حقل الجزاءات
      },
    });
  } catch (error) {
    console.error('خطأ في updateSalaryAdjustment:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التعديل',
      error: error.message,
      data: null,
    });
  }
});

// باقي نقاط النهاية (بدون تغيير)
router.post('/advances', authenticateToken, async (req, res) => {
  try {
    const { employeeCode, advanceAmount, monthlyInstallment, advanceDate, finalRepaymentDate, installmentMonths } = req.body;
    if (!employeeCode || !advanceAmount || !monthlyInstallment || !advanceDate || !finalRepaymentDate || !installmentMonths) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }
    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    const startDate = new Date(advanceDate);
    const expectedEndDate = new Date(startDate);
    expectedEndDate.setMonth(expectedEndDate.getMonth() + parseInt(installmentMonths));
    expectedEndDate.setDate(0);
    if (new Date(finalRepaymentDate).toISOString().split('T')[0] !== expectedEndDate.toISOString().split('T')[0]) {
      console.warn(`Final repayment date mismatch: provided=${finalRepaymentDate}, expected=${expectedEndDate.toISOString().split('T')[0]}`);
    }
    const advance = new Advance({
      employeeCode,
      employeeName: user.name,
      advanceAmount: roundNumber(advanceAmount),
      monthlyInstallment: roundNumber(monthlyInstallment),
      advanceDate: new Date(advanceDate),
      finalRepaymentDate: new Date(finalRepaymentDate),
      installmentMonths: parseInt(installmentMonths),
      remainingAmount: roundNumber(advanceAmount),
      status: 'active',
      isIncluded: false,
      lastDeductionMonth: null,
      deductionHistory: [],
    });
    await advance.save();
    const yearMonth = advanceDate.toISOString().slice(0, 7);
    let advanceAdjustments = user.advanceAdjustments?.get(yearMonth) || {
      totalAdvances: 0,
      deductionAdvancesInstallment: 0,
      remainingAdvances: 0,
      occasionBonus: 0,
      mealAllowance: user.mealAllowance || 0,
      mealDeduction: 0,
      penalties: 0, // إضافة حقل الجزاءات
    };
    advanceAdjustments.totalAdvances = roundNumber(advanceAdjustments.totalAdvances + advanceAmount);
    advanceAdjustments.deductionAdvancesInstallment = roundNumber(monthlyInstallment);
    advanceAdjustments.remainingAdvances = roundNumber(advanceAdjustments.totalAdvances - monthlyInstallment);
    user.advanceAdjustments = user.advanceAdjustments || new Map();
    user.advanceAdjustments.set(yearMonth, advanceAdjustments);
    user.advanceTotal = roundNumber(advanceAdjustments.totalAdvances);
    user.advanceInstallment = roundNumber(advanceAdjustments.deductionAdvancesInstallment);
    await user.save();
    await SalaryAdjustment.findOneAndUpdate(
      { employeeCode, month: yearMonth },
      advanceAdjustments,
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, message: 'تم إنشاء السلفة بنجاح', data: advance });
  } catch (err) {
    console.error('Error in POST /user/advances:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: `حدث خطأ: ${err.message}` });
  }
});

// تعديل سلفة
router.put('/advances/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { advanceAmount, monthlyInstallment, advanceDate, finalRepaymentDate, installmentMonths } = req.body;
    if (!advanceAmount || !monthlyInstallment || !advanceDate || !finalRepaymentDate || !installmentMonths) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }
    const advance = await Advance.findById(id);
    if (!advance) {
      return res.status(404).json({ success: false, message: 'السلفة غير موجودة' });
    }
    const employeeCode = advance.employeeCode;
    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    const oldAdvanceAmount = roundNumber(advance.advanceAmount || 0);
    const oldMonthlyInstallment = roundNumber(advance.monthlyInstallment || 0);
    const oldYearMonth = advance.advanceDate.toISOString().slice(0, 7);
    const oldRemainingAmount = roundNumber(advance.remainingAmount || 0);
    const newAdvanceAmount = roundNumber(advanceAmount);
    const newMonthlyInstallment = roundNumber(monthlyInstallment);
    const newYearMonth = new Date(advanceDate).toISOString().slice(0, 7);
    const newInstallmentMonths = parseInt(installmentMonths);
    // التحقق من توافق finalRepaymentDate
    const startDate = new Date(advanceDate);
    const expectedEndDate = new Date(startDate);
    expectedEndDate.setMonth(expectedEndDate.getMonth() + newInstallmentMonths);
    expectedEndDate.setDate(0);
    if (new Date(finalRepaymentDate).toISOString().split('T')[0] !== expectedEndDate.toISOString().split('T')[0]) {
      console.warn(`Final repayment date mismatch: provided=${finalRepaymentDate}, expected=${expectedEndDate.toISOString().split('T')[0]}`);
    }
    advance.advanceAmount = newAdvanceAmount;
    advance.monthlyInstallment = newMonthlyInstallment;
    advance.advanceDate = new Date(advanceDate);
    advance.finalRepaymentDate = new Date(finalRepaymentDate);
    advance.installmentMonths = newInstallmentMonths;
    const deductedAmount = roundNumber(oldAdvanceAmount - oldRemainingAmount);
    advance.remainingAmount = roundNumber(newAdvanceAmount - deductedAmount);
    advance.isIncluded = false;
    advance.lastDeductionMonth = null;
    await advance.save();
    console.log(`Updating advance ${id} for ${employeeCode}:`, {
      oldAdvanceAmount,
      oldMonthlyInstallment,
      newAdvanceAmount,
      newMonthlyInstallment,
      oldYearMonth,
      newYearMonth,
      deductedAmount,
      newRemainingAmount: advance.remainingAmount
    });
    // تحديث SalaryAdjustment
    if (oldYearMonth === newYearMonth) {
      let salaryAdjustment = await SalaryAdjustment.findOne({ employeeCode, month: newYearMonth });
      let advanceAdjustments = user.advanceAdjustments?.get(newYearMonth) || {
        totalAdvances: 0,
        deductionAdvancesInstallment: 0,
        remainingAdvances: 0,
        occasionBonus: 0,
        mealAllowance: user.mealAllowance || 0,
        mealDeduction: 0,
        penalties: 0, // إضافة حقل الجزاءات
      };
      const activeAdvances = await Advance.find({
        employeeCode,
        advanceDate: { $lte: new Date(newYearMonth + '-31') },
        finalRepaymentDate: { $gte: new Date(newYearMonth + '-01') },
        status: 'active'
      });
      let totalAdvancesForMonth = 0;
      let totalMonthlyInstallment = 0;
      for (const adv of activeAdvances) {
        const advStartDate = new Date(adv.advanceDate);
        const currentDate = new Date(`${newYearMonth}-01`);
        const monthsPassed = (currentDate.getFullYear() - advStartDate.getFullYear()) * 12 + currentDate.getMonth() - advStartDate.getMonth();
        if (monthsPassed < adv.installmentMonths) {
          totalAdvancesForMonth += roundNumber(adv.remainingAmount || 0);
          totalMonthlyInstallment += roundNumber(adv.monthlyInstallment || 0);
        }
      }
      advanceAdjustments.totalAdvances = roundNumber(totalAdvancesForMonth);
      advanceAdjustments.deductionAdvancesInstallment = roundNumber(totalMonthlyInstallment);
      advanceAdjustments.remainingAdvances = roundNumber(totalAdvancesForMonth - totalMonthlyInstallment);
      user.advanceAdjustments = user.advanceAdjustments || new Map();
      user.advanceAdjustments.set(newYearMonth, advanceAdjustments);
      user.advanceTotal = roundNumber(advanceAdjustments.totalAdvances);
      user.advanceInstallment = roundNumber(advanceAdjustments.deductionAdvancesInstallment);
      await user.save();
      await SalaryAdjustment.findOneAndUpdate(
        { employeeCode, month: newYearMonth },
        advanceAdjustments,
        { upsert: true, new: true }
      );
      console.log(`Updated advance adjustments for ${employeeCode} in ${newYearMonth}:`, advanceAdjustments);
    } else {
      let oldSalaryAdjustment = await SalaryAdjustment.findOne({ employeeCode, month: oldYearMonth });
      if (oldSalaryAdjustment) {
        oldSalaryAdjustment.totalAdvances = 0;
        oldSalaryAdjustment.deductionAdvancesInstallment = 0;
        oldSalaryAdjustment.remainingAdvances = 0;
        await oldSalaryAdjustment.save();
        let oldAdvanceAdjustments = user.advanceAdjustments?.get(oldYearMonth) || {
          totalAdvances: 0,
          deductionAdvancesInstallment: 0,
          remainingAdvances: 0,
          occasionBonus: 0,
          mealAllowance: user.mealAllowance || 0,
          mealDeduction: 0,
          penalties: 0, // إضافة حقل الجزاءات
        };
        oldAdvanceAdjustments.totalAdvances = 0;
        oldAdvanceAdjustments.deductionAdvancesInstallment = 0;
        oldAdvanceAdjustments.remainingAdvances = 0;
        user.advanceAdjustments.set(oldYearMonth, oldAdvanceAdjustments);
        await user.save();
        console.log(`Cleared old advance adjustments for ${employeeCode} in ${oldYearMonth}`);
      }
      let salaryAdjustment = await SalaryAdjustment.findOne({ employeeCode, month: newYearMonth });
      let advanceAdjustments = user.advanceAdjustments?.get(newYearMonth) || {
        totalAdvances: 0,
        deductionAdvancesInstallment: 0,
        remainingAdvances: 0,
        occasionBonus: 0,
        mealAllowance: user.mealAllowance || 0,
        mealDeduction: 0,
        penalties: 0, // إضافة حقل الجزاءات
      };
      const activeAdvances = await Advance.find({
        employeeCode,
        advanceDate: { $lte: new Date(newYearMonth + '-31') },
        finalRepaymentDate: { $gte: new Date(newYearMonth + '-01') },
        status: 'active'
      });
      let totalAdvancesForMonth = 0;
      let totalMonthlyInstallment = 0;
      for (const adv of activeAdvances) {
        const advStartDate = new Date(adv.advanceDate);
        const currentDate = new Date(`${newYearMonth}-01`);
        const monthsPassed = (currentDate.getFullYear() - advStartDate.getFullYear()) * 12 + currentDate.getMonth() - advStartDate.getMonth();
        if (monthsPassed < adv.installmentMonths) {
          totalAdvancesForMonth += roundNumber(adv.remainingAmount || 0);
          totalMonthlyInstallment += roundNumber(adv.monthlyInstallment || 0);
        }
      }
      advanceAdjustments.totalAdvances = roundNumber(totalAdvancesForMonth);
      advanceAdjustments.deductionAdvancesInstallment = roundNumber(totalMonthlyInstallment);
      advanceAdjustments.remainingAdvances = roundNumber(totalAdvancesForMonth - totalMonthlyInstallment);
      user.advanceAdjustments.set(newYearMonth, advanceAdjustments);
      user.advanceTotal = roundNumber(advanceAdjustments.totalAdvances);
      user.advanceInstallment = roundNumber(advanceAdjustments.deductionAdvancesInstallment);
      await user.save();
      await SalaryAdjustment.findOneAndUpdate(
        { employeeCode, month: newYearMonth },
        advanceAdjustments,
        { upsert: true, new: true }
      );
      console.log(`Updated advance adjustments for ${employeeCode} in ${newYearMonth}:`, advanceAdjustments);
    }
    res.json({ success: true, message: 'تم تعديل السلفة بنجاح', data: advance });
  } catch (err) {
    console.error('Error in PUT /user/advances/:id:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: `حدث خطأ: ${err.message}` });
  }
});

// تعديل مخالفة
router.put('/violations/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
    const { id } = req.params;
    const { date, violationPrice, description } = req.body;
    if (!date || !violationPrice) {
      return res.status(400).json({ success: false, message: 'التاريخ وسعر المخالفة مطلوبان' });
    }
    const violation = await Violation.findById(id);
    if (!violation) {
      return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
    }
    const oldYearMonth = violation.date.toISOString().slice(0, 7);
    const newYearMonth = new Date(date).toISOString().slice(0, 7);
    violation.date = new Date(date);
    violation.violationPrice = roundNumber(violationPrice);
    violation.description = description || violation.description;
    await violation.save();
    const employeeCode = violation.employeeCode;
    // تحديث ViolationAdjustment للشهر القديم إذا تغير
    if (oldYearMonth !== newYearMonth) {
      let oldViolationAdjustment = await ViolationAdjustment.findOne({ employeeCode, month: oldYearMonth });
      if (oldViolationAdjustment) {
        const violationsOldMonth = await Violation.find({
          employeeCode,
          date: {
            $gte: new Date(oldYearMonth + '-01'),
            $lte: new Date(new Date(oldYearMonth + '-01').setMonth(new Date(oldYearMonth + '-01').getMonth() + 1) - 1)
          }
        });
        const totalViolationsOldMonth = violationsOldMonth.reduce((sum, v) => sum + (v.violationPrice || 0), 0);
        oldViolationAdjustment.totalViolations = roundNumber(totalViolationsOldMonth);
        oldViolationAdjustment.remainingViolations = roundNumber(totalViolationsOldMonth - oldViolationAdjustment.deductionViolationsInstallment);
        await oldViolationAdjustment.save();
        const user = await User.findOne({ employeeCode });
        user.violationAdjustments.set(oldYearMonth, {
          totalViolations: oldViolationAdjustment.totalViolations,
          deductionViolationsInstallment: oldViolationAdjustment.deductionViolationsInstallment,
          remainingViolations: oldViolationAdjustment.remainingViolations,
        });
        await user.save();
        console.log(`Updated ViolationAdjustment for ${employeeCode} in ${oldYearMonth}`);
      }
    }
    // تحديث ViolationAdjustment للشهر الجديد
    let newViolationAdjustment = await ViolationAdjustment.findOne({ employeeCode, month: newYearMonth });
    const violationsNewMonth = await Violation.find({
      employeeCode,
      date: {
        $gte: new Date(newYearMonth + '-01'),
        $lte: new Date(new Date(newYearMonth + '-01').setMonth(new Date(newYearMonth + '-01').getMonth() + 1) - 1)
      }
    });
    const totalViolationsNewMonth = violationsNewMonth.reduce((sum, v) => sum + (v.violationPrice || 0), 0);
    const prevMonth = parseInt(newYearMonth.split('-')[1]) - 1 < 1
      ? `${parseInt(newYearMonth.split('-')[0]) - 1}-12`
      : `${newYearMonth.split('-')[0]}-${(parseInt(newYearMonth.split('-')[1]) - 1).toString().padStart(2, '0')}`;
    const prevViolationAdjustment = await ViolationAdjustment.findOne({ employeeCode, month: prevMonth });
    const prevRemainingViolations = prevViolationAdjustment ? roundNumber(prevViolationAdjustment.remainingViolations || 0) : 0;
    newViolationAdjustment = await ViolationAdjustment.findOneAndUpdate(
      { employeeCode, month: newYearMonth },
      {
        totalViolations: roundNumber(prevRemainingViolations + totalViolationsNewMonth),
        deductionViolationsInstallment: roundNumber(newViolationAdjustment?.deductionViolationsInstallment || 0),
        remainingViolations: roundNumber(prevRemainingViolations + totalViolationsNewMonth - (newViolationAdjustment?.deductionViolationsInstallment || 0)),
      },
      { upsert: true, new: true }
    );
    const user = await User.findOne({ employeeCode });
    user.violationAdjustments = user.violationAdjustments || new Map();
    user.violationAdjustments.set(newYearMonth, {
      totalViolations: newViolationAdjustment.totalViolations,
      deductionViolationsInstallment: newViolationAdjustment.deductionViolationsInstallment,
      remainingViolations: newViolationAdjustment.remainingViolations,
    });
    user.violationTotal = roundNumber(newViolationAdjustment.totalViolations);
    user.violationInstallment = roundNumber(newViolationAdjustment.deductionViolationsInstallment);
    await user.save();
    console.log(`Updated ViolationAdjustment for ${employeeCode} in ${newYearMonth}`);
    res.json({ success: true, message: 'تم تعديل المخالفة بنجاح', data: violation });
  } catch (err) {
    console.error('Error in PUT /user/violations/:id:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: `حدث خطأ: ${err.message}` });
  }
});

// حذف سلف
router.delete('/advances/:employeeCode', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
    const { employeeCode } = req.params;
    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    const advanceResult = await Advance.deleteMany({ employeeCode });
    user.advanceAdjustments = new Map();
    user.advanceTotal = 0;
    user.advanceInstallment = 0;
    await user.save();
    await SalaryAdjustment.updateMany(
      { employeeCode },
      { $set: { totalAdvances: 0, deductionAdvancesInstallment: 0, remainingAdvances: 0, penalties: 0 } } // إضافة حقل الجزاءات
    );
    res.json({
      success: true,
      message: `تم حذف ${advanceResult.deletedCount} سلفة بنجاح وتحديث جميع السجلات ذات الصلة`
    });
  } catch (err) {
    console.error('Error in DELETE /user/advances/:employeeCode:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: `حدث خطأ: ${err.message}` });
  }
});

// باقي نقاط النهاية
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
    const token = jwt.sign(
      { userId: user._id, employeeCode: user.employeeCode, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        employeeCode: user.employeeCode,
        name: user.name,
        department: user.department,
        role: user.role
      }
    });
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل الدخول', error: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
    const users = await User.find().populate('shiftType');
    res.json(users);
  } catch (err) {
    console.error('Error in GET /user:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.get('/shifts', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
    const shifts = await Shift.find();
    res.json(shifts);
  } catch (err) {
    console.error('Error in GET /shifts:', err);
    res.status(500).json({ success: false, message: `حدث خطأ أثناء جلب الشيفتات: ${err.message}` });
  }
});

router.post('/create', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
    const { password, role, ...otherData } = req.body;
    if (role && !['admin', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, message: 'الدور غير صالح، يجب أن يكون admin أو employee' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ ...otherData, password: hashedPassword, role: role || 'employee' });
    await user.save();
    res.json({ success: true, message: 'تم إنشاء المستخدم بنجاح' });
  } catch (err) {
    console.error('Error in POST /create:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.put('/update/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
    const { password, role, ...otherData } = req.body;
    if (role && !['admin', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, message: 'الدور غير صالح، يجب أن يكون admin أو employee' });
    }
    const updates = {};
    if (otherData.totalSalaryWithAllowances !== undefined) updates.totalSalaryWithAllowances = parseFloat(otherData.totalSalaryWithAllowances) || 0;
    if (otherData.basicSalary !== undefined) updates.basicSalary = parseFloat(otherData.basicSalary) || 0;
    if (otherData.bonusPercentage !== undefined) updates.bonusPercentage = parseFloat(otherData.bonusPercentage) || 0;
    if (otherData.basicBonus !== undefined) updates.basicBonus = parseFloat(otherData.basicBonus) || 0;
    if (otherData.mealAllowance !== undefined) updates.mealAllowance = parseFloat(otherData.mealAllowance) || 0;
    if (otherData.medicalInsurance !== undefined) updates.medicalInsurance = parseFloat(otherData.medicalInsurance) || 0;
    if (otherData.socialInsurance !== undefined) updates.socialInsurance = parseFloat(otherData.socialInsurance) || 0;
    if (otherData.annualLeaveBalance !== undefined) updates.annualLeaveBalance = parseFloat(otherData.annualLeaveBalance) || 0;
    if (role) updates.role = role;
    updates.netSalary = roundNumber(
      (updates.totalSalaryWithAllowances || 0) +
      ((updates.basicBonus || 0) * (updates.bonusPercentage || 0) / 100) +
      (updates.mealAllowance || 0) -
      (updates.medicalInsurance || 0) -
      (updates.socialInsurance || 0)
    );
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }
    await User.findByIdAndUpdate(req.params.id, updates);
    res.json({ success: true, message: 'تم تحديث المستخدم بنجاح' });
  } catch (err) {
    console.error('Error in PUT /update/:id:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.put('/update-many', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
    const { updates, shiftType, excludedUsers, annualIncreasePercentage, basicIncreasePercentage } = req.body;
    let filter = shiftType ? { shiftType } : {};
    if (excludedUsers && excludedUsers.length > 0) {
      filter._id = { $nin: excludedUsers };
    }
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
      return res.json({ success: true, message: 'تم تحديث الرواتب السنوية بنجاح' });
    }
    if (basicIncreasePercentage !== undefined && !isNaN(basicIncreasePercentage)) {
      const users = await User.find(filter);
      for (const user of users) {
        const currentBasicSalary = user.basicSalary || 0;
        const newBasicSalary = roundNumber(currentBasicSalary * (1 + parseFloat(basicIncreasePercentage) / 100));
        await User.findByIdAndUpdate(user._id, {
          basicSalary: newBasicSalary,
        });
      }
      return res.json({ success: true, message: 'تم تحديث الرواتب الأساسية بنجاح' });
    }
    const sanitizedUpdates = {};
    if (updates?.bonusPercentage !== undefined) sanitizedUpdates.bonusPercentage = parseFloat(updates.bonusPercentage) || 0;
    if (updates?.basicBonus !== undefined) sanitizedUpdates.basicBonus = parseFloat(updates.basicBonus) || 0;
    if (updates?.mealAllowance !== undefined) sanitizedUpdates.mealAllowance = parseFloat(updates.mealAllowance) || 0;
    if (updates?.medicalInsurance !== undefined) sanitizedUpdates.medicalInsurance = parseFloat(updates.medicalInsurance) || 0;
    if (updates?.socialInsurance !== undefined) sanitizedUpdates.socialInsurance = parseFloat(updates.socialInsurance) || 0;
    if (updates?.annualLeaveBalance !== undefined) sanitizedUpdates.annualLeaveBalance = parseFloat(updates.annualLeaveBalance) || 0;
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
      await User.updateMany(filter, { $set: sanitizedUpdates });
    }
    res.json({ success: true, message: 'تم تحديث المستخدمين بنجاح' });
  } catch (err) {
    console.error('Error in PUT /update-many:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.delete('/delete/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    console.error('Error in DELETE /delete/:id:', err);
    res.status(500).json({ success: false, message: `حدث خطأ أثناء الحذف: ${err.message}` });
  }
});

router.put('/update-bonus-adjustment/:employeeCode/:monthYear', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'ممنوع: يتطلب صلاحية أدمن' });
    }
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

router.get('/monthly-bonus-report', authenticateToken, async (req, res) => {
  try {
    const { yearMonth, employeeCode, shiftId } = req.query;
    const userRole = req.user.role;
    const currentEmployeeCode = req.user.employeeCode;
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
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, message: 'تاريخ غير صالح' });
    }
    let userFilter = {};
    if (userRole === 'employee') {
      userFilter.employeeCode = currentEmployeeCode;
    } else if (userRole === 'admin') {
      if (employeeCode) userFilter.employeeCode = employeeCode;
      if (shiftId) userFilter.shiftType = shiftId;
    } else {
      return res.status(403).json({ success: false, message: 'دور المستخدم غير صالح' });
    }
    const users = await User.find(userFilter).populate('shiftType');
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'لا يوجد موظفين بهذا الكود أو الشيفت' });
    }
    const reports = [];
    for (const user of users) {
      if (!user.shiftType || !user.shiftType._id || !user.shiftType.shiftName) {
        console.warn(`User ${user.employeeCode} has no valid shiftType`);
        continue;
      }
      const shift = user.shiftType;
      const attendanceQuery = {
        employeeCode: user.employeeCode,
        date: { $gte: startDateStr, $lte: endDateStr },
        attendanceStatus: { $in: ['حاضر', 'متأخر'] }
      };
      const attendances = await Attendance.find(attendanceQuery);
      let totalAttendanceDays = attendances.length;
      const deductedDaysQuery = {
        employeeCode: user.employeeCode,
        date: { $gte: startDateStr, $lte: endDateStr },
        deductedDays: { $gt: 0 }
      };
      const deductedDaysRecords = await Attendance.find(deductedDaysQuery).sort({ date: 1 });
      let totalDeductedDays = 0;
      const processedDates = new Set();
      for (const record of deductedDaysRecords) {
        let recordDate;
        if (record.date instanceof Date) {
          recordDate = record.date.toISOString().split('T')[0];
        } else if (typeof record.date === 'string') {
          recordDate = record.date;
        } else {
          console.warn(`Invalid date format for record: ${record._id}, skipping`);
          continue;
        }
        if (processedDates.has(recordDate)) {
          continue;
        }
        processedDates.add(recordDate);
        if (record.deductedDays && record.deductedDays > 0) {
          totalDeductedDays += record.deductedDays;
        }
      }
      const adjustment = await BonusAdjustment.findOne({ employeeCode: user.employeeCode, monthYear: yearMonth }) || {
        bindingValue: 0,
        productionValue: 0
      };
      const basicBonus = roundNumber(user.basicBonus || 2000);
      const bonusPercentage = roundNumber(user.bonusPercentage || 50);
      const bonusValue = roundNumber(basicBonus * (bonusPercentage / 100));
      const dailyBonusRate = roundNumber(bonusValue / 30);
      const deductionAmount = roundNumber(totalDeductedDays * dailyBonusRate);
      const totalDeductions = deductionAmount;
      const netBonus = roundNumber(bonusValue + adjustment.bindingValue + adjustment.productionValue - totalDeductions);
      reports.push({
        employeeCode: user.employeeCode,
        name: user.name || 'غير متوفر',
        basicBonus,
        shiftType: shift.shiftName,
        bonusPercentage,
        totalAttendanceDays,
        totalDeductedDays: roundNumber(totalDeductedDays, 2),
        totalDeductions,
        bindingValue: roundNumber(adjustment.bindingValue),
        productionValue: roundNumber(adjustment.productionValue),
        netBonus
      });
    }
    res.status(200).json({
      success: true,
      message: 'تم جلب تقرير الحافز الشهري بنجاح',
      data: reports
    });
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
