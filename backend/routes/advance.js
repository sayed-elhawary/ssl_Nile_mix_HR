const express = require('express');
const router = express.Router();
const Advance = require('../models/Advance');
const User = require('../models/User');
const SalaryAdjustment = require('../models/SalaryAdjustment');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
// دالة للتحقق من دور الأدمن
const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'التوكن غير موجود' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    if (!['admin', 'Admin', 'ADMIN'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'يجب أن تكون أدمن لتنفيذ هذا الإجراء' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'انتهت صلاحية التوكن' });
    }
    return res.status(401).json({ success: false, message: 'التوكن غير صالح', error: err.message });
  }
};
// دالة للتحقق من صيغة التاريخ (YYYY-MM) - تعديل هنا
const isValidDateFormat = (dateString) => {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const [year, month] = dateString.split('-').map(Number);
  if (month < 1 || month > 12) return false;
  const date = new Date(`${dateString}-01`);
  return !isNaN(date.getTime());
};
// دالة لحساب finalRepaymentDate بناءً على advanceDate و installmentMonths - تعديل لدعم YYYY-MM
const calculateFinalRepaymentDate = (advanceDate, installmentMonths) => {
  const fullDate = `${advanceDate}-01`; // إضافة -01
  const date = new Date(fullDate);
  date.setMonth(date.getMonth() + parseInt(installmentMonths));
  date.setDate(1);
  return date.toISOString().split('T')[0];
};
// دالة لحساب قائمة الأشهر بين advanceDate و finalRepaymentDate - تعديل لدعم YYYY-MM
const getMonthsInRange = (startDate, installmentMonths) => {
  const months = [];
  const fullStartDate = `${startDate}-01`; // إضافة -01
  const current = new Date(fullStartDate);
  for (let i = 0; i < parseInt(installmentMonths); i++) {
    months.push(`${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months;
};
// دالة لتحديث SalaryAdjustment و User.salaryAdjustments عند الإنشاء أو التعديل
const updateSalaryAdjustments = async (employeeCode, advanceAmount, monthlyInstallment, advanceDate, installmentMonths) => {
  try {
    const user = await User.findOne({ employeeCode });
    if (!user) {
      throw new Error('المستخدم غير موجود');
    }
    const months = getMonthsInRange(advanceDate, installmentMonths);
    const salaryAdjustments = user.salaryAdjustments || new Map();
    for (const month of months) {
      const existingAdjustment = salaryAdjustments.get(month) || {
        totalViolations: 0,
        deductionViolationsInstallment: 0,
        totalAdvances: 0,
        deductionAdvancesInstallment: 0,
        occasionBonus: 0,
        remainingViolations: 0,
        remainingAdvances: 0,
      };
      const updatedTotalAdvances = Number(existingAdjustment.totalAdvances || 0) + Number(advanceAmount);
      const updatedDeductionAdvances = Number(existingAdjustment.deductionAdvancesInstallment || 0) + Number(monthlyInstallment);
      const remainingAdvances = updatedTotalAdvances - updatedDeductionAdvances;
      // تحديث User.salaryAdjustments
      salaryAdjustments.set(month, {
        ...existingAdjustment,
        totalAdvances: updatedTotalAdvances,
        deductionAdvancesInstallment: updatedDeductionAdvances,
        remainingAdvances,
      });
      // تحديث SalaryAdjustment
      await SalaryAdjustment.findOneAndUpdate(
        { employeeCode, month },
        {
          employeeCode,
          month,
          totalViolations: existingAdjustment.totalViolations,
          deductionViolationsInstallment: existingAdjustment.deductionViolationsInstallment,
          totalAdvances: updatedTotalAdvances,
          deductionAdvancesInstallment: updatedDeductionAdvances,
          occasionBonus: existingAdjustment.occasionBonus,
          remainingViolations: existingAdjustment.remainingViolations,
          remainingAdvances,
        },
        { upsert: true, new: true }
      );
    }
    user.salaryAdjustments = salaryAdjustments;
    await user.save();
  } catch (err) {
    console.error('Error updating salary adjustments:', err.message);
    throw err;
  }
};
// دالة لإزالة التعديلات المرتبطة بالسلفة عند الحذف
const removeSalaryAdjustments = async (employeeCode, advanceAmount, monthlyInstallment, advanceDate, installmentMonths) => {
  try {
    const user = await User.findOne({ employeeCode });
    if (!user) {
      throw new Error('المستخدم غير موجود');
    }
    const months = getMonthsInRange(advanceDate, installmentMonths);
    const salaryAdjustments = user.salaryAdjustments || new Map();
    for (const month of months) {
      const existingAdjustment = salaryAdjustments.get(month) || {
        totalViolations: 0,
        deductionViolationsInstallment: 0,
        totalAdvances: 0,
        deductionAdvancesInstallment: 0,
        occasionBonus: 0,
        remainingViolations: 0,
        remainingAdvances: 0,
      };
      const updatedTotalAdvances = Number(existingAdjustment.totalAdvances || 0) - Number(advanceAmount);
      const updatedDeductionAdvances = Number(existingAdjustment.deductionAdvancesInstallment || 0) - Number(monthlyInstallment);
      const remainingAdvances = updatedTotalAdvances - updatedDeductionAdvances;
      // تحديث User.salaryAdjustments
      salaryAdjustments.set(month, {
        ...existingAdjustment,
        totalAdvances: updatedTotalAdvances >= 0 ? updatedTotalAdvances : 0,
        deductionAdvancesInstallment: updatedDeductionAdvances >= 0 ? updatedDeductionAdvances : 0,
        remainingAdvances: remainingAdvances >= 0 ? remainingAdvances : 0,
      });
      // تحديث SalaryAdjustment
      await SalaryAdjustment.findOneAndUpdate(
        { employeeCode, month },
        {
          employeeCode,
          month,
          totalViolations: existingAdjustment.totalViolations,
          deductionViolationsInstallment: existingAdjustment.deductionViolationsInstallment,
          totalAdvances: updatedTotalAdvances >= 0 ? updatedTotalAdvances : 0,
          deductionAdvancesInstallment: updatedDeductionAdvances >= 0 ? updatedDeductionAdvances : 0,
          occasionBonus: existingAdjustment.occasionBonus,
          remainingViolations: existingAdjustment.remainingViolations,
          remainingAdvances: remainingAdvances >= 0 ? remainingAdvances : 0,
        },
        { upsert: true, new: true }
      );
    }
    user.salaryAdjustments = salaryAdjustments;
    await user.save();
  } catch (err) {
    console.error('Error removing salary adjustments:', err.message);
    throw err;
  }
};
// البحث عن موظف
router.get('/search-employee', async (req, res) => {
  try {
    const { employeeCode } = req.query;
    if (!employeeCode) {
      return res.status(400).json({ success: false, message: 'كود الموظف مطلوب' });
    }
    const user = await User.findOne({ employeeCode }).select('employeeCode name');
    if (!user) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    res.json({ success: true, employee: { employeeCode: user.employeeCode, name: user.name } });
  } catch (err) {
    console.error('Error in GET /advance/search-employee:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء البحث', error: err.message });
  }
});
// إنشاء سلفة جديدة - تعديل لدعم YYYY-MM
router.post('/create', verifyAdmin, async (req, res) => {
  try {
    let { employeeCode, employeeName, advanceAmount, advanceDate, installmentMonths } = req.body;
    if (!employeeCode || !employeeName || !advanceAmount || !advanceDate || !installmentMonths) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }
    if (parseFloat(advanceAmount) <= 0 || parseInt(installmentMonths) <= 0) {
      return res.status(400).json({ success: false, message: 'قيمة السلفة وعدد الأشهر يجب أن تكونا إيجابيين' });
    }
    if (!isValidDateFormat(advanceDate)) {
      return res.status(400).json({ success: false, message: 'تاريخ السلفة غير صالح، استخدم صيغة YYYY-MM' });
    }
    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    // إضافة -01 لتحويل إلى تاريخ كامل
    const fullAdvanceDate = `${advanceDate}-01`;
    advanceDate = new Date(fullAdvanceDate);
    const monthlyInstallment = parseFloat(advanceAmount) / parseInt(installmentMonths);
    const finalRepaymentDate = calculateFinalRepaymentDate(req.body.advanceDate, installmentMonths); // استخدم الـ YYYY-MM الأصلي
    const advance = new Advance({
      employeeCode,
      employeeName,
      advanceAmount,
      advanceDate,
      installmentMonths,
      monthlyInstallment,
      remainingAmount: advanceAmount,
      finalRepaymentDate: new Date(finalRepaymentDate),
      status: 'active',
    });
    await advance.save();
    // تحديث SalaryAdjustment و User.salaryAdjustments - استخدم الـ YYYY-MM الأصلي
    await updateSalaryAdjustments(employeeCode, advanceAmount, monthlyInstallment, req.body.advanceDate, installmentMonths);
    res.status(201).json({ success: true, message: 'تم تسجيل السلفة بنجاح', advance });
  } catch (err) {
    console.error('Error in POST /advance/create:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل السلفة', error: err.message });
  }
});
// جلب جميع السلف
router.get('/advances', verifyAdmin, async (req, res) => {
  try {
    const advances = await Advance.find();
    res.json({ success: true, advances });
  } catch (err) {
    console.error('Error in GET /advances:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب السلف', error: err.message });
  }
});
// تحديث سلفة - تعديل لدعم YYYY-MM
router.put('/update/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let { advanceAmount, advanceDate, installmentMonths, status } = req.body;
    if (!advanceAmount || !advanceDate || !installmentMonths) {
      return res.status(400).json({ success: false, message: 'جميع الحقول (قيمة السلفة، تاريخ السلفة، عدد الأشهر) مطلوبة' });
    }
    if (parseFloat(advanceAmount) <= 0 || parseInt(installmentMonths) <= 0) {
      return res.status(400).json({ success: false, message: 'قيمة السلفة وعدد الأشهر يجب أن تكونا إيجابيين' });
    }
    if (!isValidDateFormat(advanceDate)) {
      return res.status(400).json({ success: false, message: 'تاريخ السلفة غير صالح، استخدم صيغة YYYY-MM' });
    }
    if (status && !['active', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'الحالة يجب أن تكون إما active أو completed' });
    }
    const advance = await Advance.findById(id);
    if (!advance) {
      return res.status(404).json({ success: false, message: 'السلفة غير موجودة' });
    }
    // إضافة -01 لتحويل إلى تاريخ كامل
    const fullAdvanceDate = `${advanceDate}-01`;
    advanceDate = new Date(fullAdvanceDate);
    const monthlyInstallment = parseFloat(advanceAmount) / parseInt(installmentMonths);
    const finalRepaymentDate = calculateFinalRepaymentDate(req.body.advanceDate, installmentMonths); // استخدم الـ YYYY-MM الأصلي
    advance.advanceAmount = advanceAmount;
    advance.advanceDate = advanceDate;
    advance.installmentMonths = installmentMonths;
    advance.monthlyInstallment = monthlyInstallment;
    advance.remainingAmount = advanceAmount;
    advance.finalRepaymentDate = new Date(finalRepaymentDate);
    if (status) advance.status = status;
    await advance.save();
    // تحديث SalaryAdjustment و User.salaryAdjustments - استخدم الـ YYYY-MM الأصلي
    await updateSalaryAdjustments(advance.employeeCode, advanceAmount, monthlyInstallment, req.body.advanceDate, installmentMonths);
    res.json({ success: true, message: 'تم تعديل السلفة بنجاح', advance });
  } catch (err) {
    console.error('Error in PUT /advance/update:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تعديل السلفة', error: err.message });
  }
});
// حذف سلفة
router.delete('/delete/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const advance = await Advance.findById(id);
    if (!advance) {
      return res.status(404).json({ success: false, message: 'السلفة غير موجودة' });
    }
    // إزالة التعديلات المرتبطة بالسلفة - استخدم advance.advanceDate.toISOString().slice(0,7) للحصول على YYYY-MM
    await removeSalaryAdjustments(
      advance.employeeCode,
      advance.advanceAmount,
      advance.monthlyInstallment,
      advance.advanceDate.toISOString().slice(0,7),
      advance.installmentMonths
    );
    // حذف السلفة
    await Advance.deleteOne({ _id: id });
    res.json({ success: true, message: 'تم حذف السلفة بنجاح' });
  } catch (err) {
    console.error('Error in DELETE /advance/delete:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف السلفة', error: err.message });
  }
});
module.exports = router;
