import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const dayMap = {
  'الأحد': 0,
  'الإثنين': 1,
  'الثلاثاء': 2,
  'الأربعاء': 3,
  'الخميس': 4,
  'الجمعة': 5,
  'السبت': 6,
};

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, transition: { duration: 0.4 } }}
    exit={{ opacity: 0, transition: { duration: 0.4 } }}
  >
    <div className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    <span className="mr-3 text-purple-600 text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

function CreateShift() {
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

  const calculateOvertimeEndTime = () => {
    if ((shiftType === 'morning' || shiftType === 'evening') && endTime && maxOvertimeHours) {
      const [hours, minutes] = endTime.split(':').map(Number);
      const endDate = new Date(2025, 0, 1, hours, minutes);
      endDate.setHours(endDate.getHours() + Number(maxOvertimeHours));
      if (shiftType === 'evening' && endDate.getDate() > 1) {
        endDate.setDate(endDate.getDate() + 1);
      }
      const overtimeHours = endDate.getHours().toString().padStart(2, '0');
      const overtimeMinutes = endDate.getMinutes().toString().padStart(2, '0');
      return `${overtimeHours}:${overtimeMinutes}`;
    }
    return '';
  };

  const handleWorkDaysChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setWorkDays([...workDays, value]);
    } else {
      setWorkDays(workDays.filter((day) => day !== value));
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        if (Math.abs(calculatedBaseHours - Number(baseHours)) > 0.01) {
          setError('الساعات الأساسية يجب أن تتطابق مع الفرق بين وقت البداية والنهاية');
          setLoading(false);
          return;
        }
        for (const deduction of deductions) {
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
      } else if (shiftType === '24/24') {
        if (Number(maxOvertimeHours) <= 0) {
          setError('الساعات الإضافية يجب أن تكون قيمة إيجابية لشيفت 24/24');
          setLoading(false);
          return;
        }
        for (const deduction of deductions) {
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
      const workDaysNumbers = workDays.map(day => dayMap[day]);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/shift/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftType,
          shiftName,
          baseHours,
          startTime: shiftType === 'morning' || shiftType === 'evening' ? startTime : null,
          endTime: shiftType === 'morning' || shiftType === 'evening' ? endTime : null,
          isCrossDay: shiftType === 'evening',
          maxOvertimeHours: maxOvertimeHours || 0,
          workDays: workDaysNumbers,
          gracePeriod,
          deductions,
          sickLeaveDeduction,
          overtimeBasis,
          overtimeMultiplier: Number(overtimeMultiplier),
          fridayOvertimeBasis,
          fridayOvertimeMultiplier: Number(fridayOvertimeMultiplier),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('تم إنشاء الشيفت بنجاح');
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
      } else {
        setError('حدث خطأ أثناء إنشاء الشيفت');
      }
    } catch (err) {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.03, boxShadow: '0 6px 20px rgba(139, 92, 246, 0.2)', transition: { duration: 0.3 } },
    tap: { scale: 0.98, backgroundColor: '#A78BFA', transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-blue-100 p-4 md:p-8 font-noto-sans-arabic relative dir=rtl overflow-auto" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto relative z-10 max-w-7xl bg-white rounded-3xl shadow-lg p-6 md:p-8 border border-purple-100 backdrop-blur-sm bg-opacity-90"
      >
        <h2 className="text-3xl font-extrabold text-purple-600 mb-6 text-right tracking-wide drop-shadow-sm">
          إنشاء شيفت جديد
        </h2>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-right text-sm shadow-sm"
            >
              {error}
            </motion.div>
          )}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-purple-50 border border-purple-200 text-purple-600 px-4 py-3 rounded-xl mb-6 text-right text-sm shadow-sm"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 border border-purple-100 backdrop-blur-sm bg-opacity-90">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                نوع الشيفت
              </label>
              <select
                value={shiftType}
                onChange={(e) => {
                  setShiftType(e.target.value);
                  setStartTime('');
                  setEndTime('');
                  setBaseHours('');
                  setDeductions([]);
                }}
                className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                required
              >
                <option value="morning">صباحي</option>
                <option value="evening">مسائي</option>
                <option value="24/24">24/24</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                اسم الشيفت
              </label>
              <input
                type="text"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                الساعات الأساسية
              </label>
              <input
                type="number"
                value={baseHours}
                onChange={(e) => setBaseHours(e.target.value)}
                className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                required
              />
            </div>
            {(shiftType === 'morning' || shiftType === 'evening') && (
              <>
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                    وقت بداية الشيفت
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                    وقت نهاية الشيفت
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                    required
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                الحد الأقصى للساعات الإضافية
              </label>
              <input
                type="number"
                value={maxOvertimeHours}
                onChange={(e) => setMaxOvertimeHours(e.target.value)}
                className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                placeholder={shiftType === '24/24' ? 'مطلوب' : 'اختياري'}
                required={shiftType === '24/24'}
              />
            </div>
            {(shiftType === 'morning' || shiftType === 'evening') && maxOvertimeHours && (
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                  وقت نهاية الشيفت الإضافي
                </label>
                <input
                  type="text"
                  value={calculateOvertimeEndTime()}
                  readOnly
                  className="w-full p-3 border border-purple-200 rounded-2xl bg-gray-100 text-sm shadow-sm"
                />
              </div>
            )}
            {shiftType === '24/24' && Number(baseHours) + Number(maxOvertimeHours) > 24 && (
              <div className="col-span-1 md:col-span-2">
                <p className="text-gray-500 text-xs text-right">
                  ملاحظة: مجموع الساعات الأساسية والإضافية ({Number(baseHours) + Number(maxOvertimeHours)} ساعة) يتجاوز 24 ساعة، لذا قد يمتد الشيفت عبر يومين.
                </p>
              </div>
            )}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                أيام العمل
              </label>
              <div className="grid grid-cols-2 gap-4">
                {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
                  <label key={day} className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      value={day}
                      onChange={handleWorkDaysChange}
                      className="form-checkbox h-5 w-5 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-600">{day}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                فترة السماح (بالدقائق)
              </label>
              <input
                type="number"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(e.target.value)}
                className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                required
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                {shiftType === '24/24' ? 'خصومات الخروج المبكر' : 'خصومات التأخير'}
              </label>
              {shiftType === '24/24' && (
                <p className="text-gray-500 text-xs text-right mb-2">
                  أدخل مدة الوقت الناقص عن الساعات الأساسية ومقدار الخصم بالدقائق (مثال: إذا خرج بعد 8 ساعات، أدخل 60 دقيقة ناقصة و60 دقيقة خصم).
                </p>
              )}
              {deductions.map((deduction, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mb-4">
                  {(shiftType === 'morning' || shiftType === 'evening') ? (
                    <>
                      <input
                        type="time"
                        value={deduction.start}
                        onChange={(e) => updateDeduction(index, 'start', e.target.value)}
                        className="w-full sm:w-1/3 p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                        placeholder="من (الوقت)"
                        required
                      />
                      <input
                        type="time"
                        value={deduction.end}
                        onChange={(e) => updateDeduction(index, 'end', e.target.value)}
                        className="w-full sm:w-1/3 p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
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
                        className="w-full sm:w-1/3 p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                        placeholder="مدة النقص (دقائق)"
                        required
                      />
                      <input
                        type="number"
                        value={deduction.deductionAmount}
                        onChange={(e) => updateDeduction(index, 'deductionAmount', e.target.value)}
                        className="w-full sm:w-1/3 p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                        placeholder="مقدار الخصم (دقائق)"
                        required
                      />
                    </>
                  )}
                  <select
                    value={deduction.type}
                    onChange={(e) => updateDeduction(index, 'type', e.target.value)}
                    className="w-full sm:w-1/3 p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
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
                    className="w-full sm:w-auto bg-red-600 text-white p-3 rounded-2xl hover:bg-red-700 transition duration-300 font-medium text-sm shadow-sm"
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
                className="mt-2 w-full sm:w-auto bg-green-600 text-white p-3 rounded-2xl hover:bg-green-700 transition duration-300 font-medium text-sm shadow-sm"
              >
                إضافة خصم جديد
              </motion.button>
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                خصم الإجازة المرضية
              </label>
              <select
                value={sickLeaveDeduction}
                onChange={(e) => setSickLeaveDeduction(e.target.value)}
                className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              >
                <option value="">اختر</option>
                <option value="none">بدون خصم</option>
                <option value="quarter">ربع يوم</option>
                <option value="half">نص يوم</option>
                <option value="full">يوم كامل</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                حساب الساعات الإضافية
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={overtimeBasis}
                  onChange={(e) => setOvertimeBasis(e.target.value)}
                  className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                >
                  <option value="basicSalary">الراتب الأساسي</option>
                  <option value="totalSalaryWithAllowances">الراتب الإجمالي بالبدلات</option>
                </select>
                <select
                  value={overtimeMultiplier}
                  onChange={(e) => setOvertimeMultiplier(e.target.value)}
                  className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                >
                  <option value="2">ساعة بساعتين</option>
                  <option value="1">ساعة</option>
                  <option value="1.5">ساعة ونص</option>
                </select>
              </div>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
                حساب الساعات الإضافية يوم الجمعة
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={fridayOvertimeBasis}
                  onChange={(e) => setFridayOvertimeBasis(e.target.value)}
                  className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                >
                  <option value="basicSalary">الراتب الأساسي</option>
                  <option value="totalSalaryWithAllowances">الراتب الإجمالي بالبدلات</option>
                </select>
                <select
                  value={fridayOvertimeMultiplier}
                  onChange={(e) => setFridayOvertimeMultiplier(e.target.value)}
                  className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
                >
                  <option value="1">ساعة</option>
                  <option value="1.5">ساعة ونص</option>
                  <option value="2">ساعتين</option>
                </select>
              </div>
            </div>
          </div>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            type="submit"
            className="mt-6 w-full bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700 transition duration-300 font-medium text-sm shadow-md"
            disabled={loading}
          >
            {loading ? <CustomLoadingSpinner /> : 'إنشاء الشيفت'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateShift;
