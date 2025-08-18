import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Check Icon
const CustomCheckIcon = () => (
  <motion.div
    className="relative h-16 w-16"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.7, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      initial={{ pathLength: 0, rotate: -45 }}
      animate={{ pathLength: 1, rotate: 0, transition: { duration: 0.9, ease: [0.6, -0.05, 0.01, 0.99] } }}
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
    animate={{ opacity: 1, transition: { duration: 0.4, ease: 'easeInOut' } }}
    exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <motion.div
      className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-3 text-purple-600 text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

// Custom SVG Icons
const ShiftIcon = () => (
  <div className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  </div>
);

const UserPlusIcon = () => (
  <div className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M20 8v6m-3-3h6" />
    </svg>
  </div>
);

const UserEditIcon = () => (
  <div className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M19 8l-4 4 1 1 4-4-1-1" />
    </svg>
  </div>
);

const SettingsIcon = () => (
  <div className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  </div>
);

const UploadIcon = () => (
  <div className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  </div>
);

const ReportIcon = () => (
  <div className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  </div>
);

function Dashboard() {
  const navigate = useNavigate();
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCardClick = (path, message) => {
    setLoading(true);
    setShowSuccessAnimation(true);
    setSuccessMessage(message);
    setTimeout(() => {
      setShowSuccessAnimation(false);
      setLoading(false);
      navigate(path);
    }, 1200);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { 
        duration: 0.6, 
        ease: [0.6, -0.05, 0.01, 0.99], 
        type: 'spring', 
        stiffness: 120, 
        damping: 15,
        staggerChildren: 0.1 
      } 
    },
    hover: { scale: 1.03, boxShadow: '0 8px 24px rgba(124, 58, 237, 0.2)', transition: { duration: 0.3, ease: 'easeInOut' } },
    tap: { scale: 0.98, transition: { duration: 0.2, ease: 'easeInOut' } },
  };

  const cardChildVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { 
        duration: 0.4, 
        ease: [0.6, -0.05, 0.01, 0.99] 
      } 
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 md:p-8 font-noto-sans-arabic relative dir=rtl overflow-auto" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <div className="container mx-auto relative z-10 max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-8 sm:mb-10 text-right tracking-tight"
        >
          الداشبورد
        </motion.h2>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="flex justify-center mb-8"
          >
            <CustomLoadingSpinner />
          </motion.div>
        )}
        {successMessage && !loading && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="text-gray-900 bg-purple-50 p-4 rounded-xl shadow-sm mb-6 text-right text-sm sm:text-base"
          >
            {successMessage}
          </motion.p>
        )}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          <motion.div
            variants={cardChildVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/create-shift', 'جارٍ الانتقال إلى إنشاء شيفت')}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200/50"
          >
            <Link to="/create-shift" className="flex items-center space-x-4 space-x-reverse">
              <ShiftIcon />
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">إنشاء شيفت</h3>
                <p className="text-gray-600 text-sm sm:text-base">إنشاء شيفت جديد مع تحديد التفاصيل</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardChildVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/create-user', 'جارٍ الانتقال إلى إنشاء حساب')}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200/50"
          >
            <Link to="/create-user" className="flex items-center space-x-4 space-x-reverse">
              <UserPlusIcon />
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">إنشاء حساب</h3>
                <p className="text-gray-600 text-sm sm:text-base">إضافة موظف جديد إلى النظام</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardChildVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/edit-user', 'جارٍ الانتقال إلى تعديل حساب')}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200/50"
          >
            <Link to="/edit-user" className="flex items-center space-x-4 space-x-reverse">
              <UserEditIcon />
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">تعديل حساب</h3>
                <p className="text-gray-600 text-sm sm:text-base">تعديل بيانات موظف موجود</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardChildVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/settings', 'جارٍ الانتقال إلى الإعدادات')}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200/50"
          >
            <Link to="/settings" className="flex items-center space-x-4 space-x-reverse">
              <SettingsIcon />
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">الإعدادات</h3>
                <p className="text-gray-600 text-sm sm:text-base">تعديل أو حذف الشيفتات</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardChildVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/attendance-upload', 'جارٍ الانتقال إلى رفع بيانات الحضور')}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200/50"
          >
            <Link to="/attendance-upload" className="flex items-center space-x-4 space-x-reverse">
              <UploadIcon />
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">رفع بيانات الحضور</h3>
                <p className="text-gray-600 text-sm sm:text-base">رفع ملف بصمة لتسجيل الحضور</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardChildVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/monthly-salary-report', 'جارٍ الانتقال إلى تقرير الرواتب الشهري')}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200/50"
          >
            <Link to="/monthly-salary-report" className="flex items-center space-x-4 space-x-reverse">
              <ReportIcon />
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">تقرير الرواتب الشهري</h3>
                <p className="text-gray-600 text-sm sm:text-base">عرض تقرير الرواتب الشهري مع الحسابات</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardChildVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/monthly-bonus-report', 'جارٍ الانتقال إلى تقرير الحافز الشهري')}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200/50"
          >
            <Link to="/monthly-bonus-report" className="flex items-center space-x-4 space-x-reverse">
              <ReportIcon />
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">تقرير الحافز الشهري</h3>
                <p className="text-gray-600 text-sm sm:text-base">عرض تقرير الحوافز الشهرية مع الحسابات</p>
              </div>
            </Link>
          </motion.div>
        </motion.div>
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 } }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.4, ease: 'easeInOut' } }}
              className="fixed inset-0 flex items-center justify-center bg-black/20 z-50"
            >
              <CustomCheckIcon />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Dashboard;
