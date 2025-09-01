import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';
import { AlertCircle, Search, Pencil, Download, X } from 'lucide-react';

// Custom Check Icon
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

// Custom Loading Spinner
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

const ReportRow = memo(({ report, handleEdit, userRole }) => {
  const formatNumber = (num) => Number.isFinite(num) ? num.toFixed(2) : '0.00';
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="hover:bg-gray-100 transition-colors duration-200"
    >
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{report.employeeCode}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{report.name}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{formatNumber(report.basicBonus)}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{report.shiftType}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{`${report.bonusPercentage}%`}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{report.totalAttendanceDays}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{report.totalDeductedDays}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{formatNumber(report.totalDeductions)}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{formatNumber(report.bindingValue)}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{formatNumber(report.productionValue)}</td>
      <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right font-semibold">{formatNumber(report.netBonus)}</td>
      {userRole === 'admin' && (
        <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">
          <motion.button
            variants={{
              hover: { scale: 1.02, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', transition: { duration: 0.2, ease: 'easeInOut' } },
              tap: { scale: 0.98, transition: { duration: 0.2, ease: 'easeInOut' } }
            }}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleEdit(report)}
            className="bg-purple-600 text-white px-3 py-1 rounded-xl transition-all duration-200 text-xs font-semibold shadow-sm"
          >
            تعديل
          </motion.button>
        </td>
      )}
    </motion.tr>
  );
});

