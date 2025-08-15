const express = require('express');
const router = express.Router();
const {
  uploadAttendance,
  getAttendance,
  deleteAllAttendance,
  updateAttendance,
  applyOfficialLeave,
  applyAnnualLeave,
  applySickLeave,
  getMonthlySalaryReport, // إضافة الدالة الجديدة
} = require('../controllers/attendance');
const Shift = require('../models/Shift');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('file'), uploadAttendance);
router.get('/', getAttendance);
router.delete('/delete-all', deleteAllAttendance);
router.patch('/:id', updateAttendance);
router.post('/official-leave', applyOfficialLeave);
router.post('/annual-leave', applyAnnualLeave);
router.post('/sick-leave', applySickLeave);
router.get('/monthly-salary-report', getMonthlySalaryReport); // الـ endpoint الجديد

router.post('/reset-grace-period', async (req, res) => {
  try {
    const { shiftId, employeeCode, applyToAll, customGracePeriod, resetMonth } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'التوكن غير موجود' });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'انتهت صلاحية التوكن، يرجى تسجيل الدخول مرة أخرى' });
      }
      return res.status(401).json({ success: false, message: 'التوكن غير صالح', error: err.message });
    }

    let gracePeriodValue = 120; // Default grace period in minutes (fallback)
    if (customGracePeriod) {
      if (Number(customGracePeriod) <= 0) {
        return res.status(400).json({ success: false, message: 'عدد الدقائق يجب أن يكون قيمة إيجابية' });
      }
      gracePeriodValue = Number(customGracePeriod);
    } else if (shiftId) {
      const shift = await Shift.findById(shiftId);
      if (!shift) {
        return res.status(404).json({ success: false, message: 'الشيفت غير موجود' });
      }
      gracePeriodValue = shift.gracePeriod;
    }

    // Define the filter based on input
    let filter = {};
    if (applyToAll) {
      filter = {};
    } else if (employeeCode) {
      filter.employeeCode = employeeCode;
      if (shiftId) {
        filter.shiftId = shiftId;
      }
    } else if (shiftId) {
      filter.shiftId = shiftId;
    } else {
      return res.status(400).json({ success: false, message: 'يرجى تحديد شيفت أو كود موظف أو تطبيق على الجميع' });
    }

    // Determine the date range based on resetMonth or current month
    let startOfMonth, endOfMonth;
    if (resetMonth) {
      const [year, month] = resetMonth.split('-').map(Number);
      startOfMonth = new Date(year, month - 1, 1);
      endOfMonth = new Date(year, month, 0);
    } else {
      const currentDate = new Date();
      startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }

    const attendanceFilter = {
      ...filter,
      date: {
        $gte: startOfMonth.toISOString().split('T')[0],
        $lte: endOfMonth.toISOString().split('T')[0],
      },
    };

    // Update remainingGracePeriod for matching records in Attendance
    const attendanceUpdateResult = await Attendance.updateMany(attendanceFilter, {
      $set: { remainingGracePeriod: gracePeriodValue },
    });

    // Update User model as well for consistency (only if current month)
    let userFilter = {};
    if (applyToAll) {
      userFilter = {};
    } else if (employeeCode) {
      userFilter.employeeCode = employeeCode;
    } else if (shiftId) {
      userFilter.shiftType = shiftId; // Assuming shiftType in User is shiftId
    }

    const currentDate = new Date();
    const currentMonthStr = currentDate.toISOString().slice(0, 7);
    if (resetMonth === currentMonthStr || !resetMonth) {
      const userUpdateResult = await User.updateMany(userFilter, {
        $set: { remainingGracePeriod: gracePeriodValue },
      });
      res.json({
        success: true,
        message: `تم إعادة تعيين فترة السماح إلى ${gracePeriodValue} دقيقة لـ ${attendanceUpdateResult.modifiedCount} سجل حضور و ${userUpdateResult.modifiedCount} مستخدم`,
      });
    } else {
      res.json({
        success: true,
        message: `تم إعادة تعيين فترة السماح إلى ${gracePeriodValue} دقيقة لـ ${attendanceUpdateResult.modifiedCount} سجل حضور (شهر سابق، مش هيحدث User)`,
      });
    }
  } catch (err) {
    console.error('Error in POST /reset-grace-period:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ، حاول مرة أخرى', error: err.message });
  }
});

module.exports = router;
