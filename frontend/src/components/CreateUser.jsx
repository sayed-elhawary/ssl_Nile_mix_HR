import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12 bg-white p-4 rounded-full shadow-md"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
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
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeInOut' } }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <motion.div
      className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-3 text-purple-600 text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

function CreateUser() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [totalSalaryWithAllowances, setTotalSalaryWithAllowances] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [basicBonus, setBasicBonus] = useState('');
  const [bonusPercentage, setBonusPercentage] = useState('');
  const [medicalInsurance, setMedicalInsurance] = useState('');
  const [socialInsurance, setSocialInsurance] = useState('');
  const [mealAllowance, setMealAllowance] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [workDays, setWorkDays] = useState('');
  const [annualLeaveBalance, setAnnualLeaveBalance] = useState('');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/shift`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!response.ok) throw new Error('فشل في جلب الشيفتات');
        const data = await response.json();
        setShifts(data);
      } catch (err) {
        setError('حدث خطأ أثناء جلب الشيفتات');
      }
    };
    fetchShifts();
  }, []);

  const handleShiftChange = (e) => {
    const selectedShiftId = e.target.value;
    setShiftType(selectedShiftId);
    const selectedShift = shifts.find((shift) => shift._id === selectedShiftId);
    if (selectedShift) {
      const workDaysValue = Array.isArray(selectedShift.workDays)
        ? selectedShift.workDays.length
        : selectedShift.workDays || 30;
      setWorkDays(workDaysValue.toString());
    } else {
      setWorkDays('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setShowSuccessAnimation(false);
    try {
      const netSalary = parseFloat(totalSalaryWithAllowances) +
        (parseFloat(basicBonus) * parseFloat(bonusPercentage) / 100) +
        parseFloat(mealAllowance) -
        parseFloat(medicalInsurance) -
        parseFloat(socialInsurance);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          employeeCode,
          password,
          name,
          department,
          totalSalaryWithAllowances: parseFloat(totalSalaryWithAllowances),
          basicSalary: parseFloat(basicSalary),
          basicBonus: parseFloat(basicBonus),
          bonusPercentage: parseFloat(bonusPercentage),
          medicalInsurance: parseFloat(medicalInsurance),
          socialInsurance: parseFloat(socialInsurance),
          mealAllowance: parseFloat(mealAllowance),
          shiftType,
          workDays: parseInt(workDays),
          annualLeaveBalance: parseFloat(annualLeaveBalance),
          netSalary: parseFloat(netSalary),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('تم إنشاء الحساب بنجاح');
        setShowSuccessAnimation(true);
        setTimeout(() => {
          setShowSuccessAnimation(false);
          setEmployeeCode('');
          setPassword('');
          setName('');
          setDepartment('');
          setTotalSalaryWithAllowances('');
          setBasicSalary('');
          setBasicBonus('');
          setBonusPercentage('');
          setMedicalInsurance('');
          setSocialInsurance('');
          setMealAllowance('');
          setShiftType('');
          setWorkDays('');
          setAnnualLeaveBalance('');
        }, 1000);
      } else {
        setError(data.message || 'حدث خطأ أثناء إنشاء الحساب');
      }
    } catch (err) {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: 'easeOut', type: 'spring', stiffness: 150, damping: 18 } },
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#7C3AED',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    tap: { scale: 0.98, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  const getShiftIcon = (type) => {
    if (type === 'morning') {
      return (
        <svg
          className="w-5 h-5 text-yellow-500 inline-block mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM1 10a9 9 0 1118 0 9 9 0 01-18 0z" />
        </svg>
      );
    } else if (type === 'evening') {
      return (
        <svg
          className="w-5 h-5 text-blue-900 inline-block mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      );
    } else if (type === '24/24') {
      return (
        <svg
          className="w-5 h-5 text-gray-700 inline-block mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 sm:p-6 md:p-8 font-noto-sans-arabic dir=rtl" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto max-w-7xl bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 border border-gray-200/50 backdrop-blur-sm"
      >
        <div className="flex justify-center mb-6">
          <img
            src="http://www.nilemix.com/wp-content/uploads/2016/05/logo.png"
            alt="NileMix Logo"
            className="h-16 sm:h-20"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 text-center tracking-tight">
          NileMix HR System - إنشاء حساب جديد
        </h2>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-xl mb-4 text-sm text-center shadow-sm"
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
              className="bg-purple-50 border border-purple-300 text-purple-700 p-3 rounded-xl mb-4 text-sm text-center shadow-sm"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">كود الموظف</label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">القسم</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">إجمالي الراتب بالبدلات</label>
            <input
              type="number"
              value={totalSalaryWithAllowances}
              onChange={(e) => setTotalSalaryWithAllowances(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">الراتب الأساسي</label>
            <input
              type="number"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">الحافز الأساسي</label>
            <input
              type="number"
              value={basicBonus}
              onChange={(e) => setBasicBonus(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">نسبة الحافز (%)</label>
            <input
              type="number"
              value={bonusPercentage}
              onChange={(e) => setBonusPercentage(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">التأمين الطبي</label>
            <input
              type="number"
              value={medicalInsurance}
              onChange={(e) => setMedicalInsurance(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">التأمين الاجتماعي</label>
            <input
              type="number"
              value={socialInsurance}
              onChange={(e) => setSocialInsurance(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">بدل الوجبة</label>
            <input
              type="number"
              value={mealAllowance}
              onChange={(e) => setMealAllowance(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">نوع الشيفت</label>
            <div className="flex items-center">
              <select
                value={shiftType}
                onChange={handleShiftChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                required
              >
                <option value="">اختر الشيفت</option>
                {shifts.map((shift) => (
                  <option key={shift._id} value={shift._id}>
                    {shift.shiftName} ({shift.shiftType === 'morning' ? 'صباحي' : shift.shiftType === 'evening' ? 'مسائي' : '24/24'})
                  </option>
                ))}
              </select>
              {shiftType && getShiftIcon(shifts.find((shift) => shift._id === shiftType)?.shiftType)}
            </div>
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">عدد أيام العمل</label>
            <input
              type="text"
              value={workDays}
              readOnly
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 text-sm shadow-sm text-right"
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">رصيد الإجازة السنوية</label>
            <input
              type="number"
              value={annualLeaveBalance}
              onChange={(e) => setAnnualLeaveBalance(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              required
            />
          </div>
          <div className="md:col-span-2">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              type="submit"
              className="mt-6 w-full bg-purple-600 text-white py-3 rounded-xl transition-all duration-300 font-semibold text-sm shadow-md disabled:bg-purple-400"
              disabled={loading}
            >
              {loading ? <CustomLoadingSpinner /> : 'إنشاء الحساب'}
            </motion.button>
          </div>
        </form>
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
            >
              <CustomCheckIcon />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default CreateUser;
