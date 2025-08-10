import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';

const CustomCheckIcon = () => (
  <motion.svg
    className="h-12 w-12 text-green-800"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    initial={{ scale: 0, rotate: -180, opacity: 0 }}
    animate={{ scale: 1, rotate: 0, opacity: 1, transition: { duration: 0.8, ease: 'easeInOut', type: 'spring', stiffness: 120, damping: 10 } }}
    exit={{ scale: 0, rotate: 180, opacity: 0, transition: { duration: 0.4 } }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1, transition: { duration: 0.8, ease: 'easeInOut' } }}
    />
  </motion.svg>
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
  const [leaveAllowanceCheckbox, setLeaveAllowanceCheckbox] = useState(false);
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
  });

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
          }));
          setAttendanceData(adjustedData);
          setFilteredData(adjustedData);
          setSuccessMessage('تم رفع سجلات الحضور بنجاح');
          setShowSuccessAnimation(true);
          setTimeout(() => setShowSuccessAnimation(false), 2000);
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
          }));

          if (filterAbsences) {
            adjustedData = adjustedData.filter(row => row.attendanceStatus === 'غائب');
          }

          if (filterSingleCheck) {
            adjustedData = adjustedData.filter(row => (row.checkIn && !row.checkOut) || (!row.checkIn && row.checkOut));
          }

          setAttendanceData(data.data);
          setFilteredData(adjustedData);
          setSuccessMessage('تم جلب سجلات الحضور بنجاح');
          setShowSuccessAnimation(true);
          setTimeout(() => setShowSuccessAnimation(false), 2000);
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
        setTimeout(() => setShowSuccessAnimation(false), 2000);
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
      }, 2000);
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
    console.log('Opening edit modal for record:', record);
    setEditRecord(record);
    setEditCheckIn(record.checkIn || '');
    setEditCheckOut(record.checkOut || '');
    setEditCheckInDate(record.checkInDate || record.date);
    setEditCheckOutDate(record.checkOutDate || record.date);
    setLeaveAllowanceCheckbox(record.leaveAllowance === 'نعم');
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
    setLeaveAllowanceCheckbox(false);
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
    if (leaveAllowanceCheckbox && (!editCheckIn || !editCheckOut)) {
      return 'بدل الإجازة يتطلب وقت حضور وانصراف';
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

      const expectedStatus = annualLeaveCheckbox ? 'إجازة سنوية' : sickLeaveCheckbox ? 'إجازة مرضية' : (editCheckIn || editCheckOut) ? 'حاضر' : 'غائب';
      const body = {
        checkIn: annualLeaveCheckbox || sickLeaveCheckbox ? null : (editCheckIn || null),
        checkOut: annualLeaveCheckbox || sickLeaveCheckbox ? null : (editCheckOut || null),
        checkInDate: editCheckInDate || null,
        checkOutDate: editCheckOutDate || null,
        leaveAllowance: leaveAllowanceCheckbox ? 'نعم' : 'لا',
        attendanceStatus: expectedStatus,
      };

      console.log('Sending PATCH request with ID:', editRecord._id);
      console.log('Payload:', body);

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
        };
        setAttendanceData((prev) => prev.map((record) => (record._id === editRecord._id ? adjustedData : record)));
        setFilteredData((prev) => prev.map((record) => (record._id === editRecord._id ? adjustedData : record)));
        setSuccessMessage('تم تعديل سجل الحضور بنجاح');
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 2000);
        closeEditModal();
      } else {
        console.error('Update failed or status mismatch:', data);
        setError(data.message || `فشل تحديث حالة الحضور إلى "${expectedStatus}".`);
      }
    } catch (err) {
      console.error('Error in handleEditSubmit:', err);
      setError(err.message || 'حدث خطأ أثناء التعديل.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (type) => {
    if (type === 'leaveAllowance') {
      setLeaveAllowanceCheckbox(!leaveAllowanceCheckbox);
      setAnnualLeaveCheckbox(false);
      setSickLeaveCheckbox(false);
    } else if (type === 'annualLeave') {
      setAnnualLeaveCheckbox(!annualLeaveCheckbox);
      setLeaveAllowanceCheckbox(false);
      setSickLeaveCheckbox(false);
      setEditCheckIn('');
      setEditCheckOut('');
    } else if (type === 'sickLeave') {
      setSickLeaveCheckbox(!sickLeaveCheckbox);
      setLeaveAllowanceCheckbox(false);
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
        setTimeout(() => setShowSuccessAnimation(false), 2000);
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
        setTimeout(() => setShowSuccessAnimation(false), 2000);
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
        setTimeout(() => setShowSuccessAnimation(false), 2000);
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

  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.3 } },
    tap: { scale: 0.95, transition: { duration: 0.3 } },
  };

  const totalsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut', staggerChildren: 0.1 } },
  };

  const totalItemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 font-noto-sans-arabic relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/subtle-dots.png')] opacity-10"></div>
      <motion.div
        variants={tableVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto relative z-10 max-w-7xl"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-6 sm:mb-8 text-right">
          نظام إدارة الحضور
        </h2>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-100 border border-danger text-danger px-4 py-3 rounded-lg mb-6 text-right text-sm sm:text-base shadow-md"
            >
              {error}
            </motion.div>
          )}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-100 border border-success text-success px-4 py-3 rounded-lg mb-6 text-right text-sm sm:text-base shadow-md"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2 text-right">
                رفع ملف البصمة (Excel أو CSV)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition bg-gray-50 text-sm shadow-sm"
                disabled={loading}
              />
              {file && (
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleFileUpload}
                  className="mt-4 w-full bg-primary text-white p-3 rounded-lg hover:bg-secondary transition duration-300 font-medium text-sm shadow-md"
                  disabled={loading}
                >
                  {loading ? 'جاري الرفع...' : 'رفع الملف'}
                </motion.button>
              )}
            </div>
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="ابحث بكود الموظف"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition bg-gray-50 text-sm shadow-sm"
                />
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleSearchAndFilter}
                  className="w-full sm:w-auto bg-primary text-white p-3 rounded-lg hover:bg-secondary transition duration-300 font-medium text-sm shadow-md"
                >
                  بحث
                </motion.button>
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition bg-gray-50 text-sm shadow-sm"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition bg-gray-50 text-sm shadow-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
                <label className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    checked={filterAbsences}
                    onChange={(e) => setFilterAbsences(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-primary"
                  />
                  <span className="text-sm text-gray-700">عرض أيام الغياب فقط</span>
                </label>
                <label className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    checked={filterSingleCheck}
                    onChange={(e) => setFilterSingleCheck(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-primary"
                  />
                  <span className="text-sm text-gray-700">عرض الأيام ذات البصمة الواحدة</span>
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleShowAll}
                  className="bg-primary text-white p-3 rounded-lg hover:bg-secondary transition duration-300 font-medium text-sm shadow-md"
                >
                  عرض الكل
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleDeleteAll}
                  className="bg-danger text-white p-3 rounded-lg hover:bg-red-700 transition duration-300 font-medium text-sm shadow-md"
                >
                  حذف جميع البصمات
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={openOfficialLeaveModal}
                  className="bg-success text-white p-3 rounded-lg hover:bg-green-700 transition duration-300 font-medium text-sm shadow-md"
                >
                  إجازة رسمية
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={openAnnualLeaveModal}
                  className="bg-primary text-white p-3 rounded-lg hover:bg-secondary transition duration-300 font-medium text-sm shadow-md"
                >
                  إجازة سنوية
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={openSickLeaveModal}
                  className="bg-warning text-white p-3 rounded-lg hover:bg-yellow-700 transition duration-300 font-medium text-sm shadow-md"
                >
                  إجازة مرضية
                </motion.button>
              </div>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="relative h-16 w-16"
            >
              <div className="absolute inset-0 rounded-full border-t-4 border-primary"></div>
              <div className="absolute inset-0 rounded-full border-b-4 border-secondary opacity-50"></div>
            </motion.div>
          </div>
        ) : filteredData.length > 0 ? (
          <>
            <div className="bg-white rounded-xl shadow-2xl overflow-x-auto mb-6 sm:mb-8 border border-gray-100">
              <table className="w-full text-right text-sm table-auto">
                <thead>
                  <tr className="bg-tableHeader text-white">
                    <th className="p-3 min-w-[100px]">كود الموظف</th>
                    <th className="p-3 min-w-[150px]">اسم الموظف</th>
                    <th className="p-3 min-w-[120px]">التاريخ</th>
                    <th className="p-3 min-w-[120px]">تاريخ الحضور</th>
                    <th className="p-3 min-w-[100px]">وقت الحضور</th>
                    <th className="p-3 min-w-[120px]">تاريخ الانصراف</th>
                    <th className="p-3 min-w-[100px]">وقت الانصراف</th>
                    <th className="p-3 min-w-[100px]">اسم الشيفت</th>
                    <th className="p-3 min-w-[120px]">حالة الحضور</th>
                    <th className="p-3 min-w-[100px]">دقائق التأخير</th>
                    <th className="p-3 min-w-[120px]">بدل التأخير المتبقي</th>
                    <th className="p-3 min-w-[100px]">خصم الساعات</th>
                    <th className="p-3 min-w-[120px]">الساعات الإضافية</th>
                    <th className="p-3 min-w-[120px]">الأيام المخصومة</th>
                    <th className="p-3 min-w-[100px]">رصيد الإجازة</th>
                    <th className="p-3 min-w-[100px]">بدل الإجازة</th>
                    <th className="p-3 min-w-[150px]">خصم الإجازة المرضية</th>
                    <th className="p-3 min-w-[100px]">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record) => (
                    <tr
                      key={record._id}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${
                        record.attendanceStatus === 'إجازة أسبوعية'
                          ? 'bg-green-50'
                          : record.attendanceStatus === 'غائب'
                          ? 'bg-red-50'
                          : 'bg-white'
                      }`}
                    >
                      <td className="p-3">{record.employeeCode}</td>
                      <td className="p-3">{record.employeeName}</td>
                      <td className="p-3">{record.date}</td>
                      <td className="p-3">{record.checkInDate}</td>
                      <td className="p-3">{record.checkIn}</td>
                      <td className="p-3">{record.checkOutDate}</td>
                      <td className="p-3">{record.checkOut}</td>
                      <td className="p-3">{record.shiftName}</td>
                      <td className="p-3">{record.attendanceStatus}</td>
                      <td className="p-3">{record.delayMinutes}</td>
                      <td className="p-3">{record.remainingGracePeriod}</td>
                      <td className="p-3">{record.deductedHours}</td>
                      <td className="p-3">{record.overtimeHours}</td>
                      <td className="p-3">{record.deductedDays}</td>
                      <td className="p-3">{record.leaveBalance}</td>
                      <td className="p-3">{record.leaveAllowance}</td>
                      <td className="p-3">{record.sickLeaveDeduction}</td>
                      <td className="p-3">
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => openEditModal(record)}
                          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition duration-300 text-sm"
                        >
                          تعديل
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <motion.div
              variants={totalsVariants}
              initial="hidden"
              animate="visible"
              className="bg-gradient-to-r from-primary to-secondary rounded-xl shadow-2xl p-4 sm:p-6 border border-gray-100"
            >
              <h3 className="text-xl font-bold text-white mb-4 text-right">الإحصائيات</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي أيام الحضور</p>
                  <p className="font-bold text-primary">{totals.totalAttendanceDays}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي الإجازات الأسبوعية</p>
                  <p className="font-bold text-primary">{totals.totalWeeklyLeaves}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي بدل الإجازة</p>
                  <p className="font-bold text-primary">{totals.totalLeaveAllowance}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي الغياب</p>
                  <p className="font-bold text-primary">{totals.totalAbsences}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي الساعات الإضافية</p>
                  <p className="font-bold text-primary">{totals.totalOvertimeHours}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي الساعات المخصومة</p>
                  <p className="font-bold text-primary">{totals.totalDeductedHours}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي الإجازات السنوية</p>
                  <p className="font-bold text-primary">{totals.totalAnnualLeaves}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي خصم الإجازة المرضية</p>
                  <p className="font-bold text-primary">{totals.totalSickLeaveDeduction}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">متوسط رصيد الإجازة</p>
                  <p className="font-bold text-primary">{totals.totalLeaveBalance}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي الإجازات الرسمية</p>
                  <p className="font-bold text-primary">{totals.totalOfficialLeaves}</p>
                </motion.div>
                <motion.div variants={totalItemVariants} className="bg-white rounded-lg p-3 shadow-md text-right">
                  <p className="text-gray-700 text-sm">إجمالي الأيام المخصومة</p>
                  <p className="font-bold text-primary">{totals.totalDeductedDays}</p>
                </motion.div>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="text-center text-gray-600 text-sm sm:text-base">
            لا توجد بيانات حضور متاحة
          </div>
        )}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            >
              <CustomCheckIcon />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isEditModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="bg-white rounded-xl p-4 w-full max-w-md shadow-2xl"
              >
                <h3 className="text-lg font-bold text-primary mb-2 text-right">تعديل سجل الحضور</h3>
                {error && (
                  <div className="bg-red-100 border border-danger text-danger px-3 py-1 rounded-lg mb-2 text-right text-xs">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      وقت الحضور
                    </label>
                    <input
                      type="time"
                      value={editCheckIn}
                      onChange={(e) => setEditCheckIn(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                      disabled={annualLeaveCheckbox || sickLeaveCheckbox}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      تاريخ الحضور
                    </label>
                    <input
                      type="date"
                      value={editCheckInDate}
                      onChange={(e) => setEditCheckInDate(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                      disabled={annualLeaveCheckbox || sickLeaveCheckbox}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      وقت الانصراف
                    </label>
                    <input
                      type="time"
                      value={editCheckOut}
                      onChange={(e) => setEditCheckOut(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                      disabled={annualLeaveCheckbox || sickLeaveCheckbox}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      تاريخ الانصراف
                    </label>
                    <input
                      type="date"
                      value={editCheckOutDate}
                      onChange={(e) => setEditCheckOutDate(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                      disabled={annualLeaveCheckbox || sickLeaveCheckbox}
                    />
                  </div>
                </div>
                <div className="flex space-x-4 space-x-reverse mt-2">
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={leaveAllowanceCheckbox}
                      onChange={() => handleCheckboxChange('leaveAllowance')}
                      className="form-checkbox h-4 w-4 text-primary"
                    />
                    <span className="text-xs text-gray-700">بدل الإجازة</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={annualLeaveCheckbox}
                      onChange={() => handleCheckboxChange('annualLeave')}
                      className="form-checkbox h-4 w-4 text-primary"
                    />
                    <span className="text-xs text-gray-700">إجازة سنوية</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={sickLeaveCheckbox}
                      onChange={() => handleCheckboxChange('sickLeave')}
                      className="form-checkbox h-4 w-4 text-primary"
                    />
                    <span className="text-xs text-gray-700">إجازة مرضية</span>
                  </label>
                </div>
                <div className="flex justify-between mt-3">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={closeEditModal}
                    className="bg-gray-300 text-gray-700 p-2 rounded-lg hover:bg-gray-400 transition duration-300 font-medium text-xs"
                  >
                    إلغاء
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleEditSubmit}
                    className="bg-primary text-white p-2 rounded-lg hover:bg-secondary transition duration-300 font-medium text-xs"
                    disabled={loading}
                  >
                    {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
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
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="bg-white rounded-xl p-4 w-full max-w-sm shadow-2xl"
              >
                <h3 className="text-lg font-bold text-primary mb-3 text-right">إجازة رسمية</h3>
                {error && (
                  <div className="bg-red-100 border border-danger text-danger px-3 py-2 rounded-lg mb-3 text-right text-xs">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      تاريخ البداية
                    </label>
                    <input
                      type="date"
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      تاريخ النهاية
                    </label>
                    <input
                      type="date"
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      كود الموظف (اختياري)
                    </label>
                    <input
                      type="text"
                      value={leaveEmployeeCode}
                      onChange={(e) => setLeaveEmployeeCode(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                      disabled={applyToAll}
                    />
                  </div>
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-primary"
                    />
                    <span className="text-xs text-gray-700">تطبيق على جميع الموظفين</span>
                  </label>
                </div>
                <div className="flex justify-between mt-4">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={closeLeaveModal}
                    className="bg-gray-300 text-gray-700 p-2 rounded-lg hover:bg-gray-400 transition duration-300 font-medium text-xs"
                  >
                    إلغاء
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleOfficialLeaveSubmit}
                    className="bg-success text-white p-2 rounded-lg hover:bg-green-700 transition duration-300 font-medium text-xs"
                    disabled={loading}
                  >
                    {loading ? 'جاري التطبيق...' : 'تطبيق الإجازة الرسمية'}
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
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="bg-white rounded-xl p-4 w-full max-w-sm shadow-2xl"
              >
                <h3 className="text-lg font-bold text-primary mb-3 text-right">إجازة سنوية</h3>
                {error && (
                  <div className="bg-red-100 border border-danger text-danger px-3 py-2 rounded-lg mb-3 text-right text-xs">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      تاريخ البداية
                    </label>
                    <input
                      type="date"
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      تاريخ النهاية
                    </label>
                    <input
                      type="date"
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      كود الموظف (اختياري)
                    </label>
                    <input
                      type="text"
                      value={leaveEmployeeCode}
                      onChange={(e) => setLeaveEmployeeCode(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                      disabled={applyToAll}
                    />
                  </div>
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-primary"
                    />
                    <span className="text-xs text-gray-700">تطبيق على جميع الموظفين</span>
                  </label>
                </div>
                <div className="flex justify-between mt-4">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={closeLeaveModal}
                    className="bg-gray-300 text-gray-700 p-2 rounded-lg hover:bg-gray-400 transition duration-300 font-medium text-xs"
                  >
                    إلغاء
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleAnnualLeaveSubmit}
                    className="bg-primary text-white p-2 rounded-lg hover:bg-secondary transition duration-300 font-medium text-xs"
                    disabled={loading}
                  >
                    {loading ? 'جاري التطبيق...' : 'تطبيق الإجازة السنوية'}
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
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="bg-white rounded-xl p-4 w-full max-w-sm shadow-2xl"
              >
                <h3 className="text-lg font-bold text-primary mb-3 text-right">إجازة مرضية</h3>
                {error && (
                  <div className="bg-red-100 border border-danger text-danger px-3 py-2 rounded-lg mb-3 text-right text-xs">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      تاريخ البداية
                    </label>
                    <input
                      type="date"
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      تاريخ النهاية
                    </label>
                    <input
                      type="date"
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-medium mb-1 text-right">
                      كود الموظف (اختياري)
                    </label>
                    <input
                      type="text"
                      value={leaveEmployeeCode}
                      onChange={(e) => setLeaveEmployeeCode(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs"
                      disabled={applyToAll}
                    />
                  </div>
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-primary"
                    />
                    <span className="text-xs text-gray-700">تطبيق على جميع الموظفين</span>
                  </label>
                </div>
                <div className="flex justify-between mt-4">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={closeLeaveModal}
                    className="bg-gray-300 text-gray-700 p-2 rounded-lg hover:bg-gray-400 transition duration-300 font-medium text-xs"
                  >
                    إلغاء
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleSickLeaveSubmit}
                    className="bg-warning text-white p-2 rounded-lg hover:bg-yellow-700 transition duration-300 font-medium text-xs"
                    disabled={loading}
                  >
                    {loading ? 'جاري التطبيق...' : 'تطبيق الإجازة المرضية'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default AttendanceUpload;
