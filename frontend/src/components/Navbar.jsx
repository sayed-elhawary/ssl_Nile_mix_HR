import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, LogOut, Settings, UserPlus, Edit, Upload, DollarSign } from 'lucide-react';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.6, ease: 'easeInOut', type: 'spring', stiffness: 150, damping: 12 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      initial={{ pathLength: 0, rotate: -45 }}
      animate={{ pathLength: 1, rotate: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </motion.svg>
  </motion.div>
);

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeIn' } }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.4, ease: 'easeOut' } }}
  >
    <motion.div
      className="h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-2 text-purple-600 text-xs font-medium">جارٍ التحميل...</span>
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
    }, 2000);
  };

  const handleLinkClick = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const linkVariants = {
    hover: { scale: 1.05, x: 5, color: '#7C3AED', transition: { duration: 0.3, ease: 'easeOut' } },
    tap: { scale: 0.95, x: 0, color: '#6B7280', transition: { duration: 0.2 } },
  };

  const buttonVariants = {
    hover: { scale: 1.1, boxShadow: '0 10px 20px rgba(139, 92, 246, 0.3)', transition: { duration: 0.3, ease: 'easeOut' } },
    tap: { scale: 0.95, transition: { duration: 0.2 } },
  };

  const sidebarVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeInOut', type: 'spring', stiffness: 200, damping: 20 }
    },
    exit: { x: '100%', opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, duration: 0.3, ease: 'easeInOut' }
    })
  };

  const navItems = [
    { path: '/dashboard', label: 'الداشبورد', icon: <Home className="h-5 w-5" /> },
    { path: '/create-shift', label: 'إنشاء شيفت', icon: <Edit className="h-5 w-5" /> },
    { path: '/create-user', label: 'إنشاء حساب', icon: <UserPlus className="h-5 w-5" /> },
    { path: '/edit-user', label: 'تعديل حساب', icon: <Edit className="h-5 w-5" /> },
    { path: '/settings', label: 'الإعدادات', icon: <Settings className="h-5 w-5" /> },
    { path: '/attendance-upload', label: 'رفع الحضور', icon: <Upload className="h-5 w-5" /> },
    { path: '/monthly-salary-report', label: 'تقرير المرتب', icon: <DollarSign className="h-5 w-5" /> },
    { path: '/monthly-bonus-report', label: 'تقرير الحافز الشهري', icon: <DollarSign className="h-5 w-5" /> },
  ];

  return (
    <div className="font-noto-sans-arabic dir=rtl">
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="md:flex bg-gray-100 p-4 sticky top-0 z-50 shadow-lg hidden backdrop-blur-md"
      >
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-right tracking-wide drop-shadow-lg">
            HR
          </h1>
          <div className="flex items-center space-x-6 space-x-reverse">
            {navItems.map((item, index) => (
              <motion.div
                key={item.path}
                variants={linkVariants}
                whileHover="hover"
                whileTap="tap"
                className="px-3 py-2 cursor-pointer rounded-xl hover:bg-purple-100 transition-all duration-300"
              >
                <Link
                  to={item.path}
                  onClick={() => handleLinkClick(item.path)}
                  className="text-gray-900 text-sm font-medium hover:text-purple-600 transition-all duration-300"
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleLogout}
              className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-all duration-300 text-sm font-bold shadow-lg hover:shadow-xl"
              disabled={showSuccessAnimation || loading}
            >
              {loading ? <CustomLoadingSpinner /> : 'تسجيل الخروج'}
            </motion.button>
          </div>
        </div>
      </motion.nav>

      <motion.div
        className="md:hidden fixed top-4 right-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="text-white bg-purple-600 p-2 rounded-xl shadow-lg hover:bg-purple-700 hover:shadow-xl transition-all duration-300"
          onClick={toggleMenu}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="md:hidden fixed top-0 right-0 h-full w-64 bg-gray-100 p-4 shadow-lg border-l border-purple-200/50 z-40 overflow-y-auto backdrop-blur-lg"
          >
            <div className="flex flex-col gap-3 mt-12">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="px-3 py-2 cursor-pointer rounded-xl hover:bg-purple-100 transition-all duration-300"
                >
                  <Link
                    to={item.path}
                    onClick={() => handleLinkClick(item.path)}
                    className="text-gray-900 text-sm font-medium hover:text-purple-600 transition-all duration-300 flex items-center gap-3"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                custom={navItems.length}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="px-3 py-2 cursor-pointer rounded-xl hover:bg-purple-100 transition-all duration-300"
                onClick={handleLogout}
              >
                <div className="text-gray-900 text-sm font-medium hover:text-purple-600 transition-all duration-300 flex items-center gap-3">
                  <LogOut className="h-5 w-5" />
                  تسجيل الخروج
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {successMessage && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="bg-purple-100 border border-purple-400 text-purple-800 p-3 rounded-xl text-sm text-right mt-2 shadow-lg mx-auto max-w-md backdrop-blur-sm"
        >
          {successMessage}
        </motion.div>
      )}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/20"
          >
            <CustomCheckIcon />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Navbar;
