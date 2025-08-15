import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-16 w-16"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.6, ease: 'easeInOut' } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } }}
  >
    <svg
      className="h-full w-full text-purple-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
    <div className="absolute inset-0 rounded-full bg-purple-100 opacity-40" />
  </motion.div>
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

function Navbar({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    setLoading(true);
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setShowSuccessAnimation(true);
    setSuccessMessage('تم تسجيل الخروج بنجاح');
    setTimeout(() => {
      setShowSuccessAnimation(false);
      setLoading(false);
      navigate('/login');
      setIsMenuOpen(false);
    }, 1500);
  };

  const handleLinkClick = (path) => {
    console.log(`Navigating to: ${path}`);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuVariants = {
    hidden: { opacity: 0, y: -20, height: 0 },
    visible: { opacity: 1, y: 0, height: 'auto', transition: { duration: 0.2, ease: 'easeInOut' } },
  };

  const linkVariants = [
    {
      hover: { scale: 1.05, color: '#8B5CF6', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)', transition: { duration: 0.2 } },
      tap: { scale: 0.95, color: '#A78BFA', transition: { duration: 0.2 } },
    },
    {
      hover: { scale: 1.05, color: '#3B82F6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)', transition: { duration: 0.2 } },
      tap: { scale: 0.95, color: '#60A5FA', transition: { duration: 0.2 } },
    },
    {
      hover: { scale: 1.05, color: '#10B981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', transition: { duration: 0.2 } },
      tap: { scale: 0.95, color: '#34D399', transition: { duration: 0.2 } },
    },
    {
      hover: { scale: 1.05, color: '#F59E0B', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)', transition: { duration: 0.2 } },
      tap: { scale: 0.95, color: '#FBBF24', transition: { duration: 0.2 } },
    },
    {
      hover: { scale: 1.05, color: '#EC4899', boxShadow: '0 4px 12px rgba(236, 72, 153, 0.2)', transition: { duration: 0.2 } },
      tap: { scale: 0.95, color: '#F472B6', transition: { duration: 0.2 } },
    },
    {
      hover: { scale: 1.05, color: '#EAB308', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)', transition: { duration: 0.2 } },
      tap: { scale: 0.95, color: '#FACC15', transition: { duration: 0.2 } },
    },
    {
      hover: { scale: 1.05, color: '#EF4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)', transition: { duration: 0.2 } },
      tap: { scale: 0.95, color: '#F87171', transition: { duration: 0.2 } },
    },
  ];

  const buttonVariants = {
    hover: { scale: 1.03, boxShadow: '0 6px 20px rgba(139, 92, 246, 0.2)', transition: { duration: 0.2 } },
    tap: { scale: 0.98, backgroundColor: '#A78BFA', transition: { duration: 0.2 } },
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="bg-gradient-to-br from-purple-100 via-purple-50 to-blue-100 p-4 font-noto-sans-arabic sticky top-0 z-50 shadow-md dir=rtl"
      style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}
    >
      <div className="container mx-auto flex justify-between items-center relative">
        <h1 className="text-2xl sm:text-3xl font-bold text-purple-600 text-right tracking-wide drop-shadow-sm">
          HR
        </h1>
        <div className="flex items-center space-x-4 space-x-reverse">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="md:hidden text-purple-600 focus:outline-none"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleLogout}
            className="hidden md:block bg-purple-600 text-white px-4 py-2 rounded-2xl hover:bg-purple-700 transition-all duration-200 text-sm font-semibold shadow-md"
            disabled={showSuccessAnimation || loading}
          >
            {loading ? <CustomLoadingSpinner /> : 'تسجيل الخروج'}
          </motion.button>
        </div>
      </div>
      {loading && (
        <div className="flex justify-center mt-4">
          <CustomLoadingSpinner />
        </div>
      )}
      {successMessage && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="text-purple-600 text-sm sm:text-base text-right mt-2 bg-purple-50 p-3 rounded-xl shadow-sm"
        >
          {successMessage}
        </motion.div>
      )}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="md:hidden absolute top-16 left-0 right-0 bg-white p-4 shadow-md w-full border border-purple-100"
          >
            <div className="flex flex-col gap-3">
              <motion.div variants={linkVariants[0]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
                <Link to="/dashboard" onClick={() => handleLinkClick('/dashboard')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200 block">
                  الداشبورد
                </Link>
              </motion.div>
              <motion.div variants={linkVariants[1]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
                <Link to="/create-shift" onClick={() => handleLinkClick('/create-shift')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200 block">
                  إنشاء شيفت
                </Link>
              </motion.div>
              <motion.div variants={linkVariants[2]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
                <Link to="/create-user" onClick={() => handleLinkClick('/create-user')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200 block">
                  إنشاء حساب
                </Link>
              </motion.div>
              <motion.div variants={linkVariants[3]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
                <Link to="/edit-user" onClick={() => handleLinkClick('/edit-user')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200 block">
                  تعديل حساب
                </Link>
              </motion.div>
              <motion.div variants={linkVariants[4]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
                <Link to="/settings" onClick={() => handleLinkClick('/settings')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200 block">
                  الإعدادات
                </Link>
              </motion.div>
              <motion.div variants={linkVariants[5]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
                <Link to="/attendance-upload" onClick={() => handleLinkClick('/attendance-upload')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200 block">
                  رفع بيانات الحضور
                </Link>
              </motion.div>
              <motion.div variants={linkVariants[6]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
                <Link to="/monthly-salary-report" onClick={() => handleLinkClick('/monthly-salary-report')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200 block">
                  تقرير المرتب الشهري
                </Link>
              </motion.div>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleLogout}
                className="bg-purple-600 text-white px-4 py-2 rounded-2xl text-sm font-semibold text-right shadow-md"
                disabled={showSuccessAnimation || loading}
              >
                {loading ? <CustomLoadingSpinner /> : 'تسجيل الخروج'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hidden md:flex items-center space-x-6 space-x-reverse">
        <motion.div variants={linkVariants[0]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
          <Link to="/dashboard" onClick={() => handleLinkClick('/dashboard')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200">
            الداشبورد
          </Link>
        </motion.div>
        <motion.div variants={linkVariants[1]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
          <Link to="/create-shift" onClick={() => handleLinkClick('/create-shift')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200">
            إنشاء شيفت
          </Link>
        </motion.div>
        <motion.div variants={linkVariants[2]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
          <Link to="/create-user" onClick={() => handleLinkClick('/create-user')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200">
            إنشاء حساب
          </Link>
        </motion.div>
        <motion.div variants={linkVariants[3]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
          <Link to="/edit-user" onClick={() => handleLinkClick('/edit-user')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200">
            تعديل حساب
          </Link>
        </motion.div>
        <motion.div variants={linkVariants[4]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
          <Link to="/settings" onClick={() => handleLinkClick('/settings')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200">
            الإعدادات
          </Link>
        </motion.div>
        <motion.div variants={linkVariants[5]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
          <Link to="/attendance-upload" onClick={() => handleLinkClick('/attendance-upload')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200">
            رفع بيانات الحضور
          </Link>
        </motion.div>
        <motion.div variants={linkVariants[6]} whileHover="hover" whileTap="tap" className="px-3 py-2 cursor-pointer rounded-lg">
          <Link to="/monthly-salary-report" onClick={() => handleLinkClick('/monthly-salary-report')} className="text-gray-700 text-sm font-medium hover:text-purple-600 transition-all duration-200">
            تقرير المرتب الشهري
          </Link>
        </motion.div>
      </div>
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.4, ease: 'easeIn' } }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50"
          >
            <CustomCheckIcon />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

export default Navbar;
