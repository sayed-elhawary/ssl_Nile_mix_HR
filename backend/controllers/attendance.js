const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Shift = require('../models/Shift');
const xlsx = require('xlsx');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// دالة لتحليل التاريخ
const parseDate = (dateString) => {
  try {
    let date;
    if (typeof dateString === 'string' && /AM|PM/i.test(dateString)) {
      date = new Date(dateString.replace(/(\d{1,2}:\d{2}:\d{2})(\s?(AM|PM))/i, (match, time, _, period) => {
        let [hours, minutes, seconds] = time.split(':').map(Number);
        if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }));
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date)) {
      console.log(`تنسيق التاريخ غير صالح: ${dateString}`);
      return null;
    }
    return date;
  } catch (err) {
    console.log(`خطأ في تحليل التاريخ: ${dateString}, الخطأ: ${err.message}`);
    return null;
  }
};

// دالة لتنسيق الوقت
const formatTime = (date) => {
  return date.toTimeString().split(' ')[0].slice(0, 5);
};

// دالة للحصول على جميع التواريخ في نطاق معين
const getAllDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  let end = new Date(endDate);
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

// دالة للتحقق مما إذا كان اليوم إجازة أسبوعية
const isWeeklyOffDay = (date, workDays) => {
  const dayOfWeek = new Date(date).toLocaleString('ar-EG', { weekday: 'long' });
  return !workDays.includes(dayOfWeek);
};

// دالة للتحقق مما إذا كان الشيفت يمتد ليومين
const isShiftCrossDay = (shift) => {
  return shift.isCrossDay || shift.shiftType === '24/24' || shift.shiftType === 'evening';
};

// دالة لحساب مدة العمل بالساعات
const calculateDurationHours = (checkIn, checkOut, checkInDate, checkOutDate) => {
  if (!checkIn || !checkOut) return 0;
  const checkInTime = new Date(`${checkInDate}T${checkIn}:00`);
  const checkOutTime = new Date(`${checkOutDate}T${checkOut}:00`);
  let durationMs = checkOutTime - checkInTime;
  if (durationMs < 0) {
    durationMs += 24 * 60 * 60 * 1000;
  }
  return durationMs / (1000 * 60 * 60);
};

// دالة لحساب الخصومات والتأخيرات
const calculateDeductions = (shift, checkInTime, checkOutTime, checkInDate, checkOutDate, remainingGracePeriod, leaveAllowance) => {
  let deductedDays = 0;
  let deductedHours = 0;
  let delayMinutes = 0;
  let overtimeHours = 0;
  let newCheckIn = null;

  const baseHours = shift.baseHours || 9;
  const maxOvertimeHours = shift.maxOvertimeHours || (shift.shiftType === '24/24' ? 21 : 5);
  const maxDuration = baseHours + maxOvertimeHours;
  const shiftStartTime = shift.startTime || '08:30';
  const shiftEndTime = shift.endTime || '17:30';
  const gracePeriod = shift.gracePeriod || 0;

  if (remainingGracePeriod === null || isNaN(remainingGracePeriod)) {
    remainingGracePeriod = gracePeriod;
  }

  if (!checkInTime && !checkOutTime) {
    return { deductedDays: 1, deductedHours: 0, delayMinutes: 0, overtimeHours: 0, remainingGracePeriod, newCheckIn };
  }

  if (checkInTime && !checkOutTime) {
    deductedHours = baseHours;
  }

  if (!checkInTime && checkOutTime) {
    const checkOut = new Date(`${checkOutDate}T${checkOutTime}:00`);
    const checkIn = new Date(checkOut.getTime() - baseHours * 60 * 60 * 1000);
    checkInTime = formatTime(checkIn);
    checkInDate = checkIn.toISOString().split('T')[0];
  }

  const checkIn = new Date(`${checkInDate}T${checkInTime}:00`);
  const checkOut = checkOutTime ? new Date(`${checkOutDate}T${checkOutTime}:00`) : null;

  if (shift.shiftType === 'morning') {
    const [shiftStartHour, shiftStartMinute] = shiftStartTime.split(':').map(Number);
    const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number);
    const shiftStartMinutes = shiftStartHour * 60 + shiftStartMinute;
    const checkInMinutes = checkInHour * 60 + checkInMinute;
    delayMinutes = Math.max(0, checkInMinutes - shiftStartMinutes);

    let appliedDeduction = null;
    const checkInTimeObj = new Date(`2025-01-01T${checkInTime}:00`);
    const deductionStartTime = new Date(`2025-01-01T09:15:00`);

    if (checkInTimeObj < deductionStartTime) {
      delayMinutes = 0;
    } else {
      for (const deduction of shift.deductions || []) {
        let dedStart = new Date(`2025-01-01T${deduction.start}:00`);
        let dedEnd = new Date(`2025-01-01T${deduction.end}:00`);
        if (shift.isCrossDay && dedEnd <= dedStart) {
          dedEnd.setDate(dedEnd.getDate() + 1);
        }
        if (checkInTimeObj >= dedStart && checkInTimeObj <= dedEnd) {
          appliedDeduction = deduction;
          break;
        }
      }

      if (appliedDeduction) {
        if (delayMinutes <= remainingGracePeriod) {
          remainingGracePeriod -= delayMinutes;
          deductedDays = 0;
        } else {
          remainingGracePeriod = 0;
          switch (appliedDeduction.type) {
            case 'quarter':
              deductedDays = 0.25;
              break;
            case 'half':
              deductedDays = 0.5;
              break;
            case 'full':
              deductedDays = 1;
              break;
            case 'minutes':
              deductedHours = delayMinutes / 60;
              break;
            default:
              deductedDays = 0;
          }
        }
      } else {
        if (delayMinutes <= remainingGracePeriod) {
          remainingGracePeriod -= delayMinutes;
          deductedDays = 0;
        } else {
          delayMinutes -= remainingGracePeriod;
          remainingGracePeriod = 0;
          deductedHours = delayMinutes / 60;
        }
      }
    }

    if (checkOut) {
      let shiftEnd = new Date(`${checkInDate}T${shiftEndTime}:00`);
      const durationHours = calculateDurationHours(checkInTime, checkOutTime, checkInDate, checkOutDate);
      if (leaveAllowance === 'نعم') {
        overtimeHours = durationHours * 2;
      } else if (durationHours > maxDuration) {
        newCheckIn = { time: checkOutTime, date: checkOutDate };
        overtimeHours = maxOvertimeHours;
      } else if (durationHours > baseHours) {
        overtimeHours = Math.min(durationHours - baseHours, maxOvertimeHours);
      }
      if (durationHours < baseHours && checkOutTime) {
        const missingMinutes = (baseHours - durationHours) * 60;
        deductedHours = missingMinutes / 60;
      }
    }
  } else if (shift.shiftType === 'evening' || shift.shiftType === '24/24') {
    if (checkOut) {
      const durationHours = calculateDurationHours(checkInTime, checkOutTime, checkInDate, checkOutDate);
      if (leaveAllowance === 'نعم') {
        overtimeHours = durationHours * 2;
      } else if (durationHours > maxDuration) {
        newCheckIn = { time: checkOutTime, date: checkOutDate };
        overtimeHours = maxOvertimeHours;
      } else if (durationHours > baseHours) {
        overtimeHours = Math.min(durationHours - baseHours, maxOvertimeHours);
      }
      if (durationHours < baseHours) {
        const missingMinutes = (baseHours - durationHours) * 60;
        deductedHours = missingMinutes / 60;
      }
    } else {
      deductedHours = baseHours;
    }
  }

  return { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod, newCheckIn };
};

