import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeOut', type: 'spring', stiffness: 150, damping: 12 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1, transition: { duration: 0.6, ease: 'easeOut' } }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </motion.svg>
  </motion.div>
);

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
    exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.div
      className="h-8 w-8 border-3 border-purple-500 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-2 text-purple-500 text-sm font-medium">جارٍ التحميل...</span>
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
    6: 'السبت',
  };

  const reverseDaysMap = {
    'الأحد': 0,
    'الإثنين': 1,
    'الثلاثاء': 2,
    'الأربعاء': 3,
    'الخميس': 4,
    'الجمعة': 5,
    'السبت': 6,
  };

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/shift`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = response.data;
      if (!Array.isArray(data)) {
        setError('البيانات المستلمة غير صالحة. تواصل مع المسؤول.');
        return;
      }
      const transformedData = data.map((shift) => ({
        ...shift,
        workDays: Array.isArray(shift.workDays) ? shift.workDays.map((num) => daysMap[num]).filter((day) => day !== undefined) : [],
      }));
      setShifts(transformedData);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError('التوكن غير صالح أو انتهت صلاحيته، يرجى تسجيل الدخول مرة أخرى');
        } else {
          setError(err.response.data.message || 'حدث خطأ أثناء جلب الشيفتات');
        }
      } else {
        setError('فشل الاتصال بالخادم، تحقق من الاتصال بالإنترنت');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const calculateBaseHours = useCallback(() => {
    if ((shiftType === 'morning' || shiftType === 'evening') && startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      let [endHours, endMinutes] = endTime.split(':').map(Number);
      const start = new Date(2025, 0, 1, startHours, startMinutes);
      let end = new Date(2025, 0, 1, endHours, endMinutes);
      if (end <= start) end.setDate(end.getDate() + 1);
      return ((end - start) / (1000 * 60 * 60)).toFixed(2);
    }
    return baseHours;
  }, [shiftType, startTime, endTime, baseHours]);

  const calculateOvertimeEndTime = useCallback(() => {
    if ((shiftType === 'morning' || shiftType === 'evening') && endTime && maxOvertimeHours) {
      const [hours, minutes] = endTime.split(':').map(Number);
      const endDate = new Date(2025, 0, 1, hours, minutes);
      endDate.setHours(endDate.getHours() + Number(maxOvertimeHours));
      const overtimeHours = endDate.getHours().toString().padStart(2, '0');
      const overtimeMinutes = endDate.getMinutes().toString().padStart(2, '0');
      return `${overtimeHours}:${overtimeMinutes}`;
    }
    return '';
  }, [shiftType, endTime, maxOvertimeHours]);

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

  const handleShiftChange = useCallback((e) => {
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
  }, [shifts]);

  const handleWorkDaysChange = useCallback((e) => {
    const { value, checked } = e.target;
    setWorkDays((prev) =>
      checked ? [...prev, value] : prev.filter((day) => day !== value)
    );
  }, []);

  const addDeduction = useCallback(() => {
    setDeductions((prev) => [
      ...prev,
      shiftType === 'morning' || shiftType === 'evening'
        ? { start: '', end: '', type: '' }
        : { duration: '', deductionAmount: '', type: 'minutes' },
    ]);
  }, [shiftType]);

  const updateDeduction = useCallback((index, field, value) => {
    setDeductions((prev) => {
      const newDeductions = [...prev];
      newDeductions[index][field] = value;
      if (shiftType === '24/24' && field === 'duration') {
        newDeductions[index].deductionAmount = value;
      }
      return newDeductions;
    });
  }, [shiftType]);

  const removeDeduction = useCallback((index) => {
    setDeductions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdate = useCallback(
    async (e) => {
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
          return;
        }
        if (shiftType === 'morning' || shiftType === 'evening') {
          if (!startTime || !endTime) {
            setError('يجب إدخال وقت البداية والنهاية للشيفت الصباحي أو المسائي');
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
            setError('الساعات الأساسية يجب أن تتطابق مع الفرق بين وقت البداية والنهاية');
            return;
          }
          for (const deduction of deductions) {
            if (!deduction.start || !deduction.end || !deduction.type) {
              setError('جميع حقول الخصم مطلوبة');
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
              return;
            }
          }
        } else {
          if (Number(maxOvertimeHours) <= 0) {
            setError('الساعات الإضافية يجب أن تكون قيمة إيجابية لشيفت 24/24');
            return;
          }
          for (const deduction of deductions) {
            if (!deduction.duration || !deduction.deductionAmount || !deduction.type) {
              setError('جميع حقول الخصم مطلوبة');
              return;
            }
            if (Number(deduction.duration) <= 0 || Number(deduction.deductionAmount) <= 0) {
              setError('مدة الخصم ومقدار الخصم يجب أن يكونا قيمتين إيجابيتين');
              return;
            }
            if (Number(deduction.duration) > Number(baseHours) * 60) {
              setError('مدة الخصم يجب ألا تتجاوز الساعات الأساسية');
              return;
            }
          }
        }
        const numericWorkDays = workDays.map((name) => reverseDaysMap[name]).filter((day) => day !== undefined).sort((a, b) => a - b);
        const response = await axios.put(
          `${process.env.REACT_APP_API_URL}/api/shift/update/${selectedShift._id}`,
          {
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
            fridayOvertimeMultiplier: Number(fridayOvertimeMultiplier),
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (response.data.success) {
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
          }, 1000);
        } else {
          setError(response.data.message || 'حدث خطأ أثناء تعديل الشيفت');
        }
      } catch (err) {
        if (err.response) {
          if (err.response.status === 401) {
            setError('التوكن غير صالح أو انتهت صلاحيته، يرجى تسجيل الدخول مرة أخرى');
          } else {
            setError(err.response.data.message || 'حدث خطأ أثناء تعديل الشيفت');
          }
        } else {
          setError('فشل الاتصال بالخادم، تحقق من الاتصال بالإنترنت');
        }
      } finally {
        setLoading(false);
      }
    },
    [
      selectedShift,
      shiftType,
      shiftName,
      baseHours,
      startTime,
      endTime,
      maxOvertimeHours,
      workDays,
      gracePeriod,
      deductions,
      sickLeaveDeduction,
      overtimeBasis,
      overtimeMultiplier,
      fridayOvertimeBasis,
      fridayOvertimeMultiplier,
      fetchShifts,
    ]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedShift) {
      setError('يرجى اختيار شيفت');
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف الشيفت؟')) return;
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/api/shift/delete/${selectedShift._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.data.success) {
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
        }, 1000);
      } else {
        setError(response.data.message || 'حدث خطأ أثناء حذف الشيفت');
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError('التوكن غير صالح أو انتهت صلاحيته، يرجى تسجيل الدخول مرة أخرى');
        } else {
          setError(err.response.data.message || 'حدث خطأ أثناء حذف الشيفت');
        }
      } else {
        setError('فشل الاتصال بالخادم، تحقق من الاتصال بالإنترنت');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedShift, fetchShifts]);

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', transition: { duration: 0.2, ease: 'easeOut' } },
    tap: { scale: 0.95, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  const inputVariants = {
    hover: { scale: 1.02, borderColor: '#8B5CF6', transition: { duration: 0.2, ease: 'easeOut' } },
    focus: { scale: 1.02, borderColor: '#8B5CF6', boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.3)', transition: { duration: 0.2, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 font-noto-sans-arabic relative dir=rtl" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <div className="container mx-auto max-w-full sm:max-w-lg md:max-w-2xl lg:max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-6 sm:mb-8 text-right"
        >
          إعدادات الشيفتات
        </motion.h2>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-red-600 bg-red-50 p-3 rounded-lg mb-6 text-right text-sm"
            >
              {error}
            </motion.p>
          )}
          {successMessage && !loading && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-green-600 bg-green-50 p-3 rounded-lg mb-6 text-right text-sm"
            >
              {successMessage}
            </motion.p>
          )}
        </AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex justify-center mb-6"
          >
            <CustomLoadingSpinner />
          </motion.div>
        )}
        <motion.div
          variants={formVariants}
          initial="hidden"
          animate="visible"
          className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
        >
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2 text-right">اختر الشيفت</label>
            <motion.select
              variants={inputVariants}
              whileHover="hover"
              whileFocus="focus"
              onChange={handleShiftChange}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
            >
              <option value="">اختر الشيفت</option>
              {shifts.map((shift) => (
                <option key={shift._id} value={shift._id}>
                  {shift.shiftName} ({shift.shiftType === 'morning' ? 'صباحي' : shift.shiftType === 'evening' ? 'مسائي' : '24/24'}) {getShiftIcon(shift.shiftType)}
                </option>
              ))}
            </motion.select>
          </div>
          {selectedShift && (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">نوع الشيفت</label>
                  <div className="flex items-center">
                    <motion.select
                      variants={inputVariants}
                      whileHover="hover"
                      whileFocus="focus"
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
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                      disabled
                    >
                      <option value="morning">صباحي</option>
                      <option value="evening">مسائي</option>
                      <option value="24/24">24/24</option>
                    </motion.select>
                    {getShiftIcon(shiftType)}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">اسم الشيفت</label>
                  <motion.input
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    type="text"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">الساعات الأساسية</label>
                  <motion.input
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    type="number"
                    value={baseHours}
                    onChange={(e) => setBaseHours(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                    readOnly={shiftType === 'morning' || shiftType === 'evening'}
                    placeholder={shiftType === 'morning' || shiftType === 'evening' ? 'يتم الحساب تلقائيًا' : ''}
                    required
                  />
                </div>
                {(shiftType === 'morning' || shiftType === 'evening') && (
                  <>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2 text-right">وقت بداية الشيفت</label>
                      <motion.input
                        variants={inputVariants}
                        whileHover="hover"
                        whileFocus="focus"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2 text-right">وقت نهاية الشيفت</label>
                      <motion.input
                        variants={inputVariants}
                        whileHover="hover"
                        whileFocus="focus"
                        type="time"
                        value={endTime}
                        onChange={(e) => {
                          setEndTime(e.target.value);
                          setBaseHours(calculateBaseHours());
                        }}
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                        required
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">الحد الأقصى للساعات الإضافية</label>
                  <motion.input
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    type="number"
                    value={maxOvertimeHours}
                    onChange={(e) => setMaxOvertimeHours(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                    placeholder={shiftType === '24/24' ? 'مطلوب' : 'اختياري'}
                    required={shiftType === '24/24'}
                  />
                </div>
                {(shiftType === 'morning' || shiftType === 'evening') && maxOvertimeHours && (
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2 text-right">وقت نهاية الشيفت الإضافي</label>
                    <motion.input
                      variants={inputVariants}
                      whileHover="hover"
                      whileFocus="focus"
                      type="text"
                      value={calculateOvertimeEndTime()}
                      readOnly
                      className="w-full p-3 border border-gray-200 rounded-lg bg-gray-100 text-sm"
                    />
                  </div>
                )}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">أيام العمل</label>
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
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">فترة السماح (دقائق)</label>
                  <motion.input
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    type="number"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">خصم الإجازة المرضية</label>
                  <motion.select
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    value={sickLeaveDeduction}
                    onChange={(e) => setSickLeaveDeduction(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                  >
                    <option value="">اختر</option>
                    <option value="none">بدون خصم</option>
                    <option value="quarter">ربع يوم</option>
                    <option value="half">نص يوم</option>
                    <option value="full">يوم كامل</option>
                  </motion.select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">أساس حساب الساعات الإضافية</label>
                  <motion.select
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    value={overtimeBasis}
                    onChange={(e) => setOvertimeBasis(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                    required
                  >
                    <option value="basicSalary">الراتب الأساسي</option>
                    <option value="totalSalary">الراتب الإجمالي بالبدلات</option>
                  </motion.select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">معدل الساعات الإضافية</label>
                  <motion.select
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    value={overtimeMultiplier}
                    onChange={(e) => setOvertimeMultiplier(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                    required
                  >
                    <option value="1">ساعة</option>
                    <option value="1.5">ساعة ونص</option>
                    <option value="2">ساعتين</option>
                  </motion.select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">أساس حساب ساعات الجمعة الإضافية</label>
                  <motion.select
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    value={fridayOvertimeBasis}
                    onChange={(e) => setFridayOvertimeBasis(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                    required
                  >
                    <option value="basicSalary">الراتب الأساسي</option>
                    <option value="totalSalary">الراتب الإجمالي بالبدلات</option>
                  </motion.select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2 text-right">معدل ساعات الجمعة الإضافية</label>
                  <motion.select
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    value={fridayOvertimeMultiplier}
                    onChange={(e) => setFridayOvertimeMultiplier(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                    required
                  >
                    <option value="1">ساعة</option>
                    <option value="1.5">ساعة ونص</option>
                    <option value="2">ساعتين</option>
                  </motion.select>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2 text-right">
                  {shiftType === '24/24' ? 'خصومات الخروج المبكر' : 'خصومات التأخير'}
                </label>
                <p className="text-gray-500 text-sm mb-4">
                  {shiftType === '24/24'
                    ? 'أدخل مدة النقص ومقدار الخصم بالدقائق (مثال: إذا خرج بعد 8 ساعات، أدخل 960 دقيقة ناقصة و960 دقيقة خصم). اختر نوع الخصم: ربع يوم، نص يوم، يوم كامل، أو بالدقائق.'
                    : 'أدخل وقت بداية ونهاية التأخير (مثال: تأخر من 08:00 إلى 08:30). اختر نوع الخصم: ربع يوم، نص يوم، يوم كامل، أو بالدقائق.'}
                </p>
                {deductions.map((deduction, index) => (
                  <div key={index} className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-3 md:space-x-reverse mb-4">
                    {shiftType === 'morning' || shiftType === 'evening' ? (
                      <>
                        <motion.input
                          variants={inputVariants}
                          whileHover="hover"
                          whileFocus="focus"
                          type="time"
                          value={deduction.start}
                          onChange={(e) => updateDeduction(index, 'start', e.target.value)}
                          className="w-full md:w-1/4 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                          placeholder="من (الوقت)"
                          required
                        />
                        <motion.input
                          variants={inputVariants}
                          whileHover="hover"
                          whileFocus="focus"
                          type="time"
                          value={deduction.end}
                          onChange={(e) => updateDeduction(index, 'end', e.target.value)}
                          className="w-full md:w-1/4 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                          placeholder="إلى (الوقت)"
                          required
                        />
                      </>
                    ) : (
                      <>
                        <motion.input
                          variants={inputVariants}
                          whileHover="hover"
                          whileFocus="focus"
                          type="number"
                          value={deduction.duration}
                          onChange={(e) => updateDeduction(index, 'duration', e.target.value)}
                          className="w-full md:w-1/4 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                          placeholder="مدة النقص (دقائق)"
                          required
                        />
                        <motion.input
                          variants={inputVariants}
                          whileHover="hover"
                          whileFocus="focus"
                          type="number"
                          value={deduction.deductionAmount}
                          onChange={(e) => updateDeduction(index, 'deductionAmount', e.target.value)}
                          className="w-full md:w-1/4 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                          placeholder="مقدار الخصم (دقائق)"
                          required
                        />
                      </>
                    )}
                    <motion.select
                      variants={inputVariants}
                      whileHover="hover"
                      whileFocus="focus"
                      value={deduction.type}
                      onChange={(e) => updateDeduction(index, 'type', e.target.value)}
                      className="w-full md:w-1/4 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
                      required
                    >
                      <option value="">اختر نوع الخصم</option>
                      <option value="quarter">ربع يوم</option>
                      <option value="half">نص يوم</option>
                      <option value="full">يوم كامل</option>
                      <option value="minutes">بالدقائق</option>
                    </motion.select>
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      type="button"
                      onClick={() => removeDeduction(index)}
                      className="w-full md:w-auto bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm font-medium shadow-md"
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
                  className="w-full md:w-auto bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition-colors duration-200 text-sm font-medium shadow-md"
                >
                  إضافة خصم جديد
                </motion.button>
              </div>
              <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3 md:space-x-reverse">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="submit"
                  className="w-full md:w-auto bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 transition-colors duration-200 text-sm font-medium shadow-md"
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
                  className="w-full md:w-auto bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm font-medium shadow-md"
                  disabled={loading}
                >
                  حذف الشيفت
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <div className="bg-white p-4 rounded-full shadow-md">
                <CustomCheckIcon />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Settings;
