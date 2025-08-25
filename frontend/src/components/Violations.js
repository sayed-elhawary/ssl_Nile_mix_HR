import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Custom Check Icon
const CustomCheckIcon = () => (
  <motion.div
    className="relative h-16 w-16"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.9, ease: [0.68, -0.55, 0.265, 1.55], type: 'spring', stiffness: 90, damping: 25 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      initial={{ pathLength: 0, rotate: -45 }}
      animate={{ pathLength: 1, rotate: 0, transition: { duration: 1.2, ease: [0.68, -0.55, 0.265, 1.55] } }}
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
    animate={{ opacity: 1, transition: { duration: 0.6, ease: 'easeInOut' } }}
    exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
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
  const [imageError, setImageError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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
      console.log('جلب المخالفات من:', `${process.env.REACT_APP_API_URL}/api/violations`);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/violations`, {
        headers: { Authorization: `Bearer ${token}` },
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
        data: error.response?.data,
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
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/violations/employee/${employeeCode}`, {
        headers: { Authorization: `Bearer ${token}` },
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
        data: error.response?.data,
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
    const missingFields = requiredFields.filter((field) => !formData[field]);
    if (missingFields.length > 0) {
      setErrorMessage(`يرجى ملء الحقول التالية: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }
    const data = new FormData();
    Object.keys(formData).forEach((key) => {
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
        await axios.put(`${process.env.REACT_APP_API_URL}/api/violations/${editId}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage('تم تعديل المخالفة بنجاح');
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/violations`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage('تم إضافة المخالفة بنجاح');
      }
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setLoading(false);
        fetchViolations();
        resetForm();
      }, 1500);
    } catch (error) {
      console.error('خطأ في حفظ المخالفة:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
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

  const handleDelete = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى');
        setLoading(false);
        setShowConfirmDialog(false);
        return;
      }
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/violations/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMessage('تم حذف المخالفة بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setLoading(false);
        fetchViolations();
        setShowConfirmDialog(false);
        setDeleteId(null);
      }, 1500);
    } catch (error) {
      console.error('خطأ في حذف المخالفة:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setErrorMessage(error.response?.data?.message || 'حدث خطأ أثناء الحذف');
      setLoading(false);
      setShowConfirmDialog(false);
      setDeleteId(null);
    }
  };

  const handleShowConfirmDialog = (id) => {
    setDeleteId(id);
    setShowConfirmDialog(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
    setDeleteId(null);
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
    const fullImageUrl = `${process.env.REACT_APP_API_URL}${imageUrl}`;
    console.log('تم تحديد الصورة:', fullImageUrl);
    setSelectedImage(imageUrl);
    setImageError(null);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
    setImageError(null);
  };

  const handleImageError = (e) => {
    console.error('فشل تحميل الصورة:', e.target.src, {
      status: e.target.status,
      statusText: e.target.statusText,
    });
    setImageError(`فشل تحميل الصورة: ${e.target.src}. تحقق من أن الصورة موجودة على الخادم أو حاول رفع صورة جديدة.`);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.9,
        ease: [0.68, -0.55, 0.265, 1.55],
        type: 'spring',
        stiffness: 90,
        damping: 25,
        staggerChildren: 0.2,
      },
    },
    hover: { scale: 1.03, boxShadow: '0 8px 24px rgba(139, 92, 246, 0.25)', transition: { duration: 0.6, ease: 'easeInOut' } },
    tap: { scale: 0.98, transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  const cardChildVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.7,
        ease: [0.68, -0.55, 0.265, 1.55],
      },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.68, -0.55, 0.265, 1.55] } },
    hover: { scale: 1.12, boxShadow: '0 6px 16px rgba(139, 92, 246, 0.35)', transition: { duration: 0.6, ease: 'easeInOut' } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4 sm:p-6 md:p-8 font-noto-sans-arabic relative dir=rtl overflow-auto">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-100/30 via-purple-100/30 to-pink-100/30"
        animate={{
          background: [
            'linear-gradient(135deg, rgba(219, 234, 254, 0.3), rgba(221, 214, 254, 0.3), rgba(252, 231, 243, 0.3))',
            'linear-gradient(135deg, rgba(219, 234, 254, 0.5), rgba(221, 214, 254, 0.5), rgba(252, 231, 243, 0.5))',
            'linear-gradient(135deg, rgba(219, 234, 254, 0.3), rgba(221, 214, 254, 0.3), rgba(252, 231, 243, 0.3))',
          ],
        }}
        transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      <div className="container mx-auto relative z-10 max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.68, -0.55, 0.265, 1.55], type: 'spring', stiffness: 90, damping: 25 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-8 sm:mb-10 text-right tracking-tight drop-shadow-lg"
        >
          صفحة المخالفات
        </motion.h2>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
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
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="text-gray-800 bg-white/90 backdrop-blur-sm border border-purple-200/50 p-4 rounded-xl shadow-xl mb-6 text-right text-sm sm:text-base"
          >
            {successMessage}
          </motion.p>
        )}
        {errorMessage && !loading && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="text-red-600 bg-red-50/90 backdrop-blur-sm border border-red-200/50 p-4 rounded-xl shadow-xl mb-6 text-right text-sm sm:text-base"
          >
            {errorMessage}
          </motion.p>
        )}
        {/* نموذج الإضافة/التعديل */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl mb-8 border border-purple-200/50"
        >
          <div className="flex items-center space-x-4 space-x-reverse mb-6">
            <CustomViolationIcon />
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">تسجيل مخالفة جديدة أو تعديل</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 text-right">
            <input
              type="text"
              name="employeeCode"
              placeholder="كود الموظف"
              value={formData.employeeCode}
              onChange={handleInputChange}
              onBlur={handleEmployeeCodeBlur}
              className="w-full p-3 border border-purple-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-right bg-white/70 backdrop-blur-sm transition-all duration-600 shadow-sm hover:shadow-md"
              required
            />
            <input
              type="text"
              name="employeeName"
              placeholder="اسم الموظف"
              value={formData.employeeName}
              onChange={handleInputChange}
              className="w-full p-3 border border-purple-200/50 rounded-lg focus:outline-none text-right bg-gray-50/50 backdrop-blur-sm shadow-sm"
              readOnly
            />
            <input
              type="text"
              name="department"
              placeholder="القسم"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full p-3 border border-purple-200/50 rounded-lg focus:outline-none text-right bg-gray-50/50 backdrop-blur-sm shadow-sm"
              readOnly
            />
            <input
              type="number"
              name="violationPrice"
              placeholder="سعر المخالفة"
              value={formData.violationPrice}
              onChange={handleInputChange}
              className="w-full p-3 border border-purple-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-right bg-white/70 backdrop-blur-sm transition-all duration-600 shadow-sm hover:shadow-md"
              required
            />
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full p-3 border border-purple-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-right bg-white/70 backdrop-blur-sm transition-all duration-600 shadow-sm hover:shadow-md"
              required
            />
            <input
              type="text"
              name="vehicleCode"
              placeholder="كود العربية"
              value={formData.vehicleCode}
              onChange={handleInputChange}
              className="w-full p-3 border border-purple-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-right bg-white/70 backdrop-blur-sm transition-all duration-600 shadow-sm hover:shadow-md"
              required
            />
            <input
              type="text"
              name="station"
              placeholder="المحطة"
              value={formData.station}
              onChange={handleInputChange}
              className="w-full p-3 border border-purple-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-right bg-white/70 backdrop-blur-sm transition-all duration-600 shadow-sm hover:shadow-md"
              required
            />
            <input
              type="file"
              name="violationImage"
              onChange={handleFileChange}
              accept="image/*"
              className="w-full p-3 border border-purple-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-right bg-white/70 backdrop-blur-sm transition-all duration-600 shadow-sm hover:shadow-md"
            />
            <button
              type="submit"
              className="w-full bg-purple-600 text-white p-3 rounded-lg font-bold hover:bg-purple-700 transition-all duration-600 shadow-md hover:shadow-lg"
            >
              {editId ? 'حفظ التعديل' : 'إضافة مخالفة'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full bg-gray-600 text-white p-3 rounded-lg font-bold hover:bg-gray-700 transition-all duration-600 shadow-md hover:shadow-lg mt-2"
              >
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
              className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl transition-all duration-600 border border-purple-200/50"
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
                    <motion.img
                      src={`${process.env.REACT_APP_API_URL}${violation.violationImage}`}
                      alt="صورة المخالفة"
                      variants={imageVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover="hover"
                      className="w-32 h-32 object-cover rounded-lg mt-2 cursor-pointer shadow-md"
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
                <button
                  onClick={() => handleEdit(violation)}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all duration-600 shadow-sm hover:shadow-md"
                >
                  تعديل
                </button>
                <button
                  onClick={() => handleShowConfirmDialog(violation._id)}
                  className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-all duration-600 shadow-sm hover:shadow-md"
                >
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
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 p-4"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.68, -0.55, 0.265, 1.55] }}
                className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200/50 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                {imageError ? (
                  <div className="flex flex-col items-center justify-center max-w-full max-h-[90vh]">
                    <img
                      src="/placeholder-image.jpg"
                      alt="صورة احتياطية"
                      className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-md"
                    />
                    <p className="text-red-600 text-sm mt-2">{imageError}</p>
                  </div>
                ) : (
                  <motion.img
                    src={`${process.env.REACT_APP_API_URL}${selectedImage}`}
                    alt="صورة المخالفة المكبرة"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.68, -0.55, 0.265, 1.55] }}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-lg"
                    onError={handleImageError}
                    onLoad={() => console.log('تم تحميل الصورة المكبرة بنجاح:', `${process.env.REACT_APP_API_URL}${selectedImage}`)}
                  />
                )}
                <button
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold hover:bg-red-700 transition-all duration-600 shadow-sm hover:shadow-md"
                >
                  ×
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* نافذة تأكيد الحذف */}
        <AnimatePresence>
          {showConfirmDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.68, -0.55, 0.265, 1.55] }}
                className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-purple-200/50 text-right max-w-sm w-full"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">تأكيد الحذف</h3>
                <p className="text-gray-600 mb-6">هل أنت متأكد أنك تريد حذف هذه المخالفة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                <div className="flex justify-end space-x-2 space-x-reverse">
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-all duration-600 shadow-sm hover:shadow-md"
                  >
                    نعم، احذف
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition-all duration-600 shadow-sm hover:shadow-md"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* نافذة النجاح */}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.9, ease: [0.68, -0.55, 0.265, 1.55], type: 'spring', stiffness: 90, damping: 25 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <div className="bg-white/90 backdrop-blur-sm p-8 rounded-full shadow-xl border border-purple-200/50">
                <CustomCheckIcon />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Violations;