// دالة مساعدة لتحديث leaveBalance في جميع سجلات الحضور لموظف معين
const updateAllAttendanceLeaveBalance = async (employeeCode, newLeaveBalance) => {
  try {
    await Attendance.updateMany(
      { employeeCode },
      { $set: { leaveBalance: newLeaveBalance } }
    );
  } catch (error) {
    console.error(`خطأ في تحديث leaveBalance للموظف ${employeeCode}:`, error.stack);
    throw error;
  }
};

// دالة لرفع سجلات الحضور
exports.uploadAttendance = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: 'فشل الاتصال بقاعدة البيانات', error: 'MongoDB غير متصل' });
    }

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

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'يرجى رفع ملف البصمة' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    const processedData = [];
    jsonData
      .map((row) => ({
        employeeCode: row['No.']?.toString(),
        dateTime: row['Date/Time'] ? parseDate(row['Date/Time']) : null,
      }))
      .filter((row) => row.employeeCode && row.dateTime)
      .sort((a, b) => a.dateTime - b.dateTime)
      .forEach((row) => {
        processedData.push(row);
      });

    if (processedData.length === 0) {
      return res.status(400).json({ success: false, message: 'الملف لا يحتوي على بيانات صالحة' });
    }

    const users = await User.find();
    const shifts = await Shift.find();

    const groupedData = {};

    processedData.forEach((curr) => {
      const user = users.find((u) => u.employeeCode === curr.employeeCode);
      if (!user) return;

      const shift = shifts.find((s) => s._id.toString() === user.shiftType?.toString());
      if (!shift) return;

      const date = curr.dateTime.toISOString().split('T')[0];
      const time = formatTime(curr.dateTime);
      const key = `${curr.employeeCode}_${date}`;
      const nextDay = new Date(curr.dateTime);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayKey = `${curr.employeeCode}_${nextDay.toISOString().split('T')[0]}`;
      const prevDay = new Date(curr.dateTime);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayKey = `${curr.employeeCode}_${prevDay.toISOString().split('T')[0]}`;

      const remainingGracePeriod = user.remainingGracePeriod !== null && !isNaN(user.remainingGracePeriod) ? user.remainingGracePeriod : (shift.gracePeriod || 0);

      if (isShiftCrossDay(shift)) {
        if (groupedData[prevDayKey] && !groupedData[prevDayKey].checkOut) {
          groupedData[prevDayKey].checkOut = time;
          groupedData[prevDayKey].checkOutDate = date;
          const durationHours = calculateDurationHours(
            groupedData[prevDayKey].checkIn,
            time,
            groupedData[prevDayKey].checkInDate,
            date
          );
          const baseHours = shift.baseHours || 9;
          const maxOvertimeHours = shift.maxOvertimeHours || (shift.shiftType === '24/24' ? 21 : 5);
          const maxDuration = baseHours + maxOvertimeHours;
          if (durationHours <= maxDuration) {
            return;
          }
        }

        if (!groupedData[key]) {
          groupedData[key] = {
            employeeCode: curr.employeeCode,
            employeeName: user.name,
            date,
            checkIn: time,
            checkOut: null,
            checkInDate: date,
            checkOutDate: nextDay.toISOString().split('T')[0],
            shiftType: shift.shiftType,
            shiftName: shift.shiftName,
            workDays: shift.workDays,
            shiftId: shift._id,
            leaveBalance: user.annualLeaveBalance || 0,
            attendanceStatus: 'حاضر',
            delayMinutes: 0,
            gracePeriod: shift.gracePeriod || 0,
            remainingGracePeriod,
            deductedHours: 0,
            overtimeHours: 0,
            deductedDays: 0,
            leaveAllowance: 'لا يوجد',
            sickLeaveDeduction: 'none',
            isCrossDay: true,
            isOfficialLeave: false,
          };
        } else if (time < groupedData[key].checkIn) {
          groupedData[key].checkIn = time;
          groupedData[key].checkInDate = date;
        }
      } else {
        const isCheckIn = shift.startTime ? curr.dateTime.getHours() <= parseInt(shift.startTime.split(':')[0]) + 2 : true;
        if (!groupedData[key]) {
          groupedData[key] = {
            employeeCode: curr.employeeCode,
            employeeName: user.name,
            date,
            checkIn: isCheckIn ? time : null,
            checkOut: isCheckIn ? null : time,
            checkInDate: date,
            checkOutDate: date,
            shiftType: shift.shiftType,
            shiftName: shift.shiftName,
            workDays: shift.workDays,
            shiftId: shift._id,
            leaveBalance: user.annualLeaveBalance || 0,
            attendanceStatus: isCheckIn ? 'حاضر' : 'غائب',
            delayMinutes: 0,
            gracePeriod: shift.gracePeriod || 0,
            remainingGracePeriod,
            deductedHours: 0,
            overtimeHours: 0,
            deductedDays: 0,
            leaveAllowance: 'لا يوجد',
            sickLeaveDeduction: 'none',
            isCrossDay: false,
            isOfficialLeave: false,
          };
        } else {
          if (isCheckIn && (!groupedData[key].checkIn || time < groupedData[key].checkIn)) {
            groupedData[key].checkIn = time;
            groupedData[key].checkInDate = date;
          } else if (!isCheckIn && (!groupedData[key].checkOut || time > groupedData[key].checkOut)) {
            groupedData[key].checkOut = time;
            groupedData[key].checkOutDate = date;
          }
        }
      }
    });

    for (const key of Object.keys(groupedData)) {
      const record = groupedData[key];
      const shift = shifts.find((s) => s._id.toString() === record.shiftId.toString());
      if (!shift) continue;

      let { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod, newCheckIn } = calculateDeductions(
        shift,
        record.checkIn,
        record.checkOut,
        record.checkInDate,
        record.checkOutDate,
        record.remainingGracePeriod,
        record.leaveAllowance
      );

      if (newCheckIn && isShiftCrossDay(shift)) {
        const newKey = `${record.employeeCode}_${newCheckIn.date}`;
        if (!groupedData[newKey]) {
          groupedData[newKey] = {
            employeeCode: record.employeeCode,
            employeeName: record.employeeName,
            date: newCheckIn.date,
            checkIn: newCheckIn.time,
            checkOut: null,
            checkInDate: newCheckIn.date,
            checkOutDate: new Date(new Date(newCheckIn.date).setDate(new Date(newCheckIn.date).getDate() + 1)).toISOString().split('T')[0],
            shiftType: shift.shiftType,
            shiftName: shift.shiftName,
            workDays: shift.workDays,
            shiftId: shift._id,
            leaveBalance: record.leaveBalance,
            attendanceStatus: 'حاضر',
            delayMinutes: 0,
            gracePeriod: shift.gracePeriod || 0,
            remainingGracePeriod,
            deductedHours: 0,
            overtimeHours: 0,
            deductedDays: 0,
            leaveAllowance: 'لا يوجد',
            sickLeaveDeduction: 'none',
            isCrossDay: true,
            isOfficialLeave: false,
          };
        }
        record.checkOut = null;
        record.checkOutDate = record.checkInDate;
        record.overtimeHours = overtimeHours;
      } else {
        record.deductedDays = deductedDays;
        record.deductedHours = deductedHours;
        record.delayMinutes = delayMinutes || 0;
        record.overtimeHours = overtimeHours || 0;
        record.remainingGracePeriod = remainingGracePeriod;
        record.attendanceStatus = (record.checkIn || record.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : 'غائب';
      }
    }

    const attendanceRecords = Object.values(groupedData);
    await Attendance.deleteMany({
      date: { $in: [...new Set(Object.values(groupedData).map((r) => r.date))] },
      employeeCode: { $in: [...new Set(Object.values(groupedData).map((r) => r.employeeCode))] }
    });
    const savedAttendance = await Attendance.insertMany(attendanceRecords);

    for (const record of attendanceRecords) {
      if (record.checkIn || record.checkOut) {
        await User.updateOne(
          { employeeCode: record.employeeCode },
          { $set: { remainingGracePeriod: record.remainingGracePeriod } }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'تم رفع سجلات الحضور بنجاح',
      data: savedAttendance
    });
  } catch (error) {
    console.error('خطأ في uploadAttendance:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة البيانات', error: error.message });
  }
};

