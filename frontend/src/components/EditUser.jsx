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
      basicSalary: '',
      bonusPercentage: '',
      basicBonus: '',
      mealAllowance: '',
      medicalInsurance: '',
      socialInsurance: '',
      annualLeaveBalance: '',
      annualIncreasePercentage: '',
      password: '',
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
          headers: { 'Content-Type': 'application/json' },
        });
        if (!usersResponse.ok) {
          throw new Error(`فشل جلب الموظفين! حالة HTTP: ${usersResponse.status}`);
        }
        const usersData = await usersResponse.json();
        setUsers(usersData);
        setFilteredUsers(usersData);

        const shiftsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/shift`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!shiftsResponse.ok) {
          throw new Error(`فشل جلب الشيفتات! حالة HTTP: ${shiftsResponse.status}`);
        }
        const shiftsData = await shiftsResponse.json();
        setShifts(shiftsData);
      } catch (err) {
        console.error('خطأ في جلب البيانات:', err);
        setError(`حدث خطأ أثناء جلب البيانات: ${err.message}`);
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
    setModal({
      isOpen: true,
      type,
      userId,
      formData: {
        basicSalary: userData.basicSalary?.toString() || '',
        bonusPercentage: userData.bonusPercentage?.toString() || '',
        basicBonus: userData.basicBonus?.toString() || '',
        mealAllowance: userData.mealAllowance?.toString() || '',
        medicalInsurance: userData.medicalInsurance?.toString() || '',
        socialInsurance: userData.socialInsurance?.toString() || '',
        annualLeaveBalance: userData.annualLeaveBalance?.toString() || '',
        annualIncreasePercentage: '',
        password: '',
      },
      applyToAll: false,
      selectedShift: '',
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: '',
      userId: null,
      formData: {
        basicSalary: '',
        bonusPercentage: '',
        basicBonus: '',
        mealAllowance: '',
        medicalInsurance: '',
        socialInsurance: '',
        annualLeaveBalance: '',
        annualIncreasePercentage: '',
        password: '',
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

  const handleUpdate = async () => {
    const { type, userId, formData, applyToAll, selectedShift } = modal;
    setLoading(true);
    setError('');
    try {
      const updates = {};
      if (type === 'annualIncrease') {
        if (!formData.annualIncreasePercentage || isNaN(formData.annualIncreasePercentage) || formData.annualIncreasePercentage < 0) {
          setError('يرجى إدخال نسبة زيادة سنوية صحيحة');
          setLoading(false);
          return;
        }
      } else if (type === 'edit') {
        if (Object.values(formData).every((val) => !val)) {
          setError('يرجى إدخال قيمة واحدة على الأقل');
          setLoading(false);
          return;
        }
        if (formData.basicSalary && (isNaN(formData.basicSalary) || formData.basicSalary < 0)) {
          setError('يرجى إدخال راتب أساسي صحيح');
          setLoading(false);
          return;
        }
        if (formData.bonusPercentage && (isNaN(formData.bonusPercentage) || formData.bonusPercentage < 0)) {
          setError('يرجى إدخال نسبة حافز صحيحة');
          setLoading(false);
          return;
        }
        if (formData.basicBonus && (isNaN(formData.basicBonus) || formData.basicBonus < 0)) {
          setError('يرجى إدخال حافز أساسي صحيح');
          setLoading(false);
          return;
        }
        if (formData.mealAllowance && (isNaN(formData.mealAllowance) || formData.mealAllowance < 0)) {
          setError('يرجى إدخال بدل وجبة صحيح');
          setLoading(false);
          return;
        }
        if (formData.medicalInsurance && (isNaN(formData.medicalInsurance) || formData.medicalInsurance < 0)) {
          setError('يرجى إدخال تأمين طبي صحيح');
          setLoading(false);
          return;
        }
        if (formData.socialInsurance && (isNaN(formData.socialInsurance) || formData.socialInsurance < 0)) {
          setError('يرجى إدخال تأمين اجتماعي صحيح');
          setLoading(false);
          return;
        }
        if (formData.annualLeaveBalance && (isNaN(formData.annualLeaveBalance) || formData.annualLeaveBalance < 0)) {
          setError('يرجى إدخال رصيد إجازة صحيح');
          setLoading(false);
          return;
        }
        if (formData.password && formData.password.length < 6) {
          setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          setLoading(false);
          return;
        }
        updates.basicSalary = formData.basicSalary ? parseFloat(formData.basicSalary) : undefined;
        updates.bonusPercentage = formData.bonusPercentage ? parseFloat(formData.bonusPercentage) : undefined;
        updates.basicBonus = formData.basicBonus ? parseFloat(formData.basicBonus) : undefined;
        updates.mealAllowance = formData.mealAllowance ? parseFloat(formData.mealAllowance) : undefined;
        updates.medicalInsurance = formData.medicalInsurance ? parseFloat(formData.medicalInsurance) : undefined;
        updates.socialInsurance = formData.socialInsurance ? parseFloat(formData.socialInsurance) : undefined;
        updates.annualLeaveBalance = formData.annualLeaveBalance ? parseInt(formData.annualLeaveBalance) : undefined;
        updates.password = formData.password || undefined;
        if (updates.basicSalary || updates.basicBonus || updates.mealAllowance) {
          const user = users.find((u) => u._id === userId);
          updates.netSalary = (updates.basicSalary || user?.basicSalary || 0) +
                             (updates.basicBonus || user?.basicBonus || 0) +
                             (updates.mealAllowance || user?.mealAllowance || 0);
        }
      } else {
        if (!formData[type] || isNaN(formData[type]) || formData[type] < 0) {
          setError('يرجى إدخال قيمة صحيحة وغير سالبة');
          setLoading(false);
          return;
        }
        updates[type] = type === 'annualLeaveBalance' ? parseInt(formData[type]) : parseFloat(formData[type]);
        if (['basicSalary', 'basicBonus', 'mealAllowance'].includes(type)) {
          const user = users.find((u) => u._id === userId);
          updates.netSalary = (updates.basicSalary || user?.basicSalary || 0) +
                             (updates.basicBonus || user?.basicBonus || 0) +
                             (updates.mealAllowance || user?.mealAllowance || 0);
        }
      }

      if (applyToAll) {
        const percentage = type === 'annualIncrease' ? parseFloat(formData.annualIncreasePercentage) : null;
        await fetch(`${process.env.REACT_APP_API_URL}/api/user/update-many`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates,
            shiftType: selectedShift || undefined,
            excludedUsers,
            annualIncreasePercentage: percentage,
          }),
        });
      } else if (userId) {
        if (type === 'annualIncrease') {
          const user = users.find((u) => u._id === userId);
          const percentage = parseFloat(formData.annualIncreasePercentage);
          updates.basicSalary = user.basicSalary * (1 + percentage / 100);
          updates.netSalary = updates.basicSalary + (user.basicBonus || 0) + (user.mealAllowance || 0);
        }
        await fetch(`${process.env.REACT_APP_API_URL}/api/user/update/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      }

      const usersResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/user`);
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
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`فشل حذف الموظف! حالة HTTP: ${response.status}`);
      }
      const usersResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/user`);
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
                { type: 'annualIncrease', label: 'زيادة سنوية', icon: Percent },
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
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-x-auto lg:overflow-x-visible">
              <table className="w-full text-right text-xs sm:text-sm lg:text-base table-auto">
                <thead>
                  <tr className="bg-purple-50">
                    <th className="p-2 sm:p-3 lg:p-4 w-[5%] min-w-[50px] font-semibold text-purple-600">استثناء</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">كود الموظف</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[10%] min-w-[80px] font-semibold text-purple-600">الاسم</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">القسم</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">الشيفت</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">الراتب الأساسي</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">الحافز الأساسي</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">نسبة الحافز</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">بدل الوجبة</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">التأمين الطبي</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">التأمين الاجتماعي</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[8%] min-w-[60px] font-semibold text-purple-600">رصيد الإجازة</th>
                    <th className="p-2 sm:p-3 lg:p-4 w-[10%] min-w-[80px] font-semibold text-purple-600">إجراءات</th>
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
                      <td className="p-2 sm:p-3 lg:p-4">
                        <input
                          type="checkbox"
                          checked={excludedUsers.includes(user._id)}
                          onChange={() => handleExcludeToggle(user._id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 rounded"
                        />
                      </td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.employeeCode}</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.name}</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.department}</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.shiftType?.shiftName || 'غير محدد'}</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.basicSalary.toFixed(2)}</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.basicBonus.toFixed(2)}</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.bonusPercentage.toFixed(2)}%</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.mealAllowance.toFixed(2)}</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.medicalInsurance.toFixed(2)}</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.socialInsurance.toFixed(2)}</td>
                      <td className="p-2 sm:p-3 lg:p-4">{user.annualLeaveBalance}</td>
                      <td className="p-2 sm:p-3 lg:p-4 flex space-x-2 space-x-reverse">
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => openModal('edit', user._id, user)}
                          className="bg-purple-600 text-white px-2 sm:px-3 py-1 rounded-lg hover:bg-purple-700 transition-all duration-300 text-xs sm:text-sm font-semibold shadow-sm"
                        >
                          <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 inline-block ml-1" />
                          تعديل
                        </motion.button>
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => openDeleteConfirm(user._id, user.name)}
                          className="bg-red-600 text-white px-2 sm:px-3 py-1 rounded-lg hover:bg-red-700 transition-all duration-300 text-xs sm:text-sm font-semibold shadow-sm"
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
                  className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-y-auto border border-gray-100"
                >
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-purple-600 mb-3 text-right">
                    {modal.type === 'edit' && 'تعديل بيانات الموظف'}
                    {modal.type === 'annualIncrease' && 'إضافة نسبة سنوية على الراتب الأساسي'}
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
                          <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">الراتب الأساسي</label>
                          <input
                            type="number"
                            value={modal.formData.basicSalary}
                            onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, basicSalary: e.target.value } })}
                            placeholder="أدخل الراتب الأساسي"
                            className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                            disabled={loading}
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
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-800 text-right">
                        {modal.type === 'annualIncrease' ? 'نسبة الزيادة السنوية (%)' : modal.type === 'bonusPercentage' ? 'نسبة الحافز (%)' : 'القيمة'}
                      </label>
                      <input
                        type="number"
                        value={modal.formData[modal.type === 'annualIncrease' ? 'annualIncreasePercentage' : modal.type]}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, [modal.type === 'annualIncrease' ? 'annualIncreasePercentage' : modal.type]: e.target.value } })}
                        placeholder={modal.type === 'bonusPercentage' || modal.type === 'annualIncrease' ? 'أدخل النسبة (%)' : 'أدخل القيمة'}
                        className="w-full px-2 sm:px-3 py-2 border border-purple-200 rounded-lg text-right text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white shadow-sm"
                        disabled={loading}
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
                      onChange={(e) => setModal({ ...modal, selectedShift: e.target.value })}
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
                  <div className="flex justify-between space-x-2 sm:space-x-3 space-x-reverse mt-4">
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={handleUpdate}
                      className="bg-purple-600 text-white px-2 sm:px-3 py-2 rounded-lg hover:bg-purple-700 transition-all duration-300 text-xs sm:text-sm font-semibold flex-1 shadow-sm"
                      disabled={loading}
                    >
                      تأكيد
                    </motion.button>
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={closeModal}
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
                  <div className="flex justify-between space-x-2 sm:space-x-3 space-x-reverse">
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
