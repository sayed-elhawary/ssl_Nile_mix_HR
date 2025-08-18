import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';

const dayMap = {
  'الأحد': 0,
  'الإثنين': 1,
  'الثلاثاء': 2,
  'الأربعاء': 3,
  'الخميس': 4,
  'الجمعة': 5,
  'السبت': 6,
};

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-16 lg:w-16"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.6, ease: 'easeInOut', type: 'spring', stiffness: 150, damping: 12 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      initial={{ pathLength: 0, rotate: -45 }}
      animate={{ pathLength: 1, rotate: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </motion.svg>
    <motion.div
      className="absolute inset-0 rounded-full bg-purple-100 opacity-40"
      initial={{ scale: 0 }}
      animate={{ scale: 1.8, opacity: 0, transition: { duration: 1.2, ease: 'easeOut' } }}
    />
  </motion.div>
);

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeIn' } }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.4, ease: 'easeOut' } }}
  >
    <motion.div
      className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 border-4 border-purple-600 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-2 sm:mr-3 text-purple-600 text-[10px] sm:text-xs md:text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

const CustomButtonLoadingSpinner = () => (
  <motion.div
    className="inline-flex items-center justify-center"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeInOut' } }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.div
      className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  </motion.div>
);

function AttendanceUpload({ isAuthenticated }) {
  const [file, setFile] = useState(null);
  const [attendanceData, setAttendanceData] = useState([
    {
      _id: '1',
      employeeCode: '3343',
      employeeName: 'sayed',
      date: '2025-05-01',
      checkInDate: '2025-05-01',
      checkIn: '08:50',
      checkOutDate: '2025-05-01',
      checkOut: '17:30',
      shiftName: 'صباحي',
      attendanceStatus: 'حاضر',
      delayMinutes: 0,
      remainingGracePeriod: 120,
      deductedHours: 0.33,
      overtimeHours: 17.33,
      deductedDays: 0,
      leaveBalance: 14,
      leaveAllowance: 'نعم',
      sickLeaveDeduction: 'none',
      workDays: [0, 1, 2, 3, 4],
      isWorkedWeeklyOff: false,
    },
    {
      _id: '2',
      employeeCode: '3343',
      employeeName: 'sayed',
      date: '2025-05-02',
      checkInDate: '2025-05-02',
      checkIn: '',
      checkOutDate: '2025-05-02',
      checkOut: '',
      shiftName: 'صباحي',
      attendanceStatus: 'إجازة أسبوعية',
      delayMinutes: 0,
      remainingGracePeriod: 120,
      deductedHours: 0,
      overtimeHours: 0,
      deductedDays: 0,
      leaveBalance: 14,
      leaveAllowance: 'لا يوجد',
      sickLeaveDeduction: 'none',
      workDays: [0, 1, 2, 3, 4],
      isWorkedWeeklyOff: false,
    },
    {
      _id: '3',
      employeeCode: '3343',
      employeeName: 'sayed',
      date: '2025-05-03',
      checkInDate: '2025-05-03',
      checkIn: '09:00',
      checkOutDate: '2025-05-03',
      checkOut: '17:00',
      shiftName: 'صباحي',
      attendanceStatus: 'حاضر',
      delayMinutes: 0,
      remainingGracePeriod: 120,
      deductedHours: 0,
      overtimeHours: 0,
      deductedDays: 0,
      leaveBalance: 14,
      leaveAllowance: 'نعم',
      sickLeaveDeduction: 'none',
      workDays: [0, 1, 2, 3, 4],
      isWorkedWeeklyOff: true, // يوم السبت، إجازة أسبوعية لكنه عمل
    },
  ]);
  const [filteredData, setFilteredData] = useState(attendanceData);
  const [searchCode, setSearchCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editCheckInDate, setEditCheckInDate] = useState('');
  const [editCheckOutDate, setEditCheckOutDate] = useState('');
  const [annualLeaveCheckbox, setAnnualLeaveCheckbox] = useState(false);
  const [sickLeaveCheckbox, setSickLeaveCheckbox] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [filterAbsences, setFilterAbsences] = useState(false);
  const [filterSingleCheck, setFilterSingleCheck] = useState(false);
  const [isOfficialLeaveModalOpen, setIsOfficialLeaveModalOpen] = useState(false);
  const [isAnnualLeaveModalOpen, setIsAnnualLeaveModalOpen] = useState(false);
  const [isSickLeaveModalOpen, setIsSickLeaveModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveEmployeeCode, setLeaveEmployeeCode] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);
  const [totals, setTotals] = useState({
    totalAttendanceDays: 0,
    totalWeeklyLeaves: 0,
    totalLeaveAllowance: 0,
    totalAbsences: 0,
    totalOvertimeHours: 0,
    totalDeductedHours: 0,
    totalAnnualLeaves: 0,
    totalSickLeaveDeduction: 0,
    totalLeaveBalance: 21,
    totalOfficialLeaves: 0,
    totalDeductedDays: 0,
    totalWorkedWeeklyOffDays: 0,
  });

  // دالة للتحقق مما إذا كان اليوم هو يوم إجازة أسبوعية
  const isWeeklyOffDay = (date, workDays) => {
    const day = new Date(date).getDay();
    return !workDays.includes(day);
  };

  useEffect(() => {
    const calculateTotals = () => {
      const totalAttendanceDays = filteredData.filter(
        (row) => row.attendanceStatus === 'حاضر' || row.attendanceStatus === 'متأخر'
      ).length;
      const totalWeeklyLeaves = filteredData.filter(row => row.attendanceStatus === 'إجازة أسبوعية').length;
      const totalLeaveAllowance = filteredData.reduce((sum, row) => sum + (row.leaveAllowance === 'نعم' ? 1 : 0), 0);
      const totalAbsences = filteredData.filter(row => row.attendanceStatus === 'غائب').length;
      const totalOvertimeHours = filteredData.reduce((sum, row) => sum + (row.overtimeHours || 0), 0);
      const totalDeductedHours = filteredData.reduce((sum, row) => {
        if (row.checkIn && row.checkOut) {
          return sum + (row.deductedHours || 0);
        }
        return sum;
      }, 0);
      const totalAnnualLeaves = filteredData.filter(row => row.attendanceStatus === 'إجازة سنوية').length;
      const totalSickLeaveDeduction = filteredData.reduce((sum, row) => {
        return sum + (row.sickLeaveDeduction === 'quarter' ? 0.25 : row.sickLeaveDeduction === 'half' ? 0.5 : row.sickLeaveDeduction === 'full' ? 1 : 0);
      }, 0);
      const totalOfficialLeaves = filteredData.filter(row => row.attendanceStatus === 'إجازة رسمية').length;
      const totalDeductedDays = filteredData.reduce((sum, row) => sum + (row.deductedDays || 0), 0);
      const totalLeaveBalance = filteredData.reduce((sum, row) => sum + (row.leaveBalance || 0), 0) / (filteredData.length || 1);
      const totalWorkedWeeklyOffDays = filteredData.reduce((sum, row) => sum + (row.isWorkedWeeklyOff ? 1 : 0), 0);

      setTotals({
        totalAttendanceDays,
        totalWeeklyLeaves,
        totalLeaveAllowance,
        totalAbsences,
        totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
        totalDeductedHours: parseFloat(totalDeductedHours.toFixed(2)),
        totalAnnualLeaves,
        totalSickLeaveDeduction,
        totalLeaveBalance: parseFloat(totalLeaveBalance.toFixed(2)),
        totalOfficialLeaves,
        totalDeductedDays,
        totalWorkedWeeklyOffDays,
      });
    };
    calculateTotals();
  }, [filteredData]);

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    setError('');
    setSuccessMessage('');
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('يرجى اختيار ملف Excel أو CSV أولاً');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('التوكن غير موجود، يرجى تسجيل الدخول');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        if (data.data.length === 0) {
          setError('الملف لا يحتوي على بيانات صالحة لعرضها. تأكد من أن الملف يحتوي على أعمدة "No." و"Date/Time"');
        } else {
          const adjustedData = data.data.map((record) => ({
            ...record,
            deductedHours: (!record.checkIn || !record.checkOut) ? 0 : parseFloat(record.deductedHours.toFixed(2)),
            overtimeHours: (!record.checkIn || !record.checkOut) ? 0 : parseFloat(record.overtimeHours.toFixed(2)),
            workDays: record.workDays ? record.workDays.map(day => typeof day === 'string' ? dayMap[day] : day) : [],
            isWorkedWeeklyOff: record.isWorkedWeeklyOff || false,
            leaveAllowance: record.isWorkedWeeklyOff ? 'نعم' : record.leaveAllowance || 'لا يوجد',
          }));
          setAttendanceData(adjustedData);
          setFilteredData(adjustedData);
          setSuccessMessage('تم رفع سجلات الحضور بنجاح');
          setShowSuccessAnimation(true);
          setTimeout(() => setShowSuccessAnimation(false), 1500);
        }
      } else {
        handleAuthError(data.message);
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء الرفع. تحقق من اتصالك بالإنترنت أو تنسيق الملف');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAndFilter = async () => {
    if (!startDate || !endDate) {
      setError('يرجى تحديد تاريخ البداية والنهاية');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('التوكن غير موجود، يرجى تسجيل الدخول');
      const query = new URLSearchParams({
        startDate,
        endDate,
        ...(searchCode && { employeeCode: searchCode }),
      });
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        if (data.data.length === 0) {
          setError('لا توجد بيانات حضور في الفترة المحددة أو لكود الموظف المحدد');
        } else {
          let adjustedData = data.data.map((record) => ({
            ...record,
            deductedHours: (!record.checkIn || !record.checkOut) ? 0 : parseFloat(record.deductedHours.toFixed(2)),
            overtimeHours: (!record.checkIn || !record.checkOut) ? 0 : parseFloat(record.overtimeHours.toFixed(2)),
            workDays: record.workDays ? record.workDays.map(day => typeof day === 'string' ? dayMap[day] : day) : [],
            isWorkedWeeklyOff: record.isWorkedWeeklyOff || false,
            leaveAllowance: record.isWorkedWeeklyOff ? 'نعم' : record.leaveAllowance || 'لا يوجد',
          }));

          if (filterAbsences) {
            adjustedData = adjustedData.filter(row => row.attendanceStatus === 'غائب');
          }

          if (filterSingleCheck) {
            adjustedData = adjustedData.filter(row => (row.checkIn && !row.checkOut) || (!row.checkIn && row.checkOut));
          }

          setAttendanceData(adjustedData);
          setFilteredData(adjustedData);
          setSuccessMessage('تم جلب سجلات الحضور بنجاح');
          setShowSuccessAnimation(true);
          setTimeout(() => setShowSuccessAnimation(false), 1500);
        }
      } else {
        handleAuthError(data.message);
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء جلب البيانات. تحقق من اتصالك بالإنترنت أو الخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('هل أنت متأكد من حذف جميع سجلات الحضور؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('التوكن غير موجود، يرجى تسجيل الدخول');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance/delete-all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setAttendanceData([]);
        setFilteredData([]);
        setSuccessMessage('تم حذف جميع سجلات الحضور بنجاح');
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 1500);
      } else {
        handleAuthError(data.message);
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء الحذف. تحقق من اتصالك بالإنترنت أو الخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (message) => {
    if (message.includes('انتهت صلاحية التوكن')) {
      setError('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.');
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 1500);
    } else {
      setError(message || 'حدث خطأ أثناء العملية');
    }
  };

  const openEditModal = (record) => {
    if (!record || !record._id || record._id.length !== 24) {
      console.error('Invalid or missing _id for record:', record);
      setError('لا يمكن تعديل هذا السجل بسبب معرف غير صالح.');
      return;
    }
    setEditRecord(record);
    setEditCheckIn(record.checkIn || '');
    setEditCheckOut(record.checkOut || '');
    setEditCheckInDate(record.checkInDate || record.date);
    setEditCheckOutDate(record.checkOutDate || record.date);
    setAnnualLeaveCheckbox(record.attendanceStatus === 'إجازة سنوية');
    setSickLeaveCheckbox(record.attendanceStatus === 'إجازة مرضية');
    setIsEditModalOpen(true);
    setError('');
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditRecord(null);
    setEditCheckIn('');
    setEditCheckOut('');
    setEditCheckInDate('');
    setEditCheckOutDate('');
    setAnnualLeaveCheckbox(false);
    setSickLeaveCheckbox(false);
    setError('');
  };

  const validateEditDates = () => {
    if (annualLeaveCheckbox || sickLeaveCheckbox) {
      return '';
    }
    if (!editCheckInDate || !editCheckOutDate) {
      return 'يرجى إدخال تاريخ الحضور وتاريخ الانصراف';
    }
    if (editCheckIn && editCheckOut) {
      const checkIn = new Date(`${editCheckInDate}T${editCheckIn}:00`);
      const checkOut = new Date(`${editCheckOutDate}T${editCheckOut}:00`);
      if (checkOut <= checkIn) {
        return 'وقت الانصراف يجب أن يكون بعد وقت الحضور';
      }
    }
    return '';
  };

const handleEditSubmit = async () => {
  if (!editRecord || !editRecord._id || editRecord._id.length !== 24) {
    console.error('Invalid or missing _id:', editRecord);
    setError('معرف السجل غير صالح أو مفقود.');
    return;
  }

  const validationError = validateEditDates();
  if (validationError) {
    setError(validationError);
    return;
  }

  setLoading(true);
  setError('');
  setSuccessMessage('');

  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('التوكن غير موجود، يرجى تسجيل الدخول');

    const isWeeklyOff = isWeeklyOffDay(editCheckInDate, editRecord.workDays);
    const isFriday = new Date(editCheckInDate).getDay() === 5; // التحقق إذا كان اليوم الجمعة
    const expectedStatus = annualLeaveCheckbox
      ? 'إجازة سنوية'
      : sickLeaveCheckbox
      ? 'إجازة مرضية'
      : (editCheckIn || editCheckOut)
      ? 'حاضر'
      : 'غائب';
    const isWorkedWeeklyOffNew = isWeeklyOff && editCheckIn && editCheckOut && !annualLeaveCheckbox && !sickLeaveCheckbox;
    const leaveAllowanceValue = isFriday && editCheckIn && editCheckOut ? 'لا يوجد' : isWorkedWeeklyOffNew ? 'نعم' : 'لا';

    const body = {
      checkIn: annualLeaveCheckbox || sickLeaveCheckbox ? null : (editCheckIn || null),
      checkOut: annualLeaveCheckbox || sickLeaveCheckbox ? null : (editCheckOut || null),
      checkInDate: editCheckInDate || null,
      checkOutDate: editCheckOutDate || null,
      leaveAllowance: leaveAllowanceValue,
      attendanceStatus: expectedStatus,
      isWorkedWeeklyOff: isWorkedWeeklyOffNew,
    };

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance/${editRecord._id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.success && data.data.attendanceStatus === expectedStatus) {
      const adjustedData = {
        ...data.data,
        deductedHours: (!data.data.checkIn || !data.data.checkOut) ? 0 : parseFloat(data.data.deductedHours.toFixed(2)),
        overtimeHours: (!data.data.checkIn || !data.data.checkOut) ? 0 : parseFloat(data.data.overtimeHours.toFixed(2)),
        workDays: data.data.workDays ? data.data.workDays.map(day => typeof day === 'string' ? dayMap[day] : day) : [],
        isWorkedWeeklyOff: data.data.isWorkedWeeklyOff || false,
        leaveAllowance: data.data.leaveAllowance || 'لا يوجد',
      };
      setAttendanceData((prev) => prev.map((record) => (record._id === editRecord._id ? adjustedData : record)));
      setFilteredData((prev) => prev.map((record) => (record._id === editRecord._id ? adjustedData : record)));
      setSuccessMessage('تم تعديل سجل الحضور بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 1500);
      closeEditModal();
    } else {
      setError(data.message || `فشل تحديث حالة الحضور إلى "${expectedStatus}".`);
    }
  } catch (err) {
    setError(err.message || 'حدث خطأ أثناء التعديل.');
  } finally {
    setLoading(false);
  }
};
  const handleCheckboxChange = (type) => {
    if (type === 'annualLeave') {
      setAnnualLeaveCheckbox(!annualLeaveCheckbox);
      setSickLeaveCheckbox(false);
      setEditCheckIn('');
      setEditCheckOut('');
    } else if (type === 'sickLeave') {
      setSickLeaveCheckbox(!sickLeaveCheckbox);
      setAnnualLeaveCheckbox(false);
      setEditCheckIn('');
      setEditCheckOut('');
    }
  };

  const handleShowAll = () => {
    setSearchCode('');
    setFilterAbsences(false);
    setFilterSingleCheck(false);
    handleSearchAndFilter();
  };

  const openOfficialLeaveModal = () => {
    setIsOfficialLeaveModalOpen(true);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveEmployeeCode('');
    setApplyToAll(false);
    setError('');
  };

  const openAnnualLeaveModal = () => {
    setIsAnnualLeaveModalOpen(true);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveEmployeeCode('');
    setApplyToAll(false);
    setError('');
  };

  const openSickLeaveModal = () => {
    setIsSickLeaveModalOpen(true);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveEmployeeCode('');
    setApplyToAll(false);
    setError('');
  };

  const closeLeaveModal = () => {
    setIsOfficialLeaveModalOpen(false);
    setIsAnnualLeaveModalOpen(false);
    setIsSickLeaveModalOpen(false);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveEmployeeCode('');
    setApplyToAll(false);
    setError('');
  };

  const validateLeaveDates = () => {
    if (!leaveStartDate || !leaveEndDate) {
      return 'يرجى تحديد تاريخ البداية وتاريخ النهاية للإجازة';
    }
    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    if (end < start) {
      return 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية';
    }
    if (!applyToAll && !leaveEmployeeCode) {
      return 'يرجى إدخال كود الموظف إذا لم يتم اختيار تطبيق على الجميع';
    }
    return '';
  };

  const handleOfficialLeaveSubmit = async () => {
    const validationError = validateLeaveDates();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('التوكن غير موجود، يرجى تسجيل الدخول');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance/official-leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          employeeCode: applyToAll ? undefined : leaveEmployeeCode,
          applyToAll,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('تم تطبيق الإجازة الرسمية بنجاح');
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 1500);
        closeLeaveModal();
        handleSearchAndFilter();
      } else {
        handleAuthError(data.message);
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تطبيق الإجازة الرسمية');
    } finally {
      setLoading(false);
    }
  };

  const handleAnnualLeaveSubmit = async () => {
    const validationError = validateLeaveDates();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('التوكن غير موجود، يرجى تسجيل الدخول');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance/annual-leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          employeeCode: applyToAll ? undefined : leaveEmployeeCode,
          applyToAll,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('تم تطبيق الإجازة السنوية بنجاح');
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 1500);
        closeLeaveModal();
        handleSearchAndFilter();
      } else {
        handleAuthError(data.message);
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تطبيق الإجازة السنوية.');
    } finally {
      setLoading(false);
    }
  };

  const handleSickLeaveSubmit = async () => {
    const validationError = validateLeaveDates();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('التوكن غير موجود، يرجى تسجيل الدخول');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance/sick-leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          employeeCode: applyToAll ? undefined : leaveEmployeeCode,
          applyToAll,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('تم تطبيق الإجازة المرضية بنجاح');
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 1500);
        closeLeaveModal();
        handleSearchAndFilter();
      } else {
        handleAuthError(data.message);
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تطبيق الإجازة المرضية');
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 6px 25px rgba(139, 92, 246, 0.3)', transition: { duration: 0.3, ease: 'easeInOut' } },
    tap: { scale: 0.95, backgroundColor: '#A78BFA', transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  const totalsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut', staggerChildren: 0.1 } },
  };

  const totalItemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-blue-100 p-2 sm:p-4 md:p-6 font-noto-sans-arabic relative overflow-hidden dir=rtl">
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto relative z-10 max-w-[95vw] sm:max-w-4xl lg:max-w-7xl bg-white rounded-2xl shadow-md p-3 sm:p-4 md:p-6 border border-gray-100"
      >
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600 mb-3 sm:mb-4 md:mb-6 text-right tracking-wide drop-shadow-sm">
          نظام إدارة الحضور
        </h2>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-100 text-red-700 p-2 sm:p-3 rounded-xl mb-3 sm:mb-4 md:mb-6 text-right text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm"
            >
              {error}
            </motion.div>
          )}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-purple-50 text-purple-600 p-2 sm:p-3 rounded-xl mb-3 sm:mb-4 md:mb-6 text-right text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="bg-white rounded-2xl shadow-md p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6 border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            <div>
              <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 md:mb-2 text-right">
                رفع ملف البصمة (Excel أو CSV)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                disabled={loading}
              />
              {file && (
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleFileUpload}
                  className="mt-2 sm:mt-3 w-full bg-purple-600 text-white p-2 sm:p-3 rounded-lg hover:bg-purple-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm"
                  disabled={loading}
                >
                  {loading ? 'جارٍ الرفع...' : 'رفع الملف'}
                </motion.button>
              )}
            </div>
            <div className="flex flex-col space-y-2 sm:space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="ابحث بكود الموظف"
                  className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                />
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleSearchAndFilter}
                  className="w-full sm:w-auto bg-purple-600 text-white p-2 sm:p-3 rounded-lg hover:bg-purple-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm"
                >
                  بحث
                </motion.button>
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse">
                <label className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    checked={filterAbsences}
                    onChange={(e) => setFilterAbsences(e.target.checked)}
                    className="h-3 sm:h-4 w-3 sm:w-4 text-purple-600 focus:ring-purple-500 rounded"
                  />
                  <span className="text-[10px] sm:text-xs md:text-sm text-gray-800 font-semibold">عرض أيام الغياب فقط</span>
                </label>
                <label className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    checked={filterSingleCheck}
                    onChange={(e) => setFilterSingleCheck(e.target.checked)}
                    className="h-3 sm:h-4 w-3 sm:w-4 text-purple-600 focus:ring-purple-500 rounded"
                  />
                  <span className="text-[10px] sm:text-xs md:text-sm text-gray-800 font-semibold">عرض الأيام ذات البصمة الواحدة</span>
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleShowAll}
                  className="bg-purple-600 text-white p-2 sm:p-3 rounded-lg hover:bg-purple-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm"
                >
                  عرض الكل
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleDeleteAll}
                  className="bg-red-600 text-white p-2 sm:p-3 rounded-lg hover:bg-red-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm"
                >
                  حذف جميع البصمات
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={openOfficialLeaveModal}
                  className="bg-green-600 text-white p-2 sm:p-3 rounded-lg hover:bg-green-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm"
                >
                  إجازة رسمية
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={openAnnualLeaveModal}
                  className="bg-purple-600 text-white p-2 sm:p-3 rounded-lg hover:bg-purple-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm"
                >
                  إجازة سنوية
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={openSickLeaveModal}
                  className="bg-yellow-600 text-white p-2 sm:p-3 rounded-lg hover:bg-yellow-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm"
                >
                  إجازة مرضية
                </motion.button>
              </div>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <CustomLoadingSpinner />
          </div>
        ) : filteredData.length > 0 ? (
          <>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-x-auto snap-x">
              <table className="min-w-[1600px] md:min-w-full w-full text-right text-[9px] sm:text-[10px] md:text-xs lg:text-[13px] table-auto md:table-fixed">
                <thead>
                  <tr className="bg-purple-600 text-white">
                    <th className="p-1.5 sm:p-2 md:p-3 w-[8%] min-w-[50px] font-semibold">كود الموظف</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[12%] min-w-[70px] font-semibold">اسم الموظف</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[10%] min-w-[70px] font-semibold">تاريخ الحضور</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[8%] min-w-[50px] font-semibold">وقت الحضور</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[10%] min-w-[70px] font-semibold">تاريخ الانصراف</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[8%] min-w-[50px] font-semibold">وقت الانصراف</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[8%] min-w-[50px] font-semibold">اسم الشيفت</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[8%] min-w-[60px] font-semibold">حالة الحضور</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">دقائق التأخير</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">بدل التأخير</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">خصم الساعات</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">ساعات إضافية</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">أيام مخصومة</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">رصيد الإجازة</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">بدل الإجازة</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">خصم المرضية</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">بدل الإجازة الأسبوعية</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[6%] min-w-[50px] font-semibold">أيام العمل</th>
                    <th className="p-1.5 sm:p-2 md:p-3 w-[8%] min-w-[50px] font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record) => (
                    <motion.tr
                      key={record._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`border-b border-purple-100 hover:bg-purple-50 transition-all duration-200 snap-start ${
                        record.attendanceStatus === 'إجازة أسبوعية'
                          ? 'bg-green-50'
                          : record.attendanceStatus === 'غائب'
                          ? 'bg-red-50'
                          : record.attendanceStatus === 'إجازة سنوية'
                          ? 'bg-blue-50'
                          : record.attendanceStatus === 'إجازة رسمية'
                          ? 'bg-yellow-50'
                          : record.isWorkedWeeklyOff
                          ? 'bg-teal-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      <td className="p-1.5 sm:p-2 md:p-3">{record.employeeCode}</td>
                      <td className="p-1.5 sm:p-2 md:p-3" title={record.employeeName}>{record.employeeName}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.checkInDate}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.checkIn}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.checkOutDate}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.checkOut}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.shiftName}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.attendanceStatus}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.delayMinutes}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.remainingGracePeriod}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.deductedHours}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.overtimeHours}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.deductedDays}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.leaveBalance}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.leaveAllowance}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.sickLeaveDeduction}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.isWorkedWeeklyOff ? 'نعم' : 'لا'}</td>
                      <td className="p-1.5 sm:p-2 md:p-3">{record.workDays.length} أيام</td>
                      <td className="p-1.5 sm:p-2 md:p-3">
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => openEditModal(record)}
                          className="bg-purple-600 text-white px-2 sm:px-3 py-1 sm:py-1 rounded-lg hover:bg-purple-700 transition-all duration-300 text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-semibold shadow-sm"
                        >
                          تعديل
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <motion.div
              variants={totalsVariants}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-2xl shadow-md p-3 sm:p-4 md:p-6 mt-3 sm:mt-4 md:mt-6 border border-gray-100"
            >
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-purple-600 mb-2 sm:mb-3 md:mb-4 text-right">الإحصائيات</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-purple-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي أيام الحضور</p>
                  <p className="font-bold text-purple-700">{totals.totalAttendanceDays}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-green-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي الإجازات الأسبوعية</p>
                  <p className="font-bold text-green-700">{totals.totalWeeklyLeaves}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-blue-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي بدل الإجازة</p>
                  <p className="font-bold text-blue-700">{totals.totalLeaveAllowance}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-red-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي الغياب</p>
                  <p className="font-bold text-red-700">{totals.totalAbsences}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-purple-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي الساعات الإضافية</p>
                  <p className="font-bold text-purple-700">{totals.totalOvertimeHours}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-red-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي الساعات المخصومة</p>
                  <p className="font-bold text-red-700">{totals.totalDeductedHours}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-blue-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي الإجازات السنوية</p>
                  <p className="font-bold text-blue-700">{totals.totalAnnualLeaves}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-yellow-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي خصم الإجازة المرضية</p>
                  <p className="font-bold text-yellow-700">{totals.totalSickLeaveDeduction}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-blue-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">متوسط رصيد الإجازة</p>
                  <p className="font-bold text-blue-700">{totals.totalLeaveBalance}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-yellow-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي الإجازات الرسمية</p>
                  <p className="font-bold text-yellow-700">{totals.totalOfficialLeaves}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-red-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي الأيام المخصومة</p>
                  <p className="font-bold text-red-700">{totals.totalDeductedDays}</p>
                </motion.div>
                <motion.div
                  variants={totalItemVariants}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 shadow-sm border border-teal-200 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold">إجمالي أيام بدل الإجازة الأسبوعية</p>
                  <p className="font-bold text-teal-700">{totals.totalWorkedWeeklyOffDays}</p>
                </motion.div>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="text-center text-purple-600 text-[10px] sm:text-xs md:text-sm font-semibold">
            لا توجد بيانات حضور متاحة
          </div>
        )}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90, transition: { duration: 0.4, ease: 'easeIn' } }}
              className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50"
            >
              <CustomCheckIcon />
            </motion.div>
          )}
          {isEditModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4"
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="bg-white rounded-2xl p-3 sm:p-4 md:p-6 w-full max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-y-auto shadow-lg border border-gray-100"
              >
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-purple-600 mb-2 sm:mb-3 text-right">تعديل سجل الحضور</h3>
                {error && (
                  <div className="bg-red-100 text-red-700 p-2 sm:p-3 rounded-xl mb-2 sm:mb-3 text-right text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
                      وقت الحضور
                    </label>
                    <input
                      type="time"
                      value={editCheckIn}
                      onChange={(e) => setEditCheckIn(e.target.value)}
                      className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                      disabled={annualLeaveCheckbox || sickLeaveCheckbox}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
                      تاريخ الحضور
                    </label>
                    <input
                      type="date"
                      value={editCheckInDate}
                      onChange={(e) => setEditCheckInDate(e.target.value)}
                      className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                      disabled={annualLeaveCheckbox || sickLeaveCheckbox}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
                      وقت الانصراف
                    </label>
                    <input
                      type="time"
                      value={editCheckOut}
                      onChange={(e) => setEditCheckOut(e.target.value)}
                      className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                      disabled={annualLeaveCheckbox || sickLeaveCheckbox}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
                      تاريخ الانصراف
                    </label>
                    <input
                      type="date"
                      value={editCheckOutDate}
                      onChange={(e) => setEditCheckOutDate(e.target.value)}
                      className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                      disabled={annualLeaveCheckbox || sickLeaveCheckbox}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3">
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={annualLeaveCheckbox}
                      onChange={() => handleCheckboxChange('annualLeave')}
                      className="h-3 sm:h-4 w-3 sm:w-4 text-purple-600 focus:ring-purple-500 rounded"
                    />
                    <span className="text-[10px] sm:text-xs md:text-sm text-gray-800 font-semibold">إجازة سنوية</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={sickLeaveCheckbox}
                      onChange={() => handleCheckboxChange('sickLeave')}
                      className="h-3 sm:h-4 w-3 sm:w-4 text-purple-600 focus:ring-purple-500 rounded"
                    />
                    <span className="text-[10px] sm:text-xs md:text-sm text-gray-800 font-semibold">إجازة مرضية</span>
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row justify-between mt-3 sm:mt-4 gap-3 sm:gap-6">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={closeEditModal}
                    className="w-full sm:w-1/2 bg-gray-200 text-gray-800 p-2 sm:p-3 rounded-lg hover:bg-gray-300 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm flex items-center justify-center"
                  >
                    إلغاء
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleEditSubmit}
                    className="w-full sm:w-1/2 bg-purple-600 text-white p-2 sm:p-3 rounded-lg hover:bg-purple-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm flex items-center justify-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <CustomButtonLoadingSpinner />
                        <span className="mr-2">جارٍ الحفظ...</span>
                      </>
                    ) : (
                      'حفظ التعديلات'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isOfficialLeaveModalOpen && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4"
  >
    <motion.div
      initial={{ scale: 0.8, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.8, y: 50 }}
      className="bg-white rounded-2xl p-3 sm:p-4 md:p-6 w-full max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-y-auto shadow-lg border border-gray-100"
    >
      <h3 className="text-base sm:text-lg md:text-xl font-bold text-purple-600 mb-2 sm:mb-3 text-right">إجازة رسمية</h3>
      {error && (
        <div className="bg-red-100 text-red-700 p-2 sm:p-3 rounded-xl mb-2 sm:mb-3 text-right text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:gap-3">
        <div>
          <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
            تاريخ البداية
          </label>
          <input
            type="date"
            value={leaveStartDate}
            onChange={(e) => setLeaveStartDate(e.target.value)}
            className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
          />
        </div>
        <div>
          <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
            تاريخ النهاية
          </label>
          <input
            type="date"
            value={leaveEndDate}
            onChange={(e) => setLeaveEndDate(e.target.value)}
            className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
          />
        </div>
        <div>
          <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
            كود الموظف (اختياري)
          </label>
          <input
            type="text"
            value={leaveEmployeeCode}
            onChange={(e) => setLeaveEmployeeCode(e.target.value)}
            className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
            disabled={applyToAll}
          />
        </div>
        <label className="flex items-center space-x-2 space-x-reverse">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={(e) => setApplyToAll(e.target.checked)}
            className="h-3 sm:h-4 w-3 sm:w-4 text-purple-600 focus:ring-purple-500 rounded"
          />
          <span className="text-[10px] sm:text-xs md:text-sm text-gray-800 font-semibold">تطبيق على الجميع</span>
        </label>
      </div>
      <div className="flex flex-col sm:flex-row justify-between mt-3 sm:mt-4 gap-3 sm:gap-6">
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={closeLeaveModal}
          className="w-full sm:w-1/2 bg-gray-200 text-gray-800 p-2 sm:p-3 rounded-lg hover:bg-gray-300 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm flex items-center justify-center"
        >
          إلغاء
        </motion.button>
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={handleOfficialLeaveSubmit}
          className="w-full sm:w-1/2 bg-green-600 text-white p-2 sm:p-3 rounded-lg hover:bg-green-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <CustomButtonLoadingSpinner />
              <span className="mr-2">جارٍ الحفظ...</span>
            </>
          ) : (
            'تطبيق الإجازة الرسمية'
          )}
        </motion.button>
      </div>
    </motion.div>
  </motion.div>
)}
{isAnnualLeaveModalOpen && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4"
  >
    <motion.div
      initial={{ scale: 0.8, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.8, y: 50 }}
      className="bg-white rounded-2xl p-3 sm:p-4 md:p-6 w-full max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-y-auto shadow-lg border border-gray-100"
    >
      <h3 className="text-base sm:text-lg md:text-xl font-bold text-purple-600 mb-2 sm:mb-3 text-right">إجازة سنوية</h3>
      {error && (
        <div className="bg-red-100 text-red-700 p-2 sm:p-3 rounded-xl mb-2 sm:mb-3 text-right text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:gap-3">
        <div>
          <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
            تاريخ البداية
          </label>
          <input
            type="date"
            value={leaveStartDate}
            onChange={(e) => setLeaveStartDate(e.target.value)}
            className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
          />
        </div>
        <div>
          <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
            تاريخ النهاية
          </label>
          <input
            type="date"
            value={leaveEndDate}
            onChange={(e) => setLeaveEndDate(e.target.value)}
            className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
          />
        </div>
        <div>
          <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
            كود الموظف (اختياري)
          </label>
          <input
            type="text"
            value={leaveEmployeeCode}
            onChange={(e) => setLeaveEmployeeCode(e.target.value)}
            className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
            disabled={applyToAll}
          />
        </div>
        <label className="flex items-center space-x-2 space-x-reverse">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={(e) => setApplyToAll(e.target.checked)}
            className="h-3 sm:h-4 w-3 sm:w-4 text-purple-600 focus:ring-purple-500 rounded"
          />
          <span className="text-[10px] sm:text-xs md:text-sm text-gray-800 font-semibold">تطبيق على الجميع</span>
        </label>
      </div>
      <div className="flex flex-col sm:flex-row justify-between mt-3 sm:mt-4 gap-3 sm:gap-6">
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={closeLeaveModal}
          className="w-full sm:w-1/2 bg-gray-200 text-gray-800 p-2 sm:p-3 rounded-lg hover:bg-gray-300 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm flex items-center justify-center"
        >
          إلغاء
        </motion.button>
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={handleAnnualLeaveSubmit}
          className="w-full sm:w-1/2 bg-purple-600 text-white p-2 sm:p-3 rounded-lg hover:bg-purple-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <CustomButtonLoadingSpinner />
              <span className="mr-2">جارٍ الحفظ...</span>
            </>
          ) : (
            'تطبيق الإجازة السنوية'
          )}
        </motion.button>
      </div>
    </motion.div>
  </motion.div>
)}
{isSickLeaveModalOpen && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4"
  >
    <motion.div
      initial={{ scale: 0.8, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.8, y: 50 }}
      className="bg-white rounded-2xl p-3 sm:p-4 md:p-6 w-full max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-y-auto shadow-lg border border-gray-100"
    >
      <h3 className="text-base sm:text-lg md:text-xl font-bold text-purple-600 mb-2 sm:mb-3 text-right">إجازة مرضية</h3>
      {error && (
        <div className="bg-red-100 text-red-700 p-2 sm:p-3 rounded-xl mb-2 sm:mb-3 text-right text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:gap-3">
        <div>
          <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
            تاريخ البداية
          </label>
          <input
            type="date"
            value={leaveStartDate}
            onChange={(e) => setLeaveStartDate(e.target.value)}
            className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
          />
        </div>
        <div>
          <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
            تاريخ النهاية
          </label>
          <input
            type="date"
            value={leaveEndDate}
            onChange={(e) => setLeaveEndDate(e.target.value)}
            className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
          />
        </div>
        <div>
          <label className="block text-gray-800 text-[10px] sm:text-xs md:text-sm font-semibold mb-1 text-right">
            كود الموظف (اختياري)
          </label>
          <input
            type="text"
            value={leaveEmployeeCode}
            onChange={(e) => setLeaveEmployeeCode(e.target.value)}
            className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg text-right text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
            disabled={applyToAll}
          />
        </div>
        <label className="flex items-center space-x-2 space-x-reverse">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={(e) => setApplyToAll(e.target.checked)}
            className="h-3 sm:h-4 w-3 sm:w-4 text-purple-600 focus:ring-purple-500 rounded"
          />
          <span className="text-[10px] sm:text-xs md:text-sm text-gray-800 font-semibold">تطبيق على الجميع</span>
        </label>
      </div>
      <div className="flex flex-col sm:flex-row justify-between mt-3 sm:mt-4 gap-3 sm:gap-6">
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={closeLeaveModal}
          className="w-full sm:w-1/2 bg-gray-200 text-gray-800 p-2 sm:p-3 rounded-lg hover:bg-gray-300 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm flex items-center justify-center"
        >
          إلغاء
        </motion.button>
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={handleSickLeaveSubmit}
          className="w-full sm:w-1/2 bg-yellow-600 text-white p-2 sm:p-3 rounded-lg hover:bg-yellow-700 transition-all duration-300 text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <CustomButtonLoadingSpinner />
              <span className="mr-2">جارٍ الحفظ...</span>
            </>
          ) : (
            'تطبيق الإجازة المرضية'
          )}
        </motion.button>
      </div>
    </motion.div>
  </motion.div>
)}
        </AnimatePresence> {/* Close the AnimatePresence tag here */}
      </motion.div>
    </div>
  );
}

export default AttendanceUpload;
