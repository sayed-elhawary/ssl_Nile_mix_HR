import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function CreateUser() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [medicalInsurance, setMedicalInsurance] = useState('');
  const [socialInsurance, setSocialInsurance] = useState('');
  const [name, setName] = useState('');
  const [mealAllowance, setMealAllowance] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [workDays, setWorkDays] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [basicBonus, setBasicBonus] = useState('');
  const [bonusPercentage, setBonusPercentage] = useState('');
  const [annualLeaveBalance, setAnnualLeaveBalance] = useState('');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/shift`);
        const data = await response.json();
        setShifts(data);
      } catch (err) {
        setError('حدث خطأ أثناء جلب الشيفتات');
      }
    };
    fetchShifts();
  }, []);

  const handleShiftChange = (e) => {
    const selectedShift = shifts.find((shift) => shift._id === e.target.value);
    setShiftType(e.target.value);
    setWorkDays(selectedShift?.workDays.length || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const netSalary = parseFloat(basicSalary) + (parseFloat(basicBonus) * parseFloat(bonusPercentage) / 100) + parseFloat(mealAllowance) - parseFloat(medicalInsurance) - parseFloat(socialInsurance);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode,
          password,
          department,
          medicalInsurance,
          socialInsurance,
          name,
          mealAllowance,
          shiftType,
          workDays,
          basicSalary,
          basicBonus,
          bonusPercentage,
          annualLeaveBalance,
          netSalary,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert('تم إنشاء الحساب بنجاح');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب');
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
          إنشاء حساب جديد
        </h2>
        {error && <p className="text-red-500 mb-4 text-sm sm:text-base text-right">{error}</p>}
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">كود الموظف</label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">القسم</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">التأمين الطبي</label>
            <input
              type="number"
              value={medicalInsurance}
              onChange={(e) => setMedicalInsurance(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">التأمين الاجتماعي</label>
            <input
              type="number"
              value={socialInsurance}
              onChange={(e) => setSocialInsurance(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">بدل الوجبة</label>
            <input
              type="number"
              value={mealAllowance}
              onChange={(e) => setMealAllowance(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">نوع الشيفت</label>
            <select
              value={shiftType}
              onChange={handleShiftChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            >
              <option value="">اختر الشيفت</option>
              {shifts.map((shift) => (
                <option key={shift._id} value={shift._id}>{shift.shiftName}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">عدد أيام العمل</label>
            <input
              type="number"
              value={workDays}
              readOnly
              className="w-full p-2 border rounded bg-gray-100 text-sm sm:text-base"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">الراتب الأساسي</label>
            <input
              type="number"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">الحافز الأساسي</label>
            <input
              type="number"
              value={basicBonus}
              onChange={(e) => setBasicBonus(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">نسبة الحافز (%)</label>
            <input
              type="number"
              value={bonusPercentage}
              onChange={(e) => setBonusPercentage(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm sm:text-base">رصيد الإجازة السنوية</label>
            <input
              type="number"
              value={annualLeaveBalance}
              onChange={(e) => setAnnualLeaveBalance(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm sm:text-base"
              required
            />
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
              'إنشاء الحساب'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateUser;
