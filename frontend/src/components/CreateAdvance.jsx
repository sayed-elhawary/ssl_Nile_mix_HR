import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';

// الحصول على التاريخ الحالي بصيغة YYYY-MM
const getCurrentYearMonth = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // إضافة 1 لأن الأشهر تبدأ من 0
  return `${year}-${month}`;
};

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

const AdvanceIcon = () => (
  <div className="h-8 w-8 text-purple-600">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  </div>
);

function CreateAdvance() {
  const [formData, setFormData] = useState({
    employeeCode: '',
    employeeName: '',
    advanceAmount: '',
    advanceDate: getCurrentYearMonth(), // تعيين التاريخ الحالي كقيمة افتراضية
    installmentMonths: '',
  });
  const [loading, setLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [employeeFound, setEmployeeFound] = useState(null);
  const [advances, setAdvances] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    advanceAmount: '',
    advanceDate: getCurrentYearMonth(), // تعيين التاريخ الحالي كقيمة افتراضية
    installmentMonths: '',
    status: 'active',
  });
  const [filterActive, setFilterActive] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [searchEmployeeCode, setSearchEmployeeCode] = useState('');

  useEffect(() => {
    fetchAdvances();
  }, []);

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/advance/advances`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.data.success) {
        setAdvances(response.data.advances);
      } else {
        toast.error(response.data.message || 'فشل جلب السلف', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء جلب السلف', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const filteredAdvances = advances.filter((advance) => {
      const matchesStatus =
        (!filterActive && !filterCompleted) ||
        (filterActive && advance.status === 'active') ||
        (filterCompleted && advance.status === 'completed');
      const matchesEmployeeCode = searchEmployeeCode
        ? advance.employeeCode.toLowerCase().includes(searchEmployeeCode.toLowerCase())
        : true;
      return matchesStatus && matchesEmployeeCode;
    });
    const data = filteredAdvances.map((advance) => ({
      'كود الموظف': advance.employeeCode,
      'اسم الموظف': advance.employeeName,
      'قيمة السلفة': advance.advanceAmount,
      'تاريخ السلفة': advance.advanceDate.slice(0,7),
      'عدد الأشهر': advance.installmentMonths,
      'القسط الشهري': advance.monthlyInstallment.toFixed(2),
      'المبلغ المتبقي': advance.remainingAmount,
      'تاريخ السداد النهائي': advance.finalRepaymentDate.slice(0,7),
      'الحالة': advance.status === 'active' ? 'نشط' : 'مكتمل',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Advances');
    XLSX.writeFile(wb, `advances_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const searchEmployee = async () => {
    if (!formData.employeeCode) {
      setEmployeeFound(null);
      setFormData((prev) => ({ ...prev, employeeName: '' }));
      toast.error('يرجى إدخال كود الموظف', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
      return;
    }
    setLoading(true);
    const sanitizedEmployeeCode = String(formData.employeeCode).trim();
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/advance/search-employee`, {
        params: { employeeCode: sanitizedEmployeeCode },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.data.success && response.data.employee && response.data.employee.name) {
        setEmployeeFound(response.data.employee);
        setFormData((prev) => ({ ...prev, employeeName: response.data.employee.name }));
        toast.success(`تم العثور على الموظف: ${response.data.employee.name}`, {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: { backgroundColor: '#F3E8FF', color: '#6B46C1', fontFamily: 'Noto Sans Arabic' },
        });
      } else {
        setEmployeeFound(null);
        setFormData((prev) => ({ ...prev, employeeName: '' }));
        toast.error(response.data.message || 'لم يتم العثور على الموظف', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
        });
      }
    } catch (err) {
      setEmployeeFound(null);
      setFormData((prev) => ({ ...prev, employeeName: '' }));
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء البحث عن الموظف', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const trimmedValue = String(value).trim();
    setFormData({ ...formData, [name]: trimmedValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeFound) {
      toast.error('يرجى البحث عن موظف صالح أولاً', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
      return;
    }
    if (!formData.advanceAmount || !formData.advanceDate || !formData.installmentMonths) {
      toast.error('جميع الحقول مطلوبة', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
      return;
    }
    if (parseFloat(formData.advanceAmount) <= 0 || parseInt(formData.installmentMonths) <= 0) {
      toast.error('قيمة السلفة وعدد الأشهر يجب أن تكون قيم إيجابية', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
      return;
    }
    setLoading(true);
    try {
      const fullAdvanceDate = `${formData.advanceDate}-01`;
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/advance/create`,
        {
          ...formData,
          advanceDate: formData.advanceDate,
          monthlyInstallment: parseFloat(formData.advanceAmount) / parseInt(formData.installmentMonths),
          remainingAmount: formData.advanceAmount,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      if (response.data.success || response.status === 204) {
        setShowSuccessAnimation(true);
        toast.success('تم تسجيل السلفة بنجاح', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: { backgroundColor: '#F3E8FF', color: '#6B46C1', fontFamily: 'Noto Sans Arabic' },
        });
        setTimeout(() => {
          setShowSuccessAnimation(false);
          setFormData({
            employeeCode: '',
            employeeName: '',
            advanceAmount: '',
            advanceDate: getCurrentYearMonth(), // إعادة تعيين التاريخ الحالي
            installmentMonths: '',
          });
          setEmployeeFound(null);
          fetchAdvances();
        }, 1000);
      } else {
        toast.error(response.data.message || 'فشل تسجيل السلفة', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء تسجيل السلفة', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (advance) => {
    setEditFormData({
      id: advance._id,
      advanceAmount: advance.advanceAmount,
      advanceDate: advance.advanceDate ? advance.advanceDate.slice(0, 7) : getCurrentYearMonth(), // استخدام التاريخ المحفوظ أو الحالي
      installmentMonths: advance.installmentMonths,
      status: advance.status,
    });
    setEditModalOpen(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    const trimmedValue = String(value).trim();
    setEditFormData({ ...editFormData, [name]: trimmedValue });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.advanceAmount || !editFormData.advanceDate || !editFormData.installmentMonths || !editFormData.status) {
      toast.error('جميع الحقول مطلوبة', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
      return;
    }
    if (parseFloat(editFormData.advanceAmount) <= 0 || parseInt(editFormData.installmentMonths) <= 0) {
      toast.error('قيمة السلفة وعدد الأشهر يجب أن تكون قيم إيجابية', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
      return;
    }
    setLoading(true);
    try {
      const fullAdvanceDate = `${editFormData.advanceDate}-01`;
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/advance/update/${editFormData.id}`,
        {
          advanceAmount: editFormData.advanceAmount,
          advanceDate: editFormData.advanceDate,
          installmentMonths: editFormData.installmentMonths,
          status: editFormData.status,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      if (response.data.success) {
        toast.success('تم تعديل السلفة بنجاح', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: { backgroundColor: '#F3E8FF', color: '#6B46C1', fontFamily: 'Noto Sans Arabic' },
        });
        setEditModalOpen(false);
        fetchAdvances();
      } else {
        toast.error(response.data.message || 'فشل تعديل السلفة', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء تعديل السلفة', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه السلفة؟')) {
      return;
    }
    setLoading(true);
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/advance/delete/${id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      if (response.data.success) {
        toast.success('تم حذف السلفة بنجاح', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: { backgroundColor: '#F3E8FF', color: '#6B46C1', fontFamily: 'Noto Sans Arabic' },
        });
        fetchAdvances();
      } else {
        toast.error(response.data.message || 'فشل حذف السلفة', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء حذف السلفة', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontFamily: 'Noto Sans Arabic' },
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAdvances = advances.filter((advance) => {
    const matchesStatus =
      (!filterActive && !filterCompleted) ||
      (filterActive && advance.status === 'active') ||
      (filterCompleted && advance.status === 'completed');
    const matchesEmployeeCode = searchEmployeeCode
      ? advance.employeeCode.toLowerCase().includes(searchEmployeeCode.toLowerCase())
      : true;
    return matchesStatus && matchesEmployeeCode;
  });

  const formVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: 'easeOut', type: 'spring', stiffness: 150, damping: 18 } },
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#7C3AED',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    tap: { scale: 0.98, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 sm:p-6 md:p-8 font-noto-sans-arabic dir=rtl" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <div className="container mx-auto max-w-7xl">
        <motion.h2
          variants={formVariants}
          initial="hidden"
          animate="visible"
          className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 text-center tracking-tight"
        >
          NileMix HR System - إنشاء سلفة
        </motion.h2>
        <motion.div
          variants={formVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 border border-gray-200/50 backdrop-blur-sm"
        >
          <div className="flex justify-center mb-6">
            <img
              src="http://www.nilemix.com/wp-content/uploads/2016/05/logo.png"
              alt="NileMix Logo"
              className="h-16 sm:h-20"
            />
          </div>
          <div className="flex items-center space-x-4 space-x-reverse mb-6">
            <AdvanceIcon />
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">تسجيل سلفة جديدة</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mb-6">
            <input
              type="text"
              name="employeeCode"
              value={formData.employeeCode}
              onChange={handleInputChange}
              placeholder="أدخل كود الموظف"
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              disabled={loading}
            />
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={searchEmployee}
              disabled={loading}
              className="px-4 py-3 bg-purple-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md disabled:bg-purple-400"
            >
              بحث
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => {
                setFormData({
                  employeeCode: '',
                  employeeName: '',
                  advanceAmount: '',
                  advanceDate: getCurrentYearMonth(), // إعادة تعيين التاريخ الحالي
                  installmentMonths: '',
                });
                setEmployeeFound(null);
                toast.info('تم إعادة تعيين النموذج', {
                  position: 'top-right',
                  autoClose: 3000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  style: { backgroundColor: '#F3E8FF', color: '#6B46C1', fontFamily: 'Noto Sans Arabic' },
                });
              }}
              className="px-4 py-3 bg-gray-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md"
            >
              إعادة تعيين
            </motion.button>
          </div>
          <AnimatePresence>
            {employeeFound && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-purple-50 border border-purple-300 text-purple-700 p-3 rounded-xl mb-4 text-sm text-center shadow-sm"
              >
                تم العثور على الموظف: {employeeFound.name}
              </motion.p>
            )}
            {!employeeFound && formData.employeeCode && !loading && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-xl mb-4 text-sm text-center shadow-sm"
              >
                لم يتم العثور على موظف بهذا الكود
              </motion.p>
            )}
          </AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <input
              type="text"
              name="employeeName"
              value={formData.employeeName}
              placeholder="اسم الموظف"
              disabled
              className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
            />
            <input
              type="number"
              name="advanceAmount"
              value={formData.advanceAmount}
              onChange={handleInputChange}
              placeholder="قيمة السلفة"
              className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              disabled={loading}
            />
            <input
              type="month"
              name="advanceDate"
              value={formData.advanceDate}
              onChange={handleInputChange}
              placeholder="تاريخ السلفة (شهر وسنة)"
              className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              disabled={loading}
            />
            <input
              type="number"
              name="installmentMonths"
              value={formData.installmentMonths}
              onChange={handleInputChange}
              placeholder="عدد الأشهر"
              className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              disabled={loading}
            />
          </div>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleSubmit}
            disabled={loading || !employeeFound}
            className="w-full bg-purple-600 text-white py-3 rounded-xl transition-all duration-300 font-semibold text-sm shadow-md disabled:bg-purple-400"
          >
            {loading ? <CustomLoadingSpinner /> : 'تسجيل السلفة'}
          </motion.button>
        </motion.div>
        <motion.div
          variants={formVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 border border-gray-200/50 backdrop-blur-sm mt-8"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">قائمة السلف</h3>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mb-6">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={exportToExcel}
              className="px-4 py-3 bg-purple-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md"
            >
              تصدير إلى Excel
            </motion.button>
            <div className="flex items-center space-x-4 space-x-reverse">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filterActive}
                  onChange={(e) => setFilterActive(e.target.checked)}
                  className="mr-2 h-5 w-5 text-purple-600 focus:ring-purple-600 border-gray-300 rounded"
                />
                نشط
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filterCompleted}
                  onChange={(e) => setFilterCompleted(e.target.checked)}
                  className="mr-2 h-5 w-5 text-purple-600 focus:ring-purple-600 border-gray-300 rounded"
                />
                مكتمل
              </label>
            </div>
            <input
              type="text"
              value={searchEmployeeCode}
              onChange={(e) => setSearchEmployeeCode(e.target.value)}
              placeholder="بحث بكود الموظف"
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
            />
          </div>
          {filteredAdvances.length === 0 ? (
            <p className="text-gray-600 text-center">لا توجد سلف مسجلة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-separate border-spacing-y-2">
                <thead>
                  <tr className="bg-gray-50 text-gray-900">
                    <th className="p-4 rounded-xl">كود الموظف</th>
                    <th className="p-4 rounded-xl">اسم الموظف</th>
                    <th className="p-4 rounded-xl">قيمة السلفة</th>
                    <th className="p-4 rounded-xl">تاريخ السلفة</th>
                    <th className="p-4 rounded-xl">عدد الأشهر</th>
                    <th className="p-4 rounded-xl">القسط الشهري</th>
                    <th className="p-4 rounded-xl">المبلغ المتبقي</th>
                    <th className="p-4 rounded-xl">تاريخ السداد النهائي</th>
                    <th className="p-4 rounded-xl">الحالة</th>
                    <th className="p-4 rounded-xl">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdvances.map((advance) => (
                    <tr
                      key={advance._id}
                      className={`hover:bg-gray-50 transition-all duration-200 rounded-xl ${
                        advance.status === 'active' ? 'bg-purple-50/50' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="p-4 border-b border-gray-200">{advance.employeeCode}</td>
                      <td className="p-4 border-b border-gray-200">{advance.employeeName}</td>
                      <td className="p-4 border-b border-gray-200">{advance.advanceAmount}</td>
                      <td className="p-4 border-b border-gray-200">{advance.advanceDate.slice(0,7)}</td>
                      <td className="p-4 border-b border-gray-200">{advance.installmentMonths}</td>
                      <td className="p-4 border-b border-gray-200">{advance.monthlyInstallment.toFixed(2)}</td>
                      <td className="p-4 border-b border-gray-200">{advance.remainingAmount}</td>
                      <td className="p-4 border-b border-gray-200">{advance.finalRepaymentDate.slice(0,7)}</td>
                      <td className="p-4 border-b border-gray-200">{advance.status === 'active' ? 'نشط' : 'مكتمل'}</td>
                      <td className="p-4 border-b border-gray-200 flex space-x-2 space-x-reverse">
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => openEditModal(advance)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md"
                        >
                          تعديل
                        </motion.button>
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => handleDelete(advance._id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md"
                        >
                          حذف
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
        <AnimatePresence>
          {editModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <motion.div
                variants={formVariants}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full border border-gray-200/50 backdrop-blur-sm"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">تعديل السلفة</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="number"
                    name="advanceAmount"
                    value={editFormData.advanceAmount}
                    onChange={handleEditInputChange}
                    placeholder="قيمة السلفة"
                    className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                  />
                  <input
                    type="month"
                    name="advanceDate"
                    value={editFormData.advanceDate}
                    onChange={handleEditInputChange}
                    placeholder="تاريخ السلفة (شهر وسنة)"
                    className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                  />
                  <input
                    type="number"
                    name="installmentMonths"
                    value={editFormData.installmentMonths}
                    onChange={handleEditInputChange}
                    placeholder="عدد الأشهر"
                    className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                  />
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                    className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                  >
                    <option value="active">نشط</option>
                    <option value="completed">مكتمل</option>
                  </select>
                </div>
                <div className="flex justify-between mt-6 space-x-4 space-x-reverse">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleEditSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md disabled:bg-purple-400"
                  >
                    حفظ التعديلات
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setEditModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md"
                  >
                    إلغاء
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center mt-8"
          >
            <CustomLoadingSpinner />
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
              <CustomCheckIcon />
            </motion.div>
          )}
        </AnimatePresence>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
      </div>
    </div>
  );
}

export default CreateAdvance;
