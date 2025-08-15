import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomCheckIcon = () => (
  <motion.svg
    className="h-12 w-12 text-green-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.8, ease: 'easeInOut' } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.4 } }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
  </motion.svg>
);

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

function CreateUser() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [basicBonus, setBasicBonus] = useState('');
  const [bonusPercentage, setBonusPercentage] = useState('');
  const [medicalInsurance, setMedicalInsurance] = useState('');
  const [socialInsurance, setSocialInsurance] = useState('');
  const [mealAllowance, setMealAllowance] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [workDays, setWorkDays] = useState(''); // حالة لعرض workDays
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
      // لو workDays هو array، خد طوله، وإلا استخدم القيمة مباشرة
      const workDaysValue = Array.isArray(selectedShift.workDays)
        ? selectedShift.workDays.length
        : selectedShift.workDays || 30; // قيمة افتراضية 30 لو مفيش workDays
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
    try {
      const netSalary = parseFloat(basicSalary) + (parseFloat(basicBonus) * parseFloat(bonusPercentage) / 100) + parseFloat(mealAllowance) - parseFloat(medicalInsurance) - parseFloat(socialInsurance);
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
          basicSalary: parseFloat(basicSalary),
          basicBonus: parseFloat(basicBonus),
          bonusPercentage: parseFloat(bonusPercentage),
          medicalInsurance: parseFloat(medicalInsurance),
          socialInsurance: parseFloat(socialInsurance),
          mealAllowance: parseFloat(mealAllowance),
          shiftType,
          workDays: parseInt(workDays), // تحويل workDays إلى رقم
          annualLeaveBalance: parseFloat(annualLeaveBalance),
          netSalary: parseFloat(netSalary),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowSuccessAnimation(true);
        setSuccessMessage('تم إنشاء الحساب بنجاح');
        setTimeout(() => setShowSuccessAnimation(false), 1500);
        setEmployeeCode('');
        setPassword('');
        setName('');
        setDepartment('');
        setBasicSalary('');
        setBasicBonus('');
        setBonusPercentage('');
        setMedicalInsurance('');
        setSocialInsurance('');
        setMealAllowance('');
        setShiftType('');
        setWorkDays('');
        setAnnualLeaveBalance('');
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
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.03, boxShadow: '0 6px 20px rgba(139, 92, 246, 0.2)', transition: { duration: 0.3 } },
    tap: { scale: 0.98, backgroundColor: '#A78BFA', transition: { duration: 0.3 } },
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
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-blue-100 p-4 md:p-8 font-noto-sans-arabic relative dir=rtl overflow-auto" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto relative z-10 max-w-7xl bg-white rounded-3xl shadow-lg p-6 md:p-8 border border-purple-100 backdrop-blur-sm bg-opacity-90"
      >
        <h2 className="text-3xl font-extrabold text-purple-600 mb-6 text-right tracking-wide drop-shadow-sm">
          إنشاء حساب جديد
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
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 border border-purple-100 backdrop-blur-sm bg-opacity-90 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              كود الموظف
            </label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              الاسم
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              القسم
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              الراتب الأساسي
            </label>
            <input
              type="number"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              الحافز الأساسي
            </label>
            <input
              type="number"
              value={basicBonus}
              onChange={(e) => setBasicBonus(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              نسبة الحافز (%)
            </label>
            <input
              type="number"
              value={bonusPercentage}
              onChange={(e) => setBonusPercentage(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              التأمين الطبي
            </label>
            <input
              type="number"
              value={medicalInsurance}
              onChange={(e) => setMedicalInsurance(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              التأمين الاجتماعي
            </label>
            <input
              type="number"
              value={socialInsurance}
              onChange={(e) => setSocialInsurance(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              بدل الوجبة
            </label>
            <input
              type="number"
              value={mealAllowance}
              onChange={(e) => setMealAllowance(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              نوع الشيفت
            </label>
            <div className="flex items-center">
              <select
                value={shiftType}
                onChange={handleShiftChange}
                className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
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
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              عدد أيام العمل
            </label>
            <input
              type="text"
              value={workDays}
              readOnly
              className="w-full p-3 border border-purple-200 rounded-2xl bg-gray-100 text-gray-600 text-sm shadow-sm"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2 text-right">
              رصيد الإجازة السنوية
            </label>
            <input
              type="number"
              value={annualLeaveBalance}
              onChange={(e) => setAnnualLeaveBalance(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-purple-50 text-sm shadow-sm"
              required
            />
          </div>
          <div className="md:col-span-2">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              type="submit"
              className="w-full bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700 transition duration-300 font-medium text-sm shadow-md"
              disabled={loading}
            >
              {loading ? <CustomLoadingSpinner /> : 'إنشاء الحساب'}
            </motion.button>
          </div>
        </form>
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
      </motion.div>
    </div>
  );
}

export default CreateUser;
