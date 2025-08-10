import React, { useState } from 'react';
import { motion } from 'framer-motion';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      newDeductions[index].deductionAmount = value; // يساوي duration تلقائيًا
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
        if (calculatedBaseHours !== Number(baseHours)) {
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
          workDays,
          gracePeriod,
          deductions,
          sickLeaveDeduction,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert('تم إنشاء الشيفت بنجاح');
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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)', transition: { duration: 0.3 } },
    tap: { scale: 0.95, backgroundColor: '#EDE9FE', transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 sm:p-6 font-noto-sans-arabic relative overflow-hidden">
      <div className="absolute inset-0 bg-pattern opacity-20"></div>
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto relative z-10 max-w-md sm:max-w-lg md:max-w-2xl"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-700 mb-6 sm:mb-8 text-right">
          إنشاء شيفت جديد
        </h2>
        {error && <p className="text-red-500 mb-4 text-sm sm:text-base text-right">{error}</p>}
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">نوع الشيفت</label>
            <select
              value={shiftType}
              onChange={(e) => {
                setShiftType(e.target.value);
                setStartTime('');
                setEndTime('');
                setBaseHours('');
                setDeductions([]);
              }}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            >
              <option value="morning">صباحي</option>
              <option value="evening">مسائي</option>
              <option value="24/24">24/24</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">اسم الشيفت</label>
            <input
              type="text"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">الساعات الأساسية</label>
            <input
              type="number"
              value={baseHours}
              onChange={(e) => setBaseHours(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          {(shiftType === 'morning' || shiftType === 'evening') && (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">وقت بداية الشيفت</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">وقت نهاية الشيفت</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
                  required
                />
              </div>
            </>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">الحد الأقصى للساعات الإضافية</label>
            <input
              type="number"
              value={maxOvertimeHours}
              onChange={(e) => setMaxOvertimeHours(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              placeholder={shiftType === '24/24' ? 'مطلوب' : 'اختياري'}
              required={shiftType === '24/24'}
            />
          </div>
          {(shiftType === 'morning' || shiftType === 'evening') && maxOvertimeHours && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">وقت نهاية الشيفت الإضافي</label>
              <input
                type="text"
                value={calculateOvertimeEndTime()}
                readOnly
                className="w-full p-2 border rounded-lg bg-gray-100 text-sm sm:text-base"
              />
            </div>
          )}
          {shiftType === '24/24' && Number(baseHours) + Number(maxOvertimeHours) > 24 && (
            <div className="mb-4">
              <p className="text-gray-500 text-xs sm:text-sm">
                ملاحظة: مجموع الساعات الأساسية والإضافية ({Number(baseHours) + Number(maxOvertimeHours)} ساعة) يتجاوز 24 ساعة، لذا قد يمتد الشيفت عبر يومين.
              </p>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">أيام العمل</label>
            <div className="grid grid-cols-2 gap-2">
              {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
                <div key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    value={day}
                    onChange={handleWorkDaysChange}
                    className="mr-2 h-5 w-5 text-purple-500 focus:ring-purple-500"
                  />
                  <label className="text-gray-700 text-sm sm:text-base">{day}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">فترة السماح (بالدقائق)</label>
            <input
              type="number"
              value={gracePeriod}
              onChange={(e) => setGracePeriod(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">
              {shiftType === '24/24' ? 'خصومات الخروج المبكر' : 'خصومات التأخير'}
            </label>
            {shiftType === '24/24' && (
              <p className="text-gray-500 text-xs sm:text-sm mb-2">
                أدخل مدة الوقت الناقص عن الساعات الأساسية ومقدار الخصم بالدقائق (مثال: إذا خرج بعد 8 ساعات، أدخل 60 دقيقة ناقصة و60 دقيقة خصم).
              </p>
            )}
            {deductions.map((deduction, index) => (
              <div key={index} className="flex items-center space-x-4 space-x-reverse mb-2">
                {(shiftType === 'morning' || shiftType === 'evening') ? (
                  <>
                    <input
                      type="time"
                      value={deduction.start}
                      onChange={(e) => updateDeduction(index, 'start', e.target.value)}
                      className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
                      placeholder="من (الوقت)"
                      required
                    />
                    <input
                      type="time"
                      value={deduction.end}
                      onChange={(e) => updateDeduction(index, 'end', e.target.value)}
                      className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
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
                      className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
                      placeholder="مدة النقص (دقائق)"
                      required
                    />
                    <input
                      type="number"
                      value={deduction.deductionAmount}
                      onChange={(e) => updateDeduction(index, 'deductionAmount', e.target.value)}
                      className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
                      placeholder="مقدار الخصم (دقائق)"
                      required
                    />
                  </>
                )}
                <select
                  value={deduction.type}
                  onChange={(e) => updateDeduction(index, 'type', e.target.value)}
                  className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
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
                  className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300 text-sm sm:text-base"
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
              className="mt-2 bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition duration-300 text-sm sm:text-base"
            >
              إضافة خصم جديد
            </motion.button>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base font-medium mb-2">خصم الإجازة المرضية</label>
            <select
              value={sickLeaveDeduction}
              onChange={(e) => setSickLeaveDeduction(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
            >
              <option value="">اختر</option>
              <option value="none">بدون خصم</option>
              <option value="quarter">ربع يوم</option>
              <option value="half">نص يوم</option>
              <option value="full">يوم كامل</option>
            </select>
          </div>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            type="submit"
            className="w-full bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition duration-300 text-sm sm:text-base font-semibold"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                جارٍ التحميل...
              </div>
            ) : (
              'إنشاء الشيفت'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateShift;