// دالة لجلب سجلات الحضور
exports.getAttendance = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: 'فشل الاتصال بقاعدة البيانات', error: 'MongoDB غير متصل' });
    }

    const { startDate, endDate, employeeCode } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد تاريخ البداية والنهاية' });
    }

    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ success: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
    }

    const users = await User.find(employeeCode ? { employeeCode } : {});
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'لا يوجد موظفين بهذا الكود' });
    }

    const shifts = await Shift.find();
    if (!shifts.length) {
      return res.status(404).json({ success: false, message: 'لا توجد شيفتات مسجلة' });
    }

    const allDates = getAllDatesInRange(start, end);
    const query = {
      date: { $gte: start, $lte: end },
      ...(employeeCode && { employeeCode })
    };

    const attendances = await Attendance.find(query).sort({ date: 1, employeeCode: 1 });
    const result = [];
    let totalSickLeaveDeduction = 0;

    for (const user of users) {
      const shift = shifts.find((s) => s._id.toString() === user.shiftType?.toString());
      if (!shift) continue;

      let currentGracePeriod = user.remainingGracePeriod !== null && !isNaN(user.remainingGracePeriod) ? user.remainingGracePeriod : (shift.gracePeriod || 0);

      for (const date of allDates) {
        let existingRecord = attendances.find(
          (a) => a.employeeCode === user.employeeCode && a.date === date
        );

        if (!existingRecord && isWeeklyOffDay(date, shift.workDays)) {
          const newRecord = new Attendance({
            employeeCode: user.employeeCode,
            employeeName: user.name,
            date,
            checkIn: null,
            checkOut: null,
            checkInDate: date,
            checkOutDate: date,
            shiftType: shift.shiftType,
            shiftName: shift.shiftName,
            workDays: shift.workDays,
            shiftId: shift._id,
            leaveBalance: user.annualLeaveBalance || 0,
            attendanceStatus: 'إجازة أسبوعية',
            delayMinutes: 0,
            gracePeriod: shift.gracePeriod || 0,
            remainingGracePeriod: currentGracePeriod,
            deductedHours: 0,
            overtimeHours: 0,
            deductedDays: 0,
            leaveAllowance: 'لا يوجد',
            sickLeaveDeduction: 'none',
            isCrossDay: isShiftCrossDay(shift),
            isOfficialLeave: false,
          });
          await newRecord.save();
          existingRecord = newRecord;
        }

        if (existingRecord) {
          if (['إجازة أسبوعية', 'غائب', 'إجازة رسمية', 'إجازة سنوية', 'إجازة مرضية'].includes(existingRecord.attendanceStatus)) {
            existingRecord.remainingGracePeriod = currentGracePeriod;
            existingRecord.gracePeriod = shift.gracePeriod || 0;
            existingRecord.shiftName = shift.shiftName;
            existingRecord.leaveBalance = user.annualLeaveBalance || 0;
            if (existingRecord.attendanceStatus === 'إجازة مرضية') {
              totalSickLeaveDeduction += existingRecord.deductedDays || 0;
            }
            result.push(existingRecord);
            continue;
          }

          const { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod, newCheckIn } = calculateDeductions(
            shift,
            existingRecord.checkIn,
            existingRecord.checkOut,
            existingRecord.checkInDate,
            existingRecord.checkOutDate,
            currentGracePeriod,
            existingRecord.leaveAllowance
          );

          if (newCheckIn && isShiftCrossDay(shift)) {
            const newKey = `${existingRecord.employeeCode}_${newCheckIn.date}`;
            const existingNewRecord = await Attendance.findOne({
              employeeCode: existingRecord.employeeCode,
              date: newCheckIn.date
            });
            if (!existingNewRecord) {
              const newRecord = {
                employeeCode: existingRecord.employeeCode,
                employeeName: existingRecord.employeeName,
                date: newCheckIn.date,
                checkIn: newCheckIn.time,
                checkOut: null,
                checkInDate: newCheckIn.date,
                checkOutDate: new Date(new Date(newCheckIn.date).setDate(new Date(newCheckIn.date).getDate() + 1)).toISOString().split('T')[0],
                shiftType: shift.shiftType,
                shiftName: shift.shiftName,
                workDays: shift.workDays,
                shiftId: shift._id,
                leaveBalance: user.annualLeaveBalance || 0,
                attendanceStatus: 'حاضر',
                delayMinutes: 0,
                gracePeriod: shift.gracePeriod || 0,
                remainingGracePeriod,
                deductedHours: 0,
                overtimeHours: 0,
                deductedDays: 0,
                leaveAllowance: 'لا يوجد',
                sickLeaveDeduction: 'none',
                isCrossDay: true,
                isOfficialLeave: false,
              };
              await Attendance.create(newRecord);
              result.push(newRecord);
            }
            existingRecord.checkOut = null;
            existingRecord.checkOutDate = existingRecord.checkInDate;
            existingRecord.overtimeHours = overtimeHours;
          } else {
            existingRecord.deductedDays = deductedDays;
            existingRecord.deductedHours = deductedHours;
            existingRecord.delayMinutes = delayMinutes || 0;
            existingRecord.overtimeHours = overtimeHours || 0;
            existingRecord.remainingGracePeriod = remainingGracePeriod || currentGracePeriod;
            existingRecord.gracePeriod = shift.gracePeriod || 0;
            existingRecord.attendanceStatus = (existingRecord.checkIn || existingRecord.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : 'غائب';
            existingRecord.shiftName = shift.shiftName;
            existingRecord.leaveBalance = user.annualLeaveBalance || 0;
            await existingRecord.save();
            result.push(existingRecord);
          }

          if (existingRecord.checkIn || existingRecord.checkOut) {
            await User.updateOne(
              { employeeCode: existingRecord.employeeCode },
              { $set: { remainingGracePeriod: existingRecord.remainingGracePeriod } }
            );
            currentGracePeriod = existingRecord.remainingGracePeriod;
          }
        } else {
          const newRecord = new Attendance({
            employeeCode: user.employeeCode,
            employeeName: user.name,
            date,
            checkIn: null,
            checkOut: null,
            checkInDate: date,
            checkOutDate: date,
            shiftType: shift.shiftType,
            shiftName: shift.shiftName,
            workDays: shift.workDays,
            shiftId: shift._id,
            leaveBalance: user.annualLeaveBalance || 0,
            attendanceStatus: isWeeklyOffDay(date, shift.workDays) ? 'إجازة أسبوعية' : 'غائب',
            delayMinutes: 0,
            gracePeriod: shift.gracePeriod || 0,
            remainingGracePeriod: currentGracePeriod,
            deductedHours: 0,
            overtimeHours: 0,
            deductedDays: isWeeklyOffDay(date, shift.workDays) ? 0 : 1,
            leaveAllowance: 'لا يوجد',
            sickLeaveDeduction: 'none',
            isCrossDay: isShiftCrossDay(shift),
            isOfficialLeave: false,
          });
          await newRecord.save();
          result.push(newRecord);
        }
      }
    }

    const totals = {
      totalAttendanceDays: result.reduce((sum, r) => sum + (r.attendanceStatus === 'حاضر' || r.attendanceStatus === 'متأخر' ? 1 : 0), 0),
      totalWeeklyOffDays: result.reduce((sum, r) => sum + (r.attendanceStatus === 'إجازة أسبوعية' ? 1 : 0), 0),
      totalOfficialLeaveDays: result.reduce((sum, r) => sum + (r.attendanceStatus === 'إجازة رسمية' ? 1 : 0), 0),
      totalAbsentDays: result.reduce((sum, r) => sum + (r.attendanceStatus === 'غائب' ? 1 : 0), 0),
      totalOvertimeHours: result.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
      totalDeductedHours: result.reduce((sum, r) => sum + (r.deductedHours || 0), 0),
      totalDeductedDays: result.reduce((sum, r) => sum + (r.deductedDays || 0), 0),
      totalAnnualLeaveDays: result.reduce((sum, r) => sum + (r.attendanceStatus === 'إجازة سنوية' ? 1 : 0), 0),
      totalSickLeaveDeduction,
      totalLeaveAllowance: result.reduce((sum, r) => sum + (r.leaveAllowance === 'نعم' ? 1 : 0), 0),
      annualLeaveBalance: users.length === 1 ? users[0].annualLeaveBalance : null,
    };

    return res.status(200).json({
      success: true,
      message: 'تم جلب سجلات الحضور بنجاح',
      data: result,
      totals
    });
  } catch (error) {
    console.error('خطأ في getAttendance:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب البيانات', error: error.message });
  }
};

