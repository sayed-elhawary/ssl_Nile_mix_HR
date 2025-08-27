import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, LogOut, Settings, UserPlus, Edit, Upload, DollarSign, AlertCircle } from 'lucide-react';

// Custom Check Icon
const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12"
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

// Custom Loading Spinner
const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
    exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.div
      className="h-8 w-8 border-3 border-purple-500 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-2 text-purple-500 text-sm font-medium">جارٍ التحميل...</span>
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
    }, 1000);
  };

  const handleLinkClick = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const linkVariants = {
    hover: { scale: 1.05, x: 5, color: '#E5E7EB', transition: { duration: 0.2, ease: 'easeOut' } },
    tap: { scale: 0.95, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', transition: { duration: 0.2, ease: 'easeOut' } },
    tap: { scale: 0.95, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  const sidebarVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    exit: { x: '100%', opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
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
      {/* Hamburger Menu Button */}
      <motion.div
        className="fixed top-4 right-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          className="text-white bg-purple-500 p-2 rounded-lg shadow-md hover:bg-purple-600 transition-colors duration-200"
          onClick={toggleMenu}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </motion.button>
      </motion.div>
      {/* Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 h-full w-64 bg-gray-800 p-4 z-40 flex flex-col gap-3 shadow-md border-l border-gray-200/20 overflow-y-auto"
          >
            <div className="relative z-10 flex flex-col gap-3 mt-12">
              <h1 className="text-xl font-bold text-white text-right mb-6">HR</h1>
              {navItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="px-3 py-2 cursor-pointer rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  <Link
                    to={item.path}
                    onClick={() => handleLinkClick(item.path)}
                    className="text-gray-200 text-sm font-medium hover:text-white transition-colors duration-200 flex items-center gap-3"
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
                className="px-3 py-2 cursor-pointer rounded-lg hover:bg-gray-700 transition-colors duration-200 mt-4"
                onClick={handleLogout}
              >
                <div className="text-gray-200 text-sm font-medium hover:text-white transition-colors duration-200 flex items-center gap-3">
                  <LogOut className="h-5 w-5" />
                  تسجيل الخروج
                </div>
              </motion.div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
      {/* Success Message and Animation */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-16 right-4 z-50"
        >
          <CustomLoadingSpinner />
        </motion.div>
      )}
      {successMessage && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-16 right-4 bg-green-50 text-green-600 p-3 rounded-lg shadow-md text-sm text-right max-w-md"
        >
          {successMessage}
        </motion.div>
      )}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
          >
            <div className="bg-white p-4 rounded-full shadow-md">
              <CustomCheckIcon />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Navbar;
