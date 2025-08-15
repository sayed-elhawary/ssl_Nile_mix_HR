const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Shift = require('../models/Shift');
const xlsx = require('xlsx');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// دالة لتقريب الأرقام العشرية
const roundNumber = (num, decimals = 1) => {
  return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
};

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
  const dayOfWeek = new Date(date).getDay(); // 0 (Sunday) to 6 (Saturday)
  if (!Array.isArray(workDays)) {
    console.warn(`workDays غير مصفوفة أو غير معرف للتاريخ ${date}:`, workDays);
    return false; // افتراض عدم إجازة أسبوعية
  }
  console.log(`التحقق مما إذا كان ${date} (اليوم ${dayOfWeek}) إجازة أسبوعية. workDays: ${workDays}`); // تسجيل للتصحيح
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
  return roundNumber(durationMs / (1000 * 60 * 60), 1);
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

  if (!checkInTime && !checkOutTime) {
    return { deductedDays: 1, deductedHours: 0, delayMinutes: 0, overtimeHours: 0, remainingGracePeriod, newCheckIn };
  }

  if (!checkInTime && checkOutTime) {
    const checkOut = new Date(`${checkOutDate}T${checkOutTime}:00`);
    const checkIn = new Date(checkOut.getTime() - baseHours * 60 * 60 * 1000);
    checkInTime = formatTime(checkIn);
    checkInDate = checkIn.toISOString().split('T')[0];
  }

  const checkIn = new Date(`${checkInDate}T${checkInTime}:00`);
  const checkOut = checkOutTime ? new Date(`${checkOutDate}T${checkOutTime}:00`) : null;

  const expectedStart = new Date(`${checkInDate}T${shiftStartTime}:00`);
  let expectedEnd = new Date(`${checkInDate}T${shiftEndTime}:00`);
  if (isShiftCrossDay(shift) || parseInt(shiftEndTime.split(':')[0]) < parseInt(shiftStartTime.split(':')[0])) {
    expectedEnd.setDate(expectedEnd.getDate() + 1);
  }

  let durationHours = checkOutTime ? calculateDurationHours(checkInTime, checkOutTime, checkInDate, checkOutDate) : 0;

  if (checkInTime && !checkOutTime && !isShiftCrossDay(shift)) {
    deductedHours = baseHours;
  }

  if (checkIn && shift.shiftType !== '24/24') {
    const delayMs = Math.max(0, checkIn - expectedStart);
    delayMinutes = roundNumber(delayMs / 60000, 1);
  }

  if (shift.shiftType === '24/24') {
    delayMinutes = 0;

    if (!checkOutTime) {
      deductedHours = 0;
      overtimeHours = 0;
    } else {
      if (durationHours > maxDuration) {
        deductedHours = 0;
        overtimeHours = 0;
        newCheckIn = { time: checkOutTime, date: checkOutDate };
        return { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod, newCheckIn };
      }

      if (durationHours < baseHours) {
        const shortHours = baseHours - durationHours;
        const shortMinutes = shortHours * 60;
        let excessShortMinutes = shortMinutes;
        if (shortMinutes <= remainingGracePeriod) {
          remainingGracePeriod = roundNumber(remainingGracePeriod - shortMinutes, 1);
          excessShortMinutes = 0;
        } else {
          excessShortMinutes = roundNumber(shortMinutes - remainingGracePeriod, 1);
          remainingGracePeriod = 0;
        }
        deductedHours += roundNumber(excessShortMinutes / 60, 1);
      } else {
        overtimeHours = roundNumber(Math.min(durationHours - baseHours, maxOvertimeHours), 1);
      }
    }
  } else {
    const hasDayDeduction = shift.deductions?.some(d => ['quarter', 'half', 'full'].includes(d.type)) ?? false;

    let appliedDeduction = null;
    if (shift.shiftType === 'morning') {
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
            remainingGracePeriod = roundNumber(remainingGracePeriod - delayMinutes, 1);
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
                deductedHours = roundNumber(delayMinutes / 60, 1);
                break;
              default:
                deductedDays = 0;
            }
          }
        } else {
          if (hasDayDeduction) {
            deductedDays = 1;
          } else {
            if (delayMinutes <= remainingGracePeriod) {
              remainingGracePeriod = roundNumber(remainingGracePeriod - delayMinutes, 1);
              deductedDays = 0;
            } else {
              delayMinutes = roundNumber(delayMinutes - remainingGracePeriod, 1);
              remainingGracePeriod = 0;
              deductedHours = roundNumber(delayMinutes / 60, 1);
            }
          }
        }
      }
    } else {
      let earlyLeaveMinutes = 0;
      if (checkOut) {
        const earlyLeaveMs = Math.max(0, expectedEnd - checkOut);
        earlyLeaveMinutes = roundNumber(earlyLeaveMs / 60000, 1);
      } else if (isShiftCrossDay(shift)) {
        earlyLeaveMinutes = 0;
      }

      const totalDelayMinutes = roundNumber(delayMinutes + earlyLeaveMinutes, 1);
      let excessDelayMinutes = totalDelayMinutes;

      if (totalDelayMinutes > 0) {
        if (totalDelayMinutes <= remainingGracePeriod) {
          remainingGracePeriod = roundNumber(remainingGracePeriod - totalDelayMinutes, 1);
          excessDelayMinutes = 0;
        } else {
          excessDelayMinutes = roundNumber(totalDelayMinutes - remainingGracePeriod, 1);
          remainingGracePeriod = 0;
        }
      }
      if (checkOut) {
        deductedHours += roundNumber(excessDelayMinutes / 60, 1);
      }
      delayMinutes = totalDelayMinutes;
    }

    if (checkOut) {
      const overtimeMs = Math.max(0, checkOut - expectedEnd);
      overtimeHours = roundNumber(Math.min(overtimeMs / 3600000, maxOvertimeHours), 1);

      const durationHours = calculateDurationHours(checkInTime, checkOutTime, checkInDate, checkOutDate);
      if (leaveAllowance === 'نعم') {
        overtimeHours = roundNumber(durationHours * 2, 1);
      } else if (durationHours > maxDuration) {
        newCheckIn = { time: checkOutTime, date: checkOutDate };
        overtimeHours = maxOvertimeHours;
      }
    } else if (isShiftCrossDay(shift)) {
      overtimeHours = 0;
    }
  }

  return { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod, newCheckIn };
};

