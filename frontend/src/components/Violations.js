import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Custom Check Icon
const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.svg
      className="h-full w-full text-blue-500"
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
      className="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-2 text-blue-500 text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

// Custom Violation Icon
const CustomViolationIcon = () => (
  <div className="h-6 w-6 text-red-500">
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
  const [filteredViolations, setFilteredViolations] = useState([]);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFromDate, setSearchFromDate] = useState('');
  const [searchToDate, setSearchToDate] = useState('');

  const userRole = localStorage.getItem('role') || 'employee';
  const employeeCode = localStorage.getItem('employeeCode') || '';

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
      let response;
      if (userRole === 'employee') {
        // جلب المخالفات الخاصة بالموظف فقط
        response = await axios.get(`${process.env.REACT_APP_API_URL}/api/violations/employee`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // جلب جميع المخالفات لـ admin و gps
        response = await axios.get(`${process.env.REACT_APP_API_URL}/api/violations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (response.data.success) {
        setViolations(response.data.data || []);
        setFilteredViolations(response.data.data || []);
        setErrorMessage('');
      } else {
        setErrorMessage(response.data.message || 'فشل في جلب المخالفات');
      }
    } catch (error) {
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
      setErrorMessage(error.response?.data?.message || 'حدث خطأ في جلب بيانات الموظف');
    }
    setLoading(false);
  };

  const handleSearchEmployee = () => {
    fetchEmployeeData(formData.employeeCode);
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
      }, 1000);
    } catch (error) {
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
      }, 1000);
    } catch (error) {
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
    setSelectedImage(imageUrl);
    setImageError(null);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
    setImageError(null);
  };

  const handleImageError = (e) => {
    setImageError(`فشل تحميل الصورة: ${e.target.src}. تحقق من أن الصورة موجودة على الخادم أو حاول رفع صورة جديدة.`);
  };

  const handleSearch = () => {
    setLoading(true);
    let filtered = violations;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((v) =>
        v.employeeCode.toLowerCase().includes(lowerQuery) ||
        v.employeeName.toLowerCase().includes(lowerQuery)
      );
    }
    if (searchFromDate) {
      const fromDate = new Date(searchFromDate);
      filtered = filtered.filter((v) => new Date(v.date) >= fromDate);
    }
    if (searchToDate) {
      const toDate = new Date(searchToDate);
      filtered = filtered.filter((v) => new Date(v.date) <= toDate);
    }
    setFilteredViolations(filtered);
    setTimeout(() => setLoading(false), 300);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    hover: { scale: 1.02, transition: { duration: 0.3, ease: 'easeOut' } },
    tap: { scale: 0.98, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', transition: { duration: 0.2, ease: 'easeOut' } },
    tap: { scale: 0.95, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    hover: { scale: 1.1, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 font-noto-sans-arabic relative dir=rtl">
      <div className="container mx-auto max-w-full sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-6 sm:mb-8 text-right"
        >
          إدارة المخالفات
        </motion.h2>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex justify-center mb-6"
          >
            <CustomLoadingSpinner />
          </motion.div>
        )}
        {successMessage && !loading && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-green-600 bg-green-50 p-3 rounded-lg mb-6 text-right text-sm"
          >
            {successMessage}
          </motion.p>
        )}
        {errorMessage && !loading && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-red-600 bg-red-50 p-3 rounded-lg mb-6 text-right text-sm"
          >
            {errorMessage}
          </motion.p>
        )}
        {/* نموذج الإضافة/التعديل (يظهر فقط لـ admin و gps) */}
        {['admin', 'gps'].includes(userRole) && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 border border-gray-200"
          >
            <div className="flex items-center space-x-3 space-x-reverse mb-4">
              <CustomViolationIcon />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">تسجيل مخالفة</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 sm:space-x-reverse">
                <input
                  type="text"
                  name="employeeCode"
                  placeholder="كود الموظف"
                  value={formData.employeeCode}
                  onChange={handleInputChange}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-right text-sm sm:text-base"
                  required
                />
                <motion.button
                  type="button"
                  onClick={handleSearchEmployee}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm sm:text-base mt-2 sm:mt-0"
                >
                  بحث
                </motion.button>
              </div>
              <input
                type="text"
                name="employeeName"
                placeholder="اسم الموظف"
                value={formData.employeeName}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none text-right text-sm sm:text-base bg-gray-100"
                readOnly
              />
              <input
                type="text"
                name="department"
                placeholder="القسم"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none text-right text-sm sm:text-base bg-gray-100"
                readOnly
              />
              <input
                type="number"
                name="violationPrice"
                placeholder="سعر المخالفة"
                value={formData.violationPrice}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-right text-sm sm:text-base"
                required
              />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-right text-sm sm:text-base"
                required
              />
              <input
                type="text"
                name="vehicleCode"
                placeholder="كود العربية"
                value={formData.vehicleCode}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-right text-sm sm:text-base"
                required
              />
              <input
                type="text"
                name="station"
                placeholder="المحطة"
                value={formData.station}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-right text-sm sm:text-base"
                required
              />
              <input
                type="file"
                name="violationImage"
                onChange={handleFileChange}
                accept="image/*"
                className="w-full p-2 border border-gray-300 rounded-lg text-right text-sm sm:text-base"
              />
              <motion.button
                type="submit"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm sm:text-base"
              >
                {editId ? 'حفظ التعديل' : 'إضافة مخالفة'}
              </motion.button>
              {editId && (
                <motion.button
                  type="button"
                  onClick={resetForm}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="w-full bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors duration-200 text-sm sm:text-base mt-2"
                >
                  إلغاء التعديل
                </motion.button>
              )}
            </form>
          </motion.div>
        )}
        {/* فلاتر البحث */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 border border-gray-200"
        >
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 text-right">بحث المخالفات</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {userRole !== 'employee' && (
              <input
                type="text"
                placeholder="بحث بكود أو اسم الموظف"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-right text-sm sm:text-base"
              />
            )}
            <input
              type="date"
              placeholder="من تاريخ"
              value={searchFromDate}
              onChange={(e) => setSearchFromDate(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-right text-sm sm:text-base"
            />
            <input
              type="date"
              placeholder="إلى تاريخ"
              value={searchToDate}
              onChange={(e) => setSearchToDate(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-right text-sm sm:text-base"
            />
            <motion.button
              onClick={handleSearch}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm sm:text-base col-span-1 sm:col-span-2 md:col-span-3"
            >
              بحث
            </motion.button>
          </div>
        </motion.div>
        {/* عرض المخالفات في جدول */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white rounded-lg shadow-md overflow-x-auto border border-gray-200"
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">كود الموظف</th>
                <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">اسم الموظف</th>
                <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">القسم</th>
                <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">سعر المخالفة</th>
                <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">التاريخ</th>
                <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">كود العربية</th>
                <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">المحطة</th>
                <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">الصورة</th>
                {['admin', 'gps'].includes(userRole) && (
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">إجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredViolations.map((violation) => (
                <motion.tr
                  key={violation._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-700 text-right">{violation.employeeCode}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-700 text-right">{violation.employeeName}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-700 text-right">{violation.department || 'غير محدد'}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-700 text-right">{violation.violationPrice}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-700 text-right">{new Date(violation.date).toLocaleDateString('ar-EG')}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-700 text-right">{violation.vehicleCode}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-700 text-right">{violation.station}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-700 text-right">
                    {violation.violationImage && (
                      <motion.img
                        src={`${process.env.REACT_APP_API_URL}${violation.violationImage}`}
                        alt="صورة المخالفة"
                        variants={imageVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover="hover"
                        className="w-10 h-10 object-cover rounded-md cursor-pointer"
                        onClick={() => handleImageClick(violation.violationImage)}
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                    )}
                  </td>
                  {['admin', 'gps'].includes(userRole) && (
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-700 text-right">
                      <div className="flex justify-end space-x-2 space-x-reverse">
                        <motion.button
                          onClick={() => handleEdit(violation)}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors duration-200 text-xs"
                        >
                          تعديل
                        </motion.button>
                        <motion.button
                          onClick={() => handleShowConfirmDialog(violation._id)}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors duration-200 text-xs"
                        >
                          حذف
                        </motion.button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
        {/* مودال تكبير الصورة */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-lg p-3"
                onClick={(e) => e.stopPropagation()}
              >
                {imageError ? (
                  <div className="flex flex-col items-center justify-center max-w-full max-h-[80vh]">
                    <img
                      src="/placeholder-image.jpg"
                      alt="صورة احتياطية"
                      className="max-w-full max-h-[75vh] object-contain rounded-md"
                    />
                    <p className="text-red-500 text-xs mt-2">{imageError}</p>
                  </div>
                ) : (
                  <motion.img
                    src={`${process.env.REACT_APP_API_URL}${selectedImage}`}
                    alt="صورة المخالفة"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="max-w-full max-h-[80vh] object-contain rounded-md"
                    onError={handleImageError}
                  />
                )}
                <motion.button
                  onClick={handleCloseModal}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-base hover:bg-red-600 transition-colors duration-200"
                >
                  ×
                </motion.button>
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
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-white p-4 rounded-lg shadow-md text-right max-w-xs w-full"
              >
                <h3 className="text-base font-semibold text-gray-800 mb-3">تأكيد الحذف</h3>
                <p className="text-gray-600 mb-4 text-xs">هل أنت متأكد أنك تريد حذف هذه المخالفة؟</p>
                <div className="flex justify-end space-x-2 space-x-reverse">
                  <motion.button
                    onClick={handleDelete}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors duration-200 text-xs"
                  >
                    حذف
                  </motion.button>
                  <motion.button
                    onClick={handleCancelDelete}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 transition-colors duration-200 text-xs"
                  >
                    إلغاء
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* نافذة النجاح */}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <div className="bg-white p-4 rounded-full shadow-md">
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
