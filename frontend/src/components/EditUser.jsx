import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Percent, DollarSign, Utensils, Shield, Briefcase, Calendar, Edit2, Trash2 } from 'lucide-react';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12 sm:h-16 sm:w-16"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.6, ease: 'easeInOut', type: 'spring', stiffness: 150, damping: 12 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      initial={{ pathLength: 0, rotate: -45 }}
      animate={{ pathLength: 1, rotate: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </motion.svg>
    <motion.div
      className="absolute inset-0 rounded-full bg-purple-100 opacity-40"
      initial={{ scale: 0 }}
      animate={{ scale: 1.8, opacity: 0, transition: { duration: 1.2, ease: 'easeOut' } }}
    />
  </motion.div>
);

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeIn' } }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.4, ease: 'easeOut' } }}
  >
    <motion.div
      className="h-8 w-8 sm:h-10 sm:w-10 border-4 border-purple-600 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-2 sm:mr-3 text-purple-600 text-xs sm:text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

function EditUser() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [excludedUsers, setExcludedUsers] = useState([]);
  const [modal, setModal] = useState({
    isOpen: false,
    type: '',
    userId: null,
    formData: {
      totalSalaryWithAllowances: '',
      basicSalary: '',
      bonusPercentage: '',
      basicBonus: '',
      mealAllowance: '',
      medicalInsurance: '',
      socialInsurance: '',
      annualLeaveBalance: '',
      percentageIncreaseTotal: '',
      percentageIncreaseBasic: '',
      password: '',
      netSalaryPreview: '',
    },
    applyToAll: false,
    selectedShift: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ isOpen: false, userId: null, userName: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/user`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!usersResponse.ok) {
          throw new Error(`فشل جلب الموظفين! حالة HTTP: ${usersResponse.status}`);
        }
        const usersData = await usersResponse.json();
        setUsers(usersData);
        setFilteredUsers(usersData);
      } catch (err) {
        console.error('خطأ في جلب الموظفين:', err);
        setError(`حدث خطأ أثناء جلب بيانات الموظفين: ${err.message}`);
      }
      try {
        const shiftsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/shift`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!shiftsResponse.ok) {
          console.warn(`فشل جلب الشيفتات! حالة HTTP: ${shiftsResponse.status}`);
          setError(`حدث خطأ في جلب الشيفتات: ${shiftsResponse.statusText || 'خطأ داخلي'}`);
          setShifts([]);
        } else {
          const shiftsData = await shiftsResponse.json();
          setShifts(shiftsData);
        }
      } catch (shiftErr) {
        console.warn('خطأ في جلب الشيفتات:', shiftErr.message);
        setError(`حدث خطأ في جلب الشيفتات: ${shiftErr.message}`);
        setShifts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = users;
    if (searchQuery) {
      result = result.filter(
        (user) =>
          user.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredUsers(result);
  }, [searchQuery, users]);

  const openModal = (type, userId = null, userData = {}) => {
    const netSalary = userData.totalSalaryWithAllowances != null
      ? (
          (parseFloat(userData.totalSalaryWithAllowances) || 0) +
          ((parseFloat(userData.basicBonus) || 0) * (parseFloat(userData.bonusPercentage) || 0) / 100) +
          (parseFloat(userData.mealAllowance) || 0) -
          (parseFloat(userData.medicalInsurance) || 0) -
          (parseFloat(userData.socialInsurance) || 0)
        ).toFixed(2)
      : '0.00';
    setModal({
      isOpen: true,
      type,
      userId,
      formData: {
        totalSalaryWithAllowances: userData.totalSalaryWithAllowances != null ? userData.totalSalaryWithAllowances.toString() : '',
        basicSalary: userData.basicSalary != null ? userData.basicSalary.toString() : '',
        bonusPercentage: userData.bonusPercentage != null ? userData.bonusPercentage.toString() : '',
        basicBonus: userData.basicBonus != null ? userData.basicBonus.toString() : '',
        mealAllowance: userData.mealAllowance != null ? userData.mealAllowance.toString() : '',
        medicalInsurance: userData.medicalInsurance != null ? userData.medicalInsurance.toString() : '',
        socialInsurance: userData.socialInsurance != null ? userData.socialInsurance.toString() : '',
        annualLeaveBalance: userData.annualLeaveBalance != null ? userData.annualLeaveBalance.toString() : '',
        percentageIncreaseTotal: '',
        percentageIncreaseBasic: '',
        password: '',
        netSalaryPreview: netSalary,
      },
      applyToAll: false,
      selectedShift: userData.shiftType?._id || '',
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: '',
      userId: null,
      formData: {
        totalSalaryWithAllowances: '',
        basicSalary: '',
        bonusPercentage: '',
        basicBonus: '',
        mealAllowance: '',
        medicalInsurance: '',
        socialInsurance: '',
        annualLeaveBalance: '',
        percentageIncreaseTotal: '',
        percentageIncreaseBasic: '',
        password: '',
        netSalaryPreview: '',
      },
      applyToAll: false,
      selectedShift: '',
    });
  };

  const openDeleteConfirm = (userId, userName) => {
    setShowDeleteConfirm({ isOpen: true, userId, userName });
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm({ isOpen: false, userId: null, userName: '' });
  };

  const handleExcludeToggle = (userId) => {
    setExcludedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const calculateNetSalaryPreview = () => {
    const { formData } = modal;
    const ts = parseFloat(formData.totalSalaryWithAllowances) || 0;
    const bb = parseFloat(formData.basicBonus) || 0;
    const bp = parseFloat(formData.bonusPercentage) || 0;
    const ma = parseFloat(formData.mealAllowance) || 0;
    const mi = parseFloat(formData.medicalInsurance) || 0;
    const si = parseFloat(formData.socialInsurance) || 0;
    const net = ts + (bb * bp / 100) + ma - mi - si;
    setModal({
      ...modal,
      formData: { ...modal.formData, netSalaryPreview: net.toFixed(2) },
    });
  };

  const handleUpdate = async () => {
    const { type, userId, formData, applyToAll, selectedShift } = modal;
    setLoading(true);
    setError('');
    try {
      const updates = {};
      const user = users.find((u) => u._id === userId);
      if (type === 'edit') {
        updates.totalSalaryWithAllowances = formData.totalSalaryWithAllowances ? parseFloat(formData.totalSalaryWithAllowances) : user?.totalSalaryWithAllowances || 0;
        updates.basicSalary = formData.basicSalary ? parseFloat(formData.basicSalary) : user?.basicSalary || 0;
        updates.bonusPercentage = formData.bonusPercentage ? parseFloat(formData.bonusPercentage) : user?.bonusPercentage || 0;
        updates.basicBonus = formData.basicBonus ? parseFloat(formData.basicBonus) : user?.basicBonus || 0;
        updates.mealAllowance = formData.mealAllowance ? parseFloat(formData.mealAllowance) : user?.mealAllowance || 0;
        updates.medicalInsurance = formData.medicalInsurance ? parseFloat(formData.medicalInsurance) : user?.medicalInsurance || 0;
        updates.socialInsurance = formData.socialInsurance ? parseFloat(formData.socialInsurance) : user?.socialInsurance || 0;
        updates.annualLeaveBalance = formData.annualLeaveBalance ? parseInt(formData.annualLeaveBalance) : user?.annualLeaveBalance || 0;
        updates.netSalary = parseFloat(
          (updates.totalSalaryWithAllowances || 0) +
          ((updates.basicBonus || 0) * (updates.bonusPercentage || 0) / 100) +
          (updates.mealAllowance || 0) -
          (updates.medicalInsurance || 0) -
          (updates.socialInsurance || 0)
        ).toFixed(2);
        if (formData.password) updates.password = formData.password;
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/update/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error(`فشل التحديث! حالة HTTP: ${response.status}`);
      } else if (type === 'percentageIncreaseTotal') {
        if (!formData.percentageIncreaseTotal || isNaN(formData.percentageIncreaseTotal) || formData.percentageIncreaseTotal < 0) {
          setError('يرجى إدخال نسبة زيادة على الراتب الإجمالي صحيحة');
          setLoading(false);
          return;
        }
        const percentage = parseFloat(formData.percentageIncreaseTotal);
        if (applyToAll) {
          await fetch(`${process.env.REACT_APP_API_URL}/api/user/update-many`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({
              annualIncreasePercentage: percentage,
              shiftType: selectedShift || undefined,
              excludedUsers,
            }),
          });
        } else if (userId) {
          const user = users.find((u) => u._id === userId);
          updates.totalSalaryWithAllowances = (user.totalSalaryWithAllowances || 0) * (1 + percentage / 100);
          updates.netSalary = parseFloat(
            updates.totalSalaryWithAllowances +
            ((user.basicBonus || 0) * (user.bonusPercentage || 0) / 100) +
            (user.mealAllowance || 0) -
            (user.medicalInsurance || 0) -
            (user.socialInsurance || 0)
          ).toFixed(2);
          await fetch(`${process.env.REACT_APP_API_URL}/api/user/update/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(updates),
          });
        }
      } else if (type === 'percentageIncreaseBasic') {
        if (!formData.percentageIncreaseBasic || isNaN(formData.percentageIncreaseBasic) || formData.percentageIncreaseBasic < 0) {
          setError('يرجى إدخال نسبة زيادة على الراتب الأساسي صحيحة');
          setLoading(false);
          return;
        }
        const percentage = parseFloat(formData.percentageIncreaseBasic);
        if (applyToAll) {
          await fetch(`${process.env.REACT_APP_API_URL}/api/user/update-many`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({
              basicIncreasePercentage: percentage,
              shiftType: selectedShift || undefined,
              excludedUsers,
            }),
          });
        } else if (userId) {
          const user = users.find((u) => u._id === userId);
          updates.basicSalary = (user.basicSalary || 0) * (1 + percentage / 100);
          await fetch(`${process.env.REACT_APP_API_URL}/api/user/update/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(updates),
          });
        }
      } else {
        updates[type] = type === 'annualLeaveBalance' ? parseInt(formData[type]) : parseFloat(formData[type]);
        if (['bonusPercentage', 'basicBonus', 'mealAllowance', 'medicalInsurance', 'socialInsurance'].includes(type)) {
          const user = users.find((u) => u._id === userId) || {};
          const ts = user.totalSalaryWithAllowances || 0;
          const bb = updates.basicBonus || user.basicBonus || 0;
          const bp = updates.bonusPercentage || user.bonusPercentage || 0;
          const ma = updates.mealAllowance || user.mealAllowance || 0;
          const mi = updates.medicalInsurance || user.medicalInsurance || 0;
          const si = updates.socialInsurance || user.socialInsurance || 0;
          updates.netSalary = parseFloat(ts + (bb * bp / 100) + ma - mi - si).toFixed(2);
        }
        if (!updates[type] || isNaN(updates[type]) || updates[type] < 0) {
          setError('يرجى إدخال قيمة صحيحة وغير سالبة');
          setLoading(false);
          return;
        }
        await fetch(`${process.env.REACT_APP_API_URL}/api/user/update-many`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            updates,
            shiftType: applyToAll ? selectedShift : undefined,
            excludedUsers: applyToAll ? excludedUsers : undefined,
          }),
        });
      }
      const usersResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/user`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!usersResponse.ok) {
        throw new Error(`فشل جلب الموظفين بعد التحديث! حالة HTTP: ${usersResponse.status}`);
      }
      const usersData = await usersResponse.json();
      setUsers(usersData);
      setFilteredUsers(usersData);
      setExcludedUsers([]);
      setSuccessMessage(type === 'edit' ? 'تم تعديل الموظف بنجاح' : 'تم تحديث البيانات بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setSuccessMessage('');
      }, 2000);
      closeModal();
    } catch (err) {
      console.error('خطأ في تحديث البيانات:', err);
      setError(`حدث خطأ أثناء التحديث: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const { userId } = showDeleteConfirm;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/delete/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) {
        throw new Error(`فشل حذف الموظف! حالة HTTP: ${response.status}`);
      }
      const usersResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/user`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!usersResponse.ok) {
        throw new Error(`فشل جلب الموظفين بعد الحذف! حالة HTTP: ${usersResponse.status}`);
      }
      const usersData = await usersResponse.json();
      setUsers(usersData);
      setFilteredUsers(usersData);
      setSuccessMessage('تم حذف الموظف بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setSuccessMessage('');
      }, 2000);
      closeDeleteConfirm();
    } catch (err) {
      console.error('خطأ في حذف الموظف:', err);
      setError(`حدث خطأ أثناء الحذف: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShiftChange = (e) => {
    const selectedShiftId = e.target.value;
    setModal({ ...modal, selectedShift: selectedShiftId });
    const selectedShift = shifts.find((shift) => shift._id === selectedShiftId);
    if (selectedShift) {
      const workDaysValue = Array.isArray(selectedShift.workDays)
        ? selectedShift.workDays.length
        : selectedShift.workDays || 30;
      setModal({ ...modal, formData: { ...modal.formData, workDays: workDaysValue.toString() } });
    } else {
      setModal({ ...modal, formData: { ...modal.formData, workDays: '' } });
    }
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 6px 25px rgba(139, 92, 246, 0.3)', transition: { duration: 0.3, ease: 'easeInOut' } },
    tap: { scale: 0.95, backgroundColor: '#A78BFA', transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-blue-100 p-2 sm:p-4 md:p-6 font-noto-sans-arabic relative overflow-hidden dir=rtl" style={{ scrollBehavior: 'smooth' }}>
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-md p-4 sm:p-6 border border-gray-100"
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 mb-4 sm:mb-6 text-right tracking-wide drop-shadow-sm">تعديل حساب</h2>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-red-100 text-red-700 p-2 sm:p-3 rounded-xl mb-4 sm:mb-6 text-right text-xs sm:text-sm font-semibold shadow-sm"
              >
                {error}
              </motion.div>
            )}
            {successMessage && !loading && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-purple-50 text-purple-600 p-2 sm:p-3 rounded-xl mb-4 sm:mb-6 text-right text-xs sm:text-sm font-semibold shadow-sm"
              >
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>
          {loading && (
            <div className="flex justify-center mb-4 sm:mb-6">
              <CustomLoadingSpinner />
            </div>
          )}
          {!loading && users.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <div className="relative max-w-full sm:max-w-md mx-auto">
                <Search className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بكود الموظف أو الاسم"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-8 sm:pr-10 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                  disabled={loading}
                />
              </div>
            </div>
          )}
          {!loading && users.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6 max-w-5xl mx-auto">
              {[
                { type: 'percentageIncreaseTotal', label: 'زيادة نسبة على الراتب الإجمالي', icon: Percent },
                { type: 'percentageIncreaseBasic', label: 'زيادة نسبة على الراتب الأساسي', icon: Percent },
                { type: 'bonusPercentage', label: 'نسبة الحافز', icon: Percent },
                { type: 'basicBonus', label: 'حافز أساسي', icon: DollarSign },
                { type: 'mealAllowance', label: 'بدل وجبة', icon: Utensils },
                { type: 'medicalInsurance', label: 'تأمين طبي', icon: Shield },
                { type: 'socialInsurance', label: 'تأمين اجتماعي', icon: Briefcase },
                { type: 'annualLeaveBalance', label: 'رصيد الإجازة', icon: Calendar },
              ].map(({ type, label, icon: Icon }) => (
                <motion.button
                  key={type}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => openModal(type)}
                  className="flex items-center justify-center space-x-2 space-x-reverse bg-purple-600 text-white px-2 sm:px-3 py-2 rounded-lg hover:bg-purple-700 transition-all duration-300 text-xs sm:text-sm font-semibold shadow-md w-full text-center"
                  disabled={loading}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="truncate">{label}</span>
                </motion.button>
              ))}
            </div>
          )}
          {!loading && users.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-x-auto lg:overflow-x-visible max-w-full">
              <table className="w-full text-right text-xs sm:text-sm table-auto">
                <thead>
                  <tr className="bg-purple-50">
                    <th className="p-2 sm:p-3 w-[4%] min-w-[40px] font-semibold text-purple-600">استثناء</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">كود الموظف</th>
                    <th className="p-2 sm:p-3 w-[9%] min-w-[70px] font-semibold text-purple-600">الاسم</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">القسم</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">الشيفت</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">الراتب الإجمالي</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">الراتب الأساسي</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">الحافز الأساسي</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">نسبة الحافز</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">بدل الوجبة</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">التأمين الطبي</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">التأمين الاجتماعي</th>
                    <th className="p-2 sm:p-3 w-[7%] min-w-[50px] font-semibold text-purple-600">رصيد الإجازة</th>
                    <th className="p-2 sm:p-3 w-[10%] min-w-[90px] font-semibold text-purple-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="border-b border-purple-100 hover:bg-purple-50"
                    >
                      <td className="p-2 sm:p-3">
                        <input
                          type="checkbox"
                          checked={excludedUsers.includes(user._id)}
                          onChange={() => handleExcludeToggle(user._id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 rounded"
                        />
                      </td>
                      <td className="p-2 sm:p-3">{user.employeeCode}</td>
                      <td className="p-2 sm:p-3">{user.name}</td>
                      <td className="p-2 sm:p-3">{user.department}</td>
                      <td className="p-2 sm:p-3">{user.shiftType?.shiftName || 'غير محدد'}</td>
                      <td className="p-2 sm:p-3">{(user.totalSalaryWithAllowances ?? 0).toFixed(2)}</td>
                      <td className="p-2 sm:p-3">{(user.basicSalary ?? 0).toFixed(2)}</td>
                      <td className="p-2 sm:p-3">{(user.basicBonus ?? 0).toFixed(2)}</td>
                      <td className="p-2 sm:p-3">{(user.bonusPercentage ?? 0).toFixed(2)}%</td>
                      <td className="p-2 sm:p-3">{(user.mealAllowance ?? 0).toFixed(2)}</td>
                      <td className="p-2 sm:p-3">{(user.medicalInsurance ?? 0).toFixed(2)}</td>
                      <td className="p-2 sm:p-3">{(user.socialInsurance ?? 0).toFixed(2)}</td>
                      <td className="p-2 sm:p-3">{user.annualLeaveBalance ?? 0}</td>
                      <td className="p-2 sm:p-3 flex space-x-1 space-x-reverse items-center">
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => openModal('edit', user._id, user)}
                          className="bg-purple-600 text-white px-1 sm:px-2 py-1 rounded-lg hover:bg-purple-700 transition-all duration-300 text-xs font-semibold shadow-sm flex-1 min-w-[40px]"
                        >
                          <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 inline-block ml-1" />
                          تعديل
                        </motion.button>
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => openDeleteConfirm(user._id, user.name)}
                          className="bg-red-600 text-white px-1 sm:px-2 py-1 rounded-lg hover:bg-red-700 transition-all duration-300 text-xs font-semibold shadow-sm flex-1 min-w-[40px]"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 inline-block ml-1" />
                          حذف
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && <div className="text-center text-purple-600 text-xs sm:text-sm font-semibold">لا توجد بيانات موظفين متاحة</div>
          )}
          <AnimatePresence>
            {modal.isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-[90vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-100"
                >
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-purple-600 mb-3 text-right">
                    {modal.type === 'edit' && 'تعديل بيانات الموظف'}
                    {modal.type === 'percentageIncreaseTotal' && 'زيادة نسبة على الراتب الإجمالي'}
                    {modal.type === 'percentageIncreaseBasic' && 'زيادة نسبة على الراتب الأساسي'}
                    {modal.type === 'bonusPercentage' && 'تعديل نسبة الحافز'}
                    {modal.type === 'basicBonus' && 'تعديل الحافز الأساسي'}
                    {modal.type === 'mealAllowance' && 'تعديل بدل الوجبة'}
                    {modal.type === 'medicalInsurance' && 'تعديل التأمين الطبي'}
                    {modal.type === 'socialInsurance' && 'تعديل التأمين الاجتماعي'}
                    {modal.type === 'annualLeaveBalance' && 'تعديل رصيد الإجازة'}
                  </h3>
                  {modal.type === 'edit' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">إجمالي الراتب بالبدلات</label>
                          <input
                            type="number"
                            value={modal.formData.totalSalaryWithAllowances}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, totalSalaryWithAllowances: e.target.value } })}
                            placeholder="أدخل إجمالي الراتب بالبدلات"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                            onBlur={calculateNetSalaryPreview}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">الراتب الأساسي</label>
                          <input
                            type="number"
                            value={modal.formData.basicSalary}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, basicSalary: e.target.value } })}
                            placeholder="أدخل الراتب الأساسي"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                            onBlur={calculateNetSalaryPreview}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">نسبة الحافز (%)</label>
                          <input
                            type="number"
                            value={modal.formData.bonusPercentage}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, bonusPercentage: e.target.value } })}
                            placeholder="أدخل نسبة الحافز"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                            onBlur={calculateNetSalaryPreview}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">الحافز الأساسي</label>
                          <input
                            type="number"
                            value={modal.formData.basicBonus}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, basicBonus: e.target.value } })}
                            placeholder="أدخل الحافز الأساسي"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                            onBlur={calculateNetSalaryPreview}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">بدل الوجبة</label>
                          <input
                            type="number"
                            value={modal.formData.mealAllowance}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, mealAllowance: e.target.value } })}
                            placeholder="أدخل بدل الوجبة"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                            onBlur={calculateNetSalaryPreview}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">التأمين الطبي</label>
                          <input
                            type="number"
                            value={modal.formData.medicalInsurance}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, medicalInsurance: e.target.value } })}
                            placeholder="أدخل التأمين الطبي"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                            onBlur={calculateNetSalaryPreview}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">التأمين الاجتماعي</label>
                          <input
                            type="number"
                            value={modal.formData.socialInsurance}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, socialInsurance: e.target.value } })}
                            placeholder="أدخل التأمين الاجتماعي"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                            onBlur={calculateNetSalaryPreview}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">رصيد الإجازة</label>
                          <input
                            type="number"
                            value={modal.formData.annualLeaveBalance}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, annualLeaveBalance: e.target.value } })}
                            placeholder="أدخل رصيد الإجازة"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">كلمة المرور الجديدة</label>
                          <input
                            type="password"
                            value={modal.formData.password}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, password: e.target.value } })}
                            placeholder="أدخل كلمة المرور الجديدة"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">نوع الشيفت</label>
                          <select
                            value={modal.selectedShift}
                            onChange={handleShiftChange}
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
                          >
                            <option value="">اختر الشيفت</option>
                            {shifts.map((shift) => (
                              <option key={shift._id} value={shift._id}>
                                {shift.shiftName} ({shift.shiftType === 'morning' ? 'صباحي' : shift.shiftType === 'evening' ? 'مسائي' : '24/24'})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">عدد أيام العمل</label>
                          <input
                            type="text"
                            value={modal.formData.workDays || ''}
                            readOnly
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm bg-gray-100 text-gray-600 shadow-sm"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">معاينة الراتب الصافي</label>
                          <input
                            type="text"
                            value={modal.formData.netSalaryPreview}
                            readOnly
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm bg-gray-100 text-gray-600 shadow-sm"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  ) : modal.type === 'percentageIncreaseTotal' ? (
                    <div className="space-y-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">نسبة الزيادة على الراتب الإجمالي (%)</label>
                      <input
                        type="number"
                        value={modal.formData.percentageIncreaseTotal}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, percentageIncreaseTotal: e.target.value } })}
                        placeholder="أدخل النسبة (%)"
                        className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                        disabled={loading}
                      />
                    </div>
                  ) : modal.type === 'percentageIncreaseBasic' ? (
                    <div className="space-y-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">نسبة الزيادة على الراتب الأساسي (%)</label>
                      <input
                        type="number"
                        value={modal.formData.percentageIncreaseBasic}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, percentageIncreaseBasic: e.target.value } })}
                        placeholder="أدخل النسبة (%)"
                        className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                        disabled={loading}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">
                        {modal.type === 'bonusPercentage' ? 'نسبة الحافز (%)' : 'القيمة'}
                      </label>
                      <input
                        type="number"
                        value={modal.formData[modal.type]}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, [modal.type]: e.target.value } })}
                        placeholder={modal.type === 'bonusPercentage' ? 'أدخل النسبة (%)' : 'أدخل القيمة'}
                        className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                        disabled={loading}
                        onBlur={modal.type !== 'annualLeaveBalance' ? calculateNetSalaryPreview : undefined}
                      />
                    </div>
                  )}
                  <div className="mt-3">
                    <label className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        checked={modal.applyToAll}
                        onChange={(e) => setModal({ ...modal, applyToAll: e.target.checked })}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 rounded"
                        disabled={loading}
                      />
                      <span className="text-xs sm:text-sm font-semibold text-gray-800">تطبيق على الجميع</span>
                    </label>
                  </div>
                  {modal.applyToAll && (
                    <select
                      value={modal.selectedShift}
                      onChange={handleShiftChange}
                      className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white mt-3 shadow-sm"
                      disabled={loading}
                    >
                      <option value="">كل الشيفتات</option>
                      {shifts.map((shift) => (
                        <option key={shift._id} value={shift._id}>
                          {shift.shiftName}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex flex-wrap justify-between space-x-4 space-x-reverse mt-4 gap-4">
                    {modal.type === 'edit' && (
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        type="button"
                        onClick={calculateNetSalaryPreview}
                        className="bg-blue-600 text-white px-2 sm:px-3 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 text-xs sm:text-sm font-semibold flex-1 min-w-[100px] shadow-sm"
                        disabled={loading}
                      >
                        حساب الإجمالي
                      </motion.button>
                    )}
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={handleUpdate}
                      className="bg-purple-600 text-white px-2 sm:px-3 py-2 rounded-lg hover:bg-purple-700 transition-all duration-300 text-xs sm:text-sm font-semibold flex-1 min-w-[100px] shadow-sm"
                      disabled={loading}
                    >
                      تأكيد
                    </motion.button>
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={closeModal}
                      className="bg-gray-200 text-gray-800 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-300 transition-all duration-300 text-xs sm:text-sm font-semibold flex-1 min-w-[100px] shadow-sm"
                      disabled={loading}
                    >
                      إلغاء
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showDeleteConfirm.isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-[90vw] sm:max-w-md border border-gray-100"
                >
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-purple-600 mb-3 text-right">تأكيد الحذف</h3>
                  <p className="text-right text-xs sm:text-sm text-gray-800 mb-4">
                    هل أنت متأكد من حذف الموظف <span className="font-semibold">{showDeleteConfirm.userName}</span>؟
                  </p>
                  <div className="flex justify-between space-x-2 sm:space-x-3 space-x-reverse gap-4">
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={handleDelete}
                      className="bg-red-600 text-white px-2 sm:px-3 py-2 rounded-lg hover:bg-red-700 transition-all duration-300 text-xs sm:text-sm font-semibold flex-1 shadow-sm"
                      disabled={loading}
                    >
                      حذف
                    </motion.button>
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={closeDeleteConfirm}
                      className="bg-gray-200 text-gray-800 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-300 transition-all duration-300 text-xs sm:text-sm font-semibold flex-1 shadow-sm"
                      disabled={loading}
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
                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
                exit={{ opacity: 0, scale: 0.5, rotate: 90, transition: { duration: 0.4, ease: 'easeIn' } }}
                className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50"
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

export default EditUser;