// دالة لحذف جميع سجلات الحضور
exports.deleteAllAttendance = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: 'فشل الاتصال بقاعدة البيانات', error: 'MongoDB غير متصل' });
    }

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

    const annualLeaves = await Attendance.find({ attendanceStatus: 'إجازة سنوية' });

    for (const leave of annualLeaves) {
      const user = await User.findOne({ employeeCode: leave.employeeCode });
      if (user) {
        const newLeaveBalance = user.annualLeaveBalance + 1;
        await User.updateOne(
          { employeeCode: leave.employeeCode },
          { $set: { annualLeaveBalance: newLeaveBalance } }
        );
        await updateAllAttendanceLeaveBalance(leave.employeeCode, newLeaveBalance);
      }
    }

    await Attendance.deleteMany({});
    return res.status(200).json({
      success: true,
      message: 'تم حذف جميع سجلات الحضور بنجاح',
    });
  } catch (error) {
    console.error('خطأ في deleteAllAttendance:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف البيانات', error: error.message });
  }
};

// دالة لتعديل سجل حضور
exports.updateAttendance = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: 'فشل الاتصال بقاعدة البيانات', error: 'MongoDB غير متصل' });
    }

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

    const { id } = req.params;
    const { checkIn, checkOut, checkInDate, checkOutDate, leaveAllowance, attendanceStatus } = req.body;

    console.log('Received ID:', id);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid ID format:', id);
      return res.status(400).json({ success: false, message: 'معرف السجل غير صالح' });
    }

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      console.error('Attendance record not found for ID:', id);
      return res.status(404).json({ success: false, message: 'سجل الحضور غير موجود' });
    }

    const shift = await Shift.findById(attendance.shiftId);
    if (!shift) {
      console.error('Shift not found for ID:', attendance.shiftId);
      return res.status(404).json({ success: false, message: 'الشيفت غير موجود' });
    }

    const user = await User.findOne({ employeeCode: attendance.employeeCode });
    if (!user) {
      console.error('User not found for employeeCode:', attendance.employeeCode);
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    let newLeaveBalance = user.annualLeaveBalance;

    if (attendance.attendanceStatus === 'إجازة سنوية' && attendanceStatus !== 'إجازة سنوية') {
      newLeaveBalance += 1;
      await User.updateOne(
        { employeeCode: attendance.employeeCode },
        { $set: { annualLeaveBalance: newLeaveBalance } }
      );
      await updateAllAttendanceLeaveBalance(attendance.employeeCode, newLeaveBalance);
    }

    if (attendanceStatus === 'إجازة سنوية' && attendance.attendanceStatus !== 'إجازة سنوية') {
      if (user.annualLeaveBalance < 1) {
        return res.status(400).json({ success: false, message: 'رصيد الإجازة السنوية غير كافٍ' });
      }
      newLeaveBalance -= 1;
      await User.updateOne(
        { employeeCode: attendance.employeeCode },
        { $set: { annualLeaveBalance: newLeaveBalance } }
      );
      await updateAllAttendanceLeaveBalance(attendance.employeeCode, newLeaveBalance);
    }

    let deductedDays = 0;
    if (attendanceStatus === 'إجازة مرضية') {
      const sickLeaveDeduction = shift.sickLeaveDeduction || 'quarter';
      deductedDays = sickLeaveDeduction === 'quarter' ? 0.25 : sickLeaveDeduction === 'half' ? 0.5 : 1;
    }

    if (attendance.attendanceStatus === 'إجازة مرضية' && attendanceStatus !== 'إجازة مرضية') {
      attendance.sickLeaveDeduction = 'none';
      attendance.deductedDays = 0;
    }

    const validStatuses = ['حاضر', 'غائب', 'متأخر', 'إجازة سنوية', 'إجازة مرضية', 'إجازة رسمية', 'إجازة أسبوعية'];

    attendance.checkIn = attendanceStatus === 'إجازة سنوية' || attendanceStatus === 'إجازة مرضية' ? null : (checkIn !== undefined ? checkIn : attendance.checkIn);
    attendance.checkOut = attendanceStatus === 'إجازة سنوية' || attendanceStatus === 'إجازة مرضية' ? null : (checkOut !== undefined ? checkOut : attendance.checkOut);
    attendance.checkInDate = checkInDate || attendance.checkInDate;
    attendance.checkOutDate = checkOutDate || (isShiftCrossDay(shift) && (checkIn || attendance.checkIn) ? new Date(new Date(attendance.checkInDate || checkInDate).setDate(new Date(attendance.checkInDate || checkInDate).getDate() + 1)).toISOString().split('T')[0] : attendance.checkInDate);
    attendance.leaveAllowance = leaveAllowance || 'لا يوجد';
    attendance.shiftName = shift.shiftName;
    attendance.leaveBalance = newLeaveBalance;
    attendance.deductedDays = attendanceStatus === 'إجازة مرضية' ? deductedDays : 0;
    attendance.sickLeaveDeduction = attendanceStatus === 'إجازة مرضية' ? shift.sickLeaveDeduction || 'quarter' : 'none';

    if (attendanceStatus && validStatuses.includes(attendanceStatus)) {
      attendance.attendanceStatus = attendanceStatus;
    } else {
      if (!attendance.checkIn && !attendance.checkOut) {
        attendance.attendanceStatus = isWeeklyOffDay(attendance.date, shift.workDays) ? 'إجازة أسبوعية' : 'غائب';
        attendance.deductedDays = isWeeklyOffDay(attendance.date, shift.workDays) ? 0 : 1;
      } else {
        attendance.attendanceStatus = 'حاضر';
      }
    }

    let remainingGracePeriod = user.remainingGracePeriod !== null && !isNaN(user.remainingGracePeriod) ? user.remainingGracePeriod : (shift.gracePeriod || 0);
    if (!['إجازة أسبوعية', 'غائب', 'إجازة رسمية', 'إجازة سنوية', 'إجازة مرضية'].includes(attendance.attendanceStatus)) {
      const { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod: newRemainingGracePeriod, newCheckIn } = calculateDeductions(
        shift,
        attendance.checkIn,
        attendance.checkOut,
        attendance.checkInDate,
        attendance.checkOutDate,
        remainingGracePeriod,
        attendance.leaveAllowance
      );
      attendance.deductedDays = deductedDays;
      attendance.deductedHours = deductedHours;
      attendance.delayMinutes = delayMinutes || 0;
      attendance.overtimeHours = overtimeHours || 0;
      attendance.remainingGracePeriod = newRemainingGracePeriod || remainingGracePeriod;
      attendance.gracePeriod = shift.gracePeriod || 0;
      attendance.attendanceStatus = (attendance.checkIn || attendance.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : (isWeeklyOffDay(attendance.date, shift.workDays) ? 'إجازة أسبوعية' : 'غائب');
      attendance.isCrossDay = isShiftCrossDay(shift);

      if (newCheckIn && isShiftCrossDay(shift)) {
        const newKey = `${attendance.employeeCode}_${newCheckIn.date}`;
        const existingNewRecord = await Attendance.findOne({
          employeeCode: attendance.employeeCode,
          date: newCheckIn.date
        });
        if (!existingNewRecord) {
          await Attendance.create({
            employeeCode: attendance.employeeCode,
            employeeName: attendance.employeeName,
            date: newCheckIn.date,
            checkIn: newCheckIn.time,
            checkOut: null,
            checkInDate: newCheckIn.date,
            checkOutDate: new Date(new Date(newCheckIn.date).setDate(new Date(newCheckIn.date).getDate() + 1)).toISOString().split('T')[0],
            shiftType: shift.shiftType,
            shiftName: shift.shiftName,
            workDays: shift.workDays,
            shiftId: shift._id,
            leaveBalance: newLeaveBalance,
            attendanceStatus: 'حاضر',
            delayMinutes: 0,
            gracePeriod: shift.gracePeriod || 0,
            remainingGracePeriod: attendance.remainingGracePeriod,
            deductedHours: 0,
            overtimeHours: 0,
            deductedDays: 0,
            leaveAllowance: 'لا يوجد',
            sickLeaveDeduction: 'none',
            isCrossDay: true,
            isOfficialLeave: false,
          });
        }
        attendance.checkOut = null;
        attendance.checkOutDate = attendance.checkInDate;
        attendance.overtimeHours = overtimeHours;
      }

      if (attendance.checkIn || attendance.checkOut) {
        await User.updateOne(
          { employeeCode: attendance.employeeCode },
          { $set: { remainingGracePeriod: attendance.remainingGracePeriod } }
        );
      }
    } else {
      attendance.remainingGracePeriod = remainingGracePeriod;
      attendance.gracePeriod = shift.gracePeriod || 0;
      attendance.isCrossDay = isShiftCrossDay(shift);
      attendance.deductedHours = 0;
      attendance.overtimeHours = 0;
      attendance.deductedDays = attendanceStatus === 'إجازة مرضية' ? deductedDays : (isWeeklyOffDay(attendance.date, shift.workDays) ? 0 : 1);
    }

    await attendance.save();

    const laterRecords = await Attendance.find({
      employeeCode: attendance.employeeCode,
      date: { $gt: attendance.date },
      attendanceStatus: { $nin: ['إجازة أسبوعية', 'غائب', 'إجازة رسمية', 'إجازة سنوية', 'إجازة مرضية'] },
    }).sort({ date: 1 });

    let currentGracePeriod = attendance.remainingGracePeriod;
    for (const record of laterRecords) {
      if (record.checkIn || record.checkOut) {
        const { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod: newRemainingGracePeriod } = calculateDeductions(
          shift,
          record.checkIn,
          record.checkOut,
          record.checkInDate,
          record.checkOutDate,
          currentGracePeriod,
          record.leaveAllowance
        );
        record.deductedDays = deductedDays;
        record.deductedHours = deductedHours;
        record.delayMinutes = delayMinutes || 0;
        record.overtimeHours = overtimeHours || 0;
        record.remainingGracePeriod = newRemainingGracePeriod || currentGracePeriod;
        record.gracePeriod = shift.gracePeriod || 0;
        record.attendanceStatus = (record.checkIn || record.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : (isWeeklyOffDay(record.date, shift.workDays) ? 'إجازة أسبوعية' : 'غائب');
        record.shiftName = shift.shiftName;
        record.leaveBalance = newLeaveBalance;
        await record.save();

        await User.updateOne(
          { employeeCode: record.employeeCode },
          { $set: { remainingGracePeriod: record.remainingGracePeriod } }
        );
        currentGracePeriod = record.remainingGracePeriod;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'تم تعديل سجل الحضور بنجاح',
      data: attendance
    });
  } catch (error) {
    console.error('خطأ في updateAttendance:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تعديل السجل', error: error.message });
  }
};

