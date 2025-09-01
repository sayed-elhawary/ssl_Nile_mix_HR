import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Check Icon
const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12 bg-white p-4 rounded-full shadow-md"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
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

// Custom SVG Icons
const ShiftIcon = () => (
  <motion.div
    className="h-6 w-6 text-purple-600"
    whileHover={{ scale: 1.3, rotate: 10, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  </motion.div>
);

const UserPlusIcon = () => (
  <motion.div
    className="h-6 w-6 text-purple-600"
    whileHover={{ scale: 1.3, rotate: 10, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M20 8v6m-3-3h6" />
    </svg>
  </motion.div>
);

const UserEditIcon = () => (
  <motion.div
    className="h-6 w-6 text-purple-600"
    whileHover={{ scale: 1.3, rotate: 10, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M19 8l-4 4 1 1 4-4-1-1" />
    </svg>
  </motion.div>
);

const SettingsIcon = () => (
  <motion.div
    className="h-6 w-6 text-purple-600"
    whileHover={{ scale: 1.3, rotate: 10, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  </motion.div>
);

const UploadIcon = () => (
  <motion.div
    className="h-6 w-6 text-purple-600"
    whileHover={{ scale: 1.3, rotate: 10, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  </motion.div>
);

const ReportIcon = () => (
  <motion.div
    className="h-6 w-6 text-purple-600"
    whileHover={{ scale: 1.3, rotate: 10, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  </motion.div>
);

const ViolationIcon = () => (
  <motion.div
    className="h-6 w-6 text-purple-600"
    whileHover={{ scale: 1.3, rotate: 10, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  </motion.div>
);

const AdvanceIcon = () => (
  <motion.div
    className="h-6 w-6 text-purple-600"
    whileHover={{ scale: 1.3, rotate: 10, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  </motion.div>
);

function Dashboard({ socket }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const userRole = localStorage.getItem('role') || 'employee';

  // تعريف الخيارات المتاحة لكل دور
  const menuItems = {
    admin: [
      { path: '/create-shift', label: 'إنشاء شيفت', icon: <ShiftIcon /> },
      { path: '/create-user', label: 'إنشاء مستخدم', icon: <UserPlusIcon /> },
      { path: '/edit-user', label: 'تعديل مستخدم', icon: <UserEditIcon /> },
      { path: '/settings', label: 'الإعدادات', icon: <SettingsIcon /> },
      { path: '/attendance-upload', label: 'رفع البصمة', icon: <UploadIcon /> },
      { path: '/monthly-salary-report', label: 'تقرير الرواتب الشهري', icon: <ReportIcon /> },
      { path: '/monthly-bonus-report', label: 'تقرير الحافز الشهري', icon: <ReportIcon /> },
      { path: '/violations', label: 'المخالفات', icon: <ViolationIcon /> },
      { path: '/create-advance', label: 'إنشاء سلفة', icon: <AdvanceIcon /> },
    ],
    gps: [
      { path: '/monthly-salary-report', label: 'تقرير الرواتب الشهري', icon: <ReportIcon /> },
      { path: '/monthly-bonus-report', label: 'تقرير الحافز الشهري', icon: <ReportIcon /> },
      { path: '/violations', label: 'المخالفات', icon: <ViolationIcon /> },
    ],
    employee: [
      { path: '/monthly-salary-report', label: 'تقرير الرواتب الشهري', icon: <ReportIcon /> },
      { path: '/monthly-bonus-report', label: 'تقرير الحافز الشهري', icon: <ReportIcon /> },
      { path: '/violations', label: 'المخالفات', icon: <ViolationIcon /> },
    ],
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: i * 0.1, duration: 0.8, ease: 'easeOut', type: 'spring', stiffness: 150, damping: 18 },
    }),
    hover: {
      scale: 1.02,
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#f9fafb',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    tap: { scale: 0.98, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 sm:p-6 md:p-8 font-noto-sans-arabic dir=rtl" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-center mb-6">
          <img
            src="http://www.nilemix.com/wp-content/uploads/2016/05/logo.png"
            alt="NileMix Logo"
            className="h-16 sm:h-20"
          />
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut', type: 'spring', stiffness: 150, damping: 18 } }}
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 sm:mb-8 text-center tracking-tight"
        >
          NileMix HR System - لوحة التحكم
        </motion.h1>
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
        </AnimatePresence>
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center items-center h-64"
          >
            <CustomLoadingSpinner />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {menuItems[userRole].map((item, index) => (
              <Link to={item.path} key={index}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="tap"
                  custom={index}
                  className="bg-white p-6 rounded-2xl shadow-md transition-shadow duration-300 flex items-center space-x-4 space-x-reverse border border-gray-200/50 backdrop-blur-sm"
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{item.label}</h2>
                    <p className="text-sm text-gray-600">انقر للانتقال إلى {item.label}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