function MonthlyBonusReport() {
  const [yearMonth, setYearMonth] = useState('2025-05');
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
  const tableRef = useRef(null);
  const userRole = localStorage.getItem('role') || 'employee';

  useEffect(() => {
    const fetchShifts = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/shifts`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
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

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [year, month] = yearMonth.split('-');
      if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        throw new Error('تنسيق الشهر غير صالح، استخدم YYYY-MM');
      }
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/monthly-bonus-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { yearMonth, employeeCode, shiftId }
      });
      const processedData = response.data.data || response.data;
      setReports(processedData.map(row => ({
        ...row,
        basicBonus: Number(row.basicBonus || 0),
        totalDeductions: Number(row.totalDeductions || 0),
        bindingValue: Number(row.bindingValue || 0),
        productionValue: Number(row.productionValue || 0),
        netBonus: Number(row.netBonus || 0)
      })));
      setSuccessMessage('تم جلب التقرير بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 1000);
      if (processedData.length === 0) {
        setError('لا توجد تقارير متاحة للمعايير المحددة');
      }
    } catch (error) {
      console.error('Error fetching report:', error.response?.data || error.message);
      if (error.response) {
        if (error.response.status === 401) {
          setError('التوكن غير صالح أو انتهت صلاحيته، يرجى تسجيل الدخول مرة أخرى');
        } else if (error.response.status === 404) {
          setError('التقرير غير موجود أو نقطة النهاية غير متاحة');
        } else {
          setError(error.response.data?.message || 'حدث خطأ أثناء جلب التقرير');
        }
      } else {
        setError('فشل الاتصال بالخادم، تحقق من الاتصال بالإنترنت');
      }
    } finally {
      setLoading(false);
    }
  }, [yearMonth, employeeCode, shiftId]);

  const handleSearch = useCallback(() => {
    fetchReports();
  }, [fetchReports]);

  const handleShowAll = useCallback(() => {
    setEmployeeCode('');
    setShiftId('');
    fetchReports();
  }, [fetchReports]);

  const handleEdit = useCallback((report) => {
    setSelectedEmployee(report);
    setBindingValue(report.bindingValue || 0);
    setProductionValue(report.productionValue || 0);
    setMonthYear(yearMonth);
    setShowModal(true);
  }, [yearMonth]);

  const handleSaveEdit = useCallback(async () => {
    if (!window.confirm('هل أنت متأكد من حفظ التغييرات؟')) return;
    setLoading(true);
    try {
      if (!selectedEmployee || !selectedEmployee.employeeCode) {
        throw new Error('كود الموظف غير موجود');
      }
      if (bindingValue === undefined || productionValue === undefined) {
        throw new Error('يرجى ملء جميع الحقول بقيم صالحة');
      }
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
  }, [selectedEmployee, bindingValue, productionValue, monthYear, fetchReports]);

  const calculateTotals = useCallback(() => {
    return reports.reduce((acc, row) => ({
      basicBonus: acc.basicBonus + Number(row.basicBonus || 0),
      totalAttendanceDays: acc.totalAttendanceDays + Number(row.totalAttendanceDays || 0),
      totalDeductedDays: acc.totalDeductedDays + Number(row.totalDeductedDays || 0),
      totalDeductions: acc.totalDeductions + Number(row.totalDeductions || 0),
      bindingValue: acc.bindingValue + Number(row.bindingValue || 0),
      productionValue: acc.productionValue + Number(row.productionValue || 0),
      netBonus: acc.netBonus + Number(row.netBonus || 0),
      employeeCode: '',
      name: '',
      shiftType: '',
      bonusPercentage: 0
    }), {
      basicBonus: 0,
      totalAttendanceDays: 0,
      totalDeductedDays: 0,
      totalDeductions: 0,
      bindingValue: 0,
      productionValue: 0,
      netBonus: 0,
      employeeCode: '',
      name: '',
      shiftType: '',
      bonusPercentage: 0
    });
  }, [reports]);

  const formatNumber = useCallback((num) => {
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  }, []);

  const exportToExcel = useCallback(() => {
    setLoading(true);
    try {
      const totals = calculateTotals();
      const reversedData = [...reports].reverse();
      const excelData = [
        ...reversedData.map(row => ({
          'الصافي': formatNumber(row.netBonus),
          'قيمة الإنتاج': formatNumber(row.productionValue),
          'قيمة التربات': formatNumber(row.bindingValue),
          'إجمالي الخصومات': formatNumber(row.totalDeductions),
          'إجمالي الأيام المخصومة': row.totalDeductedDays,
          'أيام الحضور': row.totalAttendanceDays,
          'نسبة الحافز': `${row.bonusPercentage}%`,
          'اسم الشيفت': row.shiftType,
          'الحافز الأساسي': formatNumber(row.basicBonus),
          'الاسم': row.name,
          'كود الموظف': row.employeeCode,
        })),
        {
          'الصافي': formatNumber(totals.netBonus),
          'قيمة الإنتاج': formatNumber(totals.productionValue),
          'قيمة التربات': formatNumber(totals.bindingValue),
          'إجمالي الخصومات': formatNumber(totals.totalDeductions),
          'إجمالي الأيام المخصومة': totals.totalDeductedDays,
          'أيام الحضور': totals.totalAttendanceDays,
          'نسبة الحافز': '',
          'اسم الشيفت': '',
          'الحافز الأساسي': formatNumber(totals.basicBonus),
          'الاسم': '',
          'كود الموظف': 'إجمالي',
        }
      ];
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير الحافز الشهري');
      XLSX.writeFile(wb, 'monthly_bonus_report.xlsx');
    } catch (err) {
      setError(`حدث خطأ أثناء تصدير Excel: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [reports, calculateTotals, formatNumber]);

  const exportToWord = useCallback(async () => {
    setLoading(true);
    try {
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
                    new TableCell({ children: [new Paragraph({ text: 'قيمة التربات', alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: 'قيمة الإنتاج', alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: 'الصافي', alignment: 'right' })] }),
                  ],
                }),
                ...reports.map(report => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: report.employeeCode, alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: report.name, alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(report.basicBonus), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: report.shiftType, alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: `${report.bonusPercentage}%`, alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: report.totalAttendanceDays.toString(), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: report.totalDeductedDays.toString(), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(report.totalDeductions), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(report.bindingValue), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(report.productionValue), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(report.netBonus), alignment: 'right' })] }),
                  ],
                })),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: 'الإجمالي', alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: '', alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(reports.reduce((sum, report) => sum + (report.basicBonus || 0), 0)), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: '', alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: '', alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: reports.reduce((sum, report) => sum + (report.totalAttendanceDays || 0), 0).toString(), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: reports.reduce((sum, report) => sum + (report.totalDeductedDays || 0), 0).toString(), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(reports.reduce((sum, report) => sum + (report.totalDeductions || 0), 0)), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(reports.reduce((sum, report) => sum + (report.bindingValue || 0), 0)), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(reports.reduce((sum, report) => sum + (report.productionValue || 0), 0)), alignment: 'right' })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(reports.reduce((sum, report) => sum + (report.netBonus || 0), 0)), alignment: 'right' })] }),
                  ],
                }),
              ],
            }),
          ],
        }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `تقرير_الحافز_الشهري_${format(new Date(), 'yyyy-MM-dd')}.docx`);
    } catch (err) {
      setError(`حدث خطأ أثناء تصدير Word: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [reports, formatNumber]);

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
            NileMix HR System - تقرير الحافز الشهري
          </h2>
          <AnimatePresence>
            {error && !loading && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-xl mb-4 text-sm text-center shadow-sm"
              >
                {error}
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
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-xl border border-gray-200/50 p-4 sm:p-5 mb-6"
          >
            <div className="flex items-center space-x-3 space-x-reverse mb-4">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-800">بحث تقرير الحافز</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="كود الموظف"
                className="px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              />
              <input
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              />
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
              >
                <option value="">كل الشيفتات</option>
                {shifts.map(shift => (
                  <option key={shift._id} value={shift._id}>
                    {shift.shiftName} ({shift.shiftType})
                  </option>
                ))}
              </select>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleSearch}
                className="bg-purple-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm"
              >
                <Search className="h-5 w-5 inline-block ml-1" />
                بحث
              </motion.button>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleShowAll}
                className="bg-purple-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm"
              >
                عرض الكل
              </motion.button>
              {userRole === 'admin' && (
                <>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={exportToExcel}
                    className="bg-purple-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm flex items-center justify-center"
                  >
                    <Download className="h-5 w-5 inline-block ml-1" />
                    تصدير إلى Excel
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={exportToWord}
                    className="bg-purple-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm flex items-center justify-center"
                  >
                    <Download className="h-5 w-5 inline-block ml-1" />
                    تصدير إلى Word
                  </motion.button>
                </>
              )}
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
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">الاسم</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">الحافز الأساسي</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">اسم الشيفت</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">نسبة الحافز</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">أيام الحضور</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">إجمالي الأيام المخصومة</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">إجمالي الخصومات</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">قيمة التربات</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">قيمة الإنتاج</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">الصافي</th>
                  {userRole === 'admin' && (
                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-semibold text-gray-800 uppercase">إجراءات</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <ReportRow key={report.employeeCode} report={report} handleEdit={handleEdit} userRole={userRole} />
                ))}
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="bg-gray-100 font-semibold"
                >
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">إجمالي</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right"></td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{formatNumber(calculateTotals().basicBonus)}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right"></td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right"></td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{calculateTotals().totalAttendanceDays}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{calculateTotals().totalDeductedDays}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{formatNumber(calculateTotals().totalDeductions)}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{formatNumber(calculateTotals().bindingValue)}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right">{formatNumber(calculateTotals().productionValue)}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right font-semibold">{formatNumber(calculateTotals().netBonus)}</td>
                  {userRole === 'admin' && (
                    <td className="px-2 sm:px-4 py-3 text-xs text-gray-800 text-right"></td>
                  )}
                </motion.tr>
              </tbody>
            </table>
          </motion.div>
          <AnimatePresence>
            {showModal && userRole === 'admin' && (
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
                  className="bg-white p-4 sm:p-5 rounded-xl shadow-md text-right max-w-md w-full relative"
                >
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setShowModal(false)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold shadow-sm"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">تعديل الحافز</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">قيمة التربات</label>
                      <input
                        type="number"
                        value={bindingValue}
                        onChange={(e) => setBindingValue(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">قيمة الإنتاج</label>
                      <input
                        type="number"
                        value={productionValue}
                        onChange={(e) => setProductionValue(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2 space-x-reverse">
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={handleSaveEdit}
                      className="bg-purple-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm"
                    >
                      حفظ
                    </motion.button>
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => setShowModal(false)}
                      className="bg-gray-600 text-white px-3 py-2 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm"
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

export default MonthlyBonusReport;
