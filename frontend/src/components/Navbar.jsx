import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, LogOut, Settings, UserPlus, Edit, Upload, DollarSign, AlertCircle } from 'lucide-react';

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
    hover: { scale: 1.05, x: 5, color: '#E5E7EB', transition: { duration: 0.3, ease: 'easeOut' } },
    tap: { scale: 0.95, x: 0, color: '#D1D5DB', transition: { duration: 0.2 } },
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
      transition: { duration: 0.4, ease: 'easeInOut', type: 'spring', stiffness: 200, damping: 20 },
    },
    exit: { x: '100%', opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, duration: 0.3, ease: 'easeInOut' },
    }),
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
    { path: '/violations', label: 'المخالفات', icon: <AlertCircle className="h-5 w-5" /> },
    { path: '/create-advance', label: 'إنشاء سلفة', icon: <DollarSign className="h-5 w-5" /> },
  ];

  return (
    <div className="font-noto-sans-arabic dir=rtl">
      {/* Hamburger Menu Button for All Screens */}
      <motion.div
        className="fixed top-4 right-4 z-50"
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

      {/* Sidebar for All Screens */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 h-full w-64 bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800 p-4 z-40 flex-col gap-3 shadow-2xl border-l border-gray-300/30 overflow-y-auto"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-gray-600/30 via-gray-700/30 to-gray-800/30"
              animate={{
                background: [
                  'linear-gradient(180deg, rgba(75, 85, 99, 0.3), rgba(55, 65, 81, 0.3), rgba(31, 41, 55, 0.3))',
                  'linear-gradient(180deg, rgba(75, 85, 99, 0.4), rgba(55, 65, 81, 0.4), rgba(31, 41, 55, 0.4))',
                  'linear-gradient(180deg, rgba(75, 85, 99, 0.3), rgba(55, 65, 81, 0.3), rgba(31, 41, 55, 0.3))',
                ],
              }}
              transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            />
            <div className="relative z-10 flex flex-col gap-3 mt-12">
              <h1 className="text-2xl font-bold text-white text-right tracking-wide drop-shadow-lg mb-8">
                HR
              </h1>
              {navItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="px-3 py-2 cursor-pointer rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
                >
                  <Link
                    to={item.path}
                    onClick={() => handleLinkClick(item.path)}
                    className="text-white text-sm font-medium hover:text-gray-200 transition-all duration-300 flex items-center gap-3"
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
                className="px-3 py-2 cursor-pointer rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 mt-4"
                onClick={handleLogout}
              >
                <div className="text-white text-sm font-medium hover:text-gray-200 transition-all duration-300 flex items-center gap-3">
                  <LogOut className="h-5 w-5" />
                  تسجيل الخروج
                </div>
              </motion.div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Success Message and Animation */}
      {successMessage && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="bg-gray-100/95 backdrop-blur-sm border border-gray-300/50 text-gray-800 p-3 rounded-xl text-sm text-right mt-2 shadow-lg mx-auto max-w-md"
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
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
          >
            <div className="bg-white/95 backdrop-blur-lg p-8 rounded-full shadow-2xl border border-gray-300/30">
              <CustomCheckIcon />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Navbar;
