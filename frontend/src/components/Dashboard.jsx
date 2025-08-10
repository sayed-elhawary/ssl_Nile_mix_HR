import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, UserPlus, UserCog, Settings, Upload } from 'lucide-react';

function Dashboard() {
  const navigate = useNavigate();

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    hover: { scale: 1.05, boxShadow: '0 8px 24px rgba(147, 51, 234, 0.3)', transition: { duration: 0.3 } },
    tap: { scale: 0.95, backgroundColor: '#EDE9FE', transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 sm:p-6 font-noto-sans-arabic relative overflow-hidden">
      {/* تأثير خلفية ديناميكي */}
      <div className="absolute inset-0 bg-pattern opacity-20"></div>
      <div className="container mx-auto relative z-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-700 mb-6 sm:mb-8 text-right">
          الداشبورد
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            onClick={() => navigate('/create-shift')}
            className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <Link to="/create-shift" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
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
            onClick={() => navigate('/create-user')}
            className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <Link to="/create-user" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
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
            onClick={() => navigate('/edit-user')}
            className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <Link to="/edit-user" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <UserCog className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
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
            onClick={() => navigate('/settings')}
            className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <Link to="/settings" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
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
            onClick={() => navigate('/attendance-upload')}
            className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <Link to="/attendance-upload" className="flex items-center space-x-3 sm:space-x-4 space-x-reverse">
              <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-purple-600">رفع بيانات الحضور</h3>
                <p className="text-gray-600 text-xs sm:text-sm">رفع ملف بصمة لتسجيل الحضور</p>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
