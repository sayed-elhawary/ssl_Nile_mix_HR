import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';
import { saveAs } from 'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/+esm';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'https://cdn.jsdelivr.net/npm/docx@7.8.2/+esm';

const CustomLoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center gap-2"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
  >
    <div className="h-8 w-8 border-4 border-purple-700 border-t-transparent rounded-full animate-spin" />
    <span className="text-purple-700 text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

const CustomCheckIcon = () => (
  <motion.svg
    className="h-16 w-16 text-green-500 drop-shadow-lg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    initial={{ scale: 0, opacity: 0, rotate: -45 }}
    animate={{ scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
    exit={{ scale: 0, opacity: 0, rotate: 45, transition: { duration: 0.3 } }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
  </motion.svg>
);

const MonthlyBonusReport = () => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employeeCode, setEmployeeCode] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [shifts, setShifts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [bindingValue, setBindingValue] = useState(0);
  const [productionValue, setProductionValue] = useState(0);
  const [monthYear, setMonthYear] = useState('');

  useEffect(() => {
    const fetchShifts = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/shifts`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setShifts(response.data);
        if (response.data.length === 0) {
          setError('لا توجد شيفتات متاحة في النظام');
        }
      } catch (error) {
        console.error('خطأ في جلب الشيفتات:', error);
        if (error.response) {
          if (error.response.status === 401) {
            setError('التوكن غير صالح أو انتهت صلاحيته، يرجى تسجيل الدخول مرة أخرى');
          } else if (error.response.status === 404) {
            setError('نقطة نهاية الشيفتات غير متاحة');
          } else {
            setError(error.response.data.message || 'حدث خطأ أثناء جلب الشيفتات');
          }
        } else {
          setError('فشل الاتصال بالخادم، تحقق من الاتصال بالإنترنت أو إعدادات الخادم');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/monthly-bonus-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { startDate, endDate, employeeCode, shiftId }
      });
      setReports(response.data);
      setSuccessMessage('تم جلب التقرير بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 1500);
      if (response.data.length === 0) {
        setError('لا توجد تقارير متاحة للمعايير المحددة');
      }
    } catch (error) {
      console.error('خطأ في جلب التقرير:', error);
      if (error.response) {
        if (error.response.status === 401) {
          setError('التوكن غير صالح أو انتهت صلاحيته، يرجى تسجيل الدخول مرة أخرى');
        } else if (error.response.status === 404) {
          setError('لا يوجد بيانات متاحة لهذا التقرير');
        } else {
          setError(error.response.data.message || 'حدث خطأ أثناء جلب التقرير');
        }
      } else {
        setError('فشل الاتصال بالخادم، تحقق من الاتصال بالإنترنت');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!startDate || !endDate) {
      setError('يرجى إدخال تاريخ البداية والنهاية');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }
    fetchReports();
  };

  const handleShowAll = () => {
    setEmployeeCode('');
    setShiftId('');
    fetchReports();
  };

  const handleEdit = (report) => {
    setSelectedEmployee(report);
    setBindingValue(report.bindingValue || 0);
    setProductionValue(report.productionValue || 0);
    setMonthYear(startDate.slice(0, 7));
    setShowModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/user/update-bonus-adjustment/${selectedEmployee.employeeCode}/${monthYear}`,
        { bindingValue, productionValue },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSuccessMessage('تم تعديل الحافز بنجاح');
      setShowModal(false);
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        fetchReports();
      }, 1000);
    } catch (error) {
      console.error('خطأ في تعديل الحافز:', error);
      if (error.response) {
        if (error.response.status === 401) {
          setError('التوكن غير صالح أو انتهت صلاحيته، يرجى تسجيل الدخول مرة أخرى');
        } else {
          setError(error.response.data.message || 'حدث خطأ أثناء تعديل الحافز');
        }
      } else {
        setError('فشل الاتصال بالخادم، تحقق من الاتصال بالإنترنت');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const headers = [
      'كود الموظف',
      'الاسم',
      'الحافز الأساسي',
      'اسم الشيفت',
      'نسبة الحافز',
      'أيام الحضور',
      'إجمالي الأيام المخصومة',
      'إجمالي الخصومات',
      'قيمة التربيط',
      'قيمة الإنتاج',
      'الصافي'
    ];

    const data = reports.map(report => ({
      'كود الموظف': report.employeeCode,
      'الاسم': report.name,
      'الحافز الأساسي': report.basicBonus,
      'اسم الشيفت': report.shiftType,
      'نسبة الحافز': `${report.bonusPercentage}%`,
      'أيام الحضور': report.totalAttendanceDays,
      'إجمالي الأيام المخصومة': report.totalDeductedDays,
      'إجمالي الخصومات': report.totalDeductions,
      'قيمة التربيط': report.bindingValue,
      'قيمة الإنتاج': report.productionValue,
      'الصافي': report.netBonus
    }));

    const totals = {
      'كود الموظف': 'الإجمالي',
      'الاسم': '',
      'الحافز الأساسي': reports.reduce((sum, report) => sum + (report.basicBonus || 0), 0),
      'اسم الشيفت': '',
      'نسبة الحافز': '',
      'أيام الحضور': reports.reduce((sum, report) => sum + (report.totalAttendanceDays || 0), 0),
      'إجمالي الأيام المخصومة': reports.reduce((sum, report) => sum + (report.totalDeductedDays || 0), 0),
      'إجمالي الخصومات': reports.reduce((sum, report) => sum + (report.totalDeductions || 0), 0),
      'قيمة التربيط': reports.reduce((sum, report) => sum + (report.bindingValue || 0), 0),
      'قيمة الإنتاج': reports.reduce((sum, report) => sum + (report.productionValue || 0), 0),
      'الصافي': reports.reduce((sum, report) => sum + (report.netBonus || 0), 0)
    };

    const dataWithTotals = [...data, totals];

    const worksheet = XLSX.utils.json_to_sheet(dataWithTotals, { header: headers });
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    worksheet['!rtl'] = true;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير الحافز الشهري');
    XLSX.writeFile(workbook, `تقرير_الحافز_الشهري_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToWord = async () => {
    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children: [
          new Paragraph({
            text: 'تقرير الحافز الشهري',
            heading: 'Heading1',
            alignment: 'right',
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'كود الموظف', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'الاسم', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'الحافز الأساسي', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'اسم الشيفت', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'نسبة الحافز', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'أيام الحضور', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'إجمالي الأيام المخصومة', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'إجمالي الخصومات', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'قيمة التربيط', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'قيمة الإنتاج', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'الصافي', alignment: 'right' })] }),
                ],
              }),
              ...reports.map(report => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: report.employeeCode, alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: report.name, alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: report.basicBonus.toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: report.shiftType, alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: `${report.bonusPercentage}%`, alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: report.totalAttendanceDays.toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: report.totalDeductedDays.toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: report.totalDeductions.toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: report.bindingValue.toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: report.productionValue.toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: report.netBonus.toString(), alignment: 'right' })] }),
                ],
              })),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'الإجمالي', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: '', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: reports.reduce((sum, report) => sum + (report.basicBonus || 0), 0).toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: '', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: '', alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: reports.reduce((sum, report) => sum + (report.totalAttendanceDays || 0), 0).toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: reports.reduce((sum, report) => sum + (report.totalDeductedDays || 0), 0).toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: reports.reduce((sum, report) => sum + (report.totalDeductions || 0), 0).toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: reports.reduce((sum, report) => sum + (report.bindingValue || 0), 0).toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: reports.reduce((sum, report) => sum + (report.productionValue || 0), 0).toString(), alignment: 'right' })] }),
                  new TableCell({ children: [new Paragraph({ text: reports.reduce((sum, report) => sum + (report.netBonus || 0), 0).toString(), alignment: 'right' })] }),
                ],
              }),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `تقرير_الحافز_الشهري_${format(new Date(), 'yyyy-MM-dd')}.docx`);
  };

  const formVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.1, boxShadow: '0 10px 20px rgba(139, 92, 246, 0.3)', transition: { duration: 0.3, ease: 'easeOut' } },
    tap: { scale: 0.95, transition: { duration: 0.2 } },
  };

  const tableVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut', staggerChildren: 0.15 } },
  };

  const tableRowVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 50 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 22 } },
    exit: { opacity: 0, scale: 0.85, y: 50, transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-indigo-600 to-blue-500 p-4 sm:p-6 md:p-8 font-noto-sans-arabic relative dir=rtl overflow-auto" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926')] bg-cover bg-center opacity-20 z-0"
      ></motion.div>
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto relative z-10 max-w-7xl bg-white/95 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border border-purple-200/50 backdrop-blur-lg"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold text-purple-900 mb-8 text-right tracking-tight drop-shadow-lg">
          تقرير الحافز الشهري
        </h2>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-xl mb-6 text-right text-sm shadow-lg"
            >
              {error}
            </motion.div>
          )}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-purple-100 border border-purple-400 text-purple-800 px-4 py-3 rounded-xl mb-6 text-right text-sm shadow-lg"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="bg-white/90 rounded-2xl shadow-xl p-6 border border-purple-200/50 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-gray-800 text-sm font-bold mb-2 text-right">من التاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-purple-50/70 text-sm shadow-md hover:shadow-lg"
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-bold mb-2 text-right">إلى التاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-purple-50/70 text-sm shadow-md hover:shadow-lg"
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-bold mb-2 text-right">كود الموظف</label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full p-3 border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-purple-50/70 text-sm shadow-md hover:shadow-lg"
              placeholder="أدخل كود الموظف"
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-bold mb-2 text-right">الشيفت</label>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="w-full p-3 border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-purple-50/70 text-sm shadow-md hover:shadow-lg"
              disabled={shifts.length === 0}
            >
              <option value="">جميع الشيفتات</option>
              {shifts.map((shift) => (
                <option key={shift._id} value={shift._id}>
                  {shift.shiftName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-4 flex-wrap">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleSearch}
              className="bg-purple-700 text-white px-6 py-3 rounded-xl hover:bg-purple-800 transition-all duration-300 font-bold text-sm shadow-lg hover:shadow-xl"
              disabled={loading}
            >
              {loading ? <CustomLoadingSpinner /> : 'بحث'}
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleShowAll}
              className="bg-gray-700 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all duration-300 font-bold text-sm shadow-lg hover:shadow-xl"
              disabled={loading}
            >
              عرض الكل
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={exportToExcel}
              className="bg-green-700 text-white px-6 py-3 rounded-xl hover:bg-green-800 transition-all duration-300 font-bold text-sm shadow-lg hover:shadow-xl"
              disabled={loading || reports.length === 0}
            >
              تصدير إلى Excel
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={exportToWord}
              className="bg-blue-700 text-white px-6 py-3 rounded-xl hover:bg-blue-800 transition-all duration-300 font-bold text-sm shadow-lg hover:shadow-xl"
              disabled={loading || reports.length === 0}
            >
              تصدير إلى Word
            </motion.button>
          </div>
        </div>
        <motion.div
          variants={tableVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/95 rounded-2xl shadow-xl p-6 border border-purple-200/50 backdrop-blur-sm mt-8 overflow-x-auto"
        >
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-8"
            >
              <CustomLoadingSpinner />
            </motion.div>
          )}
          {!loading && (
            <table className="min-w-full divide-y divide-purple-200">
              <thead className="bg-purple-100/70">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">كود الموظف</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">الاسم</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">الحافز الأساسي</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">اسم الشيفت</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">نسبة الحافز</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">أيام الحضور</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">إجمالي الأيام المخصومة</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">إجمالي الخصومات</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">قيمة التربيط</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">قيمة الإنتاج</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">الصافي</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">تعديل</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-purple-100">
                {reports.length === 0 && !error && (
                  <motion.tr variants={tableRowVariants}>
                    <td colSpan="12" className="px-4 py-4 text-center text-sm text-gray-600">
                      لا توجد بيانات لعرضها
                    </td>
                  </motion.tr>
                )}
                {reports.map((report) => (
                  <motion.tr key={report.employeeCode} variants={tableRowVariants} className="hover:bg-purple-50/50 transition-colors duration-200">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.employeeCode}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.basicBonus}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.shiftType}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.bonusPercentage}%</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.totalAttendanceDays}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.totalDeductedDays}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.totalDeductions}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.bindingValue}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.productionValue}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">{report.netBonus}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => handleEdit(report)}
                        className="bg-purple-700 text-white px-4 py-2 rounded-xl hover:bg-purple-800 transition-all duration-300 font-bold text-sm shadow-md hover:shadow-lg"
                      >
                        تعديل
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CustomCheckIcon />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white/95 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-purple-200/50 backdrop-blur-lg"
              >
                <h3 className="text-xl sm:text-2xl font-extrabold text-purple-900 mb-6 text-right tracking-tight drop-shadow-lg">تعديل الحافز</h3>
                <div className="mb-6">
                  <label className="block text-gray-800 text-sm font-bold mb-2 text-right">قيمة التربيط</label>
                  <input
                    type="number"
                    value={bindingValue}
                    onChange={(e) => setBindingValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-purple-50/70 text-sm shadow-md hover:shadow-lg"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-800 text-sm font-bold mb-2 text-right">قيمة الإنتاج</label>
                  <input
                    type="number"
                    value={productionValue}
                    onChange={(e) => setProductionValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-purple-50/70 text-sm shadow-md hover:shadow-lg"
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleSaveEdit}
                    className="bg-purple-700 text-white px-6 py-3 rounded-xl hover:bg-purple-800 transition-all duration-300 font-bold text-sm shadow-lg hover:shadow-xl"
                    disabled={loading}
                  >
                    {loading ? <CustomLoadingSpinner /> : 'حفظ'}
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setShowModal(false)}
                    className="bg-gray-700 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all duration-300 font-bold text-sm shadow-lg hover:shadow-xl"
                  >
                    إلغاء
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default MonthlyBonusReport;