// دالة مساعدة لتحديث leaveBalance في جميع سجلات الحضور لموظف معين
const updateAllAttendanceLeaveBalance = async (employeeCode, newLeaveBalance, session = null) => {
  try {
    const updateOptions = session ? { session } : {};
    await Attendance.updateMany(
      { employeeCode },
      { $set: { leaveBalance: newLeaveBalance } },
      updateOptions
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

    const employeeGrouped = {};
    processedData.forEach((curr) => {
      if (!employeeGrouped[curr.employeeCode]) {
        employeeGrouped[curr.employeeCode] = [];
      }
      employeeGrouped[curr.employeeCode].push(curr);
    });

    const attendanceRecords = [];

    for (const employeeCode in employeeGrouped) {
      const user = users.find((u) => u.employeeCode === employeeCode);
      if (!user) continue;

      const shift = shifts.find((s) => s._id.toString() === user.shiftType?.toString());
      if (!shift) {
        console.error(`Shift not found for user ${employeeCode}`);
        continue;
      }

      const employeeData = employeeGrouped[employeeCode].sort((a, b) => a.dateTime - b.dateTime);

      const groupedData = {};

      employeeData.forEach((curr) => {
        const date = curr.dateTime.toISOString().split('T')[0];
        const time = formatTime(curr.dateTime);
        const key = `${employeeCode}_${date}`;
        const nextDay = new Date(curr.dateTime);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayKey = `${employeeCode}_${nextDay.toISOString().split('T')[0]}`;
        const prevDay = new Date(curr.dateTime);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayKey = `${employeeCode}_${prevDay.toISOString().split('T')[0]}`;

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
              employeeCode: employeeCode,
              employeeName: user.name,
              date,
              checkIn: time,
              checkOut: null,
              checkInDate: date,
              checkOutDate: nextDay.toISOString().split('T')[0],
              shiftType: shift.shiftType,
              shiftName: shift.shiftName,
              workDays: shift.workDays || [],
              shiftId: shift._id,
              leaveBalance: user.annualLeaveBalance || 0,
              attendanceStatus: 'حاضر',
              delayMinutes: 0,
              gracePeriod: shift.gracePeriod || 0,
              remainingGracePeriod: 0,
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
              employeeCode: employeeCode,
              employeeName: user.name,
              date,
              checkIn: isCheckIn ? time : null,
              checkOut: isCheckIn ? null : time,
              checkInDate: date,
              checkOutDate: date,
              shiftType: shift.shiftType,
              shiftName: shift.shiftName,
              workDays: shift.workDays || [],
              shiftId: shift._id,
              leaveBalance: user.annualLeaveBalance || 0,
              attendanceStatus: isCheckIn ? 'حاضر' : 'غائب',
              delayMinutes: 0,
              gracePeriod: shift.gracePeriod || 0,
              remainingGracePeriod: 0,
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

      const sortedKeys = Object.keys(groupedData).sort((a, b) => a.split('_')[1].localeCompare(b.split('_')[1]));

      let currentMonth = null;
      let currentRemainingGracePeriod = shift.gracePeriod || 0;

      for (const key of sortedKeys) {
        const record = groupedData[key];
        const month = record.date.slice(0, 7);

        if (month !== currentMonth) {
          currentMonth = month;
          currentRemainingGracePeriod = shift.gracePeriod || 0;
        }

        let { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod, newCheckIn } = calculateDeductions(
          shift,
          record.checkIn,
          record.checkOut,
          record.checkInDate,
          record.checkOutDate,
          currentRemainingGracePeriod,
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
              checkOutDate: new Date(new Date(newCheckIn.date).getDate() + 1).toISOString().split('T')[0],
              shiftType: shift.shiftType,
              shiftName: shift.shiftName,
              workDays: shift.workDays || [],
              shiftId: shift._id,
              leaveBalance: record.leaveBalance,
              attendanceStatus: 'حاضر',
              delayMinutes: 0,
              gracePeriod: shift.gracePeriod || 0,
              remainingGracePeriod: remainingGracePeriod,
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
          record.attendanceStatus = (record.checkIn || record.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : (isWeeklyOffDay(record.date, shift.workDays) ? 'إجازة أسبوعية' : 'غائب');
          record.deductedDays = (record.checkIn || record.checkOut) ? deductedDays : (isWeeklyOffDay(record.date, shift.workDays) ? 0 : 1);
          currentRemainingGracePeriod = remainingGracePeriod;
        }
      }

      attendanceRecords.push(...Object.values(groupedData));
    }

    await Attendance.deleteMany({
      date: { $in: [...new Set(attendanceRecords.map((r) => r.date))] },
      employeeCode: { $in: [...new Set(attendanceRecords.map((r) => r.employeeCode))] }
    });
    const savedAttendance = await Attendance.insertMany(attendanceRecords);

    const currentDate = new Date();
    const currentMonthStr = currentDate.toISOString().slice(0, 7);
    for (const record of attendanceRecords.filter(r => r.date.slice(0, 7) === currentMonthStr)) {
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

    const allDates = getAllDatesInRange(start, end).sort();
    const query = {
      date: { $gte: start, $lte: end },
      ...(employeeCode && { employeeCode })
    };

    const attendances = await Attendance.find(query).sort({ employeeCode: 1, date: 1 });
    const result = [];
    let totalSickLeaveDeduction = 0;

    for (const user of users) {
      const shift = shifts.find((s) => s._id.toString() === user.shiftType?.toString());
      if (!shift) {
        console.error(`Shift not found for user ${user.employeeCode}. Skipping user.`);
        continue;
      }

      console.log(`Shift workDays for employee ${user.employeeCode}: ${shift.workDays}`);

      let currentMonth = null;
      let currentGracePeriod = shift.gracePeriod || 0;

      for (const date of allDates) {
        const month = date.slice(0, 7);

        if (month !== currentMonth) {
          currentMonth = month;
          currentGracePeriod = shift.gracePeriod || 0;
        }

        let existingRecord = attendances.find(
          (a) => a.employeeCode === user.employeeCode && a.date === date
        );

        if (existingRecord && ['إجازة سنوية', 'إجازة رسمية', 'إجازة مرضية'].includes(existingRecord.attendanceStatus)) {
          existingRecord.workDays = shift.workDays || [];
          existingRecord.remainingGracePeriod = currentGracePeriod;
          existingRecord.gracePeriod = shift.gracePeriod || 0;
          existingRecord.shiftName = shift.shiftName;
          existingRecord.leaveBalance = user.annualLeaveBalance || 0;
          if (existingRecord.attendanceStatus === 'إجازة مرضية') {
            totalSickLeaveDeduction += existingRecord.deductedDays || 0;
          }
          await existingRecord.save();
          result.push(existingRecord);
          continue;
        }

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
            workDays: shift.workDays || [],
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
          result.push(newRecord);
          continue;
        }

        if (!existingRecord) {
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
            workDays: shift.workDays || [],
            shiftId: shift._id,
            leaveBalance: user.annualLeaveBalance || 0,
            attendanceStatus: 'غائب',
            delayMinutes: 0,
            gracePeriod: shift.gracePeriod || 0,
            remainingGracePeriod: currentGracePeriod,
            deductedHours: 0,
            overtimeHours: 0,
            deductedDays: 1,
            leaveAllowance: 'لا يوجد',
            sickLeaveDeduction: 'none',
            isCrossDay: isShiftCrossDay(shift),
            isOfficialLeave: false,
          });
          await newRecord.save();
          result.push(newRecord);
          continue;
        }

        existingRecord.workDays = shift.workDays || [];

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
              checkOutDate: new Date(new Date(newCheckIn.date).getDate() + 1).toISOString().split('T')[0],
              shiftType: shift.shiftType,
              shiftName: shift.shiftName,
              workDays: shift.workDays || [],
              shiftId: shift._id,
              leaveBalance: user.annualLeaveBalance || 0,
              attendanceStatus: 'حاضر',
              delayMinutes: 0,
              gracePeriod: shift.gracePeriod || 0,
              remainingGracePeriod: remainingGracePeriod,
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
          existingRecord.remainingGracePeriod = remainingGracePeriod;
          existingRecord.gracePeriod = shift.gracePeriod || 0;
          existingRecord.attendanceStatus = (existingRecord.checkIn || existingRecord.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : (isWeeklyOffDay(date, shift.workDays) ? 'إجازة أسبوعية' : 'غائب');
          existingRecord.deductedDays = (existingRecord.checkIn || existingRecord.checkOut) ? deductedDays : (isWeeklyOffDay(date, shift.workDays) ? 0 : 1);
          existingRecord.shiftName = shift.shiftName;
          existingRecord.leaveBalance = user.annualLeaveBalance || 0;
          await existingRecord.save();
          result.push(existingRecord);
        }

        if (existingRecord.checkIn || existingRecord.checkOut) {
          currentGracePeriod = existingRecord.remainingGracePeriod;
        }
      }

      const currentDate = new Date();
      const currentMonthStr = currentDate.toISOString().slice(0, 7);
      if (allDates[allDates.length - 1].slice(0, 7) === currentMonthStr) {
        await User.updateOne(
          { employeeCode: user.employeeCode },
          { $set: { remainingGracePeriod: currentGracePeriod } }
        );
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
      if (user && !isWeeklyOffDay(leave.date, (await Shift.findById(user.shiftType))?.workDays || [])) {
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

// دالة لتعديل سجل حضور (هنا التعديل الرئيسي)
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

    if (attendance.attendanceStatus === 'إجازة سنوية' && attendanceStatus !== 'إجازة سنوية' && !isWeeklyOffDay(attendance.date, shift.workDays)) {
      newLeaveBalance += 1;
      await User.updateOne(
        { employeeCode: attendance.employeeCode },
        { $set: { annualLeaveBalance: newLeaveBalance } }
      );
      await updateAllAttendanceLeaveBalance(attendance.employeeCode, newLeaveBalance);
    }

    if (attendanceStatus === 'إجازة سنوية' && attendance.attendanceStatus !== 'إجازة سنوية' && !isWeeklyOffDay(attendance.date, shift.workDays)) {
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
    attendance.checkOutDate = checkOutDate || attendance.checkOutDate;
    attendance.leaveAllowance = leaveAllowance || 'لا يوجد';
    attendance.shiftName = shift.shiftName;
    attendance.leaveBalance = newLeaveBalance;
    attendance.sickLeaveDeduction = attendanceStatus === 'إجازة مرضية' ? shift.sickLeaveDeduction || 'quarter' : 'none';
    attendance.workDays = shift.workDays || [];

    if (attendanceStatus && validStatuses.includes(attendanceStatus)) {
      attendance.attendanceStatus = attendanceStatus;
    } else {
      if (!attendance.checkIn && !attendance.checkOut) {
        attendance.attendanceStatus = isWeeklyOffDay(attendance.date, shift.workDays) ? 'إجازة أسبوعية' : 'غائب';
      } else {
        attendance.attendanceStatus = 'حاضر';
      }
    }

    const month = attendance.date.slice(0, 7);
    const previousRecords = await Attendance.find({
      employeeCode: attendance.employeeCode,
      date: { $lt: attendance.date, $gte: `${month}-01`, $lte: `${month}-31` },
      attendanceStatus: { $nin: ['إجازة أسبوعية', 'غائب', 'إجازة رسمية', 'إجازة سنوية', 'إجازة مرضية'] },
    }).sort({ date: 1 });

    let remainingGracePeriod = shift.gracePeriod || 0;
    for (const prev of previousRecords) {
      const prevDeductions = calculateDeductions(
        shift,
        prev.checkIn,
        prev.checkOut,
        prev.checkInDate,
        prev.checkOutDate,
        remainingGracePeriod,
        prev.leaveAllowance
      );
      remainingGracePeriod = prevDeductions.remainingGracePeriod;
    }

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
            checkOutDate: new Date(new Date(newCheckIn.date).getDate() + 1).toISOString().split('T')[0],
            shiftType: shift.shiftType,
            shiftName: shift.shiftName,
            workDays: shift.workDays || [],
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

      remainingGracePeriod = attendance.remainingGracePeriod;
    } else {
      attendance.remainingGracePeriod = remainingGracePeriod;
      attendance.gracePeriod = shift.gracePeriod || 0;
      attendance.isCrossDay = isShiftCrossDay(shift);
      attendance.deductedHours = 0;
      attendance.overtimeHours = 0;
      // التعديل الرئيسي هنا: نعين deductedDays = 0 للإجازات المدفوعة (سنوية، رسمية، أسبوعية)، وخصم للمرضية، و1 للغياب
      if (attendanceStatus === 'إجازة مرضية') {
        attendance.deductedDays = deductedDays; // deductedDays محسبة فوق للمرضية
      } else if (['إجازة سنوية', 'إجازة رسمية', 'إجازة أسبوعية'].includes(attendanceStatus)) {
        attendance.deductedDays = 0; // لا خصم للسنوية أو الرسمية أو الأسبوعية
      } else {
        attendance.deductedDays = 1; // للغياب
      }
    }

    await attendance.save();

    const laterRecords = await Attendance.find({
      employeeCode: attendance.employeeCode,
      date: { $gt: attendance.date, $lte: `${month}-31` },
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
        record.deductedDays = (record.checkIn || record.checkOut) ? deductedDays : (isWeeklyOffDay(record.date, shift.workDays) ? 0 : 1);
        record.shiftName = shift.shiftName;
        record.leaveBalance = newLeaveBalance;
        record.workDays = shift.workDays || [];
        await record.save();

        currentGracePeriod = record.remainingGracePeriod;
      }
    }

    const currentDate = new Date();
    const currentMonthStr = currentDate.toISOString().slice(0, 7);
    if (month === currentMonthStr && (attendance.checkIn || attendance.checkOut)) {
      await User.updateOne(
        { employeeCode: attendance.employeeCode },
        { $set: { remainingGracePeriod: attendance.remainingGracePeriod } }
      );
    }

    return res.status(200).json({
      success: true,
      message: `تم تعديل سجل الحضور بنجاح. باقي ${attendance.remainingGracePeriod} دقيقة من رصيد السماح الشهري`,
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
      if (!shift) {
        console.error(`Shift not found for user ${user.employeeCode}`);
        continue;
      }

      let remainingGracePeriod = user.remainingGracePeriod;
      if (remainingGracePeriod === null || isNaN(remainingGracePeriod)) {
        remainingGracePeriod = shift.gracePeriod || 0;
      }

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
          workDays: shift.workDays || [],
          shiftId: shift._id,
          leaveBalance: user.annualLeaveBalance || 0,
          attendanceStatus: 'إجازة رسمية',
          delayMinutes: 0,
          gracePeriod: shift.gracePeriod || 0,
          remainingGracePeriod,
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (mongoose.connection.readyState !== 1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ success: false, message: 'فشل الاتصال بقاعدة البيانات', error: 'MongoDB غير متصل' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ success: false, message: 'غير مصرح: التوكن غير موجود' });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'انتهت صلاحية التوكن، يرجى تسجيل الدخول مرة أخرى' });
      }
      return res.status(401).json({ success: false, message: 'التوكن غير صالح', error: err.message });
    }

    const { startDate, endDate, employeeCode, applyToAll } = req.body;
    if (!startDate || !endDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'تاريخ البداية والنهاية مطلوبان' });
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end || isNaN(start) || isNaN(end)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'تنسيق التاريخ غير صالح' });
    }

    const startISO = start.toISOString().split('T')[0];
    const endISO = end.toISOString().split('T')[0];
    if (new Date(endISO) < new Date(startISO)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
    }

    const dates = getAllDatesInRange(startISO, endISO);
    let users = [];
    if (applyToAll) {
      users = await User.find({}).session(session);
    } else if (employeeCode) {
      const user = await User.findOne({ employeeCode }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
      }
      users = [user];
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'كود الموظف مطلوب إذا لم يتم اختيار تطبيق على الجميع' });
    }

    const shifts = await Shift.find().session(session);
    const attendanceRecords = [];

    for (const user of users) {
      const shift = shifts.find((s) => s._id.toString() === user.shiftType?.toString());
      if (!shift) {
        console.error(`Shift not found for user ${user.employeeCode}`);
        continue;
      }

      const validLeaveDays = dates.filter(date => !isWeeklyOffDay(date, shift.workDays)).length;
      if (user.annualLeaveBalance < validLeaveDays && !applyToAll) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: `رصيد الإجازة السنوية للموظف ${user.employeeCode} غير كافٍ` });
      }

      const newLeaveBalance = applyToAll ? user.annualLeaveBalance : user.annualLeaveBalance - validLeaveDays;
      let remainingGracePeriod = user.remainingGracePeriod;
      if (remainingGracePeriod === null || isNaN(remainingGracePeriod)) {
        remainingGracePeriod = shift.gracePeriod || 0;
      }

      const existingRecords = await Attendance.find({
        employeeCode: user.employeeCode,
        date: { $in: dates }
      }).session(session);

      for (const date of dates) {
        if (isWeeklyOffDay(date, shift.workDays)) {
          console.log(`تخطي التاريخ ${date} لأنه إجازة أسبوعية للموظف ${user.employeeCode}`);
          continue;
        }

        const existingRecord = existingRecords.find(r => r.date === date);
        if (existingRecord && ['إجازة سنوية', 'إجازة رسمية', 'إجازة مرضية'].includes(existingRecord.attendanceStatus)) {
          console.log(`سجل موجود بالفعل للتاريخ ${date} للموظف ${user.employeeCode} بحالة ${existingRecord.attendanceStatus}`);
          continue;
        }

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
          workDays: shift.workDays || [],
          shiftId: shift._id,
          leaveBalance: newLeaveBalance,
          attendanceStatus: 'إجازة سنوية',
          delayMinutes: 0,
          gracePeriod: shift.gracePeriod || 0,
          remainingGracePeriod,
          deductedHours: 0,
          overtimeHours: 0,
          deductedDays: 0,  // تأكيد: 0 للسنوية
          leaveAllowance: 'لا يوجد',
          sickLeaveDeduction: 'none',
          isCrossDay: isShiftCrossDay(shift),
          isOfficialLeave: false,
        };
        attendanceRecords.push(attendanceRecord);
        console.log(`إنشاء سجل إجازة سنوية للموظف ${user.employeeCode} في ${date}`);
      }

      if (!applyToAll) {
        await User.updateOne(
          { employeeCode: user.employeeCode },
          { $set: { annualLeaveBalance: newLeaveBalance } },
          { session }
        );
        await updateAllAttendanceLeaveBalance(user.employeeCode, newLeaveBalance, session);
      }
    }

    if (attendanceRecords.length > 0) {
      await Attendance.deleteMany({
        date: { $in: dates },
        employeeCode: { $in: users.map(u => u.employeeCode) },
        attendanceStatus: { $nin: ['إجازة رسمية', 'إجازة مرضية', 'إجازة سنوية'] }
      }, { session });

      await Attendance.insertMany(attendanceRecords, { session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: 'تم تطبيق الإجازة السنوية بنجاح',
      data: attendanceRecords
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
      if (!shift) {
        console.error(`Shift not found for user ${user.employeeCode}`);
        continue;
      }

      const sickLeaveDeduction = shift.sickLeaveDeduction || 'quarter';
      const deductedDays = sickLeaveDeduction === 'quarter' ? 0.25 : sickLeaveDeduction === 'half' ? 0.5 : 1;

      let remainingGracePeriod = user.remainingGracePeriod;
      if (remainingGracePeriod === null || isNaN(remainingGracePeriod)) {
        remainingGracePeriod = shift.gracePeriod || 0;
      }

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
            workDays: shift.workDays || [],
            shiftId: shift._id,
            leaveBalance: user.annualLeaveBalance || 0,
            attendanceStatus: 'إجازة مرضية',
            delayMinutes: 0,
            gracePeriod: shift.gracePeriod || 0,
            remainingGracePeriod,
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

// الـ route الجديد لتعديل تعديلات الراتب (المخالفات والسلف)
exports.updateSalaryAdjustment = async (req, res) => {
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
    const { totalViolations, deductionViolationsInstallment, totalAdvances, deductionAdvancesInstallment } = req.body;

    if (!employeeCode || !monthYear) {
      return res.status(400).json({ success: false, message: 'كود الموظف والشهر مطلوبان' });
    }

    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    if (!user.salaryAdjustments) {
      user.salaryAdjustments = {};
    }

    user.salaryAdjustments[monthYear] = {
      totalViolations: totalViolations || 0,
      deductionViolationsInstallment: deductionViolationsInstallment || 0,
      totalAdvances: totalAdvances || 0,
      deductionAdvancesInstallment: deductionAdvancesInstallment || 0,
    };

    await user.save();

    return res.status(200).json({ success: true, message: 'تم تعديل تعديلات الراتب بنجاح' });
  } catch (error) {
    console.error('خطأ في updateSalaryAdjustment:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التعديل', error: error.message });
  }
};

// دالة لجلب تقرير الرواتب الشهري (معدلة لتشمل المخالفات والسلف)
//
//
exports.getMonthlySalaryReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeCode, shiftId } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد تاريخ البداية والنهاية' });
    }

    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ success: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
    }

    const monthYear = `${start.split('-')[0]}-${start.split('-')[1]}`; // مثل "2025-08"

    let userFilter = {};
    if (employeeCode) userFilter.employeeCode = employeeCode;
    if (shiftId) userFilter.shiftType = shiftId;

    const users = await User.find(userFilter).populate('shiftType');
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'لا يوجد موظفين مطابقين للمعايير' });
    }

    const attendanceTotals = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          employeeCode: { $in: users.map(u => u.employeeCode) }
        }
      },
      {
        $group: {
          _id: '$employeeCode',
          totalAttendanceDays: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$attendanceStatus', 'حاضر'] }, { $eq: ['$attendanceStatus', 'متأخر'] }] },
                1,
                0
              ]
            }
          },
          totalWeeklyOffDays: {
            $sum: { $cond: [{ $eq: ['$attendanceStatus', 'إجازة أسبوعية'] }, 1, 0] }
          },
          totalOfficialLeaveDays: {
            $sum: { $cond: [{ $eq: ['$attendanceStatus', 'إجازة رسمية'] }, 1, 0] }
          },
          totalAbsentDays: {
            $sum: { $cond: [{ $eq: ['$attendanceStatus', 'غائب'] }, 1, 0] }
          },
          totalOvertimeHours: { $sum: '$overtimeHours' },
          totalDeductedHours: { $sum: '$deductedHours' },
          totalDeductedDays: { $sum: '$deductedDays' },
          totalAnnualLeaveDays: {
            $sum: { $cond: [{ $eq: ['$attendanceStatus', 'إجازة سنوية'] }, 1, 0] }
          },
          totalSickLeaveDeduction: {
            $sum: { $cond: [{ $eq: ['$attendanceStatus', 'إجازة مرضية'] }, '$deductedDays', 0] }
          },
          totalLeaveAllowance: {
            $sum: { $cond: [{ $eq: ['$leaveAllowance', 'نعم'] }, 1, 0] }
          }
        }
      }
    ]);

    const report = [];
    for (const user of users) {
      // التحقق من shiftType
      if (!user.shiftType) {
        console.error(`User ${user.employeeCode} has no valid shiftType`);
        continue; // تخطي الموظف لو مافيش shiftType صالح
      }

      const totals = attendanceTotals.find(t => t._id === user.employeeCode) || {
        totalAttendanceDays: 0,
        totalWeeklyOffDays: 0,
        totalOfficialLeaveDays: 0,
        totalAbsentDays: 0,
        totalOvertimeHours: 0,
        totalDeductedHours: 0,
        totalDeductedDays: 0,
        totalAnnualLeaveDays: 0,
        totalSickLeaveDeduction: 0,
        totalLeaveAllowance: 0
      };

      const shift = user.shiftType;
      const hasMinutesDeduction = shift.deductions ? shift.deductions.some(d => d.type === 'minutes') : false;

      const dailySalary = user.basicSalary / 30;
      const hourlySalary = dailySalary / (shift.baseHours || 9);
      const overtimePay = totals.totalOvertimeHours * hourlySalary * 1.5;
      const deductedPay = hasMinutesDeduction
        ? totals.totalDeductedHours * hourlySalary
        : totals.totalDeductedDays * dailySalary;

      // جلب تعديلات الراتب
      const adjustment = user.salaryAdjustments?.[monthYear] || {
        totalViolations: 0,
        deductionViolationsInstallment: 0,
        totalAdvances: 0,
        deductionAdvancesInstallment: 0
      };

      // حساب إجمالي الخصومات والإضافات والصافي
      const totalDeductions = deductedPay + adjustment.deductionViolationsInstallment + adjustment.deductionAdvancesInstallment + (totals.totalSickLeaveDeduction * dailySalary);
      const totalAdditions = overtimePay;
      const netSalary = (totals.totalAttendanceDays * dailySalary) + totalAdditions - totalDeductions;

      report.push({
        employeeCode: user.employeeCode,
        employeeName: user.name,
        shiftName: shift.shiftName,
        totalAttendanceDays: totals.totalAttendanceDays,
        totalWeeklyOffDays: totals.totalWeeklyOffDays,
        totalOfficialLeaveDays: totals.totalOfficialLeaveDays,
        totalAbsentDays: totals.totalAbsentDays,
        totalOvertimeHours: roundNumber(totals.totalOvertimeHours, 1),
        totalDeductedHours: roundNumber(totals.totalDeductedHours, 1),
        totalDeductedDays: roundNumber(totals.totalDeductedDays, 1),
        totalAnnualLeaveDays: totals.totalAnnualLeaveDays,
        totalSickLeaveDeduction: roundNumber(totals.totalSickLeaveDeduction, 1),
        totalLeaveAllowance: totals.totalLeaveAllowance,
        annualLeaveBalance: user.annualLeaveBalance || 0,
        basicSalary: user.basicSalary,
        dailySalary: roundNumber(dailySalary, 2),
        hourlySalary: roundNumber(hourlySalary, 2),
        overtimePay: roundNumber(overtimePay, 2),
        deductedPay: roundNumber(deductedPay, 2),
        totalViolations: adjustment.totalViolations,
        deductionViolationsInstallment: adjustment.deductionViolationsInstallment,
        totalAdvances: adjustment.totalAdvances,
        deductionAdvancesInstallment: adjustment.deductionAdvancesInstallment,
        totalDeductions: roundNumber(totalDeductions, 2),
        totalAdditions: roundNumber(totalAdditions, 2),
        netSalary: roundNumber(netSalary, 2)
      });
    }

    return res.status(200).json({
      success: true,
      message: 'تم إنشاء التقرير الشهري بنجاح',
      data: report
    });
  } catch (error) {
    console.error('خطأ في getMonthlySalaryReport:', error.stack);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء التقرير', error: error.message });
  }
};