// دالة لتطبيق إجازة رسمية
exports.applyOfficialLeave = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: 'فشل الاتصال بقاعدة البيانات', error: 'MongoDB غير متصل' });
    }

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

    const { startDate, endDate, employeeCode, applyToAll } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'تاريخ البداية والنهاية مطلوبان' });
    }

    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ success: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
    }

    const dates = getAllDatesInRange(start, end);

    let users = [];
    if (applyToAll) {
      users = await User.find({});
    } else if (employeeCode) {
      const user = await User.findOne({ employeeCode });
      if (!user) {
        return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
      }
      users = [user];
    } else {
      return res.status(400).json({ success: false, message: 'كود الموظف مطلوب إذا لم يتم اختيار تطبيق على الجميع' });
    }

    const shifts = await Shift.find();
    const attendanceRecords = [];

    for (const user of users) {
      const shift = shifts.find((s) => s._id.toString() === user.shiftType?.toString());
      if (!shift) continue;

      for (const date of dates) {
        const attendanceRecord = {
          employeeCode: user.employeeCode,
          employeeName: user.name,
          date,
          checkIn: null,
          checkOut: null,
          checkInDate: date,
          checkOutDate: date,
          shiftType: shift.shiftType,
          shiftName: shift.shiftName,
          workDays: shift.workDays,
          shiftId: shift._id,
          leaveBalance: user.annualLeaveBalance || 0,
          attendanceStatus: 'إجازة رسمية',
          delayMinutes: 0,
          gracePeriod: shift.gracePeriod || 0,
          remainingGracePeriod: user.remainingGracePeriod || shift.gracePeriod || 0,
          deductedHours: 0,
          overtimeHours: 0,
          deductedDays: 0,
          leaveAllowance: 'لا يوجد',
          sickLeaveDeduction: 'none',
          isCrossDay: isShiftCrossDay(shift),
          isOfficialLeave: true
        };
        attendanceRecords.push(attendanceRecord);
      }
    }

    await Attendance.deleteMany({ date: { $in: dates }, employeeCode: { $in: users.map(u => u.employeeCode) } });
    await Attendance.insertMany(attendanceRecords);

    return res.status(200).json({
      success: true,
      message: 'تم تطبيق الإجازة الرسمية بنجاح',
      data: attendanceRecords
    });
  } catch (error) {
    console.error('خطأ في applyOfficialLeave:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تطبيق الإجازة الرسمية', error: error.message });
  }
};

