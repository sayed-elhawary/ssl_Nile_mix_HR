import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Check Icon (بدون حركة إضافية)
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

// Custom Loading Spinner (بدون حركة إضافية زائدة)
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

// Custom SVG Icons (بدون حركة)
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
    }, 1500); // تقليل وقت الانتظار لتحسين الأداء
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    hover: { scale: 1.03, boxShadow: '0 6px 20px rgba(139, 92, 246, 0.2)', transition: { duration: 0.3 } },
    tap: { scale: 0.98, backgroundColor: '#F3E8FF', transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-blue-100 p-4 sm:p-6 font-noto-sans-arabic relative dir=rtl overflow-auto" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <div className="container mx-auto relative z-10 max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-600 mb-6 sm:mb-8 text-right tracking-wide drop-shadow-sm">
          الداشبورد
        </h2>
        {loading && (
          <div className="flex justify-center mb-6">
            <CustomLoadingSpinner />
          </div>
        )}
        {successMessage && !loading && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-purple-600 mb-4 text-sm sm:text-base text-right bg-purple-50 p-3 rounded-xl shadow-sm"
          >
            {successMessage}
          </motion.p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/create-shift', 'جارٍ الانتقال إلى إنشاء شيفت')}
            className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-purple-100 backdrop-blur-sm bg-opacity-90"
          >
            <Link to="/create-shift" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <ShiftIcon />
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-purple-600">إنشاء شيفت</h3>
                <p className="text-gray-600 text-xs sm:text-sm">إنشاء شيفت جديد مع تحديد التفاصيل</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/create-user', 'جارٍ الانتقال إلى إنشاء حساب')}
            className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-purple-100 backdrop-blur-sm bg-opacity-90"
          >
            <Link to="/create-user" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <UserPlusIcon />
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-purple-600">إنشاء حساب</h3>
                <p className="text-gray-600 text-xs sm:text-sm">إضافة موظف جديد إلى النظام</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/edit-user', 'جارٍ الانتقال إلى تعديل حساب')}
            className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-purple-100 backdrop-blur-sm bg-opacity-90"
          >
            <Link to="/edit-user" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <UserEditIcon />
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-purple-600">تعديل حساب</h3>
                <p className="text-gray-600 text-xs sm:text-sm">تعديل بيانات موظف موجود</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/settings', 'جارٍ الانتقال إلى الإعدادات')}
            className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-purple-100 backdrop-blur-sm bg-opacity-90"
          >
            <Link to="/settings" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <SettingsIcon />
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-purple-600">الإعدادات</h3>
                <p className="text-gray-600 text-xs sm:text-sm">تعديل أو حذف الشيفتات</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/attendance-upload', 'جارٍ الانتقال إلى رفع بيانات الحضور')}
            className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-purple-100 backdrop-blur-sm bg-opacity-90"
          >
            <Link to="/attendance-upload" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <UploadIcon />
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-purple-600">رفع بيانات الحضور</h3>
                <p className="text-gray-600 text-xs sm:text-sm">رفع ملف بصمة لتسجيل الحضور</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleCardClick('/monthly-salary-report', 'جارٍ الانتقال إلى تقرير الرواتب الشهري')}
            className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-purple-100 backdrop-blur-sm bg-opacity-90"
          >
            <Link to="/monthly-salary-report" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <ReportIcon />
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-purple-600">تقرير الرواتب الشهري</h3>
                <p className="text-gray-600 text-xs sm:text-sm">عرض تقرير الرواتب الشهري مع الحسابات</p>
              </div>
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
      </div>
    </div>
  );
}

export default Dashboard;
