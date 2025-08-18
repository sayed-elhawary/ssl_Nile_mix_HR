import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-16 w-16"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeInOut', type: 'spring', stiffness: 150, damping: 12 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-400"
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
      className="absolute inset-0 rounded-full bg-purple-200 opacity-30"
      initial={{ scale: 0 }}
      animate={{ scale: 2, opacity: 0, transition: { duration: 1, ease: 'easeOut' } }}
    />
  </motion.div>
);

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center gap-2"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeInOut' } }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.div
      className="h-8 w-8 border-4 border-purple-400 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="text-purple-400 text-sm font-medium">جارٍ التحميل...</span>
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
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut', type: 'spring', stiffness: 100 } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 6px 20px rgba(124, 58, 237, 0.3)', transition: { duration: 0.3, ease: 'easeInOut' } },
    tap: { scale: 0.95, backgroundColor: '#6D28D9', transition: { duration: 0.2, ease: 'easeInOut' } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4 sm:p-6 md:p-8 font-noto-sans-arabic">
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="bg-white/95 rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 max-w-md w-full border border-purple-200/50 backdrop-blur-sm"
      >
        <div className="flex justify-center mb-6">
          <img
            src="http://www.nilemix.com/wp-content/uploads/2016/05/logo.png"
            alt="NileMix Logo"
            className="h-16 sm:h-20"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center tracking-tight drop-shadow-md">
          NileMix HR System
        </h2>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-red-100/90 text-red-600 p-3 rounded-lg mb-4 text-sm text-center shadow-sm backdrop-blur-sm"
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
              className="bg-purple-100/90 text-purple-200 p-3 rounded-lg mb-4 text-sm text-center shadow-sm backdrop-blur-sm"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-center mb-6">
            <CustomLoadingSpinner />
          </div>
        )}
        <div className="mb-4">
          <label className="block text-purple-200 text-sm font-semibold mb-2 text-right">كود الموظف</label>
          <input
            type="text"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            className="w-full px-4 py-2 border border-purple-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 bg-gray-800/50 text-white text-right text-sm shadow-sm hover:shadow-md"
            required
            disabled={loading}
            placeholder="أدخل كود الموظف"
          />
        </div>
        <div className="mb-6">
          <label className="block text-purple-200 text-sm font-semibold mb-2 text-right">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-purple-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 bg-gray-800/50 text-white text-right text-sm shadow-sm hover:shadow-md"
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
          onClick={handleSubmit}
          className="w-full bg-purple-700 text-white py-2.5 rounded-lg hover:bg-purple-800 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg"
          disabled={loading}
        >
          {loading ? <CustomLoadingSpinner /> : 'تسجيل الدخول'}
        </motion.button>
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.5, ease: 'easeInOut', type: 'spring', stiffness: 150 } }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90, transition: { duration: 0.3, ease: 'easeInOut' } }}
              className="fixed inset-0 flex items-center justify-center z-50"
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
