import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock } from 'lucide-react';

function Login({ setIsAuthenticated }) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode, password }),
      });
      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('token', data.token); // تخزين التوكن
        setIsAuthenticated(true);
        navigate('/dashboard');
      } else {
        setError('كود الموظف أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4 font-noto-sans-arabic relative overflow-hidden">
      {/* تأثير خلفية ديناميكي */}
      <div className="absolute inset-0 bg-pattern opacity-20"></div>
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="h-12 w-12 border-4 border-t-blue-600 border-gray-200 rounded-full"
            ></motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-white p-10 rounded-3xl shadow-2xl border border-blue-100 w-full max-w-md relative z-10"
      >
        <h2 className="text-4xl font-bold text-blue-600 mb-8 text-right">تسجيل الدخول</h2>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-right text-sm font-semibold shadow-sm"
          >
            {error}
          </motion.div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label className="block text-gray-700 text-sm font-semibold mb-2 text-right">
              كود الموظف
            </label>
            <div className="flex items-center">
              <User className="absolute right-3 h-5 w-5 text-blue-400" />
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-blue-100 rounded-lg text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-blue-50 hover:bg-blue-100"
                required
                disabled={loading}
                placeholder="أدخل كود الموظف"
              />
            </div>
          </div>
          <div className="relative">
            <label className="block text-gray-700 text-sm font-semibold mb-2 text-right">
              كلمة المرور
            </label>
            <div className="flex items-center">
              <Lock className="absolute right-3 h-5 w-5 text-blue-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-blue-100 rounded-lg text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-blue-50 hover:bg-blue-100"
                required
                disabled={loading}
                placeholder="أدخل كلمة المرور"
              />
            </div>
          </div>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            className={`w-full bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 text-sm font-semibold shadow-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              'تسجيل الدخول'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default Login;
