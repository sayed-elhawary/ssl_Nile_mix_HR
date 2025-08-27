import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12 bg-white p-4 rounded-full shadow-md"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }}
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

function Login({ setIsAuthenticated, setUserRole }) {
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
        localStorage.setItem('role', data.user.role);
        setIsAuthenticated(true);
        setUserRole(data.user.role);
        setShowSuccessAnimation(true);
        setSuccessMessage('تم تسجيل الدخول بنجاح');
        setTimeout(() => {
          setShowSuccessAnimation(false);
          navigate('/dashboard');
        }, 1000);
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
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: 'easeOut', type: 'spring', stiffness: 150, damping: 18 } },
  };

  const inputVariants = {
    hover: {
      scale: 1.03,
      borderColor: '#6B46C1',
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
      transition: { duration: 0.4, ease: 'easeInOut' },
    },
    focus: {
      scale: 1.03,
      borderColor: '#6B46C1',
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
      transition: { duration: 0.4, ease: 'easeInOut' },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: '#6B46C1',
      transition: { duration: 0.4, ease: 'easeInOut' },
    },
    tap: { scale: 0.98, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-4 sm:p-6 md:p-8 font-noto-sans-arabic dir=rtl" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-10 max-w-md w-full border border-gray-200/50 backdrop-blur-sm"
      >
        <div className="flex justify-center mb-6">
          <img
            src="http://www.nilemix.com/wp-content/uploads/2016/05/logo.png"
            alt="NileMix Logo"
            className="h-16 sm:h-20"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 text-center tracking-tight">
          NileMix HR System
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
        <div className="mb-4">
          <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">كود الموظف</label>
          <motion.input
            type="text"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none transition-all duration-300 bg-gray-50 text-sm shadow-sm text-right"
            required
            disabled={loading}
            placeholder="أدخل كود الموظف"
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">كلمة المرور</label>
          <motion.input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none transition-all duration-300 bg-gray-50 text-sm shadow-sm text-right"
            required
            disabled={loading}
            placeholder="أدخل كلمة المرور"
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
          />
        </div>
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          type="submit"
          onClick={handleSubmit}
          className="w-full bg-purple-600 text-white py-3 rounded-xl transition-all duration-300 font-semibold text-sm shadow-md"
          disabled={loading}
        >
          {loading ? <CustomLoadingSpinner /> : 'تسجيل الدخول'}
        </motion.button>
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

export default Login;
