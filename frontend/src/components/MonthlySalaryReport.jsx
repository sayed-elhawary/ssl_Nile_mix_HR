import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const CustomCheckIcon = () => (
  <motion.div
    className="relative h-16 w-16"
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
      className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <span className="mr-3 text-purple-600 text-sm font-medium">جارٍ التحميل...</span>
  </motion.div>
);

function MonthlySalaryReport() {
  const [data, setData] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [startDate, setStartDate] = useState('2025-08-01');
  const [endDate, setEndDate] = useState('2025-08-31');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editValues, setEditValues] = useState({});
  const tableRef = useRef(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/shift`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('فشل في جلب الشيفتات');
      const shiftsData = await response.json();
      setShifts(shiftsData);
    } catch (err) {
      setError('حدث خطأ أثناء جلب الشيفتات');
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      let url = `${process.env.REACT_APP_API_URL}/api/user/monthly-salary-report?month=${startDate.split('-')[1]}&year=${startDate.split('-')[0]}`;
      if (employeeCode) url += `&employeeCode=${employeeCode}`;
      if (selectedShift) url += `&shiftId=${selectedShift}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('فشل في جلب التقرير');
      const reports = await response.json();
      setData(reports);
      setShowSuccessAnimation(true);
      setSuccessMessage('تم جلب التقرير بنجاح');
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    } catch (err) {
      setError('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchReport();

  const handleShowAll = () => {
    setEmployeeCode('');
    setSelectedShift('');
    fetchReport();
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditValues({
      totalViolations: user.totalViolations || 0,
      deductionViolationsInstallment: user.deductionViolationsInstallment || 0,
      totalAdvances: user.totalAdvances || 0,
      deductionAdvancesInstallment: user.deductionAdvancesInstallment || 0,
    });
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const value = e.target.value;
    if (value === '' || value < 0) return; // منع القيم الفارغة أو السالبة
    setEditValues({ ...editValues, [e.target.name]: Number(value) });
  };

  const saveEdit = async () => {
    if (!window.confirm('هل أنت متأكد من حفظ التغييرات؟')) return;
    setLoading(true);
    try {
      if (!editUser || !editUser.employeeCode) {
        throw new Error('كود الموظف غير موجود');
      }
      if (
        editValues.totalViolations === undefined ||
        editValues.deductionViolationsInstallment === undefined ||
        editValues.totalAdvances === undefined ||
        editValues.deductionAdvancesInstallment === undefined
      ) {
        throw new Error('يرجى ملء جميع الحقول بقيم صالحة');
      }
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/update-salary-adjustment/${editUser.employeeCode}/${startDate.split('-')[0]}-${startDate.split('-')[1]}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify(editValues),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في التعديل');
      }
      setShowSuccessAnimation(true);
      setSuccessMessage('تم التعديل بنجاح');
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setEditModalOpen(false);
        fetchReport();
      }, 2000);
    } catch (err) {
      setError(`حدث خطأ أثناء التعديل: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return data.reduce((acc, row) => ({
      basicSalary: acc.basicSalary + (row.basicSalary || 0),
      medicalInsurance: acc.medicalInsurance + (row.medicalInsurance || 0),
      socialInsurance: acc.socialInsurance + (row.socialInsurance || 0),
      mealAllowance: acc.mealAllowance + (row.mealAllowance || 0),
      mealDeduction: acc.mealDeduction + (row.mealDeduction || 0),
      remainingMealAllowance: acc.remainingMealAllowance + (row.remainingMealAllowance || 0),
      totalAttendanceDays: acc.totalAttendanceDays + (row.totalAttendanceDays || 0),
      totalWeeklyOffDays: acc.totalWeeklyOffDays + (row.totalWeeklyOffDays || 0),
      totalLeaveAllowance: acc.totalLeaveAllowance + (row.totalLeaveAllowance || 0),
      totalAbsentDays: acc.totalAbsentDays + (row.totalAbsentDays || 0),
      totalDeductedHours: acc.totalDeductedHours + (row.totalDeductedHours || 0),
      totalAnnualLeaveDays: acc.totalAnnualLeaveDays + (row.totalAnnualLeaveDays || 0),
      totalSickLeaveDeduction: acc.totalSickLeaveDeduction + (row.totalSickLeaveDeduction || 0),
      annualLeaveBalance: acc.annualLeaveBalance + (row.annualLeaveBalance || 0),
      totalOfficialLeaveDays: acc.totalOfficialLeaveDays + (row.totalOfficialLeaveDays || 0),
      totalDeductedDays: acc.totalDeductedDays + (row.totalDeductedDays || 0),
      totalOvertimeHours: acc.totalOvertimeHours + (row.totalOvertimeHours || 0),
      occasionBonus: acc.occasionBonus + (row.occasionBonus || 0),
      totalViolations: acc.totalViolations + (row.totalViolations || 0),
      deductionViolationsInstallment: acc.deductionViolationsInstallment + (row.deductionViolationsInstallment || 0),
      totalAdvances: acc.totalAdvances + (row.totalAdvances || 0),
      deductionAdvancesInstallment: acc.deductionAdvancesInstallment + (row.deductionAdvancesInstallment || 0),
      totalDeductions: acc.totalDeductions + (row.totalDeductions || 0),
      totalAdditions: acc.totalAdditions + (row.totalAdditions || 0),
      netSalary: acc.netSalary + (row.netSalary || 0),
      employeeCode: '', // لصف الإجمالي
      name: '', // لصف الإجمالي
    }), {
      basicSalary: 0,
      medicalInsurance: 0,
      socialInsurance: 0,
      mealAllowance: 0,
      mealDeduction: 0,
      remainingMealAllowance: 0,
      totalAttendanceDays: 0,
      totalWeeklyOffDays: 0,
      totalLeaveAllowance: 0,
      totalAbsentDays: 0,
      totalDeductedHours: 0,
      totalAnnualLeaveDays: 0,
      totalSickLeaveDeduction: 0,
      annualLeaveBalance: 0,
      totalOfficialLeaveDays: 0,
      totalDeductedDays: 0,
      totalOvertimeHours: 0,
      occasionBonus: 0,
      totalViolations: 0,
      deductionViolationsInstallment: 0,
      totalAdvances: 0,
      deductionAdvancesInstallment: 0,
      totalDeductions: 0,
      totalAdditions: 0,
      netSalary: 0,
      employeeCode: '',
      name: '',
    });
  };

  const formatNumber = (num) => {
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  };

  const exportToExcel = () => {
    setLoading(true);
    try {
      const totals = calculateTotals();
      const reversedData = [...data].reverse(); // عكس ترتيب الصفوف
      const excelData = [
        ...reversedData.map(row => ({
          'الصافي': formatNumber(row.netSalary),
          'إجمالي الإضافي': formatNumber(row.totalAdditions),
          'إجمالي قيمة الخصومات': formatNumber(row.totalDeductions),
          'خصم قسط السلف': formatNumber(row.deductionAdvancesInstallment),
          'إجمالي السلف': formatNumber(row.totalAdvances),
          'خصم قسط المخالفات': formatNumber(row.deductionViolationsInstallment),
          'إجمالي المخالفات': formatNumber(row.totalViolations),
          'منحة مناسبة': formatNumber(row.occasionBonus),
          'إجمالي الساعات الإضافية': formatNumber(row.totalOvertimeHours),
          'إجمالي الأيام المخصومة': formatNumber(row.totalDeductedDays),
          'إجمالي الإجازات الرسمية': formatNumber(row.totalOfficialLeaveDays),
          'رصيد الإجازة السنوية': formatNumber(row.annualLeaveBalance),
          'إجمالي خصم الإجازة المرضية': formatNumber(row.totalSickLeaveDeduction),
          'إجمالي الإجازات السنوية': formatNumber(row.totalAnnualLeaveDays),
          'إجمالي الساعات المخصومة': formatNumber(row.totalDeductedHours),
          'إجمالي الغياب': formatNumber(row.totalAbsentDays),
          'إجمالي بدل الإجازة': formatNumber(row.totalLeaveAllowance),
          'إجمالي الإجازات الأسبوعية': formatNumber(row.totalWeeklyOffDays),
          'إجمالي أيام الحضور': formatNumber(row.totalAttendanceDays),
          'نوع الشيفت': row.shiftType,
          'بدل الوجبة المتبقي': formatNumber(row.remainingMealAllowance),
          'خصومات بدل الوجبة': formatNumber(row.mealDeduction),
          'بدل الوجبة': formatNumber(row.mealAllowance),
          'التأمين الاجتماعي': formatNumber(row.socialInsurance),
          'التأمين الطبي': formatNumber(row.medicalInsurance),
          'الراتب الأساسي': formatNumber(row.basicSalary),
          'اسم الموظف': row.name,
          'كود الموظف': row.employeeCode,
        })),
        {
          'الصافي': formatNumber(totals.netSalary),
          'إجمالي الإضافي': formatNumber(totals.totalAdditions),
          'إجمالي قيمة الخصومات': formatNumber(totals.totalDeductions),
          'خصم قسط السلف': formatNumber(totals.deductionAdvancesInstallment),
          'إجمالي السلف': formatNumber(totals.totalAdvances),
          'خصم قسط المخالفات': formatNumber(totals.deductionViolationsInstallment),
          'إجمالي المخالفات': formatNumber(totals.totalViolations),
          'منحة مناسبة': formatNumber(totals.occasionBonus),
          'إجمالي الساعات الإضافية': formatNumber(totals.totalOvertimeHours),
          'إجمالي الأيام المخصومة': formatNumber(totals.totalDeductedDays),
          'إجمالي الإجازات الرسمية': formatNumber(totals.totalOfficialLeaveDays),
          'رصيد الإجازة السنوية': formatNumber(totals.annualLeaveBalance),
          'إجمالي خصم الإجازة المرضية': formatNumber(totals.totalSickLeaveDeduction),
          'إجمالي الإجازات السنوية': formatNumber(totals.totalAnnualLeaveDays),
          'إجمالي الساعات المخصومة': formatNumber(totals.totalDeductedHours),
          'إجمالي الغياب': formatNumber(totals.totalAbsentDays),
          'إجمالي بدل الإجازة': formatNumber(totals.totalLeaveAllowance),
          'إجمالي الإجازات الأسبوعية': formatNumber(totals.totalWeeklyOffDays),
          'إجمالي أيام الحضور': formatNumber(totals.totalAttendanceDays),
          'نوع الشيفت': '',
          'بدل الوجبة المتبقي': formatNumber(totals.remainingMealAllowance),
          'خصومات بدل الوجبة': formatNumber(totals.mealDeduction),
          'بدل الوجبة': formatNumber(totals.mealAllowance),
          'التأمين الاجتماعي': formatNumber(totals.socialInsurance),
          'التأمين الطبي': formatNumber(totals.medicalInsurance),
          'الراتب الأساسي': formatNumber(totals.basicSalary),
          'اسم الموظف': '',
          'كود الموظف': 'إجمالي',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير الرواتب');
      XLSX.writeFile(wb, 'monthly_salary_report.xlsx');
    } catch (err) {
      setError(`حدث خطأ أثناء تصدير Excel: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);
      const tableElement = tableRef.current;
      if (!tableElement) {
        throw new Error('تعذر العثور على عنصر الجدول');
      }

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.padding = '20px';
      tempContainer.style.backgroundColor = '#FFFFFF';
      tempContainer.innerHTML = tableElement.outerHTML;

      const totals = calculateTotals();
      const totalsRow = tempContainer.querySelector('table').insertRow();
      totalsRow.className = 'bg-purple-50 font-bold';
      totalsRow.innerHTML = `
        <td class="py-4 px-6 text-right text-sm text-gray-800" colspan="2">إجمالي</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.basicSalary)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.medicalInsurance)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.socialInsurance)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.mealAllowance)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.mealDeduction)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.remainingMealAllowance)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800"></td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalAttendanceDays)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalWeeklyOffDays)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalLeaveAllowance)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalAbsentDays)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalDeductedHours)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalAnnualLeaveDays)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalSickLeaveDeduction)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.annualLeaveBalance)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalOfficialLeaveDays)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalDeductedDays)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalOvertimeHours)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.occasionBonus)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalViolations)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.deductionViolationsInstallment)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalAdvances)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.deductionAdvancesInstallment)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalDeductions)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalAdditions)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.netSalary)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800"></td>
      `;

      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: 420 * 3, // A3 width in pixels at 300 DPI
        windowHeight: 297 * 3, // A3 height in pixels at 300 DPI
      });

      const doc = new jsPDF('landscape', 'mm', 'a3');
      doc.text('تقرير الرواتب الشهري', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      doc.addImage(imgData, 'PNG', 0, 15, pdfWidth, pdfHeight);
      doc.save('monthly_salary_report.pdf');

      document.body.removeChild(tempContainer);
    } catch (err) {
      setError(`حدث خطأ أثناء تصدير PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const tableVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 6px 25px rgba(139, 92, 246, 0.3)', transition: { duration: 0.3, ease: 'easeInOut' } },
    tap: { scale: 0.95, backgroundColor: '#A78BFA', transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-noto-sans-arabic relative overflow-hidden dir=rtl">
      <motion.div
        variants={tableVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto relative z-10 max-w-7xl bg-white rounded-3xl shadow-lg p-8 border border-gray-100"
      >
        <h2 className="text-3xl font-extrabold text-purple-600 mb-6 text-right tracking-wide drop-shadow-sm">
          تقرير الرواتب الشهري
        </h2>
        {error && <p className="text-red-600 mb-4 text-sm text-right font-medium bg-red-50 p-3 rounded-xl">{error}</p>}
        {successMessage && <p className="text-purple-600 mb-4 text-sm text-right font-medium bg-purple-50 p-3 rounded-xl">{successMessage}</p>}
        <div className="mb-6 flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4 md:space-x-reverse">
          <input
            type="text"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            placeholder="كود الموظف"
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
          />
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleSearch}
            className="w-full md:w-auto bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700 transition duration-300 text-sm font-medium shadow-md"
          >
            بحث
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleShowAll}
            className="w-full md:w-auto bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700 transition duration-300 text-sm font-medium shadow-md"
          >
            عرض الكل
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={exportToExcel}
            className="w-full md:w-auto bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700 transition duration-300 text-sm font-medium shadow-md flex items-center justify-center"
          >
            <Download className="h-4 w-4 ml-2" /> تصدير إلى Excel
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={exportToPDF}
            className="w-full md:w-auto bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700 transition duration-300 text-sm font-medium shadow-md flex items-center justify-center"
          >
            <Download className="h-4 w-4 ml-2" /> تصدير إلى PDF
          </motion.button>
        </div>
        <div className="mb-6 flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4 md:space-x-reverse">
          <label className="text-gray-600 text-sm font-medium">من:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
          />
          <label className="text-gray-600 text-sm font-medium">إلى:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
          />
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
          >
            <option value="">كل الشيفتات</option>
            {shifts.map(shift => (
              <option key={shift._id} value={shift._id}>{shift.shiftName} ({shift.shiftType})</option>
            ))}
          </select>
        </div>
        {loading && (
          <div className="flex justify-center mb-6">
            <CustomLoadingSpinner />
          </div>
        )}
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-lg">
          <table ref={tableRef} className="min-w-full divide-y divide-gray-100 bg-white">
            <thead className="bg-purple-50">
              <tr>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">كود الموظف</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">اسم الموظف</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">الراتب الأساسي</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">التأمين الطبي</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">التأمين الاجتماعي</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">بدل الوجبة</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">خصومات بدل الوجبة</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">بدل الوجبة المتبقي</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">نوع الشيفت</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي أيام الحضور</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي الإجازات الأسبوعية</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي بدل الإجازة</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي الغياب</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي الساعات المخصومة</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي الإجازات السنوية</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي خصم الإجازة المرضية</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">رصيد الإجازة السنوية</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي الإجازات الرسمية</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي الأيام المخصومة</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي الساعات الإضافية</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">منحة مناسبة</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي المخالفات</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">خصم قسط المخالفات</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي السلف</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">خصم قسط السلف</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي قيمة الخصومات</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">إجمالي الإضافي</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">الصافي</th>
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">تعديل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-purple-50/50 transition duration-300 ease-in-out">
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{row.employeeCode}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{row.name}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.basicSalary)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.medicalInsurance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.socialInsurance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.mealAllowance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.mealDeduction)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.remainingMealAllowance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{row.shiftType}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalAttendanceDays)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalWeeklyOffDays)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalLeaveAllowance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalAbsentDays)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalDeductedHours)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalAnnualLeaveDays)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalSickLeaveDeduction)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.annualLeaveBalance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalOfficialLeaveDays)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalDeductedDays)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalOvertimeHours)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.occasionBonus)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalViolations)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.deductionViolationsInstallment)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalAdvances)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.deductionAdvancesInstallment)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalDeductions)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalAdditions)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.netSalary)}</td>
                  <td className="py-4 px-6 text-right">
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => openEditModal(row)}
                      className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition duration-300 shadow-md"
                    >
                      <Pencil className="h-5 w-5" />
                    </motion.button>
                  </td>
                </tr>
              ))}
              <tr className="bg-purple-50 font-bold">
                <td className="py-4 px-6 text-right text-sm text-gray-700" colSpan="2">إجمالي</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.basicSalary)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.medicalInsurance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.socialInsurance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.mealAllowance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.mealDeduction)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.remainingMealAllowance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700"></td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalAttendanceDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalWeeklyOffDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalLeaveAllowance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalAbsentDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalDeductedHours)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalAnnualLeaveDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalSickLeaveDeduction)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.annualLeaveBalance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalOfficialLeaveDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalDeductedDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalOvertimeHours)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.occasionBonus)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalViolations)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.deductionViolationsInstallment)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalAdvances)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.deductionAdvancesInstallment)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalDeductions)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.totalAdditions)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(totals.netSalary)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-700"></td>
              </tr>
            </tbody>
          </table>
        </div>
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
        {editModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
              exit={{ opacity: 0, y: 50, transition: { duration: 0.3, ease: 'easeIn' } }}
              className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-2xl mx-4 border border-purple-100"
            >
              <h3 className="text-2xl font-bold mb-6 text-right text-purple-600">تعديل بيانات الموظف: {editUser.name}</h3>
              {error && <p className="text-red-600 mb-4 text-sm text-right font-medium bg-red-50 p-3 rounded-xl">{error}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 text-right mb-1">إجمالي المخالفات</label>
                  <input
                    type="number"
                    name="totalViolations"
                    value={editValues.totalViolations}
                    onChange={handleEditChange}
                    className="w-full p-3 border border-gray-200 rounded-2xl text-right shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 text-right mb-1">خصم قسط المخالفات</label>
                  <input
                    type="number"
                    name="deductionViolationsInstallment"
                    value={editValues.deductionViolationsInstallment}
                    onChange={handleEditChange}
                    className="w-full p-3 border border-gray-200 rounded-2xl text-right shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 text-right mb-1">إجمالي السلف</label>
                  <input
                    type="number"
                    name="totalAdvances"
                    value={editValues.totalAdvances}
                    onChange={handleEditChange}
                    className="w-full p-3 border border-gray-200 rounded-2xl text-right shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 text-right mb-1">خصم قسط السلف</label>
                  <input
                    type="number"
                    name="deductionAdvancesInstallment"
                    value={editValues.deductionAdvancesInstallment}
                    onChange={handleEditChange}
                    className="w-full p-3 border border-gray-200 rounded-2xl text-right shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 space-x-reverse mt-6">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={saveEdit}
                  className="bg-purple-600 text-white p-3 rounded-2xl font-medium shadow-md"
                >
                  حفظ التغييرات
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setEditModalOpen(false)}
                  className="bg-red-600 text-white p-3 rounded-2xl font-medium shadow-md"
                >
                  إلغاء
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default MonthlySalaryReport;
