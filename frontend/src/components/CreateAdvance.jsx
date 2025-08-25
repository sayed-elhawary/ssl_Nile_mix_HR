import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-20 w-20"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.7, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-500"
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

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, transition: { duration: 0.4, ease: 'easeInOut' } }}
    exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <motion.div
      className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-3 text-purple-500 text-base font-medium">جارٍ التحميل...</span>
  </motion.div>
);

const AdvanceIcon = () => (
  <div className="h-10 w-10 text-purple-500">
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
    advanceDate: '',
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
    advanceDate: '',
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
        toast.error(response.data.message || 'فشل جلب السلف');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء جلب السلف');
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
      'تاريخ السلفة': advance.advanceDate,
      'عدد الأشهر': advance.installmentMonths,
      'القسط الشهري': advance.monthlyInstallment.toFixed(2),
      'المبلغ المتبقي': advance.remainingAmount,
      'تاريخ السداد النهائي': advance.finalRepaymentDate,
      'الحالة': advance.status === 'active' ? 'نشط' : 'مكتمل',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Advances');
    XLSX.writeFile(wb, `advances_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const searchEmployee = async () => {
    if (!formData.employeeCode) {
      setEmployeeFound(null);
      setFormData((prev) => ({ ...prev, employeeName: '' }));
      toast.error('يرجى إدخال كود الموظف');
      return;
    }
    setLoading(true);
    const sanitizedEmployeeCode = String(formData.employeeCode).trim();
    try {
      console.log('Sending request to search employee with code:', sanitizedEmployeeCode);
      console.log('API URL:', `${process.env.REACT_APP_API_URL}/api/advance/search-employee`);
      console.log('Token:', localStorage.getItem('token'));
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/advance/search-employee`, {
        params: { employeeCode: sanitizedEmployeeCode },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      console.log('API Response:', response.data);
      if (response.data.success && response.data.employee && response.data.employee.name) {
        setEmployeeFound(response.data.employee);
        setFormData((prev) => ({ ...prev, employeeName: response.data.employee.name }));
        toast.success(`تم العثور على الموظف: ${response.data.employee.name}`);
      } else {
        setEmployeeFound(null);
        setFormData((prev) => ({ ...prev, employeeName: '' }));
        toast.error(response.data.message || 'لم يتم العثور على الموظف');
      }
    } catch (err) {
      console.error('Error in searchEmployee:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        employeeCode: sanitizedEmployeeCode,
      });
      setEmployeeFound(null);
      setFormData((prev) => ({ ...prev, employeeName: '' }));
      const errorMessage = err.response?.data?.message || 'حدث خطأ أثناء البحث عن الموظف';
      toast.error(errorMessage);
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
      toast.error('يرجى البحث عن موظف صالح أولاً');
      return;
    }
    if (!formData.advanceAmount || !formData.advanceDate || !formData.installmentMonths) {
      toast.error('جميع الحقول مطلوبة');
      return;
    }
    if (parseFloat(formData.advanceAmount) <= 0 || parseInt(formData.installmentMonths) <= 0) {
      toast.error('قيمة السلفة وعدد الأشهر يجب أن تكون قيم إيجابية');
      return;
    }
    setLoading(true);
    try {
      console.log('Submitting advance with data:', formData);
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/advance/create`,
        {
          ...formData,
          monthlyInstallment: parseFloat(formData.advanceAmount) / parseInt(formData.installmentMonths),
          remainingAmount: formData.advanceAmount,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      console.log('Create Advance Response:', response.data);
      if (response.data.success || response.status === 204) {
        setShowSuccessAnimation(true);
        toast.success('تم تسجيل السلفة بنجاح');
        setTimeout(() => {
          setShowSuccessAnimation(false);
          setFormData({
            employeeCode: '',
            employeeName: '',
            advanceAmount: '',
            advanceDate: '',
            installmentMonths: '',
          });
          setEmployeeFound(null);
          fetchAdvances();
        }, 1200);
      } else {
        toast.error(response.data.message || 'فشل تسجيل السلفة');
      }
    } catch (err) {
      console.error('Error in handleSubmit:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء تسجيل السلفة');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (advance) => {
    setEditFormData({
      id: advance._id,
      advanceAmount: advance.advanceAmount,
      advanceDate: advance.advanceDate,
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
      toast.error('جميع الحقول مطلوبة');
      return;
    }
    if (parseFloat(editFormData.advanceAmount) <= 0 || parseInt(editFormData.installmentMonths) <= 0) {
      toast.error('قيمة السلفة وعدد الأشهر يجب أن تكون قيم إيجابية');
      return;
    }
    setLoading(true);
    try {
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
        toast.success('تم تعديل السلفة بنجاح');
        setEditModalOpen(false);
        fetchAdvances();
      } else {
        toast.error(response.data.message || 'فشل تعديل السلفة');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء تعديل السلفة');
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
        toast.success('تم حذف السلفة بنجاح');
        fetchAdvances();
      } else {
        toast.error(response.data.message || 'فشل حذف السلفة');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء حذف السلفة');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-500 to-indigo-600 p-4 sm:p-6 lg:p-8 font-noto-sans-arabic dir=rtl overflow-auto relative">
      {/* Dynamic Background Animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-blue-500/30 to-indigo-600/30"
        animate={{
          background: [
            'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3), rgba(79, 70, 229, 0.3))',
            'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(59, 130, 246, 0.4), rgba(79, 70, 229, 0.4))',
            'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3), rgba(79, 70, 229, 0.3))',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      <div className="container mx-auto max-w-7xl relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-8 sm:mb-10 text-right tracking-tight drop-shadow-lg"
        >
          إنشاء سلفة
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 }}
          className="bg-white/90 backdrop-blur-lg p-6 sm:p-8 lg:p-10 rounded-3xl shadow-2xl border border-purple-200/30"
        >
          <div className="flex items-center space-x-4 space-x-reverse mb-6">
            <AdvanceIcon />
            <h3 className="text-xl sm:text-2xl font-bold text-purple-900">تسجيل سلفة جديدة</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mb-6">
            <input
              type="text"
              name="employeeCode"
              value={formData.employeeCode}
              onChange={handleInputChange}
              placeholder="كود الموظف"
              className="flex-1 p-3 border border-purple-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
            />
            <button
              onClick={searchEmployee}
              disabled={loading}
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 disabled:bg-purple-400 shadow-md hover:shadow-lg"
            >
              بحث
            </button>
            <button
              onClick={() => {
                setFormData({
                  employeeCode: '',
                  employeeName: '',
                  advanceAmount: '',
                  advanceDate: '',
                  installmentMonths: '',
                });
                setEmployeeFound(null);
                toast.info('تم إعادة تعيين النموذج');
              }}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              إعادة تعيين
            </button>
          </div>
          {employeeFound && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-600 mb-6 text-right font-medium"
            >
              تم العثور على الموظف: {employeeFound.name}
            </motion.p>
          )}
          {!employeeFound && formData.employeeCode && !loading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-600 mb-6 text-right font-medium"
            >
              لم يتم العثور على موظف بهذا الكود
            </motion.p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              name="employeeName"
              value={formData.employeeName}
              placeholder="اسم الموظف"
              disabled
              className="p-3 border border-purple-300/50 rounded-lg focus:outline-none text-right bg-gray-100/50 backdrop-blur-sm shadow-sm"
            />
            <input
              type="number"
              name="advanceAmount"
              value={formData.advanceAmount}
              onChange={handleInputChange}
              placeholder="قيمة السلفة"
              className="p-3 border border-purple-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
            />
            <input
              type="date"
              name="advanceDate"
              value={formData.advanceDate}
              onChange={handleInputChange}
              placeholder="تاريخ السلفة"
              className="p-3 border border-purple-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
            />
            <input
              type="number"
              name="installmentMonths"
              value={formData.installmentMonths}
              onChange={handleInputChange}
              placeholder="عدد الأشهر"
              className="p-3 border border-purple-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !employeeFound}
            className="mt-6 w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 disabled:bg-purple-400 shadow-md hover:shadow-lg"
          >
            تسجيل السلفة
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 }}
          className="bg-white/90 backdrop-blur-lg p-6 sm:p-8 lg:p-10 rounded-3xl shadow-2xl border border-purple-200/30 mt-8"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-purple-900 mb-6 text-right">قائمة السلف</h3>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mb-6">
            <button
              onClick={exportToExcel}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              تصدير إلى Excel
            </button>
            <div className="flex items-center space-x-4 space-x-reverse">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filterActive}
                  onChange={(e) => setFilterActive(e.target.checked)}
                  className="mr-2 h-5 w-5 text-purple-500 focus:ring-purple-500 border-gray-300 rounded"
                />
                نشط
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filterCompleted}
                  onChange={(e) => setFilterCompleted(e.target.checked)}
                  className="mr-2 h-5 w-5 text-purple-500 focus:ring-purple-500 border-gray-300 rounded"
                />
                مكتمل
              </label>
            </div>
            <input
              type="text"
              value={searchEmployeeCode}
              onChange={(e) => setSearchEmployeeCode(e.target.value)}
              placeholder="بحث بكود الموظف"
              className="flex-1 p-3 border border-purple-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>
          {filteredAdvances.length === 0 ? (
            <p className="text-gray-600 text-right">لا توجد سلف مسجلة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-separate border-spacing-y-2">
                <thead>
                  <tr className="bg-purple-100/50 text-purple-900">
                    <th className="p-4 rounded-lg">كود الموظف</th>
                    <th className="p-4 rounded-lg">اسم الموظف</th>
                    <th className="p-4 rounded-lg">قيمة السلفة</th>
                    <th className="p-4 rounded-lg">تاريخ السلفة</th>
                    <th className="p-4 rounded-lg">عدد الأشهر</th>
                    <th className="p-4 rounded-lg">القسط الشهري</th>
                    <th className="p-4 rounded-lg">المبلغ المتبقي</th>
                    <th className="p-4 rounded-lg">تاريخ السداد النهائي</th>
                    <th className="p-4 rounded-lg">الحالة</th>
                    <th className="p-4 rounded-lg">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdvances.map((advance) => (
                    <tr
                      key={advance._id}
                      className={`hover:bg-purple-100/30 transition-all duration-200 rounded-lg ${
                        advance.status === 'active' ? 'bg-green-50/70' : 'bg-gray-50/70'
                      }`}
                    >
                      <td className="p-4 border-b border-purple-200/30">{advance.employeeCode}</td>
                      <td className="p-4 border-b border-purple-200/30">{advance.employeeName}</td>
                      <td className="p-4 border-b border-purple-200/30">{advance.advanceAmount}</td>
                      <td className="p-4 border-b border-purple-200/30">{advance.advanceDate}</td>
                      <td className="p-4 border-b border-purple-200/30">{advance.installmentMonths}</td>
                      <td className="p-4 border-b border-purple-200/30">{advance.monthlyInstallment.toFixed(2)}</td>
                      <td className="p-4 border-b border-purple-200/30">{advance.remainingAmount}</td>
                      <td className="p-4 border-b border-purple-200/30">{advance.finalRepaymentDate}</td>
                      <td className="p-4 border-b border-purple-200/30">{advance.status === 'active' ? 'نشط' : 'مكتمل'}</td>
                      <td className="p-4 border-b border-purple-200/30 flex space-x-2 space-x-reverse">
                        <button
                          onClick={() => openEditModal(advance)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 shadow-sm hover:shadow-md"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(advance._id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 shadow-sm hover:shadow-md"
                        >
                          حذف
                        </button>
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
              className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white/90 backdrop-blur-lg p-6 sm:p-8 rounded-3xl shadow-2xl max-w-lg w-full border border-purple-200/30"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-purple-900 mb-6 text-right">تعديل السلفة</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="number"
                    name="advanceAmount"
                    value={editFormData.advanceAmount}
                    onChange={handleEditInputChange}
                    placeholder="قيمة السلفة"
                    className="p-3 border border-purple-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                  <input
                    type="date"
                    name="advanceDate"
                    value={editFormData.advanceDate}
                    onChange={handleEditInputChange}
                    placeholder="تاريخ السلفة"
                    className="p-3 border border-purple-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                  <input
                    type="number"
                    name="installmentMonths"
                    value={editFormData.installmentMonths}
                    onChange={handleEditInputChange}
                    placeholder="عدد الأشهر"
                    className="p-3 border border-purple-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                    className="p-3 border border-purple-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <option value="active">نشط</option>
                    <option value="completed">مكتمل</option>
                  </select>
                </div>
                <div className="flex justify-between mt-6 space-x-4 space-x-reverse">
                  <button
                    onClick={handleEditSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 disabled:bg-purple-400 shadow-md hover:shadow-lg"
                  >
                    حفظ التعديلات
                  </button>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    إلغاء
                  </button>
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
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 } }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.4, ease: 'easeInOut' } }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <div className="bg-white/90 backdrop-blur-lg p-8 rounded-full shadow-2xl border border-purple-200/30">
                <CustomCheckIcon />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
      </div>
    </div>
  );
}

export default CreateAdvance;
