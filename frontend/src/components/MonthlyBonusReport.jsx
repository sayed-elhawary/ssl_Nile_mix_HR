import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';
import { Pencil, Download } from 'lucide-react';

// Custom Check Icon
const CustomCheckIcon = () => (
  <motion.div
    className="relative h-12 w-12"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-500"
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
      className="h-8 w-8 border-3 border-purple-500 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-2 text-purple-500 text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

const ReportRow = memo(({ report, handleEdit, userRole }) => {
  const formatNumber = (num) => Number.isFinite(num) ? num.toFixed(2) : '0.00';
  return (
    <motion.tr
      variants={{
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } }
      }}
      className="hover:bg-gray-100 transition-colors duration-200"
    >
      <td className="py-3 px-4 text-right text-sm text-gray-700">{report.employeeCode}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{report.name}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{formatNumber(report.basicBonus)}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{report.shiftType}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{report.bonusPercentage}%</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{report.totalAttendanceDays}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{report.totalDeductedDays}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{formatNumber(report.totalDeductions)}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{formatNumber(report.bindingValue)}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{formatNumber(report.productionValue)}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700 font-semibold">{formatNumber(report.netBonus)}</td>
      {userRole === 'admin' && (
        <td className="py-3 px-4 text-right">
          <motion.button
            variants={{
              hover: { scale: 1.2, rotate: 15, transition: { duration: 0.3, ease: 'easeOut' } },
              tap: { scale: 0.95, transition: { duration: 0.2, ease: 'easeOut' } }
            }}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleEdit(report)}
            className="bg-purple-500 text-white p-2 rounded-full hover:bg-purple-600 transition-colors duration-200 shadow-md"
          >
            <Pencil className="h-5 w-5" />
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
          'قيمة التربيط': formatNumber(row.bindingValue),
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
          'قيمة التربيط': formatNumber(totals.bindingValue),
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
                    new TableCell({ children: [new Paragraph({ text: 'قيمة التربيط', alignment: 'right' })] }),
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

  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', transition: { duration: 0.2, ease: 'easeOut' } },
    tap: { scale: 0.95, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  const inputVariants = {
    hover: { scale: 1.02, borderColor: '#8B5CF6', transition: { duration: 0.2, ease: 'easeOut' } },
    focus: { scale: 1.02, borderColor: '#8B5CF6', boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.3)', transition: { duration: 0.2, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 font-noto-sans-arabic relative dir=rtl" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <div className="container mx-auto max-w-full sm:max-w-lg md:max-w-2xl lg:max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-6 sm:mb-8 text-right"
        >
          تقرير الحافز الشهري
        </motion.h2>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-red-600 bg-red-50 p-3 rounded-lg mb-6 text-right text-sm"
          >
            {error}
          </motion.p>
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
        <div className="mb-6 flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4 md:space-x-reverse">
          <motion.input
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
            type="text"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            placeholder="كود الموظف"
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
          />
          <motion.input
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
          />
          <motion.select
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
          >
            <option value="">كل الشيفتات</option>
            {shifts.map(shift => (
              <option key={shift._id} value={shift._id}>
                {shift.shiftName} ({shift.shiftType})
              </option>
            ))}
          </motion.select>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleSearch}
            className="w-full md:w-auto bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 transition-colors duration-200 text-sm font-medium shadow-md"
          >
            بحث
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleShowAll}
            className="w-full md:w-auto bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 transition-colors duration-200 text-sm font-medium shadow-md"
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
                className="w-full md:w-auto bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 transition-colors duration-200 text-sm font-medium shadow-md flex items-center justify-center"
              >
                <Download className="h-4 w-4 ml-2" /> تصدير إلى Excel
              </motion.button>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={exportToWord}
                className="w-full md:w-auto bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 transition-colors duration-200 text-sm font-medium shadow-md flex items-center justify-center"
              >
                <Download className="h-4 w-4 ml-2" /> تصدير إلى Word
              </motion.button>
            </>
          )}
        </div>
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
        <motion.div
          variants={tableVariants}
          initial="hidden"
          animate="visible"
          className="overflow-x-auto rounded-lg border border-gray-200 shadow-md"
          ref={tableRef}
        >
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">كود الموظف</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">الاسم</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">الحافز الأساسي</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">اسم الشيفت</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">نسبة الحافز</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">أيام الحضور</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">إجمالي الأيام المخصومة</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">إجمالي الخصومات</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">قيمة التربيط</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">قيمة الإنتاج</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">الصافي</th>
                {userRole === 'admin' && (
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-800 uppercase">تعديل</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => (
                <ReportRow key={report.employeeCode} report={report} handleEdit={handleEdit} userRole={userRole} />
              ))}
              <motion.tr
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-gray-100 font-semibold"
              >
                <td className="py-3 px-4 text-right text-sm text-gray-800">إجمالي</td>
                <td className="py-3 px-4 text-right text-sm text-gray-800"></td>
                <td className="py-3 px-4 text-right text-sm text-gray-800">{formatNumber(calculateTotals().basicBonus)}</td>
                <td className="py-3 px-4 text-right text-sm text-gray-800"></td>
                <td className="py-3 px-4 text-right text-sm text-gray-800"></td>
                <td className="py-3 px-4 text-right text-sm text-gray-800">{calculateTotals().totalAttendanceDays}</td>
                <td className="py-3 px-4 text-right text-sm text-gray-800">{calculateTotals().totalDeductedDays}</td>
                <td className="py-3 px-4 text-right text-sm text-gray-800">{formatNumber(calculateTotals().totalDeductions)}</td>
                <td className="py-3 px-4 text-right text-sm text-gray-800">{formatNumber(calculateTotals().bindingValue)}</td>
                <td className="py-3 px-4 text-right text-sm text-gray-800">{formatNumber(calculateTotals().productionValue)}</td>
                <td className="py-3 px-4 text-right text-sm text-gray-800">{formatNumber(calculateTotals().netBonus)}</td>
                {userRole === 'admin' && (
                  <td className="py-3 px-4 text-right text-sm text-gray-800"></td>
                )}
              </motion.tr>
            </tbody>
          </table>
        </motion.div>
        <AnimatePresence>
          {showModal && userRole === 'admin' && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-right">تعديل الحافز</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">قيمة التربيط</label>
                    <motion.input
                      variants={inputVariants}
                      whileHover="hover"
                      whileFocus="focus"
                      type="number"
                      value={bindingValue}
                      onChange={(e) => setBindingValue(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">قيمة الإنتاج</label>
                    <motion.input
                      variants={inputVariants}
                      whileHover="hover"
                      whileFocus="focus"
                      type="number"
                      value={productionValue}
                      onChange={(e) => setProductionValue(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-sm"
                      min="0"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleSaveEdit}
                    className="bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 transition-colors duration-200 text-sm font-medium shadow-md"
                  >
                    حفظ
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setShowModal(false)}
                    className="bg-gray-500 text-white p-3 rounded-lg hover:bg-gray-600 transition-colors duration-200 text-sm font-medium shadow-md"
                  >
                    إلغاء
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

export default MonthlyBonusReport;
