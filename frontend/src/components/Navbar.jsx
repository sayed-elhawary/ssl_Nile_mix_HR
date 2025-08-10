import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

function Navbar({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/login');
    setIsMenuOpen(false); // إغلاق القائمة بعد تسجيل الخروج
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // أنيميشن للقائمة
  const menuVariants = {
    hidden: { opacity: 0, y: -20, height: 0 },
    visible: { opacity: 1, y: 0, height: 'auto', transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 shadow-lg font-noto-sans-arabic sticky top-0 z-50"
    >
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 text-right">
          نظام إدارة الشيفتات
        </h1>
        <div className="flex items-center">
          {/* زر الهمبرغر للموبايل */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="md:hidden text-purple-700 focus:outline-none"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.button>
          {/* زر تسجيل الخروج للتابلت والكمبيوتر */}
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
            whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
            onClick={handleLogout}
            className="hidden md:block bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold shadow-md"
          >
            تسجيل الخروج
          </motion.button>
        </div>
      </div>
      {/* قائمة الروابط */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="md:hidden absolute top-16 left-0 right-0 bg-purple-50 p-4 shadow-md w-full"
          >
            <div className="flex flex-col gap-3">
              <motion.div
                whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
                whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
                onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }}
                className="px-3 py-2 cursor-pointer"
              >
                <Link
                  to="/dashboard"
                  className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
                >
                  الداشبورد
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
                whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
                onClick={() => { navigate('/create-shift'); setIsMenuOpen(false); }}
                className="px-3 py-2 cursor-pointer"
              >
                <Link
                  to="/create-shift"
                  className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
                >
                  إنشاء شيفت
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
                whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
                onClick={() => { navigate('/create-user'); setIsMenuOpen(false); }}
                className="px-3 py-2 cursor-pointer"
              >
                <Link
                  to="/create-user"
                  className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
                >
                  إنشاء حساب
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
                whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
                onClick={() => { navigate('/edit-user'); setIsMenuOpen(false); }}
                className="px-3 py-2 cursor-pointer"
              >
                <Link
                  to="/edit-user"
                  className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
                >
                  تعديل حساب
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
                whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
                onClick={() => { navigate('/settings'); setIsMenuOpen(false); }}
                className="px-3 py-2 cursor-pointer"
              >
                <Link
                  to="/settings"
                  className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
                >
                  الإعدادات
                </Link>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
                whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
                onClick={handleLogout}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold text-right"
              >
                تسجيل الخروج
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* الروابط للتابلت والكمبيوتر */}
      <div className="hidden md:flex items-center space-x-6 space-x-reverse">
        <motion.div
          whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
          whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
          onClick={() => navigate('/dashboard')}
          className="px-3 py-2 cursor-pointer"
        >
          <Link
            to="/dashboard"
            className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
          >
            الداشبورد
          </Link>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
          whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
          onClick={() => navigate('/create-shift')}
          className="px-3 py-2 cursor-pointer"
        >
          <Link
            to="/create-shift"
            className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
          >
            إنشاء شيفت
          </Link>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
          whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
          onClick={() => navigate('/create-user')}
          className="px-3 py-2 cursor-pointer"
        >
          <Link
            to="/create-user"
            className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
          >
            إنشاء حساب
          </Link>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
          whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
          onClick={() => navigate('/edit-user')}
          className="px-3 py-2 cursor-pointer"
        >
          <Link
            to="/edit-user"
            className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
          >
            تعديل حساب
          </Link>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.1, backgroundColor: '#EDE9FE', borderRadius: '8px' }}
          whileTap={{ scale: 0.95, backgroundColor: '#EDE9FE' }}
          onClick={() => navigate('/settings')}
          className="px-3 py-2 cursor-pointer"
        >
          <Link
            to="/settings"
            className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-all duration-300"
          >
            الإعدادات
          </Link>
        </motion.div>
      </div>
    </motion.nav>
  );
}

export default Navbar;
