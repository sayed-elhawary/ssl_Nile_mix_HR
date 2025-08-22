const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Violation = require('../models/Violation');
const User = require('../models/User');

// إعداد Multer لرفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// دالة لتحديث totalViolations في salaryAdjustments
const updateUserViolations = async (employeeCode, violationPrice, date, operation = 'add') => {
  try {
    const user = await User.findOne({ employeeCode });
    if (!user) {
      throw new Error('الموظف غير موجود');
    }

    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!user.salaryAdjustments) {
      user.salaryAdjustments = new Map();
    }

    const currentAdjustments = user.salaryAdjustments.get(monthYear) || {
      totalViolations: 0,
      deductionViolationsInstallment: 0,
      totalAdvances: 0,
      deductionAdvancesInstallment: 0,
      occasionBonus: 0,
      mealAllowance: user.mealAllowance || 0,
      mealDeduction: 0
    };

    if (operation === 'add') {
      currentAdjustments.totalViolations = (currentAdjustments.totalViolations || 0) + violationPrice;
    } else if (operation === 'subtract') {
      currentAdjustments.totalViolations = Math.max(0, (currentAdjustments.totalViolations || 0) - violationPrice);
    }

    user.salaryAdjustments.set(monthYear, currentAdjustments);
    user.violationTotal = (user.violationTotal || 0) + (operation === 'add' ? violationPrice : -violationPrice);
    await user.save();
  } catch (error) {
    console.error('خطأ في تحديث totalViolations:', error);
    throw error;
  }
};

// جلب جميع المخالفات
router.get('/', async (req, res) => {
  try {
    const violations = await Violation.find();
    res.json({ success: true, data: violations });
  } catch (error) {
    console.error('خطأ في جلب المخالفات:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب المخالفات', error: error.message });
  }
});

// جلب بيانات الموظف بناءً على كود الموظف
router.get('/employee/:employeeCode', async (req, res) => {
  try {
    const user = await User.findOne({ employeeCode: req.params.employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    res.json({ success: true, data: { name: user.name, department: user.department } });
  } catch (error) {
    console.error('خطأ في جلب بيانات الموظف:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب بيانات الموظف', error: error.message });
  }
});

// إنشاء مخالفة جديدة
router.post('/', upload.single('violationImage'), async (req, res) => {
  try {
    const { employeeCode, employeeName, department, violationPrice, date, vehicleCode, station } = req.body;
    if (!employeeCode || !employeeName || !violationPrice || !date || !vehicleCode || !station) {
      return res.status(400).json({ success: false, message: 'جميع الحقول المطلوبة يجب أن تُعبأ' });
    }

    const violation = new Violation({
      employeeCode,
      employeeName,
      department,
      violationPrice: parseFloat(violationPrice),
      date: new Date(date),
      vehicleCode,
      station,
      violationImage: req.file ? `/Uploads/${req.file.filename}` : null
    });

    await violation.save();

    // تحديث totalViolations في salaryAdjustments
    await updateUserViolations(employeeCode, parseFloat(violationPrice), new Date(date), 'add');

    res.json({ success: true, message: 'تم إضافة المخالفة بنجاح' });
  } catch (error) {
    console.error('خطأ في إنشاء المخالفة:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء المخالفة', error: error.message });
  }
});

// تعديل مخالفة
router.put('/:id', upload.single('violationImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeCode, employeeName, department, violationPrice, date, vehicleCode, station } = req.body;

    const violation = await Violation.findById(id);
    if (!violation) {
      return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
    }

    const oldViolationPrice = violation.violationPrice;
    const newViolationPrice = parseFloat(violationPrice);
    const violationDate = new Date(date || violation.date);

    violation.employeeCode = employeeCode || violation.employeeCode;
    violation.employeeName = employeeName || violation.employeeName;
    violation.department = department || violation.department;
    violation.violationPrice = newViolationPrice;
    violation.date = violationDate;
    violation.vehicleCode = vehicleCode || violation.vehicleCode;
    violation.station = station || violation.station;
    if (req.file) {
      violation.violationImage = `/Uploads/${req.file.filename}`;
    }

    await violation.save();

    // تحديث totalViolations إذا تغير سعر المخالفة
    if (oldViolationPrice !== newViolationPrice) {
      const priceDifference = newViolationPrice - oldViolationPrice;
      await updateUserViolations(employeeCode || violation.employeeCode, priceDifference, violationDate, 'add');
    }

    res.json({ success: true, message: 'تم تعديل المخالفة بنجاح' });
  } catch (error) {
    console.error('خطأ في تعديل المخالفة:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تعديل المخالفة', error: error.message });
  }
});

// حذف مخالفة
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const violation = await Violation.findById(id);
    if (!violation) {
      return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
    }

    // طرح سعر المخالفة من totalViolations
    await updateUserViolations(violation.employeeCode, violation.violationPrice, violation.date, 'subtract');
    await Violation.findByIdAndDelete(id);

    res.json({ success: true, message: 'تم حذف المخالفة بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف المخالفة:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف المخالفة', error: error.message });
  }
});

module.exports = router;