// دالة لتطبيق الإجازة السنوية
exports.applyAnnualLeave = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: 'فشل الاتصال بقاعدة البيانات', error: 'MongoDB غير متصل' });
    }

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

    const { startDate, endDate, employeeCode, applyToAll } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'تاريخ البداية والنهاية مطلوبان' });
    }

    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ success: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
    }

    const dates = getAllDatesInRange(start, end);
    const leaveDays = dates.length;

    let users = [];
    if (applyToAll) {
      users = await User.find({});
    } else if (employeeCode) {
      const user = await User.findOne({ employeeCode });
      if (!user) {
        return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
      }
      users = [user];
    } else {
      return res.status(400).json({ success: false, message: 'كود الموظف مطلوب إذا لم يتم اختيار تطبيق على الجميع' });
    }

    const shifts = await Shift.find();
    const attendanceRecords = [];

    for (const user of users) {
      const shift = shifts.find((s) => s._id.toString() === user.shiftType?.toString());
      if (!shift) continue;

      if (user.annualLeaveBalance < leaveDays && !applyToAll) {
        return res.status(400).json({ success: false, message: `رصيد الإجازة السنوية للموظف ${user.employeeCode} غير كافٍ` });
      }

      const newLeaveBalance = user.annualLeaveBalance - leaveDays;

      for (const date of dates) {
        const attendanceRecord = {
          employeeCode: user.employeeCode,
          employeeName: user.name,
          date,
          checkIn: null,
          checkOut: null,
          checkInDate: date,
          checkOutDate: date,
          shiftType: shift.shiftType,
          shiftName: shift.shiftName,
          workDays: shift.workDays,
          shiftId: shift._id,
          leaveBalance: newLeaveBalance,
          attendanceStatus: 'إجازة سنوية',
          delayMinutes: 0,
          gracePeriod: shift.gracePeriod || 0,
          remainingGracePeriod: user.remainingGracePeriod || shift.gracePeriod || 0,
          deductedHours: 0,
          overtimeHours: 0,
          deductedDays: 0,
          leaveAllowance: 'لا يوجد',
          sickLeaveDeduction: 'none',
          isCrossDay: isShiftCrossDay(shift),
          isOfficialLeave: false,
        };
        attendanceRecords.push(attendanceRecord);
      }

      await User.updateOne(
        { employeeCode: user.employeeCode },
        { $set: { annualLeaveBalance: newLeaveBalance } }
      );

      await updateAllAttendanceLeaveBalance(user.employeeCode, newLeaveBalance);
    }

    await Attendance.deleteMany({ date: { $in: dates }, employeeCode: { $in: users.map(u => u.employeeCode) } });
    await Attendance.insertMany(attendanceRecords);

    return res.status(200).json({
      success: true,
      message: 'تم تطبيق الإجازة السنوية بنجاح',
      data: attendanceRecords
    });
  } catch (error) {
    console.error('خطأ في applyAnnualLeave:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تطبيق الإجازة السنوية', error: error.message });
  }
};

