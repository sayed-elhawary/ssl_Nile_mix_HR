import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeInOut', type: 'spring', stiffness: 150, damping: 12 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      initial={{ pathLength: 0, rotate: -45 }}
      animate={{ pathLength: 1, rotate: 0, transition: { duration: 0.7, ease: 'easeInOut' } }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </motion.svg>
    <motion.div
      className="absolute inset-0 rounded-full bg-purple-100 opacity-40"
      initial={{ scale: 0 }}
      animate={{ scale: 1.8, opacity: 0, transition: { duration: 1, ease: 'easeOut' } }}
    />
  </motion.div>
);

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeInOut' } }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.div
      className="h-8 w-8 sm:h-10 sm:w-10 border-4 border-purple-600 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-2 sm:mr-3 text-purple-600 text-xs sm:text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

function Settings() {
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftType, setShiftType] = useState('morning');
  const [shiftName, setShiftName] = useState('');
  const [baseHours, setBaseHours] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxOvertimeHours, setMaxOvertimeHours] = useState('');
  const [workDays, setWorkDays] = useState([]);
  const [gracePeriod, setGracePeriod] = useState('');
  const [deductions, setDeductions] = useState([]);
  const [sickLeaveDeduction, setSickLeaveDeduction] = useState('');
  const [overtimeBasis, setOvertimeBasis] = useState('basicSalary');
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1');
  const [fridayOvertimeBasis, setFridayOvertimeBasis] = useState('basicSalary');
  const [fridayOvertimeMultiplier, setFridayOvertimeMultiplier] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const daysMap = {
    0: 'الأحد',
    1: 'الإثنين',
    2: 'الثلاثاء',
    3: 'الأربعاء',
    4: 'الخميس',
    5: 'الجمعة',
    6: 'السبت'
  };

  const reverseDaysMap = {
    'الأحد': 0,
    'الإثنين': 1,
    'الثلاثاء': 2,
    'الأربعاء': 3,
    'الخميس': 4,
    'الجمعة': 5,
    'السبت': 6
  };

  const fetchShifts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('يرجى تسجيل الدخول أولاً لجلب الشيفتات');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/shift`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `فشل في جلب الشيفتات: ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error('البيانات المستلمة ليست مصفوفة:', data);
        setError('البيانات المستلمة غير صالحة. تواصل مع المسؤول.');
        return;
      }
      const transformedData = data.map(shift => ({
        ...shift,
        workDays: Array.isArray(shift.workDays) ? shift.workDays.map(num => daysMap[num]).filter(day => day !== undefined) : []
      }));
      setShifts(transformedData);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء جلب الشيفتات. تحقق من الخادم أو التوكن.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const calculateBaseHours = () => {
    if ((shiftType === 'morning' || shiftType === 'evening') && startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      let [endHours, endMinutes] = endTime.split(':').map(Number);
      const start = new Date(2025, 0, 1, startHours, startMinutes);
      let end = new Date(2025, 0, 1, endHours, endMinutes);
      if (end <= start) end.setDate(end.getDate() + 1);
      return ((end - start) / (1000 * 60 * 60)).toFixed(2);
    }
    return baseHours;
  };

  const calculateOvertimeEndTime = () => {
    if ((shiftType === 'morning' || shiftType === 'evening') && endTime && maxOvertimeHours) {
      const [hours, minutes] = endTime.split(':').map(Number);
      const endDate = new Date(2025, 0, 1, hours, minutes);
      endDate.setHours(endDate.getHours() + Number(maxOvertimeHours));
      const overtimeHours = endDate.getHours().toString().padStart(2, '0');
      const overtimeMinutes = endDate.getMinutes().toString().padStart(2, '0');
      return `${overtimeHours}:${overtimeMinutes}`;
    }
    return '';
  };

  const getShiftIcon = (type) => {
    if (type === 'morning') {
      return (
        <motion.svg
          className="w-4 h-4 text-yellow-500 inline-block mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
          initial={{ scale: 0 }}
          animate={{ scale: 1, transition: { duration: 0.3 } }}
        >
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM1 10a9 9 0 1118 0 9 9 0 01-18 0z" />
        </motion.svg>
      );
    } else if (type === 'evening') {
      return (
        <motion.svg
          className="w-4 h-4 text-blue-900 inline-block mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
          initial={{ scale: 0 }}
          animate={{ scale: 1, transition: { duration: 0.3 } }}
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </motion.svg>
      );
    } else if (type === '24/24') {
      return (
        <motion.svg
          className="w-4 h-4 text-gray-700 inline-block mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
          initial={{ scale: 0 }}
          animate={{ scale: 1, transition: { duration: 0.3 } }}
        >
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </motion.svg>
      );
    }
    return null;
  };

  const handleShiftChange = (e) => {
    const shiftId = e.target.value;
    if (!shiftId) {
      setSelectedShift(null);
      setShiftType('morning');
      setShiftName('');
      setBaseHours('');
      setStartTime('');
      setEndTime('');
      setMaxOvertimeHours('');
      setWorkDays([]);
      setGracePeriod('');
      setDeductions([]);
      setSickLeaveDeduction('');
      setOvertimeBasis('basicSalary');
      setOvertimeMultiplier('1');
      setFridayOvertimeBasis('basicSalary');
      setFridayOvertimeMultiplier('1');
      return;
    }

    const shift = shifts.find((s) => s._id === shiftId);
    if (shift) {
      setSelectedShift(shift);
      setShiftType(shift.shiftType);
      setShiftName(shift.shiftName);
      setBaseHours(shift.baseHours);
      setStartTime(shift.startTime || '');
      setEndTime(shift.endTime || '');
      setMaxOvertimeHours(shift.maxOvertimeHours || '');
      setWorkDays(shift.workDays);
      setGracePeriod(shift.gracePeriod || '');
      setDeductions(shift.deductions || []);
      setSickLeaveDeduction(shift.sickLeaveDeduction || '');
      setOvertimeBasis(shift.overtimeBasis || 'basicSalary');
      setOvertimeMultiplier(shift.overtimeMultiplier || '1');
      setFridayOvertimeBasis(shift.fridayOvertimeBasis || 'basicSalary');
      setFridayOvertimeMultiplier(shift.fridayOvertimeMultiplier || '1');
    }
  };

  const handleWorkDaysChange = (e) => {
    const { value, checked } = e.target;
    let updatedWorkDays;
    if (checked) {
      updatedWorkDays = [...workDays, value];
    } else {
      updatedWorkDays = workDays.filter((day) => day !== value);
    }
    setWorkDays(updatedWorkDays);
  };

  const addDeduction = () => {
    if (shiftType === 'morning' || shiftType === 'evening') {
      setDeductions([...deductions, { start: '', end: '', type: '' }]);
    } else {
      setDeductions([...deductions, { duration: '', deductionAmount: '', type: 'minutes' }]);
    }
  };

  const updateDeduction = (index, field, value) => {
    const newDeductions = [...deductions];
    newDeductions[index][field] = value;
    if (shiftType === '24/24' && field === 'duration') {
      newDeductions[index].deductionAmount = value;
    }
    setDeductions(newDeductions);
  };

  const removeDeduction = (index) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedShift) {
      setError('يرجى اختيار شيفت');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (Number(baseHours) <= 0) {
        setError('الساعات الأساسية يجب أن تكون قيمة إيجابية');
        setLoading(false);
        return;
      }
      if (shiftType === 'morning' || shiftType === 'evening') {
        if (!startTime || !endTime) {
          setError('يجب إدخال وقت البداية والنهاية للشيفت الصباحي أو المسائي');
          setLoading(false);
          return;
        }
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        let [endHours, endMinutes] = endTime.split(':').map(Number);
        const start = new Date(2025, 0, 1, startHours, startMinutes);
        let end = new Date(2025, 0, 1, endHours, endMinutes);
        if (shiftType === 'evening' && end <= start) {
          end.setDate(end.getDate() + 1);
        }
        const calculatedBaseHours = (end - start) / (1000 * 60 * 60);
        if (Math.abs(calculatedBaseHours - Number(baseHours)) > 0.1) {
          setError('الساعات الأساسية يجب أن تتطابق مع الفرق بين وقت البداية والنهاية (بحد أقصى تفاوت 0.1 ساعة)');
          setLoading(false);
          return;
        }
        for (const deduction of deductions) {
          if (!deduction.start || !deduction.end || !deduction.type) {
            setError('جميع حقول الخصم مطلوبة');
            setLoading(false);
            return;
          }
          const [dedStartHours, dedStartMinutes] = deduction.start.split(':').map(Number);
          let [dedEndHours, dedEndMinutes] = deduction.end.split(':').map(Number);
          const dedStart = new Date(2025, 0, 1, dedStartHours, dedStartMinutes);
          let dedEnd = new Date(2025, 0, 1, dedEndHours, dedEndMinutes);
          if (shiftType === 'evening' && dedEnd <= dedStart) {
            dedEnd.setDate(dedEnd.getDate() + 1);
          }
          if (dedEnd <= dedStart) {
            setError('وقت نهاية الخصم يجب أن يكون بعد وقت البداية');
            setLoading(false);
            return;
          }
        }
      } else {
        if (Number(maxOvertimeHours) <= 0) {
          setError('الساعات الإضافية يجب أن تكون قيمة إيجابية لشيفت 24/24');
          setLoading(false);
          return;
        }
        for (const deduction of deductions) {
          if (!deduction.duration || !deduction.deductionAmount || !deduction.type) {
            setError('جميع حقول الخصم مطلوبة');
            setLoading(false);
            return;
          }
          if (Number(deduction.duration) <= 0 || Number(deduction.deductionAmount) <= 0) {
            setError('مدة الخصم ومقدار الخصم يجب أن يكونا قيمتين إيجابيتين');
            setLoading(false);
            return;
          }
          if (Number(deduction.duration) > Number(baseHours) * 60) {
            setError('مدة الخصم يجب ألا تتجاوز الساعات الأساسية');
            setLoading(false);
            return;
          }
        }
      }
      const numericWorkDays = workDays.map(name => reverseDaysMap[name]).filter(day => day !== undefined).sort((a, b) => a - b);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/shift/update/${selectedShift._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          shiftType,
          shiftName,
          baseHours,
          startTime: shiftType === 'morning' || shiftType === 'evening' ? startTime : null,
          endTime: shiftType === 'morning' || shiftType === 'evening' ? endTime : null,
          maxOvertimeHours: maxOvertimeHours || 0,
          workDays: numericWorkDays,
          gracePeriod,
          deductions,
          sickLeaveDeduction,
          isCrossDay: shiftType === 'evening',
          overtimeBasis,
          overtimeMultiplier: Number(overtimeMultiplier),
          fridayOvertimeBasis,
          fridayOvertimeMultiplier: Number(fridayOvertimeMultiplier)
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowSuccessAnimation(true);
        setSuccessMessage('تم تعديل الشيفت بنجاح');
        setTimeout(() => {
          setShowSuccessAnimation(false);
          fetchShifts();
          setSelectedShift(null);
          setShiftType('morning');
          setShiftName('');
          setBaseHours('');
          setStartTime('');
          setEndTime('');
          setMaxOvertimeHours('');
          setWorkDays([]);
          setGracePeriod('');
          setDeductions([]);
          setSickLeaveDeduction('');
          setOvertimeBasis('basicSalary');
          setOvertimeMultiplier('1');
          setFridayOvertimeBasis('basicSalary');
          setFridayOvertimeMultiplier('1');
        }, 1500);
      } else {
        setError(data.message || 'حدث خطأ أثناء تعديل الشيفت');
      }
    } catch (err) {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedShift) {
      setError('يرجى اختيار شيفت');
      return;
    }
    if (window.confirm('هل أنت متأكد من حذف الشيفت؟')) {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/shift/delete/${selectedShift._id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setShowSuccessAnimation(true);
          setSuccessMessage('تم حذف الشيفت بنجاح');
          setTimeout(() => {
            setShowSuccessAnimation(false);
            fetchShifts();
            setSelectedShift(null);
            setShiftType('morning');
            setShiftName('');
            setBaseHours('');
            setStartTime('');
            setEndTime('');
            setMaxOvertimeHours('');
            setWorkDays([]);
            setGracePeriod('');
            setDeductions([]);
            setSickLeaveDeduction('');
            setOvertimeBasis('basicSalary');
            setOvertimeMultiplier('1');
            setFridayOvertimeBasis('basicSalary');
            setFridayOvertimeMultiplier('1');
          }, 1500);
        } else {
          setError(data.message || 'حدث خطأ أثناء حذف الشيفت');
        }
      } catch (err) {
        setError('حدث خطأ، حاول مرة أخرى');
      } finally {
        setLoading(false);
      }
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 6px 25px rgba(139, 92, 246, 0.3)', transition: { duration: 0.2, ease: 'easeInOut' } },
    tap: { scale: 0.95, backgroundColor: '#A78BFA', transition: { duration: 0.2, ease: 'easeInOut' } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-blue-100 p-4 sm:p-6 font-noto-sans-arabic relative overflow-hidden dir=rtl">
      <motion.div
        className="absolute top-[-10%] left-[-10%] h-64 w-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-50"
        animate={{ scale: [1, 1.2, 1], x: [-20, 20, -20], y: [-20, 20, -20] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-15%] right-[-10%] h-80 w-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-40"
        animate={{ scale: [1, 1.3, 1], x: [20, -20, 20], y: [20, -20, 20] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 h-96 w-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        animate={{ scale: [1, 1.15, 1], rotate: [0, 45, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto relative z-10 max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl"
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-purple-600 mb-4 sm:mb-6 text-right tracking-wide drop-shadow-sm">
          إعدادات الشيفتات
        </h2>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-red-100 text-red-700 p-2 sm:p-3 rounded-xl mb-3 sm:mb-4 text-xs sm:text-sm text-right shadow-sm"
            >
              {error}
            </motion.div>
          )}
          {successMessage && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-purple-50 text-purple-600 p-2 sm:p-3 rounded-xl mb-3 sm:mb-4 text-xs sm:text-sm text-right shadow-sm"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-center mb-4 sm:mb-6">
            <CustomLoadingSpinner />
          </div>
        )}
        <div className="bg-white p-3 sm:p-4 md:p-5 rounded-2xl shadow-lg border border-purple-100 backdrop-blur-sm bg-opacity-90">
          <div className="mb-4 sm:mb-6">
            <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">اختر الشيفت</label>
            <div className="flex items-center space-x-2 sm:space-x-4 space-x-reverse">
              <select
                onChange={handleShiftChange}
                className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
              >
                <option value="">اختر الشيفت</option>
                {shifts.map((shift) => (
                  <option key={shift._id} value={shift._id}>
                    {shift.shiftName} ({shift.shiftType === 'morning' ? 'صباحي' : shift.shiftType === 'evening' ? 'مسائي' : '24/24'}) {getShiftIcon(shift.shiftType)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedShift && (
            <form onSubmit={handleUpdate} className="p-3 sm:p-4 md:p-5 rounded-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">نوع الشيفت</label>
                  <div className="flex items-center">
                    <select
                      value={shiftType}
                      onChange={(e) => {
                        setShiftType(e.target.value);
                        setStartTime('');
                        setEndTime('');
                        setBaseHours('');
                        setMaxOvertimeHours('');
                        setDeductions([]);
                        setOvertimeBasis('basicSalary');
                        setOvertimeMultiplier('1');
                        setFridayOvertimeBasis('basicSalary');
                        setFridayOvertimeMultiplier('1');
                      }}
                      className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                      disabled
                    >
                      <option value="morning">صباحي</option>
                      <option value="evening">مسائي</option>
                      <option value="24/24">24/24</option>
                    </select>
                    {getShiftIcon(shiftType)}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">اسم الشيفت</label>
                  <input
                    type="text"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">الساعات الأساسية</label>
                  <input
                    type="number"
                    value={baseHours}
                    onChange={(e) => setBaseHours(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                    readOnly={shiftType === 'morning' || shiftType === 'evening'}
                    placeholder={shiftType === 'morning' || shiftType === 'evening' ? 'يتم الحساب تلقائيًا' : ''}
                    required
                  />
                </div>
                {(shiftType === 'morning' || shiftType === 'evening') && (
                  <>
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">وقت بداية الشيفت</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">وقت نهاية الشيفت</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => {
                          setEndTime(e.target.value);
                          setBaseHours(calculateBaseHours());
                        }}
                        className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                        required
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">الحد الأقصى للساعات الإضافية</label>
                  <input
                    type="number"
                    value={maxOvertimeHours}
                    onChange={(e) => setMaxOvertimeHours(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                    placeholder={shiftType === '24/24' ? 'مطلوب' : 'اختياري'}
                    required={shiftType === '24/24'}
                  />
                </div>
                {(shiftType === 'morning' || shiftType === 'evening') && maxOvertimeHours && (
                  <div>
                    <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">وقت نهاية الشيفت الإضافي</label>
                    <input
                      type="text"
                      value={calculateOvertimeEndTime()}
                      readOnly
                      className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl bg-gray-100 text-xs sm:text-sm"
                    />
                  </div>
                )}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">أيام العمل</label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(reverseDaysMap).map((day) => (
                      <label key={day} className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          value={day}
                          checked={workDays.includes(day)}
                          onChange={handleWorkDaysChange}
                          className="form-checkbox h-5 w-5 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-600">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">فترة السماح (دقائق)</label>
                  <input
                    type="number"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">خصم الإجازة المرضية</label>
                  <select
                    value={sickLeaveDeduction}
                    onChange={(e) => setSickLeaveDeduction(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                  >
                    <option value="">اختر</option>
                    <option value="none">بدون خصم</option>
                    <option value="quarter">ربع يوم</option>
                    <option value="half">نص يوم</option>
                    <option value="full">يوم كامل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">أساس حساب الساعات الإضافية</label>
                  <select
                    value={overtimeBasis}
                    onChange={(e) => setOvertimeBasis(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                    required
                  >
                    <option value="basicSalary">الراتب الأساسي</option>
                    <option value="totalSalary">الراتب الإجمالي بالبدلات</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">معدل الساعات الإضافية</label>
                  <select
                    value={overtimeMultiplier}
                    onChange={(e) => setOvertimeMultiplier(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                    required
                  >
                    <option value="1">ساعة</option>
                    <option value="1.5">ساعة ونص</option>
                    <option value="2">ساعتين</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">أساس حساب ساعات الجمعة الإضافية</label>
                  <select
                    value={fridayOvertimeBasis}
                    onChange={(e) => setFridayOvertimeBasis(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                    required
                  >
                    <option value="basicSalary">الراتب الأساسي</option>
                    <option value="totalSalary">الراتب الإجمالي بالبدلات</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">معدل ساعات الجمعة الإضافية</label>
                  <select
                    value={fridayOvertimeMultiplier}
                    onChange={(e) => setFridayOvertimeMultiplier(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                    required
                  >
                    <option value="1">ساعة</option>
                    <option value="1.5">ساعة ونص</option>
                    <option value="2">ساعتين</option>
                  </select>
                </div>
              </div>
              <div className="mb-4 sm:mb-6">
                <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-right">
                  {shiftType === '24/24' ? 'خصومات الخروج المبكر' : 'خصومات التأخير'}
                </label>
                <p className="text-gray-500 text-xs sm:text-sm mb-2 sm:mb-4">
                  {shiftType === '24/24'
                    ? 'أدخل مدة النقص ومقدار الخصم بالدقائق (مثال: إذا خرج بعد 8 ساعات، أدخل 960 دقيقة ناقصة و960 دقيقة خصم). اختر نوع الخصم: ربع يوم، نص يوم، يوم كامل، أو بالدقائق.'
                    : 'أدخل وقت بداية ونهاية التأخير (مثال: تأخر من 08:00 إلى 08:30). اختر نوع الخصم: ربع يوم، نص يوم، يوم كامل، أو بالدقائق.'}
                </p>
                {deductions.map((deduction, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 sm:space-x-reverse mb-3 sm:mb-4">
                    {shiftType === 'morning' || shiftType === 'evening' ? (
                      <>
                        <input
                          type="time"
                          value={deduction.start}
                          onChange={(e) => updateDeduction(index, 'start', e.target.value)}
                          className="w-full sm:w-1/4 p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                          placeholder="من (الوقت)"
                          required
                        />
                        <input
                          type="time"
                          value={deduction.end}
                          onChange={(e) => updateDeduction(index, 'end', e.target.value)}
                          className="w-full sm:w-1/4 p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                          placeholder="إلى (الوقت)"
                          required
                        />
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          value={deduction.duration}
                          onChange={(e) => updateDeduction(index, 'duration', e.target.value)}
                          className="w-full sm:w-1/4 p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                          placeholder="مدة النقص (دقائق)"
                          required
                        />
                        <input
                          type="number"
                          value={deduction.deductionAmount}
                          onChange={(e) => updateDeduction(index, 'deductionAmount', e.target.value)}
                          className="w-full sm:w-1/4 p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                          placeholder="مقدار الخصم (دقائق)"
                          required
                        />
                      </>
                    )}
                    <select
                      value={deduction.type}
                      onChange={(e) => updateDeduction(index, 'type', e.target.value)}
                      className="w-full sm:w-1/4 p-2 sm:p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-xs sm:text-sm bg-purple-50"
                      required
                    >
                      <option value="">اختر نوع الخصم</option>
                      <option value="quarter">ربع يوم</option>
                      <option value="half">نص يوم</option>
                      <option value="full">يوم كامل</option>
                      <option value="minutes">بالدقائق</option>
                    </select>
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      type="button"
                      onClick={() => removeDeduction(index)}
                      className="w-full sm:w-auto bg-red-600 text-white p-2 sm:p-3 rounded-2xl hover:bg-red-700 transition duration-200 text-xs sm:text-sm font-medium shadow-md"
                    >
                      حذف
                    </motion.button>
                  </div>
                ))}
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="button"
                  onClick={addDeduction}
                  className="w-full sm:w-auto bg-green-600 text-white p-2 sm:p-3 rounded-2xl hover:bg-green-700 transition duration-200 text-xs sm:text-sm font-medium shadow-md"
                >
                  إضافة خصم جديد
                </motion.button>
              </div>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="submit"
                  className="w-full sm:w-auto bg-purple-600 text-white p-2 sm:p-3 rounded-2xl hover:bg-purple-700 transition duration-200 text-xs sm:text-sm font-medium shadow-md"
                  disabled={loading}
                >
                  تعديل الشيفت
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="button"
                  onClick={handleDelete}
                  className="w-full sm:w-auto bg-red-600 text-white p-2 sm:p-3 rounded-2xl hover:bg-red-700 transition duration-200 text-xs sm:text-sm font-medium shadow-md"
                  disabled={loading}
                >
                  حذف الشيفت
                </motion.button>
              </div>
            </form>
          )}
          <AnimatePresence>
            {showSuccessAnimation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
                exit={{ opacity: 0, scale: 0.5, rotate: 90, transition: { duration: 0.3, ease: 'easeInOut' } }}
                className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50"
              >
                <CustomCheckIcon />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default Settings;
