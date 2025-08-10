import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Percent, DollarSign, Utensils, Shield, Briefcase, Calendar, Edit2, Trash2, CheckCircle } from 'lucide-react';

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
    },
    applyToAll: false,
    selectedShift: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false); // لتتبع حالة النجاح
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ isOpen: false, userId: null, userName: '' });

  // جلب الموظفين والشيفتات
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

  // البحث والفلترة
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

  // إظهار/إخفاء علامة الصح عند النجاح
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // فتح/إغلاق الـ Modal
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
      },
      applyToAll: false,
      selectedShift: '',
    });
  };

  // فتح/إغلاق تأكيد الحذف
  const openDeleteConfirm = (userId, userName) => {
    setShowDeleteConfirm({ isOpen: true, userId, userName });
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm({ isOpen: false, userId: null, userName: '' });
  };

  // التعامل مع الاستثناءات
  const handleExcludeToggle = (userId) => {
    setExcludedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // تحديث البيانات
  const handleUpdate = async () => {
    const { type, userId, formData, applyToAll, selectedShift } = modal;
    setLoading(true);
    try {
      const updates = {};
      if (type === 'annualIncrease') {
        if (!formData.annualIncreasePercentage || isNaN(formData.annualIncreasePercentage) || formData.annualIncreasePercentage < 0) {
          setError('يرجى إدخال نسبة زيادة سنوية صحيحة');
          return;
        }
      } else if (type === 'edit') {
        if (Object.values(formData).every((val) => !val)) {
          setError('يرجى إدخال قيمة واحدة على الأقل');
          return;
        }
        if (formData.basicSalary && (isNaN(formData.basicSalary) || formData.basicSalary < 0)) {
          setError('يرجى إدخال راتب أساسي صحيح');
          return;
        }
        if (formData.bonusPercentage && (isNaN(formData.bonusPercentage) || formData.bonusPercentage < 0)) {
          setError('يرجى إدخال نسبة حافز صحيحة');
          return;
        }
        if (formData.basicBonus && (isNaN(formData.basicBonus) || formData.basicBonus < 0)) {
          setError('يرجى إدخال حافز أساسي صحيح');
          return;
        }
        if (formData.mealAllowance && (isNaN(formData.mealAllowance) || formData.mealAllowance < 0)) {
          setError('يرجى إدخال بدل وجبة صحيح');
          return;
        }
        if (formData.medicalInsurance && (isNaN(formData.medicalInsurance) || formData.medicalInsurance < 0)) {
          setError('يرجى إدخال تأمين طبي صحيح');
          return;
        }
        if (formData.socialInsurance && (isNaN(formData.socialInsurance) || formData.socialInsurance < 0)) {
          setError('يرجى إدخال تأمين اجتماعي صحيح');
          return;
        }
        if (formData.annualLeaveBalance && (isNaN(formData.annualLeaveBalance) || formData.annualLeaveBalance < 0)) {
          setError('يرجى إدخال رصيد إجازة صحيح');
          return;
        }
        updates.basicSalary = formData.basicSalary ? parseFloat(formData.basicSalary) : undefined;
        updates.bonusPercentage = formData.bonusPercentage ? parseFloat(formData.bonusPercentage) : undefined;
        updates.basicBonus = formData.basicBonus ? parseFloat(formData.basicBonus) : undefined;
        updates.mealAllowance = formData.mealAllowance ? parseFloat(formData.mealAllowance) : undefined;
        updates.medicalInsurance = formData.medicalInsurance ? parseFloat(formData.medicalInsurance) : undefined;
        updates.socialInsurance = formData.socialInsurance ? parseFloat(formData.socialInsurance) : undefined;
        updates.annualLeaveBalance = formData.annualLeaveBalance ? parseInt(formData.annualLeaveBalance) : undefined;
        if (updates.basicSalary || updates.basicBonus || updates.mealAllowance) {
          const user = users.find((u) => u._id === userId);
          updates.netSalary = (updates.basicSalary || user?.basicSalary || 0) +
                             (updates.basicBonus || user?.basicBonus || 0) +
                             (updates.mealAllowance || user?.mealAllowance || 0);
        }
      } else {
        if (!formData[type] || isNaN(formData[type]) || formData[type] < 0) {
          setError('يرجى إدخال قيمة صحيحة وغير سالبة');
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

      // إعادة جلب البيانات
      const usersResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/user`);
      if (!usersResponse.ok) {
        throw new Error(`فشل جلب الموظفين بعد التحديث! حالة HTTP: ${usersResponse.status}`);
      }
      const usersData = await usersResponse.json();
      setUsers(usersData);
      setFilteredUsers(usersData);
      setExcludedUsers([]);
      setSuccess(true); // إظهار علامة الصح
      closeModal();
    } catch (err) {
      console.error('خطأ في تحديث البيانات:', err);
      setError(`حدث خطأ أثناء التحديث: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // حذف موظف
  const handleDelete = async () => {
    const { userId } = showDeleteConfirm;
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/delete/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`فشل حذف الموظف! حالة HTTP: ${response.status}`);
      }
      // إعادة جلب البيانات
      const usersResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/user`);
      if (!usersResponse.ok) {
        throw new Error(`فشل جلب الموظفين بعد الحذف! حالة HTTP: ${usersResponse.status}`);
      }
      const usersData = await usersResponse.json();
      setUsers(usersData);
      setFilteredUsers(usersData);
      setSuccess(true); // إظهار علامة الصح
      closeDeleteConfirm();
    } catch (err) {
      console.error('خطأ في حذف الموظف:', err);
      setError(`حدث خطأ أثناء الحذف: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 sm:p-6 font-noto-sans-arabic bg-pattern">
      <div className="container mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-purple-700 mb-6 text-right">تعديل حساب</h2>

        {/* رسالة الخطأ */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 text-right text-sm font-semibold shadow-sm"
          >
            {error}
          </motion.div>
        )}

        {/* علامة الصح عند النجاح */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
            >
              <CheckCircle className="h-16 w-16 text-green-500" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* مؤشر التحميل */}
        {loading && (
          <div className="text-center text-purple-700 mb-6">جاري التحميل...</div>
        )}

        {/* خانة البحث */}
        {!loading && users.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بكود الموظف أو الاسم"
                className="w-full px-4 py-3 pr-10 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50 hover:bg-purple-100"
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* أزرار التعديل */}
        {!loading && users.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal('annualIncrease')}
              className="flex items-center justify-center space-x-2 space-x-reverse bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold shadow-md"
              disabled={loading}
            >
              <Percent className="h-5 w-5" />
              <span>إضافة نسبة سنوية على الراتب الأساسي</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal('bonusPercentage')}
              className="flex items-center justify-center space-x-2 space-x-reverse bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold shadow-md"
              disabled={loading}
            >
              <Percent className="h-5 w-5" />
              <span>تعديل نسبة الحافز</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal('basicBonus')}
              className="flex items-center justify-center space-x-2 space-x-reverse bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold shadow-md"
              disabled={loading}
            >
              <DollarSign className="h-5 w-5" />
              <span>تعديل الحافز الأساسي</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal('mealAllowance')}
              className="flex items-center justify-center space-x-2 space-x-reverse bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold shadow-md"
              disabled={loading}
            >
              <Utensils className="h-5 w-5" />
              <span>تعديل بدل الوجبة</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal('medicalInsurance')}
              className="flex items-center justify-center space-x-2 space-x-reverse bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold shadow-md"
              disabled={loading}
            >
              <Shield className="h-5 w-5" />
              <span>تعديل التأمين الطبي</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal('socialInsurance')}
              className="flex items-center justify-center space-x-2 space-x-reverse bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold shadow-md"
              disabled={loading}
            >
              <Briefcase className="h-5 w-5" />
              <span>تعديل التأمين الاجتماعي</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal('annualLeaveBalance')}
              className="flex items-center justify-center space-x-2 space-x-reverse bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold shadow-md"
              disabled={loading}
            >
              <Calendar className="h-5 w-5" />
              <span>تعديل رصيد الإجازة</span>
            </motion.button>
          </div>
        )}

        {/* جدول الموظفين */}
        {!loading && users.length > 0 ? (
          <div className="bg-white rounded-xl shadow-md overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-purple-50">
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">استثناء</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">كود الموظف</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">الاسم</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">القسم</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">الشيفت</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">الراتب الأساسي</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">الحافز الأساسي</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">نسبة الحافز</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">بدل الوجبة</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">التأمين الطبي</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">التأمين الاجتماعي</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">رصيد الإجازة</th>
                  <th className="p-3 sm:p-4 font-semibold text-purple-700">إجراءات</th>
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
                    <td className="p-3 sm:p-4">
                      <input
                        type="checkbox"
                        checked={excludedUsers.includes(user._id)}
                        onChange={() => handleExcludeToggle(user._id)}
                        className="h-4 w-4 text-purple-600"
                      />
                    </td>
                    <td className="p-3 sm:p-4">{user.employeeCode}</td>
                    <td className="p-3 sm:p-4">{user.name}</td>
                    <td className="p-3 sm:p-4">{user.department}</td>
                    <td className="p-3 sm:p-4">{user.shiftType?.shiftName || 'غير محدد'}</td>
                    <td className="p-3 sm:p-4">{user.basicSalary.toFixed(2)}</td>
                    <td className="p-3 sm:p-4">{user.basicBonus.toFixed(2)}</td>
                    <td className="p-3 sm:p-4">{user.bonusPercentage.toFixed(2)}%</td>
                    <td className="p-3 sm:p-4">{user.mealAllowance.toFixed(2)}</td>
                    <td className="p-3 sm:p-4">{user.medicalInsurance.toFixed(2)}</td>
                    <td className="p-3 sm:p-4">{user.socialInsurance.toFixed(2)}</td>
                    <td className="p-3 sm:p-4">{user.annualLeaveBalance}</td>
                    <td className="p-3 sm:p-4 flex space-x-2 space-x-reverse">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openModal('edit', user._id, user)}
                        className="bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold"
                      >
                        <Edit2 className="h-4 w-4 inline-block ml-1" />
                        تعديل
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openDeleteConfirm(user._id, user.name)}
                        className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-all duration-300 text-sm font-semibold"
                      >
                        <Trash2 className="h-4 w-4 inline-block ml-1" />
                        حذف
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !loading && <div className="text-center text-purple-700">لا توجد بيانات موظفين متاحة</div>
        )}

        {/* Modal للتعديل */}
        <AnimatePresence>
          {modal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-white p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-lg"
              >
                <h3 className="text-xl sm:text-2xl font-semibold text-purple-700 mb-4 text-right">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 text-right">الراتب الأساسي</label>
                      <input
                        type="number"
                        value={modal.formData.basicSalary}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, basicSalary: e.target.value } })}
                        placeholder="أدخل الراتب الأساسي"
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 text-right">نسبة الحافز (%)</label>
                      <input
                        type="number"
                        value={modal.formData.bonusPercentage}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, bonusPercentage: e.target.value } })}
                        placeholder="أدخل نسبة الحافز"
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 text-right">الحافز الأساسي</label>
                      <input
                        type="number"
                        value={modal.formData.basicBonus}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, basicBonus: e.target.value } })}
                        placeholder="أدخل الحافز الأساسي"
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 text-right">بدل الوجبة</label>
                      <input
                        type="number"
                        value={modal.formData.mealAllowance}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, mealAllowance: e.target.value } })}
                        placeholder="أدخل بدل الوجبة"
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 text-right">التأمين الطبي</label>
                      <input
                        type="number"
                        value={modal.formData.medicalInsurance}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, medicalInsurance: e.target.value } })}
                        placeholder="أدخل التأمين الطبي"
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 text-right">التأمين الاجتماعي</label>
                      <input
                        type="number"
                        value={modal.formData.socialInsurance}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, socialInsurance: e.target.value } })}
                        placeholder="أدخل التأمين الاجتماعي"
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 text-right">رصيد الإجازة</label>
                      <input
                        type="number"
                        value={modal.formData.annualLeaveBalance}
                        onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, annualLeaveBalance: e.target.value } })}
                        placeholder="أدخل رصيد الإجازة"
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50"
                        disabled={loading}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 text-right">
                      {modal.type === 'annualIncrease' ? 'نسبة الزيادة السنوية (%)' : modal.type === 'bonusPercentage' ? 'نسبة الحافز (%)' : 'القيمة'}
                    </label>
                    <input
                      type="number"
                      value={modal.formData[modal.type === 'annualIncrease' ? 'annualIncreasePercentage' : modal.type]}
                      onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, [modal.type === 'annualIncrease' ? 'annualIncreasePercentage' : modal.type]: e.target.value } })}
                      placeholder={modal.type === 'bonusPercentage' || modal.type === 'annualIncrease' ? 'أدخل النسبة (%)' : 'أدخل القيمة'}
                      className="w-full px-4 py-3 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50"
                      disabled={loading}
                    />
                  </div>
                )}
                <div className="mt-4">
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={modal.applyToAll}
                      onChange={(e) => setModal({ ...modal, applyToAll: e.target.checked })}
                      className="h-5 w-5 text-purple-600"
                      disabled={loading}
                    />
                    <span className="text-sm font-semibold text-gray-700">تطبيق على الجميع</span>
                  </label>
                </div>
                {modal.applyToAll && (
                  <select
                    value={modal.selectedShift}
                    onChange={(e) => setModal({ ...modal, selectedShift: e.target.value })}
                    className="w-full px-4 py-3 border border-purple-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-purple-50 mt-4"
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
                <div className="flex justify-between space-x-4 space-x-reverse mt-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdate}
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-all duration-300 text-sm font-semibold"
                    disabled={loading}
                  >
                    تأكيد
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closeModal}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all duration-300 text-sm font-semibold"
                    disabled={loading}
                  >
                    إلغاء
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal لتأكيد الحذف */}
        <AnimatePresence>
          {showDeleteConfirm.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-white p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-md"
              >
                <h3 className="text-xl sm:text-2xl font-semibold text-purple-700 mb-4 text-right">
                  تأكيد الحذف
                </h3>
                <p className="text-right text-sm text-gray-700 mb-6">
                  هل أنت متأكد من حذف الموظف <span className="font-semibold">{showDeleteConfirm.userName}</span>؟
                </p>
                <div className="flex justify-between space-x-4 space-x-reverse">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-300 text-sm font-semibold"
                    disabled={loading}
                  >
                    حذف
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closeDeleteConfirm}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all duration-300 text-sm font-semibold"
                    disabled={loading}
                  >
                    إلغاء
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default EditUser;
