import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function Login({ setIsAuthenticated }) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode, password }),
      });
      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        setIsAuthenticated(true);
        setShowSuccessAnimation(true);
        setSuccessMessage('تم تسجيل الدخول بنجاح');
        setTimeout(() => {
          setShowSuccessAnimation(false);
          navigate('/dashboard');
        }, 1500);
      } else {
        setError('كود الموظف أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
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
        className="container mx-auto relative z-10 max-w-sm sm:max-w-md md:max-w-lg"
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 mb-4 sm:mb-6 text-right tracking-wide drop-shadow-sm">
          تسجيل الدخول
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
        <form onSubmit={handleSubmit} className="bg-white p-3 sm:p-4 md:p-5 rounded-2xl shadow-lg border border-purple-100 backdrop-blur-sm bg-opacity-90">
          <div className="mb-3">
            <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-1 text-right">كود الموظف</label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-xs sm:text-sm bg-purple-50 text-right"
              required
              disabled={loading}
              placeholder="أدخل كود الموظف"
            />
          </div>
          <div className="mb-3">
            <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-1 text-right">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-xs sm:text-sm bg-purple-50 text-right"
              required
              disabled={loading}
              placeholder="أدخل كلمة المرور"
            />
          </div>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            type="submit"
            className="w-full bg-purple-600 text-white p-2 sm:p-2.5 rounded-lg hover:bg-purple-700 transition duration-200 text-xs sm:text-sm font-semibold shadow-md"
            disabled={loading}
          >
            {loading ? <CustomLoadingSpinner /> : 'تسجيل الدخول'}
          </motion.button>
        </form>
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
      </motion.div>
    </div>
  );
}

export default Login;
