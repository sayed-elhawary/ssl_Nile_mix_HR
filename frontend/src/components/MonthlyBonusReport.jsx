import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';

import { Pencil, Download } from 'lucide-react';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-16 w-16"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, transition: { duration: 0.7, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 } }}
    exit={{ scale: 0, opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
  >
    <motion.svg
      className="h-full w-full text-purple-600"
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
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeInOut' } }}
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

const ReportRow = memo(({ report, handleEdit }) => {
  const formatNumber = (num) => Number.isFinite(num) ? num.toFixed(2) : '0.00';
  return (
    <motion.tr
      variants={{
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.6, -0.05, 0.01, 0.99] } }
      }}
      className="hover:bg-purple-50 transition-colors duration-200"
    >
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.employeeCode}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.name}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(report.basicBonus)}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.shiftType}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.bonusPercentage}%</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.totalAttendanceDays}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{report.totalDeductedDays}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(report.totalDeductions)}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(report.bindingValue)}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(report.productionValue)}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">{formatNumber(report.netBonus)}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
        <motion.button
          variants={{
            hover: { scale: 1.05, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)', transition: { duration: 0.3, ease: 'easeInOut' } },
            tap: { scale: 0.95, transition: { duration: 0.2 } }
          }}
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleEdit(report)}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-all duration-300 font-semibold text-sm shadow-sm hover:shadow-md"
        >
          <Pencil className="inline-block w-4 h-4 ml-2" /> تعديل
        </motion.button>
      </td>
    </motion.tr>
  );
});

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
  const tableRef = useRef(null);

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

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/monthly-bonus-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { startDate, endDate, employeeCode, shiftId }
      });
      const processedData = response.data.map(row => ({
        ...row,
        basicBonus: Number(row.basicBonus || 0),
        totalDeductions: Number(row.totalDeductions || 0),
        bindingValue: Number(row.bindingValue || 0),
        productionValue: Number(row.productionValue || 0),
        netBonus: Number(row.netBonus || 0)
      }));
      setReports(processedData);
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
  }, [startDate, endDate, employeeCode, shiftId]);

  const handleSearch = useCallback(() => {
    if (!startDate || !endDate) {
      setError('يرجى إدخال تاريخ البداية والنهاية');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }
    fetchReports();
  }, [startDate, endDate, fetchReports]);

  const handleShowAll = useCallback(() => {
    setEmployeeCode('');
    setShiftId('');
    fetchReports();
  }, [fetchReports]);

  const handleEdit = useCallback((report) => {
    setSelectedEmployee(report);
    setBindingValue(report.bindingValue || 0);
    setProductionValue(report.productionValue || 0);
    setMonthYear(startDate.slice(0, 7));
    setShowModal(true);
  }, [startDate]);

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
      }, 1500);
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
          'إجمالي الأيام المخصومة': formatNumber(row.totalDeductedDays),
          'أيام الحضور': formatNumber(row.totalAttendanceDays),
          'نسبة الحافز': `${row.bonusPercentage}%`,
          'اسم الشيفت': row.shiftType,
          'الحافز الأساسي': formatNumber(row.basicBonus),
          'الاسم': row.name,
          'كود الموظف': row.employeeCode
        })),
        {
          'الصافي': formatNumber(totals.netBonus),
          'قيمة الإنتاج': formatNumber(totals.productionValue),
          'قيمة التربيط': formatNumber(totals.bindingValue),
          'إجمالي الخصومات': formatNumber(totals.totalDeductions),
          'إجمالي الأيام المخصومة': formatNumber(totals.totalDeductedDays),
          'أيام الحضور': formatNumber(totals.totalAttendanceDays),
          'نسبة الحافز': '',
          'اسم الشيفت': '',
          'الحافز الأساسي': formatNumber(totals.basicBonus),
          'الاسم': '',
          'كود الموظف': 'إجمالي'
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
      ];
      worksheet['!rtl'] = true;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير الحافز الشهري');
      XLSX.writeFile(workbook, `تقرير_الحافز_الشهري_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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

  const inputVariants = {
    hover: { scale: 1.02, transition: { duration: 0.3, ease: 'easeInOut' } },
    focus: { borderColor: '#7C3AED', boxShadow: '0 0 8px rgba(124, 58, 237, 0.5)', transition: { duration: 0.3 } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)', transition: { duration: 0.3, ease: 'easeInOut' } },
    tap: { scale: 0.95, transition: { duration: 0.2 } },
  };

  const formVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99], type: 'spring', stiffness: 120, damping: 15 } },
  };

  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99], staggerChildren: 0.1 } },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 15, duration: 0.5 } },
    exit: { opacity: 0, scale: 0.9, y: 30, transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 md:p-8 font-noto-sans-arabic relative dir=rtl overflow-auto" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto relative z-10 max-w-7xl bg-white rounded-3xl shadow-md p-6 sm:p-8 md:p-10 border border-gray-200/50"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-right tracking-tight">
          تقرير الحافز الشهري
        </h2>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-6 text-right text-sm shadow-sm"
            >
              {error}
            </motion.div>
          )}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-purple-50 border border-purple-300 text-purple-700 px-4 py-3 rounded-xl mb-6 text-right text-sm shadow-sm"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">من التاريخ</label>
            <motion.input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-gray-50 text-sm shadow-sm hover:shadow-md"
              variants={inputVariants}
              whileHover="hover"
              whileFocus="focus"
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">إلى التاريخ</label>
            <motion.input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-gray-50 text-sm shadow-sm hover:shadow-md"
              variants={inputVariants}
              whileHover="hover"
              whileFocus="focus"
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">كود الموظف</label>
            <motion.input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-gray-50 text-sm shadow-sm hover:shadow-md"
              placeholder="أدخل كود الموظف"
              variants={inputVariants}
              whileHover="hover"
              whileFocus="focus"
            />
          </div>
          <div>
            <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">الشيفت</label>
            <motion.select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-gray-50 text-sm shadow-sm hover:shadow-md"
              disabled={shifts.length === 0}
              variants={inputVariants}
              whileHover="hover"
              whileFocus="focus"
            >
              <option value="">جميع الشيفتات</option>
              {shifts.map((shift) => (
                <option key={shift._id} value={shift._id}>
                  {shift.shiftName}
                </option>
              ))}
            </motion.select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-4 flex-wrap">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleSearch}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all duration-300 font-semibold text-sm shadow-sm hover:shadow-md"
              disabled={loading}
            >
              {loading ? <CustomLoadingSpinner /> : 'بحث'}
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleShowAll}
              className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-all duration-300 font-semibold text-sm shadow-sm hover:shadow-md"
              disabled={loading}
            >
              عرض الكل
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={exportToExcel}
              className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 font-semibold text-sm shadow-sm hover:shadow-md"
              disabled={loading || reports.length === 0}
            >
              <Download className="inline-block w-5 h-5 ml-2" /> تصدير إلى Excel
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={exportToWord}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold text-sm shadow-sm hover:shadow-md"
              disabled={loading || reports.length === 0}
            >
              <Download className="inline-block w-5 h-5 ml-2" /> تصدير إلى Word
            </motion.button>
          </div>
        </div>
        <motion.div
          variants={tableVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-200/50 mt-8 overflow-x-auto"
          ref={tableRef}
        >
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="flex justify-center py-8"
            >
              <CustomLoadingSpinner />
            </motion.div>
          )}
          {!loading && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">كود الموظف</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">الاسم</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">الحافز الأساسي</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">اسم الشيفت</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">نسبة الحافز</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">أيام الحضور</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">إجمالي الأيام المخصومة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">إجمالي الخصومات</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">قيمة التربيط</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">قيمة الإنتاج</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">الصافي</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">تعديل</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.length === 0 && !error && (
                  <motion.tr
                    variants={{
                      hidden: { opacity: 0, x: 20 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.6, -0.05, 0.01, 0.99] } }
                    }}
                  >
                    <td colSpan="12" className="px-4 py-4 text-center text-sm text-gray-600">
                      لا توجد بيانات لعرضها
                    </td>
                  </motion.tr>
                )}
                {reports.map((report) => (
                  <ReportRow key={report.employeeCode} report={report} handleEdit={handleEdit} />
                ))}
                {reports.length > 0 && (
                  <motion.tr
                    variants={{
                      hidden: { opacity: 0, x: 20 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.6, -0.05, 0.01, 0.99] } }
                    }}
                    className="bg-gray-50 font-semibold"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">إجمالي</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(reports.reduce((sum, report) => sum + (report.basicBonus || 0), 0))}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{reports.reduce((sum, report) => sum + (report.totalAttendanceDays || 0), 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{reports.reduce((sum, report) => sum + (report.totalDeductedDays || 0), 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(reports.reduce((sum, report) => sum + (report.totalDeductions || 0), 0))}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(reports.reduce((sum, report) => sum + (report.bindingValue || 0), 0))}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(reports.reduce((sum, report) => sum + (report.productionValue || 0), 0))}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(reports.reduce((sum, report) => sum + (report.netBonus || 0), 0))}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                  </motion.tr>
                )}
              </tbody>
            </table>
          )}
        </motion.div>
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black/20"
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
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-md max-w-md w-full border border-gray-200/50"
              >
                <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-6 text-right tracking-tight">تعديل الحافز</h3>
                <div className="mb-6">
                  <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">قيمة التربيط</label>
                  <motion.input
                    type="number"
                    value={bindingValue}
                    onChange={(e) => setBindingValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-gray-50 text-sm shadow-sm hover:shadow-md"
                    placeholder="أدخل قيمة التربيط"
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-800 text-sm font-semibold mb-2 text-right">قيمة الإنتاج</label>
                  <motion.input
                    type="number"
                    value={productionValue}
                    onChange={(e) => setProductionValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-300 bg-gray-50 text-sm shadow-sm hover:shadow-md"
                    placeholder="أدخل قيمة الإنتاج"
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleSaveEdit}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all duration-300 font-semibold text-sm shadow-sm hover:shadow-md"
                    disabled={loading}
                  >
                    {loading ? <CustomLoadingSpinner /> : 'حفظ'}
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setShowModal(false)}
                    className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-all duration-300 font-semibold text-sm shadow-sm hover:shadow-md"
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
