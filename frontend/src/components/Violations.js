import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AlertCircle, Search, Plus, Trash2, X } from 'lucide-react';

// الحصول على التاريخ الحالي بصيغة YYYY-MM
const getCurrentYearMonth = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12 bg-white p-4 rounded-full shadow-md"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.4, ease: 'easeInOut' } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeInOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1, transition: { duration: 0.4, ease: 'easeInOut' } }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </motion.svg>
  </motion.div>
);

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeInOut' } }}
    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: 'easeInOut' } }}
  >
    <motion.div
      className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-3 text-purple-600 text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
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
    date: getCurrentYearMonth(), // تعيين التاريخ الحالي كقيمة افتراضية
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
        response = await axios.get(`${process.env.REACT_APP_API_URL}/api/violations/employee`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
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
      date: violation.date ? violation.date.split('T')[0].substring(0, 7) : getCurrentYearMonth(), // استخدام التاريخ المحفوظ أو الحالي
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
      date: getCurrentYearMonth(), // إعادة تعيين التاريخ الحالي
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
      filtered = filtered.filter((v) => new Date(v.date).getFullYear() >= fromDate.getFullYear() && new Date(v.date).getMonth() >= fromDate.getMonth());
    }
    if (searchToDate) {
      const toDate = new Date(searchToDate);
      filtered = filtered.filter((v) => new Date(v.date).getFullYear() <= toDate.getFullYear() && new Date(v.date).getMonth() <= toDate.getMonth());
    }
    setFilteredViolations(filtered);
    setTimeout(() => setLoading(false), 300);
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeInOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.02, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', transition: { duration: 0.2, ease: 'easeInOut' } },
    tap: { scale: 0.98, transition: { duration: 0.2, ease: 'easeInOut' } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 sm:p-6 md:p-8 font-noto-sans-arabic dir=rtl" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeInOut', type: 'spring', stiffness: 100, damping: 15 }}
          className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200/50 backdrop-blur-sm"
        >
          <div className="flex justify-center mb-6">
            <img
              src="http://www.nilemix.com/wp-content/uploads/2016/05/logo.png"
              alt="NileMix Logo"
              className="h-16 sm:h-20"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 text-center tracking-tight">
            NileMix HR System - إدارة المخالفات
          </h2>
          <AnimatePresence>
            {errorMessage && !loading && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-xl mb-4 text-sm text-center shadow-sm"
              >
                {errorMessage}
              </motion.p>
            )}
            {successMessage && !loading && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="bg-purple-50 border border-purple-300 text-purple-700 p-3 rounded-xl mb-4 text-sm text-center shadow-sm"
              >
                {successMessage}
              </motion.p>
            )}
          </AnimatePresence>
          {loading && (
            <div className="flex justify-center mb-6">
              <CustomLoadingSpinner />
            </div>
          )}
          {['admin', 'gps'].includes(userRole) && (
            <motion.div
              variants={formVariants}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-xl border border-gray-200/50 p-4 sm:p-5 mb-6"
            >
              <div className="flex items-center space-x-3 space-x-reverse mb-4">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-800">تسجيل مخالفة</h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 sm:space-x-reverse">
                  <input
                    type="text"
                    name="employeeCode"
                    placeholder="كود الموظف"
                    value={formData.employeeCode}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                    required
                  />
                  <motion.button
                    type="button"
                    onClick={handleSearchEmployee}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="bg-purple-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm mt-2 sm:mt-0"
                  >
                    <Search className="h-5 w-5 inline-block ml-1" />
                    بحث
                  </motion.button>
                </div>
                <input
                  type="text"
                  name="employeeName"
                  placeholder="اسم الموظف"
                  value={formData.employeeName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 text-sm shadow-sm text-right"
                  readOnly
                />
                <input
                  type="text"
                  name="department"
                  placeholder="القسم"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 text-sm shadow-sm text-right"
                  readOnly
                />
                <input
                  type="number"
                  name="violationPrice"
                  placeholder="سعر المخالفة"
                  value={formData.violationPrice}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                  required
                />
                <input
                  type="month"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                  required
                />
                <input
                  type="text"
                  name="vehicleCode"
                  placeholder="كود العربية"
                  value={formData.vehicleCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                  required
                />
                <input
                  type="text"
                  name="station"
                  placeholder="المحطة"
                  value={formData.station}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                  required
                />
                <input
                  type="file"
                  name="violationImage"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-gray-600 text-sm shadow-sm text-right"
                />
                <motion.button
                  type="submit"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="w-full bg-purple-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm"
                >
                  <Plus className="h-5 w-5 inline-block ml-1" />
                  {editId ? 'حفظ التعديل' : 'إضافة مخالفة'}
                </motion.button>
                {editId && (
                  <motion.button
                    type="button"
                    onClick={resetForm}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="w-full bg-gray-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm mt-2"
                  >
                    إلغاء التعديل
                  </motion.button>
                )}
              </form>
            </motion.div>
          )}
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-xl border border-gray-200/50 p-4 sm:p-5 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-right">بحث المخالفات</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {userRole !== 'employee' && (
                <input
                  type="text"
                  placeholder="بحث بكود أو اسم الموظف"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                />
              )}
              <input
                type="month"
                placeholder="من تاريخ"
                value={searchFromDate}
                onChange={(e) => setSearchFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              />
              <input
                type="month"
                placeholder="إلى تاريخ"
                value={searchToDate}
                onChange={(e) => setSearchToDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              />
              <motion.button
                onClick={handleSearch}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="bg-purple-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm col-span-1 sm:col-span-2 md:col-span-3"
              >
                <Search className="h-5 w-5 inline-block ml-1" />
                بحث
              </motion.button>
            </div>
          </motion.div>
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-xl border border-gray-200/50 overflow-x-auto"
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">كود الموظف</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">اسم الموظف</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">القسم</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">سعر المخالفة</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">التاريخ</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">كود العربية</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">المحطة</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">الصورة</th>
                  {['admin', 'gps'].includes(userRole) && (
                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">إجراءات</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredViolations.map((violation) => (
                  <motion.tr
                    key={violation._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{violation.employeeCode}</td>
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{violation.employeeName}</td>
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{violation.department || 'غير محدد'}</td>
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{violation.violationPrice}</td>
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{new Date(violation.date).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit' })}</td>
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{violation.vehicleCode}</td>
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{violation.station}</td>
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">
                      {violation.violationImage && (
                        <img
                          src={`${process.env.REACT_APP_API_URL}${violation.violationImage}`}
                          alt="صورة المخالفة"
                          className="w-10 h-10 object-cover rounded-md cursor-pointer"
                          onClick={() => handleImageClick(violation.violationImage)}
                          onError={(e) => {
                            e.target.src = '/placeholder-image.jpg';
                          }}
                        />
                      )}
                    </td>
                    {['admin', 'gps'].includes(userRole) && (
                      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">
                        <div className="flex justify-end space-x-2 space-x-reverse">
                          <motion.button
                            onClick={() => handleEdit(violation)}
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            className="bg-purple-600 text-white px-3 py-1 rounded-xl transition-all duration-200 text-xs font-semibold shadow-sm"
                          >
                            تعديل
                          </motion.button>
                          <motion.button
                            onClick={() => handleShowConfirmDialog(violation._id)}
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            className="bg-red-600 text-white px-3 py-1 rounded-xl transition-all duration-200 text-xs font-semibold shadow-sm"
                          >
                            <Trash2 className="h-4 w-4 inline-block ml-1" />
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
          <AnimatePresence>
            {selectedImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4"
                onClick={handleCloseModal}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {imageError ? (
                    <div className="flex flex-col items-center justify-center max-w-full max-h-[80vh]">
                      <img
                        src="/placeholder-image.jpg"
                        alt="صورة احتياطية"
                        className="max-w-full max-h-[75vh] object-contain rounded-md"
                      />
                      <p className="text-red-600 text-xs mt-2">{imageError}</p>
                    </div>
                  ) : (
                    <img
                      src={`${process.env.REACT_APP_API_URL}${selectedImage}`}
                      alt="صورة المخالفة"
                      className="max-w-full max-h-[80vh] object-contain rounded-md"
                      onError={handleImageError}
                    />
                  )}
                  <motion.button
                    onClick={handleCloseModal}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold shadow-sm"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showConfirmDialog && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="bg-white p-4 rounded-xl shadow-md text-right max-w-xs w-full"
                >
                  <h3 className="text-base font-semibold text-gray-800 mb-3">تأكيد الحذف</h3>
                  <p className="text-gray-600 mb-4 text-xs">هل أنت متأكد أنك تريد حذف هذه المخالفة؟</p>
                  <div className="flex justify-end space-x-2 space-x-reverse">
                    <motion.button
                      onClick={handleDelete}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="bg-red-600 text-white px-3 py-1 rounded-xl transition-all duration-200 text-xs font-semibold shadow-sm"
                    >
                      <Trash2 className="h-4 w-4 inline-block ml-1" />
                      حذف
                    </motion.button>
                    <motion.button
                      onClick={handleCancelDelete}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="bg-gray-600 text-white px-3 py-1 rounded-xl transition-all duration-200 text-xs font-semibold shadow-sm"
                    >
                      إلغاء
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showSuccessAnimation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
              >
                <CustomCheckIcon />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default Violations;