// دالة لتطبيق الإجازة المرضية
exports.applySickLeave = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: 'فشل الاتصال بقاعدة البيانات', error: 'MongoDB غير متصل' });
    }

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

    const { startDate, endDate, employeeCode, applyToAll } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'تاريخ البداية والنهاية مطلوبان' });
    }

    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ success: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
    }

    const dates = getAllDatesInRange(start, end);

    let users = [];
    if (applyToAll) {
      users = await User.find({});
    } else if (employeeCode) {
      const user = await User.findOne({ employeeCode });
      if (!user) {
        return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
      }
      users = [user];
    } else {
      return res.status(400).json({ success: false, message: 'كود الموظف مطلوب إذا لم يتم اختيار تطبيق على الجميع' });
    }

    const shifts = await Shift.find();
    const attendanceRecords = [];

    for (const user of users) {
      const shift = shifts.find((s) => s._id.toString() === user.shiftType?.toString());
      if (!shift) continue;

      const sickLeaveDeduction = shift.sickLeaveDeduction || 'quarter';
      const deductedDays = sickLeaveDeduction === 'quarter' ? 0.25 : sickLeaveDeduction === 'half' ? 0.5 : 1;

      for (const date of dates) {
        if (!isWeeklyOffDay(date, shift.workDays)) {
          const attendanceRecord = {
            employeeCode: user.employeeCode,
            employeeName: user.name,
            date,
            checkIn: null,
            checkOut: null,
            checkInDate: date,
            checkOutDate: date,
            shiftType: shift.shiftType,
            shiftName: shift.shiftName,
            workDays: shift.workDays,
            shiftId: shift._id,
            leaveBalance: user.annualLeaveBalance || 0,
            attendanceStatus: 'إجازة مرضية',
            delayMinutes: 0,
            gracePeriod: shift.gracePeriod || 0,
            remainingGracePeriod: user.remainingGracePeriod || shift.gracePeriod || 0,
            deductedHours: 0,
            overtimeHours: 0,
            deductedDays,
            leaveAllowance: 'لا يوجد',
            sickLeaveDeduction,
            isCrossDay: isShiftCrossDay(shift),
            isOfficialLeave: false,
          };
          attendanceRecords.push(attendanceRecord);
        }
      }
    }

    await Attendance.deleteMany({ date: { $in: dates }, employeeCode: { $in: users.map(u => u.employeeCode) } });
    await Attendance.insertMany(attendanceRecords);

    return res.status(200).json({
      success: true,
      message: 'تم تطبيق الإجازة المرضية بنجاح',
      data: attendanceRecords
    });
  } catch (error) {
    console.error('خطأ في applySickLeave:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تطبيق الإجازة المرضية', error: error.message });
  }
};
