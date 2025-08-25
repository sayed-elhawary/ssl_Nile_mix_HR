const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Shift = require('../models/Shift');
const xlsx = require('xlsx');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const SalaryAdjustment = require('../models/SalaryAdjustment');
const Advance = require('../models/Advance');
// دالة لتقريب الأرقام العشرية
const roundNumber = (num, decimals = 1) => {
  if (num == null || isNaN(num)) {
    console.warn(`Warning: roundNumber received invalid value: ${num}`);
    return 0;
  }
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
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

// دالة للتحقق مما إذا كان اليوم إجازة أسبوعية
// دالة للتحقق مما إذا كان اليوم إجازة أسبوعية
const isWeeklyOffDay = (date, workDays, shift) => {
  if (!Array.isArray(workDays) || workDays.length === 0) {
    console.error(`workDays غير معرفة أو فارغة للشيفت ${shift?.shiftName || 'غير معروف'} في التاريخ ${date}`);
    throw new Error('أيام العمل غير معرفة في إعدادات الشيفت');
  }
  const dayOfWeek = new Date(date).getDay();
  console.log(`التحقق مما إذا كان ${date} (اليوم ${dayOfWeek}) إجازة أسبوعية. workDays: ${workDays}`);
  if (shift && shift.shiftType === '24/24' && dayOfWeek === 5) {
    return true; // الجمعة إجازة لشيفت 24/24
  }
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
// calculateDeductions.js
const calculateDeductions = (shift, checkInTime, checkOutTime, checkInDate, checkOutDate, remainingGracePeriod, leaveAllowance, attendanceStatus) => {
  let deductedDays = 0;
  let deductedHours = 0;
  let delayMinutes = 0;
  let earlyLeaveMinutes = 0;
  let totalDelayMinutes = 0;
  let overtimeHours = 0;
  let newCheckIn = null;
  let status = attendanceStatus || 'حاضر';
  let isWorkedWeeklyOff = false;
  let delaySummary = '0 + 0';

  const baseHours = shift.baseHours || 9;
  const maxOvertimeHours = shift.maxOvertimeHours || (shift.shiftType === '24/24' ? 21 : 7);
  const maxDuration = baseHours + maxOvertimeHours;
  const shiftStartTime = shift.startTime || (shift.name === 'الاداره' ? '08:30' : shift.shiftType === 'مسائي' ? '20:00' : '08:00');
  const shiftEndTime = shift.endTime || (shift.name === 'الاداره' ? '17:30' : shift.shiftType === 'مسائي' ? '05:00' : '17:00');
  const overtimeMultiplier = shift.overtimeMultiplier || 0.7442;
  const fridayOvertimeMultiplier = shift.fridayOvertimeMultiplier || 0.7442;
  const fridayMaxOvertimeHours = shift.fridayMaxOvertimeHours || 30;

  const hasDayDeduction = shift.deductions?.some(d => ['quarter', 'half', 'full'].includes(d.type)) ?? false;
  const hasMinuteDeduction = shift.deductions?.some(d => d.type === 'minutes') ?? false;

  const isWeeklyOff = isWeeklyOffDay(checkInDate, shift.workDays, shift);
  const isFriday = new Date(checkInDate).getDay() === 5;

  if (['إجازة سنوية', 'إجازة أسبوعية', 'إجازة رسمية'].includes(status)) {
    return { deductedDays: 0, deductedHours: 0, delayMinutes: 0, earlyLeaveMinutes: 0, totalDelayMinutes: 0, overtimeHours: 0, remainingGracePeriod, newCheckIn, status, isWorkedWeeklyOff, delaySummary };
  }

  if (!checkInTime && !checkOutTime) {
    status = 'غائب';
    return { deductedDays: 1, deductedHours: 0, delayMinutes: 0, earlyLeaveMinutes: 0, totalDelayMinutes: 0, overtimeHours: 0, remainingGracePeriod, newCheckIn, status, isWorkedWeeklyOff, delaySummary };
  }

  if (checkInTime || checkOutTime) {
    if (isWeeklyOff && !isFriday) {
      isWorkedWeeklyOff = true;
      status = 'حاضر';
    }
  }

  if (!checkInTime && checkOutTime) {
    status = 'حاضر';
    return { deductedDays: 0, deductedHours: 0, delayMinutes: 0, earlyLeaveMinutes: 0, totalDelayMinutes: 0, overtimeHours: 0, remainingGracePeriod, newCheckIn, status, isWorkedWeeklyOff, delaySummary };
  }

  const checkIn = new Date(`${checkInDate}T${checkInTime}:00`);
  const checkOut = checkOutTime ? new Date(`${checkOutDate}T${checkOutTime}:00`) : null;

  const expectedStart = new Date(`${checkInDate}T${shiftStartTime}:00`);
  let expectedEnd = new Date(`${checkInDate}T${shiftEndTime}:00`);
  if (isShiftCrossDay(shift) || shift.shiftType === 'مسائي' || parseInt(shiftEndTime.split(':')[0]) < parseInt(shiftStartTime.split(':')[0])) {
    expectedEnd.setDate(expectedEnd.getDate() + 1);
  }

  let durationHours = checkOutTime ? calculateDurationHours(checkInTime, checkOutTime, checkInDate, checkOutDate) : 0;
  let durationMinutes = durationHours * 60;

  if (checkInTime && !checkOutTime && !isShiftCrossDay(shift)) {
    status = 'حاضر بدون انصراف';
    deductedHours = 0;
    return { deductedDays, deductedHours, delayMinutes, earlyLeaveMinutes, totalDelayMinutes, overtimeHours, remainingGracePeriod, newCheckIn, status, isWorkedWeeklyOff, delaySummary };
  }

  // حساب التأخير والانصراف المبكر
  if (!isFriday) {
    if (shift.shiftType === '24/24') {
      // شيفت 24/24
      if (checkOut && durationHours < baseHours) {
        delayMinutes = Math.round((baseHours - durationHours) * 60);
      }
      earlyLeaveMinutes = 0;
      totalDelayMinutes = delayMinutes;
      delaySummary = `${delayMinutes} + ${earlyLeaveMinutes}`;

      if (checkOut && durationHours > baseHours) {
        overtimeHours = Math.min(durationHours - baseHours, maxOvertimeHours);
        if (durationHours > maxDuration) {
          newCheckIn = { time: checkOutTime, date: checkOutDate };
          overtimeHours = maxOvertimeHours;
        }
      }
    } else {
      // شيفتات أخرى (إدارية أو مسائية)
      const checkInTimeObj = new Date(`2025-01-01T${checkInTime}:00`);
      const checkOutTimeObj = checkOutTime ? new Date(`2025-01-01T${checkOutTime}:00`) : null;
      let maxDeductionTime = null;

      // تحديد آخر وقت لخصم التأخير
      if (hasDayDeduction && shift.deductions) {
        const checkInDeductions = shift.deductions.filter(d => d.start >= shiftStartTime && d.type !== 'minutes');
        if (checkInDeductions.length > 0) {
          maxDeductionTime = checkInDeductions.reduce((max, d) => {
            const endTime = new Date(`2025-01-01T${d.end}:00`);
            return endTime > max ? endTime : max;
          }, new Date(`2025-01-01T00:00:00`));
        }
      }

      // حساب التأخير في الحضور
      if (checkInTimeObj >= new Date(`2025-01-01T${shiftStartTime}:00`) && (!maxDeductionTime || checkInTimeObj <= maxDeductionTime)) {
        const delayMs = Math.max(0, checkIn - expectedStart);
        delayMinutes = Math.round(delayMs / 60000);
      }

      // تحديد آخر وقت لخصم الانصراف المبكر
      maxDeductionTime = null;
      if (hasDayDeduction && shift.deductions) {
        const earlyLeaveDeductions = shift.deductions.filter(d => d.start < shiftEndTime && d.type !== 'minutes');
        if (earlyLeaveDeductions.length > 0) {
          maxDeductionTime = earlyLeaveDeductions.reduce((max, d) => {
            const endTime = new Date(`2025-01-01T${d.end}:00`);
            return endTime > max ? endTime : max;
          }, new Date(`2025-01-01T00:00:00`));
        }
      }

      // حساب الانصراف المبكر
      if (checkOut && checkOut < expectedEnd && (!maxDeductionTime || checkOutTimeObj <= maxDeductionTime)) {
        const earlyLeaveMs = Math.max(0, expectedEnd - checkOut);
        earlyLeaveMinutes = Math.round(earlyLeaveMs / 60000);
      }

      // حساب الساعات الإضافية (للشيفت المسائي والإداري)
      if (checkOut && checkOut > expectedEnd) {
        const overtimeMs = checkOut - expectedEnd;
        const overtimeHoursRaw = overtimeMs / (1000 * 60 * 60);
        overtimeHours = roundNumber(overtimeHoursRaw * overtimeMultiplier, 1);
        overtimeHours = Math.min(overtimeHours, maxOvertimeHours);
      }

      totalDelayMinutes = delayMinutes + earlyLeaveMinutes;
      delaySummary = `${delayMinutes} + ${earlyLeaveMinutes}`;
    }
  } else {
    // يوم الجمعة
    delayMinutes = 0;
    earlyLeaveMinutes = 0;
    totalDelayMinutes = 0;
    delaySummary = '0 + 0';
    if (checkOut) {
      overtimeHours = roundNumber(durationHours * fridayOvertimeMultiplier, 1);
      overtimeHours = Math.min(overtimeHours, fridayMaxOvertimeHours);
      deductedDays = 0;
      deductedHours = 0;
    }
  }

  if ((status === 'حاضر' || status === 'متأخر') && isWeeklyOff && !isFriday) {
    isWorkedWeeklyOff = true;
  }

  // منطق الخصومات
  if (!isFriday && totalDelayMinutes > 0) {
    const checkInTimeObj = new Date(`2025-01-01T${checkInTime}:00`);
    const checkOutTimeObj = checkOutTime ? new Date(`2025-01-01T${checkOutTime}:00`) : null;
    let deductionStartTime = new Date(`2025-01-01T${shiftStartTime}:00`);
    let deductionEndTime = new Date(`2025-01-01T${shiftEndTime}:00`);

    if (shift.shiftType !== '24/24') {
      let checkInDeduction = null;
      let earlyLeaveDeduction = null;

      if (hasDayDeduction && shift.deductions) {
        if (checkInTimeObj >= deductionStartTime) {
          for (const deduction of shift.deductions) {
            let dedStart = new Date(`2025-01-01T${deduction.start}:00`);
            let dedEnd = new Date(`2025-01-01T${deduction.end}:00`);
            if (checkInTimeObj >= dedStart && checkInTimeObj <= dedEnd && deduction.type !== 'minutes') {
              checkInDeduction = deduction;
              break;
            }
          }
        }

        if (checkOutTimeObj && checkOutTimeObj < deductionEndTime) {
          for (const deduction of shift.deductions) {
            let dedStart = new Date(`2025-01-01T${deduction.start}:00`);
            let dedEnd = new Date(`2025-01-01T${deduction.end}:00`);
            if (checkOutTimeObj >= dedStart && checkOutTimeObj <= dedEnd && deduction.type !== 'minutes') {
              earlyLeaveDeduction = deduction;
              break;
            }
          }
        }

        if (checkInDeduction || earlyLeaveDeduction) {
          if (totalDelayMinutes <= remainingGracePeriod) {
            remainingGracePeriod -= totalDelayMinutes;
            deductedDays = 0;
            deductedHours = 0;
          } else {
            remainingGracePeriod = 0;
            deductedDays = 0;

            if (checkInDeduction && checkInDeduction.type !== 'minutes') {
              switch (checkInDeduction.type) {
                case 'quarter':
                  deductedDays += 0.25;
                  break;
                case 'half':
                  deductedDays += 0.5;
                  break;
                case 'full':
                  deductedDays += 1;
                  break;
              }
            }

            if (earlyLeaveDeduction && earlyLeaveDeduction.type !== 'minutes') {
              switch (earlyLeaveDeduction.type) {
                case 'quarter':
                  deductedDays += 0.25;
                  break;
                case 'half':
                  deductedDays += 0.5;
                  break;
                case 'full':
                  deductedDays += 1;
                  break;
              }
            }
          }
        } else if (hasMinuteDeduction && shift.deductions) {
          const minuteDeduction = shift.deductions.find(d => d.type === 'minutes');
          if (minuteDeduction && (checkInTimeObj >= new Date(`2025-01-01T${minuteDeduction.start}:00`) || (checkOutTimeObj && checkOutTimeObj < deductionEndTime))) {
            if (totalDelayMinutes > remainingGracePeriod) {
              const excessDelayMinutes = totalDelayMinutes - remainingGracePeriod;
              remainingGracePeriod = 0;
              deductedHours = roundNumber(excessDelayMinutes / 60, 1);
            } else {
              remainingGracePeriod -= totalDelayMinutes;
              deductedHours = 0;
            }
          }
        }
      } else if (hasMinuteDeduction && shift.deductions) {
        const minuteDeduction = shift.deductions.find(d => d.type === 'minutes');
        if (minuteDeduction) {
          deductionStartTime = new Date(`2025-01-01T${minuteDeduction.start}:00`);
        }
        if (checkInTimeObj >= deductionStartTime || (checkOutTimeObj && checkOutTimeObj < deductionEndTime)) {
          if (totalDelayMinutes <= remainingGracePeriod) {
            remainingGracePeriod -= totalDelayMinutes;
            deductedDays = 0;
            deductedHours = 0;
          } else {
            const excessDelayMinutes = totalDelayMinutes - remainingGracePeriod;
            remainingGracePeriod = 0;
            deductedHours = roundNumber(excessDelayMinutes / 60, 1);
            deductedDays = 0;
          }
        }
      }
    } else {
      // شيفت 24/24
      if (totalDelayMinutes > remainingGracePeriod) {
        const excessDelayMinutes = totalDelayMinutes - remainingGracePeriod;
        remainingGracePeriod = 0;
        deductedHours = roundNumber(excessDelayMinutes / 60, 1);
      } else {
        remainingGracePeriod -= totalDelayMinutes;
        deductedHours = 0;
      }
    }
  }

  if (totalDelayMinutes > (shift.gracePeriod || 0) && !isFriday) {
    status = 'متأخر';
  }

  return {
    deductedDays,
    deductedHours,
    delayMinutes,
    earlyLeaveMinutes,
    totalDelayMinutes,
    overtimeHours,
    remainingGracePeriod,
    newCheckIn,
    status,
    isWorkedWeeklyOff,
    delaySummary
  };
};
// دالة مساعدة لحساب المدة بالساعات
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

        const isWeeklyOff = isWeeklyOffDay(date, shift.workDays, shift);

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
              workDays: shift.workDays,
              shiftId: shift._id,
              leaveBalance: user.annualLeaveBalance || 0,
              attendanceStatus: isWeeklyOff ? 'إجازة أسبوعية' : 'حاضر',
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
              isWorkedWeeklyOff: isWeeklyOff,
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
              workDays: shift.workDays,
              shiftId: shift._id,
              leaveBalance: user.annualLeaveBalance || 0,
              attendanceStatus: isWeeklyOff ? 'إجازة أسبوعية' : (isCheckIn ? 'حاضر' : 'غائب'),
              delayMinutes: 0,
              gracePeriod: shift.gracePeriod || 0,
              remainingGracePeriod: 0,
              deductedHours: 0,
              overtimeHours: 0,
              deductedDays: isWeeklyOff ? 0 : 1,
              leaveAllowance: 'لا يوجد',
              sickLeaveDeduction: 'none',
              isCrossDay: false,
              isOfficialLeave: false,
              isWorkedWeeklyOff: isWeeklyOff && (isCheckIn || time),
            };
          } else {
            if (isCheckIn && (!groupedData[key].checkIn || time < groupedData[key].checkIn)) {
              groupedData[key].checkIn = time;
              groupedData[key].checkInDate = date;
              groupedData[key].isWorkedWeeklyOff = isWeeklyOff;
            } else if (!isCheckIn && (!groupedData[key].checkOut || time > groupedData[key].checkOut)) {
              groupedData[key].checkOut = time;
              groupedData[key].checkOutDate = date;
              groupedData[key].isWorkedWeeklyOff = isWeeklyOff;
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

        let { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod, newCheckIn, isWorkedWeeklyOff } = calculateDeductions(
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
              workDays: shift.workDays,
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
              isWorkedWeeklyOff: isWeeklyOffDay(newCheckIn.date, shift.workDays, shift),
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
          record.attendanceStatus = (record.checkIn || record.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : (isWeeklyOffDay(record.date, shift.workDays, shift) ? 'إجازة أسبوعية' : 'غائب');
          record.deductedDays = (record.checkIn || record.checkOut) ? deductedDays : (isWeeklyOffDay(record.date, shift.workDays, shift) ? 0 : 1);
          record.isWorkedWeeklyOff = isWorkedWeeklyOff;
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

        const isWeeklyOff = isWeeklyOffDay(date, shift.workDays, shift);

        if (existingRecord && ['إجازة سنوية', 'إجازة رسمية', 'إجازة مرضية'].includes(existingRecord.attendanceStatus)) {
          existingRecord.workDays = shift.workDays;
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

        if (!existingRecord && isWeeklyOff) {
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
            isWorkedWeeklyOff: false,
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
            workDays: shift.workDays,
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
            isWorkedWeeklyOff: false,
          });
          await newRecord.save();
          result.push(newRecord);
          continue;
        }

        existingRecord.workDays = shift.workDays;

        const { deductedDays, deductedHours, delayMinutes, overtimeHours, remainingGracePeriod, newCheckIn, isWorkedWeeklyOff } = calculateDeductions(
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
              workDays: shift.workDays,
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
              isWorkedWeeklyOff: false,
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
          existingRecord.attendanceStatus = (existingRecord.checkIn || existingRecord.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : (isWeeklyOff ? 'إجازة أسبوعية' : 'غائب');
          existingRecord.deductedDays = (existingRecord.checkIn || existingRecord.checkOut) ? deductedDays : (isWeeklyOff ? 0 : 1);
          existingRecord.shiftName = shift.shiftName;
          existingRecord.leaveBalance = user.annualLeaveBalance || 0;
          existingRecord.isWorkedWeeklyOff = isWorkedWeeklyOff;
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
      totalWorkedWeeklyOffDays: result.reduce((sum, r) => sum + (r.isWorkedWeeklyOff ? 1 : 0), 0),
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
// دالة للحذف جميع سجلات الحضور
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
      if (user && !isWeeklyOffDay(leave.date, (await Shift.findById(user.shiftType))?.workDays || [], await Shift.findById(user.shiftType))) {
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

    if (attendance.attendanceStatus === 'إجازة سنوية' && attendanceStatus !== 'إجازة سنوية' && !isWeeklyOffDay(attendance.date, shift.workDays, shift)) {
      newLeaveBalance += 1;
      await User.updateOne(
        { employeeCode: attendance.employeeCode },
        { $set: { annualLeaveBalance: newLeaveBalance } }
      );
      await updateAllAttendanceLeaveBalance(attendance.employeeCode, newLeaveBalance);
    }

    if (attendanceStatus === 'إجازة سنوية' && attendance.attendanceStatus !== 'إجازة سنوية' && !isWeeklyOffDay(attendance.date, shift.workDays, shift)) {
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
      attendance.attendanceStatus = (attendance.checkIn || attendance.checkOut) ? (isWeeklyOffDay(attendance.date, shift.workDays, shift) ? 'إجازة أسبوعية' : 'حاضر') : (isWeeklyOffDay(attendance.date, shift.workDays, shift) ? 'إجازة أسبوعية' : 'غائب');
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
      attendance.attendanceStatus = (attendance.checkIn || attendance.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : (isWeeklyOffDay(attendance.date, shift.workDays, shift) ? 'إجازة أسبوعية' : 'غائب');
      attendance.isCrossDay = isShiftCrossDay(shift);

      if (newCheckIn && isShiftCrossDay(shift)) {
        const newKey = `${attendance.employeeCode}_${newCheckIn.date}`;
        const existingNewRecord = await Attendance.findOne({
          employeeCode: attendance.employeeCode,
          date: newCheckIn.date
        });
        if (!existingNewRecord) {
          const newRecord = {
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
          };
          await Attendance.create(newRecord);
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
      if (attendanceStatus === 'إجازة مرضية') {
        attendance.deductedDays = deductedDays;
      } else {
        attendance.deductedDays = attendanceStatus === 'غائب' ? 1 : 0;
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
        record.attendanceStatus = (record.checkIn || record.checkOut) ? (delayMinutes > (shift.gracePeriod || 0) && shift.shiftType === 'morning' ? 'متأخر' : 'حاضر') : (isWeeklyOffDay(record.date, shift.workDays, shift) ? 'إجازة أسبوعية' : 'غائب');
        record.deductedDays = (record.checkIn || record.checkOut) ? deductedDays : (isWeeklyOffDay(record.date, shift.workDays, shift) ? 0 : 1);
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

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end || isNaN(start) || isNaN(end)) {
      return res.status(400).json({ success: false, message: 'تنسيق التاريخ غير صالح' });
    }

    const startISO = start.toISOString().split('T')[0];
    const endISO = end.toISOString().split('T')[0];
    if (new Date(endISO) < new Date(startISO)) {
      return res.status(400).json({ success: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
    }

    const dates = getAllDatesInRange(startISO, endISO);
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

      const validLeaveDays = dates.filter(date => !isWeeklyOffDay(date, shift.workDays, shift)).length;
      if (user.annualLeaveBalance < validLeaveDays && !applyToAll) {
        return res.status(400).json({ success: false, message: `رصيد الإجازة السنوية للموظف ${user.employeeCode} غير كافٍ` });
      }

      const newLeaveBalance = applyToAll ? user.annualLeaveBalance : user.annualLeaveBalance - validLeaveDays;
      let remainingGracePeriod = user.remainingGracePeriod || shift.gracePeriod || 0;

      const existingRecords = await Attendance.find({
        employeeCode: user.employeeCode,
        date: { $in: dates }
      });

      for (const date of dates) {
        if (isWeeklyOffDay(date, shift.workDays, shift)) {
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
          deductedDays: 0,
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
          { $set: { annualLeaveBalance: newLeaveBalance } }
        );
        await updateAllAttendanceLeaveBalance(user.employeeCode, newLeaveBalance);
      }
    }

    if (attendanceRecords.length > 0) {
      await Attendance.deleteMany({
        date: { $in: dates },
        employeeCode: { $in: users.map(u => u.employeeCode) },
        attendanceStatus: { $nin: ['إجازة رسمية', 'إجازة سنوية', 'إجازة مرضية'] }
      });

      await Attendance.insertMany(attendanceRecords);
    }

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
//
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

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end || isNaN(start) || isNaN(end)) {
      return res.status(400).json({ success: false, message: 'تنسيق التاريخ غير صالح' });
    }

    const startISO = start.toISOString().split('T')[0];
    const endISO = end.toISOString().split('T')[0];
    if (new Date(endISO) < new Date(startISO)) {
      return res.status(400).json({ success: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
    }

    const dates = getAllDatesInRange(startISO, endISO);
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

      let remainingGracePeriod = user.remainingGracePeriod || shift.gracePeriod || 0;

      for (const date of dates) {
        // حذف فحص الإجازة الأسبوعية لتطبيق الإجازة المرضية على كل الأيام
        const existingRecord = await Attendance.findOne({
          employeeCode: user.employeeCode,
          date
        });

        if (existingRecord && ['إجازة سنوية', 'إجازة رسمية', 'إجازة مرضية'].includes(existingRecord.attendanceStatus)) {
          console.log(`سجل موجود بالفعل للتاريخ ${date} للموظف ${user.employeeCode} بحالة ${existingRecord.attendanceStatus}`);
          continue;
        }

        const sickLeaveDeduction = shift.sickLeaveDeduction || 'quarter';
        const deductedDays = sickLeaveDeduction === 'quarter' ? 0.25 : sickLeaveDeduction === 'half' ? 0.5 : 1;

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
        console.log(`إنشاء سجل إجازة مرضية للموظف ${user.employeeCode} في ${date}`);
      }
    }

    if (attendanceRecords.length > 0) {
      await Attendance.deleteMany({
        date: { $in: dates },
        employeeCode: { $in: users.map(u => u.employeeCode) },
        attendanceStatus: { $nin: ['إجازة رسمية', 'إجازة سنوية', 'إجازة مرضية'] }
      });

      await Attendance.insertMany(attendanceRecords);
    }

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



exports.getMonthlySalaryReport = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB connection failed');
      return res.status(500).json({ success: false, message: 'فشل الاتصال بقاعدة البيانات', error: 'MongoDB غير متصل' });
    }

    const { yearMonth, employeeCode, shiftId } = req.query;
    if (!yearMonth) {
      console.error('Missing yearMonth parameter');
      return res.status(400).json({ success: false, message: 'يرجى تحديد الشهر (YYYY-MM)' });
    }

    const [year, month] = yearMonth.split('-');
    if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      console.error(`Invalid yearMonth format: ${yearMonth}`);
      return res.status(400).json({ success: false, message: 'تنسيق الشهر غير صالح، استخدم YYYY-MM' });
    }

    const startDate = new Date(`${yearMonth}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    console.log(`Processing report for ${yearMonth}, start: ${startDateStr}, end: ${endDateStr}`);

    const query = employeeCode ? { employeeCode } : {};
    if (shiftId) {
      if (!mongoose.Types.ObjectId.isValid(shiftId)) {
        console.error(`Invalid shiftId: ${shiftId}`);
        return res.status(400).json({ success: false, message: 'معرف الشيفت غير صالح' });
      }
      query.shiftType = shiftId;
    }

    const users = await User.find(query);
    if (!users.length) {
      console.error('No users found for query:', query);
      return res.status(404).json({ success: false, message: 'لا يوجد موظفين بهذا الكود أو الشيفت' });
    }

    const shifts = await Shift.find();
    if (!shifts.length) {
      console.error('No shifts found in database');
      return res.status(404).json({ success: false, message: 'لا توجد شيفتات مسجلة' });
    }

    const attendanceQuery = {
      date: { $gte: startDateStr, $lte: endDateStr },
      ...(employeeCode && { employeeCode }),
      ...(shiftId && { shiftId })
    };
    const attendances = await Attendance.find(attendanceQuery).sort({ employeeCode: 1, date: 1 });
    const allDates = getAllDatesInRange(startDateStr, endDateStr).sort();

    const result = [];
    const totalsByEmployee = {};

    for (const user of users) {
      if (!user.shiftType || !mongoose.Types.ObjectId.isValid(user.shiftType)) {
        console.warn(`Invalid or missing shiftType for user ${user.employeeCode}. Skipping user.`);
        continue;
      }

      const shift = shifts.find((s) => s._id.toString() === user.shiftType?.toString());
      if (!shift) {
        console.warn(`Shift not found for user ${user.employeeCode}. Skipping user.`);
        continue;
      }

      if (!shift.workDays || !Array.isArray(shift.workDays) || shift.workDays.length === 0) {
        console.warn(`workDays is not defined or empty for shift ${shift.shiftName} (user ${user.employeeCode}). Skipping user.`);
        continue;
      }

      const basicSalary = user.basicSalary;
      const totalSalaryWithAllowances = user.totalSalaryWithAllowances;
      const medicalInsurance = user.medicalInsurance || 0;
      const socialInsurance = user.socialInsurance || 0;
      const mealAllowance = user.mealAllowance || 0;

      if (!basicSalary || !totalSalaryWithAllowances) {
        console.warn(`Missing required fields for user ${user.employeeCode}: basicSalary or totalSalaryWithAllowances`);
        continue;
      }

      let salaryAdjustments = user.salaryAdjustments?.get(yearMonth) || null;
      if (!user.salaryAdjustments?.has(yearMonth)) {
        const months = Array.from(user.salaryAdjustments.keys() || []).filter(m => m < yearMonth).sort((a, b) => b.localeCompare(a));
        let prevRemainingViolations = 0;
        let prevRemainingAdvances = 0;
        if (months.length > 0) {
          const prevMonth = months[0];
          const prevAdj = user.salaryAdjustments.get(prevMonth);
          prevRemainingViolations = prevAdj.remainingViolations || 0;
          prevRemainingAdvances = prevAdj.remainingAdvances || 0;
        }

        // جلب السلف النشطة للشهر الحالي
        console.log(`Fetching advances for employee ${user.employeeCode} for ${yearMonth}`);
        const activeAdvances = await Advance.find({
          employeeCode: user.employeeCode,
          advanceDate: { $lte: endDateStr },
          finalRepaymentDate: { $gte: startDateStr },
          status: 'active'
        });
        console.log(`Found ${activeAdvances.length} active advances for ${user.employeeCode}:`, activeAdvances);

        let newAdvancesSum = 0;
        let activeMonthlySum = 0;

        for (const advance of activeAdvances) {
          if (!advance.isIncluded) {
            newAdvancesSum += advance.advanceAmount;
            advance.isIncluded = true;
            await advance.save();
            console.log(`Marked advance ${advance._id} as included for ${user.employeeCode}`);
          }
          // التحقق من أن القسط لم يُخصم لهذا الشهر
          if (advance.lastDeductionMonth !== yearMonth) {
            activeMonthlySum += advance.monthlyInstallment;
            const newRemainingAmount = advance.remainingAmount - advance.monthlyInstallment;
            advance.remainingAmount = Math.max(newRemainingAmount, 0);
            advance.lastDeductionMonth = yearMonth;
            if (advance.remainingAmount === 0) {
              advance.status = 'completed';
            }
            await advance.save();
            console.log(`Updated advance ${advance._id} for ${user.employeeCode}: remainingAmount=${advance.remainingAmount}, status=${advance.status}, lastDeductionMonth=${yearMonth}`);
          } else {
            console.log(`Advance ${advance._id} for ${user.employeeCode} already deducted for ${yearMonth}`);
          }
        }
        console.log(`New advances sum for ${user.employeeCode}: ${newAdvancesSum}`);
        console.log(`Active monthly installment sum for ${user.employeeCode}: ${activeMonthlySum}`);

        // تهيئة salaryAdjustments مع إجمالي السلف التلقائي
        salaryAdjustments = {
          totalViolations: prevRemainingViolations,
          deductionViolationsInstallment: 0,
          totalAdvances: prevRemainingAdvances + newAdvancesSum,
          deductionAdvancesInstallment: Math.min(activeMonthlySum, prevRemainingAdvances + newAdvancesSum),
          occasionBonus: 0,
          remainingViolations: prevRemainingViolations,
          remainingAdvances: (prevRemainingAdvances + newAdvancesSum) - Math.min(activeMonthlySum, prevRemainingAdvances + newAdvancesSum),
        };

        // حفظ التعديلات في User و SalaryAdjustment
        user.salaryAdjustments.set(yearMonth, salaryAdjustments);
        await user.save();
        console.log(`Saved salary adjustments for ${user.employeeCode} for ${yearMonth}:`, salaryAdjustments);

        await SalaryAdjustment.findOneAndUpdate(
          { employeeCode: user.employeeCode, month: yearMonth },
          salaryAdjustments,
          { upsert: true, new: true }
        );
      } else {
        salaryAdjustments.remainingViolations = salaryAdjustments.remainingViolations || (salaryAdjustments.totalViolations - salaryAdjustments.deductionViolationsInstallment);
        salaryAdjustments.remainingAdvances = salaryAdjustments.remainingAdvances || (salaryAdjustments.totalAdvances - salaryAdjustments.deductionAdvancesInstallment);

        // تحديث remainingAmount في نموذج Advance لضمان التزامن
        const activeAdvances = await Advance.find({
          employeeCode: user.employeeCode,
          advanceDate: { $lte: endDateStr },
          finalRepaymentDate: { $gte: startDateStr },
          status: 'active'
        });
        for (const advance of activeAdvances) {
          if (advance.lastDeductionMonth !== yearMonth) {
            const newRemainingAmount = advance.remainingAmount - advance.monthlyInstallment;
            advance.remainingAmount = Math.max(newRemainingAmount, 0);
            advance.lastDeductionMonth = yearMonth;
            if (advance.remainingAmount === 0) {
              advance.status = 'completed';
            }
            await advance.save();
            console.log(`Updated advance ${advance._id} for ${user.employeeCode}: remainingAmount=${advance.remainingAmount}, status=${advance.status}, lastDeductionMonth=${yearMonth}`);
          } else {
            console.log(`Advance ${advance._id} for ${user.employeeCode} already deducted for ${yearMonth}`);
          }
        }
      }

      const dailyRate = totalSalaryWithAllowances / 30;
      const hourlyDeductionRate = dailyRate / (shift.baseHours || 9);
      const hourlyOvertimeRate =
        shift.overtimeBasis === 'basicSalary'
          ? (basicSalary / (30 * (shift.baseHours || 9))) * (shift.overtimeMultiplier || 1)
          : (totalSalaryWithAllowances / (30 * (shift.baseHours || 9))) * (shift.overtimeMultiplier || 1);
      const fridayHourlyOvertimeRate =
        shift.fridayOvertimeBasis === 'basicSalary'
          ? (basicSalary / (30 * (shift.baseHours || 9))) * (shift.fridayOvertimeMultiplier || 1)
          : (totalSalaryWithAllowances / (30 * (shift.baseHours || 9))) * (shift.fridayOvertimeMultiplier || 1);

      let totalOvertimeHours = 0;
      let totalDeductedHours = 0;
      let totalDeductedDays = 0;
      let totalAttendanceDays = 0;
      let totalAbsentDays = 0;
      let totalWeeklyOffDays = 0;
      let totalAnnualLeaveDays = 0;
      let totalSickLeaveDeduction = 0;
      let totalOfficialLeaveDays = 0;
      let totalLeaveAllowance = 0;
      let mealAllowanceDeduction = 0;

      for (const date of allDates) {
        let record = attendances.find((a) => a.employeeCode === user.employeeCode && a.date === date);
        if (!record) {
          const attendanceStatus = isWeeklyOffDay(date, shift.workDays, shift) ? 'إجازة أسبوعية' : 'غائب';
          record = new Attendance({
            employeeCode: user.employeeCode,
            employeeName: user.name,
            date,
            attendanceStatus,
            deductedDays: isWeeklyOffDay(date, shift.workDays, shift) ? 0 : 1,
            overtimeHours: 0,
            deductedHours: 0,
            sickLeaveDeduction: 'none',
            leaveAllowance: 'لا يوجد',
            shiftId: shift._id,
            shiftType: shift.shiftType,
            shiftName: shift.shiftName,
            workDays: shift.workDays,
            leaveBalance: user.annualLeaveBalance || 21,
            gracePeriod: 0,
            remainingGracePeriod: 0
          });
          await record.save();
        }

        if (['غائب', 'إجازة سنوية', 'إجازة مرضية'].includes(record.attendanceStatus)) {
          mealAllowanceDeduction += 50;
        }

        const isFriday = new Date(date).getDay() === 5;
        const overtimeRate = isFriday ? fridayHourlyOvertimeRate : hourlyOvertimeRate;
        const overtimeAmountForDay = Number(record.overtimeHours || 0) * overtimeRate;

        result.push({
          ...record._doc,
          basicSalary,
          totalSalaryWithAllowances,
          overtimeAmountForDay
        });

        totalOvertimeHours += Number(record.overtimeHours || 0);
        totalDeductedHours += Number(record.deductedHours || 0);
        totalDeductedDays += Number(record.deductedDays || 0);
        totalAttendanceDays += (record.attendanceStatus === 'حاضر' || record.attendanceStatus === 'متأخر') ? 1 : 0;
        totalAbsentDays += record.attendanceStatus === 'غائب' ? 1 : 0;
        totalWeeklyOffDays += record.attendanceStatus === 'إجازة أسبوعية' ? 1 : 0;
        totalAnnualLeaveDays += record.attendanceStatus === 'إجازة سنوية' ? 1 : 0;
        totalSickLeaveDeduction += record.attendanceStatus === 'إجازة مرضية' ? Number(record.deductedDays || 0) : 0;
        totalOfficialLeaveDays += record.attendanceStatus === 'إجازة رسمية' ? 1 : 0;
        totalLeaveAllowance += record.leaveAllowance === 'نعم' ? dailyRate : 0;
      }

      mealAllowanceDeduction = Math.min(mealAllowanceDeduction, mealAllowance);
      const deductedDaysAmount = totalDeductedDays * dailyRate;
      const deductedHoursAmount = totalDeductedHours * hourlyDeductionRate;
      const violationDeduction = Number(salaryAdjustments.deductionViolationsInstallment || 0);
      const advanceDeduction = Number(salaryAdjustments.deductionAdvancesInstallment || 0);
      const occasionBonus = Number(salaryAdjustments.occasionBonus || 0);

      let totalOvertimeAmount = 0;
      for (const date of allDates) {
        const isFriday = new Date(date).getDay() === 5;
        const record = result.find((r) => r.employeeCode === user.employeeCode && r.date === date);
        totalOvertimeAmount += record.overtimeAmountForDay || 0;
      }

      const totalOvertimeAmountFinal = Number(totalSalaryWithAllowances + mealAllowance + totalOvertimeAmount + occasionBonus + totalLeaveAllowance);
      const totalDeductions = Number(medicalInsurance + socialInsurance + mealAllowanceDeduction + deductedDaysAmount + violationDeduction + advanceDeduction + deductedHoursAmount);
      const finalSalary = Number(totalOvertimeAmountFinal - totalDeductions);

      totalsByEmployee[user.employeeCode] = {
        employeeCode: user.employeeCode,
        employeeName: user.name,
        basicSalary,
        totalSalaryWithAllowances,
        medicalInsurance,
        socialInsurance,
        mealAllowance,
        mealAllowanceDeduction,
        remainingMealAllowance: mealAllowance - mealAllowanceDeduction,
        shiftName: shift.shiftName,
        totalAttendanceDays,
        totalWeeklyOffDays,
        totalLeaveAllowance,
        totalAbsentDays,
        totalDeductedHours,
        totalAnnualLeaveDays,
        totalSickLeaveDeduction,
        annualLeaveBalance: user.annualLeaveBalance || 21,
        totalOfficialLeaveDays,
        totalDeductedDays,
        totalOvertimeHours,
        specialBonus: occasionBonus,
        totalViolationsFull: Number(salaryAdjustments.totalViolations || 0),
        totalViolations: Number(salaryAdjustments.remainingViolations || 0),
        violationDeduction: Number(salaryAdjustments.deductionViolationsInstallment || 0),
        totalLoansFull: Number(salaryAdjustments.totalAdvances || 0),
        totalLoans: Number(salaryAdjustments.remainingAdvances || 0),
        loanDeduction: Number(salaryAdjustments.deductionAdvancesInstallment || 0),
        totalDeductions,
        totalOvertimeAmount: totalOvertimeAmountFinal,
        finalSalary,
        deductedDaysAmount
      };
    }

    return res.status(200).json({
      success: true,
      message: 'تم جلب تقرير الراتب الشهري بنجاح',
      data: result,
      totals: Object.values(totalsByEmployee)
    });
  } catch (error) {
    console.error('خطأ في getMonthlySalaryReport:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب تقرير الراتب الشهري',
      error: error.message,
      stack: error.stack
    });
  }
};

exports.updateSalaryAdjustment = async (req, res) => {
  try {
    const { employeeCode, yearMonth } = req.params;
    const { totalViolations = 0, violationDeduction = 0, totalLoans = 0, loanDeduction = 0, occasionBonus = 0 } = req.body;

    // التحقق من وجود المعلمات المطلوبة
    if (!employeeCode || !yearMonth) {
      console.error(`خطأ: كود الموظف أو الشهر مفقود. employeeCode: ${employeeCode}, yearMonth: ${yearMonth}`);
      return res.status(400).json({
        success: false,
        message: 'كود الموظف والشهر مطلوبان',
        data: null,
      });
    }

    const [year, month] = yearMonth.split('-');
    if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      console.error(`خطأ: تنسيق الشهر غير صالح. yearMonth: ${yearMonth}`);
      return res.status(400).json({
        success: false,
        message: 'تنسيق الشهر غير صالح، استخدم YYYY-MM',
        data: null,
      });
    }

    const startDateStr = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, parseInt(month), 0);
    const endDateStr = endDate.toISOString().split('T')[0];

    // التحقق من وجود الموظف
    const user = await User.findOne({ employeeCode });
    if (!user) {
      console.error(`خطأ: الموظف غير موجود. employeeCode: ${employeeCode}`);
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود',
        data: null,
      });
    }

    // التحقق من صحة القيم
    if (
      totalViolations < 0 ||
      violationDeduction < 0 ||
      loanDeduction < 0 ||
      occasionBonus < 0
    ) {
      console.error(`خطأ: القيم لا يمكن أن تكون سالبة. totalViolations: ${totalViolations}, violationDeduction: ${violationDeduction}, loanDeduction: ${loanDeduction}, occasionBonus: ${occasionBonus}`);
      return res.status(400).json({
        success: false,
        message: 'القيم لا يمكن أن تكون سالبة',
        data: null,
      });
    }

    // حساب الشهر السابق
    let prevYear = parseInt(year);
    let prevMonth = parseInt(month) - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const previousYearMonth = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;

    // جلب تعديل الراتب للشهر السابق
    const previousAdjustment = await SalaryAdjustment.findOne({ employeeCode, month: previousYearMonth });

    // القيم المتبقية من الشهر السابق
    let prevRemainingViolations = previousAdjustment ? previousAdjustment.remainingViolations || 0 : 0;
    let prevRemainingAdvances = previousAdjustment ? previousAdjustment.remainingAdvances || 0 : 0;

    // جلب السلف النشطة للشهر الحالي
    console.log(`Fetching advances for employee ${employeeCode} for ${yearMonth}`);
    const activeAdvances = await Advance.find({
      employeeCode,
      advanceDate: { $lte: endDateStr },
      finalRepaymentDate: { $gte: startDateStr },
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
      activeMonthlySum += advance.monthlyInstallment;
    }
    console.log(`New advances sum for ${employeeCode}: ${newAdvancesSum}`);
    console.log(`Active monthly installment sum for ${employeeCode}: ${activeMonthlySum}`);

    // الإجمالي الفعال للسلف (المتبقي السابق + السلف الجديدة + أي إجمالي يدوي إضافي إن وجد)
    const effectiveTotalAdvances = prevRemainingAdvances + newAdvancesSum + Number(totalLoans);

    // الإجمالي الفعال للمخالفات (المتبقي السابق + الجديدة اليدوية)
    const effectiveTotalViolations = prevRemainingViolations + Number(totalViolations);

    // التحقق من أن الخصومات لا تتجاوز الإجمالي
    if (violationDeduction > effectiveTotalViolations) {
      console.error(`خطأ: قسط المخالفات أكبر من إجمالي المخالفات. violationDeduction: ${violationDeduction}, effectiveTotalViolations: ${effectiveTotalViolations}`);
      return res.status(400).json({
        success: false,
        message: 'قسط المخالفات لا يمكن أن يكون أكبر من إجمالي المخالفات',
        data: null,
      });
    }

    if (loanDeduction > effectiveTotalAdvances) {
      console.error(`خطأ: قسط السلف أكبر من إجمالي السلف. loanDeduction: ${loanDeduction}, effectiveTotalAdvances: ${effectiveTotalAdvances}`);
      return res.status(400).json({
        success: false,
        message: 'قسط السلف لا يمكن أن يكون أكبر من إجمالي السلف',
        data: null,
      });
    }

    // تحديث remainingAmount في نموذج Advance
    for (const advance of activeAdvances) {
      const newRemainingAmount = advance.remainingAmount - advance.monthlyInstallment;
      advance.remainingAmount = Math.max(newRemainingAmount, 0);
      if (advance.remainingAmount === 0) {
        advance.status = 'completed';
      }
      await advance.save();
      console.log(`Updated advance ${advance._id} for ${employeeCode}: remainingAmount=${advance.remainingAmount}, status=${advance.status}`);
    }

    // حساب القيم المتبقية
    const remainingViolations = effectiveTotalViolations - Number(violationDeduction);
    const remainingAdvances = effectiveTotalAdvances - Number(loanDeduction);

    // تحديث بيانات تعديلات الراتب في SalaryAdjustment
    const updatedAdjustment = await SalaryAdjustment.findOneAndUpdate(
      { employeeCode, month: yearMonth },
      {
        employeeCode,
        month: yearMonth,
        totalViolations: effectiveTotalViolations,
        deductionViolationsInstallment: Number(violationDeduction),
        totalAdvances: effectiveTotalAdvances,
        deductionAdvancesInstallment: Number(loanDeduction),
        occasionBonus: Number(occasionBonus),
        remainingViolations,
        remainingAdvances,
      },
      { upsert: true, new: true }
    );

    // تحديث بيانات المستخدم في User
    const salaryAdjustments = user.salaryAdjustments || new Map();
    salaryAdjustments.set(yearMonth, {
      totalViolations: effectiveTotalViolations,
      deductionViolationsInstallment: Number(violationDeduction),
      totalAdvances: effectiveTotalAdvances,
      deductionAdvancesInstallment: Number(loanDeduction),
      occasionBonus: Number(occasionBonus),
      remainingViolations,
      remainingAdvances,
      mealAllowance: user.mealAllowance || 0,
      mealDeduction: 0,
    });
    user.salaryAdjustments = salaryAdjustments;
    await user.save();

    // إرجاع الاستجابة مع البيانات المحدثة
    return res.status(200).json({
      success: true,
      message: 'تم تحديث تعديلات الراتب بنجاح',
      data: {
        totalViolationsFull: effectiveTotalViolations,
        violationDeduction: Number(violationDeduction),
        totalLoansFull: effectiveTotalAdvances,
        loanDeduction: Number(loanDeduction),
        occasionBonus: Number(occasionBonus),
        totalViolations: remainingViolations,
        totalLoans: remainingAdvances,
      },
    });
  } catch (error) {
    console.error('خطأ في updateSalaryAdjustment:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث تعديلات الراتب',
      error: error.message,
      data: null,
    });
  }
};
