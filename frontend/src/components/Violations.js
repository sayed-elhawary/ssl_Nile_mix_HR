import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

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

// Custom Violation Icon
const CustomViolationIcon = () => (
  <div className="h-8 w-8 sm:h-10 sm:w-10 text-red-600">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v2m0 4h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
      <path d="M12 17v.01" />
    </svg>
  </div>
);

function Violations() {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [violations, setViolations] = useState([]);
  const [formData, setFormData] = useState({
    employeeCode: '',
    employeeName: '',
    department: '',
    violationPrice: '',
    date: '',
    vehicleCode: '',
    station: '',
    violationImage: null,
  });
  const [editId, setEditId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى');
        setLoading(false);
        return;
      }
      const response = await axios.get('http://nilemix.mywire.org:5000/api/violations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setViolations(response.data.data || []);
        setErrorMessage('');
      } else {
        setErrorMessage(response.data.message || 'فشل في جلب المخالفات');
      }
    } catch (error) {
      console.error('خطأ في جلب المخالفات:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      setErrorMessage(error.response?.data?.message || 'حدث خطأ في جلب البيانات');
    }
    setLoading(false);
  };

  const fetchEmployeeData = async (employeeCode) => {
    if (!employeeCode || employeeCode.length < 1) {
      setFormData({ ...formData, employeeName: '', department: '' });
      setErrorMessage('');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى');
        setLoading(false);
        return;
      }
      console.log('جلب بيانات الموظف للكود:', employeeCode);
      const response = await axios.get(`http://nilemix.mywire.org:5000/api/violations/employee/${employeeCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const { name, department } = response.data.data;
        setFormData({ ...formData, employeeName: name, department });
        setErrorMessage('');
      } else {
        setFormData({ ...formData, employeeName: '', department: '' });
        setErrorMessage(response.data.message || 'الموظف غير موجود');
      }
    } catch (error) {
      console.error('خطأ في جلب بيانات الموظف:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      setErrorMessage(error.response?.data?.message || 'حدث خطأ في جلب بيانات الموظف');
    }
    setLoading(false);
  };

  const handleEmployeeCodeBlur = async () => {
    await fetchEmployeeData(formData.employeeCode);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, violationImage: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const requiredFields = ['employeeCode', 'employeeName', 'violationPrice', 'date', 'vehicleCode', 'station'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      setErrorMessage(`يرجى ملء الحقول التالية: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null) {
        data.append(key, formData[key]);
      }
    });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى');
        setLoading(false);
        return;
      }
      console.log('إرسال بيانات المخالفة:', Object.fromEntries(data));
      if (editId) {
        await axios.put(`http://nilemix.mywire.org:5000/api/violations/${editId}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccessMessage('تم تعديل المخالفة بنجاح');
      } else {
        await axios.post('http://nilemix.mywire.org:5000/api/violations', data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccessMessage('تم إضافة المخالفة بنجاح');
      }
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setLoading(false);
        fetchViolations();
        resetForm();
      }, 1200);
    } catch (error) {
      console.error('خطأ في حفظ المخالفة:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      setErrorMessage(error.response?.data?.message || 'حدث خطأ أثناء الحفظ');
      setLoading(false);
    }
  };

  const handleEdit = (violation) => {
    setFormData({
      employeeCode: violation.employeeCode,
      employeeName: violation.employeeName,
      department: violation.department || '',
      violationPrice: violation.violationPrice,
      date: violation.date.split('T')[0],
      vehicleCode: violation.vehicleCode,
      station: violation.station,
      violationImage: null,
    });
    setEditId(violation._id);
    setErrorMessage('');
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى');
        setLoading(false);
        return;
      }
      await axios.delete(`http://nilemix.mywire.org:5000/api/violations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('تم حذف المخالفة بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setLoading(false);
        fetchViolations();
      }, 1200);
    } catch (error) {
      console.error('خطأ في حذف المخالفة:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      setErrorMessage(error.response?.data?.message || 'حدث خطأ أثناء الحذف');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeCode: '',
      employeeName: '',
      department: '',
      violationPrice: '',
      date: '',
      vehicleCode: '',
      station: '',
      violationImage: null,
    });
    setEditId(null);
    setErrorMessage('');
  };

  const handleImageClick = (imageUrl) => {
    console.log('تم تحديد الصورة:', `http://nilemix.mywire.org:5000${imageUrl}`);
    setSelectedImage(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
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
          صفحة المخالفات
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
        {errorMessage && !loading && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="text-red-600 bg-red-50 p-4 rounded-xl shadow-sm mb-6 text-right text-sm sm:text-base"
          >
            {errorMessage}
          </motion.p>
        )}

        {/* نموذج الإضافة/التعديل */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-md mb-8 border border-gray-200/50"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 text-right">تسجيل مخالفة جديدة أو تعديل</h3>
          <form onSubmit={handleSubmit} className="space-y-4 text-right">
            <input
              type="text"
              name="employeeCode"
              placeholder="كود الموظف"
              value={formData.employeeCode}
              onChange={handleInputChange}
              onBlur={handleEmployeeCodeBlur}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 text-right"
              required
            />
            <input
              type="text"
              name="employeeName"
              placeholder="اسم الموظف"
              value={formData.employeeName}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 text-right"
              readOnly
            />
            <input
              type="text"
              name="department"
              placeholder="القسم"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 text-right"
              readOnly
            />
            <input
              type="number"
              name="violationPrice"
              placeholder="سعر المخالفة"
              value={formData.violationPrice}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 text-right"
              required
            />
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 text-right"
              required
            />
            <input
              type="text"
              name="vehicleCode"
              placeholder="كود العربية"
              value={formData.vehicleCode}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 text-right"
              required
            />
            <input
              type="text"
              name="station"
              placeholder="المحطة"
              value={formData.station}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 text-right"
              required
            />
            <input
              type="file"
              name="violationImage"
              onChange={handleFileChange}
              accept="image/*"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 text-right"
            />
            <button type="submit" className="w-full bg-purple-600 text-white p-3 rounded-lg font-bold hover:bg-purple-700 transition">
              {editId ? 'حفظ التعديل' : 'إضافة مخالفة'}
            </button>
            {editId && (
              <button type="button" onClick={resetForm} className="w-full bg-gray-600 text-white p-3 rounded-lg font-bold hover:bg-gray-700 transition mt-2">
                إلغاء التعديل
              </button>
            )}
          </form>
        </motion.div>

        {/* عرض القائمة في كاردات */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          {violations.map((violation) => (
            <motion.div
              key={violation._id}
              variants={cardChildVariants}
              whileHover="hover"
              whileTap="tap"
              className="bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200/50"
            >
              <div className="flex items-center space-x-4 space-x-reverse">
                <CustomViolationIcon />
                <div className="text-right flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">كود: {violation.employeeCode}</h3>
                  <p className="text-gray-600 text-sm sm:text-base">الاسم: {violation.employeeName}</p>
                  <p className="text-gray-600 text-sm sm:text-base">القسم: {violation.department || 'غير محدد'}</p>
                  <p className="text-gray-600 text-sm sm:text-base">سعر المخالفة: {violation.violationPrice}</p>
                  <p className="text-gray-600 text-sm sm:text-base">التاريخ: {new Date(violation.date).toLocaleDateString('ar-EG')}</p>
                  <p className="text-gray-600 text-sm sm:text-base">كود العربية: {violation.vehicleCode}</p>
                  <p className="text-gray-600 text-sm sm:text-base">المحطة: {violation.station}</p>
                  {violation.violationImage && (
                    <img
                      src={`http://nilemix.mywire.org:5000${violation.violationImage}`}
                      alt="صورة المخالفة"
                      className="w-32 h-32 object-cover rounded-lg mt-2 cursor-pointer"
                      onClick={() => handleImageClick(violation.violationImage)}
                      onError={(e) => {
                        console.error('فشل تحميل الصورة:', e.target.src);
                        e.target.src = '/placeholder-image.jpg'; // صورة احتياطية
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2 space-x-reverse">
                <button onClick={() => handleEdit(violation)} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition">
                  تعديل
                </button>
                <button onClick={() => handleDelete(violation._id)} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition">
                  حذف
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* مودال تكبير الصورة */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 p-4"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.6, -0.05, 0.01, 0.99] }}
                className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={`http://nilemix.mywire.org:5000${selectedImage}`}
                  alt="صورة المخالفة المكبرة"
                  className="max-w-full max-h-[95vh] object-contain"
                  onError={(e) => {
                    console.error('فشل تحميل الصورة المكبرة:', e.target.src);
                    setErrorMessage('فشل تحميل الصورة المكبرة');
                    setSelectedImage(null);
                  }}
                  onLoad={() => console.log('تم تحميل الصورة المكبرة بنجاح')}
                />
                <button
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold hover:bg-red-700 transition"
                >
                  ×
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 }}
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

export default Violations;
