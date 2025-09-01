import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Custom Check Icon
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

// Custom Loading Spinner
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

const SalaryIcon = () => (
  <div className="h-8 w-8 text-purple-600">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  </div>
);

function MonthlySalaryReport() {
  const [data, setData] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [yearMonth, setYearMonth] = useState('2025-05');
  const [loading, setLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editValues, setEditValues] = useState({});
  const tableRef = useRef(null);
  const userRole = localStorage.getItem('role') || 'employee';

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/shift`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) {
        throw new Error('فشل في جلب الشيفتات');
      }
      const shiftsData = await response.json();
      setShifts(shiftsData);
    } catch (err) {
      toast.error(`حدث خطأ أثناء جلب الشيفتات: ${err.message}`, {
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

  const fetchReport = async () => {
    setLoading(true);
    try {
      const [year, month] = yearMonth.split('-');
      if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        throw new Error('تنسيق الشهر غير صالح، استخدم YYYY-MM');
      }
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى');
      }
      let url = `${process.env.REACT_APP_API_URL}/api/user/monthly-salary-report?yearMonth=${yearMonth}`;
      if (employeeCode) url += `&employeeCode=${employeeCode}`;
      if (selectedShift) url += `&shiftId=${selectedShift}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في جلب التقرير');
      }
      const reports = await response.json();
      const processedData = (reports.totals || []).map(row => ({
        ...row,
        totalOvertimeAmount: Number(row.totalOvertimeAmount || 0),
        totalDeductions: Number(row.totalDeductions || 0),
        finalSalary: Number(row.finalSalary || 0),
        deductedDaysAmount: Number(row.deductedDaysAmount || 0),
        violationDeduction: Number(row.violationDeduction || 0),
        loanDeduction: Number(row.loanDeduction || 0),
        totalViolations: Number(row.totalViolations || 0),
        totalLoans: Number(row.totalLoans || 0),
        totalViolationsFull: Number(row.totalViolationsFull || 0),
        totalLoansFull: Number(row.totalLoansFull || 0),
        occasionBonus: Number(row.occasionBonus || 0),
        penalties: Number(row.penalties || 0),
      }));
      setData(processedData);
      setShowSuccessAnimation(true);
      toast.success('تم جلب التقرير بنجاح', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#F3E8FF', color: '#6B46C1', fontFamily: 'Noto Sans Arabic' },
      });
      setTimeout(() => setShowSuccessAnimation(false), 1000);
    } catch (err) {
      toast.error(`حدث خطأ أثناء جلب التقرير: ${err.message}`, {
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

  const handleSearch = () => fetchReport();

  const handleShowAll = () => {
    setEmployeeCode('');
    setSelectedShift('');
    fetchReport();
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditValues({
      totalViolations: user.totalViolationsFull || user.totalViolations || 0,
      violationDeduction: user.violationDeduction || 0,
      totalLoans: user.totalLoansFull || user.totalLoans || 0,
      loanDeduction: user.loanDeduction || 0,
      occasionBonus: user.occasionBonus || 0,
      penalties: user.penalties || 0,
    });
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (value === '' || Number(value) < 0) return;
    setEditValues(prev => ({ ...prev, [name]: Number(value) }));
  };

  const saveEdit = async () => {
    if (!window.confirm('هل أنت متأكد من حفظ التغييرات؟')) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/update-salary-adjustment/${editUser.employeeCode}/${yearMonth}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            totalViolations: Number(editValues.totalViolations),
            deductionViolationsInstallment: Number(editValues.violationDeduction),
            totalAdvances: Number(editValues.totalLoans),
            deductionAdvancesInstallment: Number(editValues.loanDeduction),
            occasionBonus: Number(editValues.occasionBonus),
            penalties: Number(editValues.penalties),
          }),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل في التعديل');
      }
      setData(prevData =>
        prevData.map(row =>
          row.employeeCode === editUser.employeeCode
            ? {
                ...row,
                totalViolationsFull: Number(responseData.data.totalViolationsFull || 0),
                totalViolations: Number(responseData.data.totalViolations || 0),
                violationDeduction: Number(responseData.data.violationDeduction || 0),
                totalLoansFull: Number(responseData.data.totalLoansFull || 0),
                totalLoans: Number(responseData.data.totalLoans || 0),
                loanDeduction: Number(responseData.data.loanDeduction || 0),
                occasionBonus: Number(responseData.data.occasionBonus || 0),
                penalties: Number(responseData.data.penalties || 0),
                totalDeductions: Number(row.totalDeductions) + Number(responseData.data.penalties || 0) - Number(row.penalties || 0),
                finalSalary: Number(row.finalSalary) - (Number(responseData.data.penalties || 0) - Number(row.penalties || 0)),
              }
            : row
        )
      );
      setShowSuccessAnimation(true);
      toast.success('تم التعديل بنجاح', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#F3E8FF', color: '#6B46C1', fontFamily: 'Noto Sans Arabic' },
      });
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setEditModalOpen(false);
      }, 1000);
    } catch (err) {
      toast.error(`حدث خطأ أثناء التعديل: ${err.message}`, {
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

  const calculateTotals = () => {
    return data.reduce((acc, row) => {
      return {
        basicSalary: acc.basicSalary + Number(row.basicSalary || 0),
        totalSalaryWithAllowances: acc.totalSalaryWithAllowances + Number(row.totalSalaryWithAllowances || 0),
        medicalInsurance: acc.medicalInsurance + Number(row.medicalInsurance || 0),
        socialInsurance: acc.socialInsurance + Number(row.socialInsurance || 0),
        mealAllowance: acc.mealAllowance + Number(row.mealAllowance || 0),
        mealDeduction: acc.mealDeduction + Number(row.mealDeduction || 0),
        remainingMealAllowance: acc.remainingMealAllowance + Number(row.remainingMealAllowance || 0),
        totalAttendanceDays: acc.totalAttendanceDays + Number(row.totalAttendanceDays || 0),
        totalWeeklyOffDays: acc.totalWeeklyOffDays + Number(row.totalWeeklyOffDays || 0),
        totalLeaveAllowance: acc.totalLeaveAllowance + Number(row.totalLeaveAllowance || 0),
        totalAbsentDays: acc.totalAbsentDays + Number(row.totalAbsentDays || 0),
        totalDeductedHours: acc.totalDeductedHours + Number(row.totalDeductedHours || 0),
        totalAnnualLeaveDays: acc.totalAnnualLeaveDays + Number(row.totalAnnualLeaveDays || 0),
        totalSickLeaveDeduction: acc.totalSickLeaveDeduction + Number(row.totalSickLeaveDeduction || 0),
        annualLeaveBalance: acc.annualLeaveBalance + Number(row.annualLeaveBalance || 0),
        totalOfficialLeaveDays: acc.totalOfficialLeaveDays + Number(row.totalOfficialLeaveDays || 0),
        totalDeductedDays: acc.totalDeductedDays + Number(row.totalDeductedDays || 0),
        totalOvertimeHours: acc.totalOvertimeHours + Number(row.totalOvertimeHours || 0),
        occasionBonus: acc.occasionBonus + Number(row.occasionBonus || 0),
        totalViolations: acc.totalViolations + Number(row.totalViolations || 0),
        violationDeduction: acc.violationDeduction + Number(row.violationDeduction || 0),
        totalLoans: acc.totalLoans + Number(row.totalLoans || 0),
        loanDeduction: acc.loanDeduction + Number(row.loanDeduction || 0),
        penalties: acc.penalties + Number(row.penalties || 0),
        totalDeductions: acc.totalDeductions + Number(row.totalDeductions || 0),
        totalOvertimeAmount: acc.totalOvertimeAmount + Number(row.totalOvertimeAmount || 0),
        finalSalary: acc.finalSalary + Number(row.finalSalary || 0),
        deductedDaysAmount: acc.deductedDaysAmount + Number(row.deductedDaysAmount || 0),
        employeeCode: '',
        employeeName: '',
        shiftName: '',
      };
    }, {
      basicSalary: 0,
      totalSalaryWithAllowances: 0,
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
      violationDeduction: 0,
      totalLoans: 0,
      loanDeduction: 0,
      penalties: 0,
      totalDeductions: 0,
      totalOvertimeAmount: 0,
      finalSalary: 0,
      deductedDaysAmount: 0,
      employeeCode: '',
      employeeName: '',
      shiftName: '',
    });
  };

  const formatNumber = (num) => {
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  };

  const exportToExcel = () => {
    setLoading(true);
    try {
      const totals = calculateTotals();
      const reversedData = [...data].reverse();
      const excelData = [
        ...reversedData.map(row => ({
          'كود الموظف': row.employeeCode,
          'اسم الموظف': row.employeeName,
          'الراتب الأساسي': formatNumber(row.basicSalary),
          'الراتب الإجمالي بالبدلات': formatNumber(row.totalSalaryWithAllowances),
          'التأمين الطبي': formatNumber(row.medicalInsurance),
          'التأمين الاجتماعي': formatNumber(row.socialInsurance),
          'بدل الوجبة': formatNumber(row.mealAllowance),
          'خصومات بدل الوجبة': formatNumber(row.mealDeduction),
          'بدل الوجبة المتبقي': formatNumber(row.remainingMealAllowance),
          'نوع الشيفت': row.shiftName,
          'إجمالي أيام الحضور': formatNumber(row.totalAttendanceDays),
          'إجمالي الإجازات الأسبوعية': formatNumber(row.totalWeeklyOffDays),
          'إجمالي بدل الإجازة': formatNumber(row.totalLeaveAllowance),
          'إجمالي الغياب': formatNumber(row.totalAbsentDays),
          'إجمالي الساعات المخصومة': formatNumber(row.totalDeductedHours),
          'إجمالي الإجازات السنوية': formatNumber(row.totalAnnualLeaveDays),
          'إجمالي خصم الإجازة المرضية': formatNumber(row.totalSickLeaveDeduction),
          'رصيد الإجازة السنوية': formatNumber(row.annualLeaveBalance),
          'إجمالي الإجازات الرسمية': formatNumber(row.totalOfficialLeaveDays),
          'إجمالي الأيام المخصومة': formatNumber(row.totalDeductedDays),
          'إجمالي الساعات الإضافية': formatNumber(row.totalOvertimeHours),
          'منحة مناسبة': formatNumber(row.occasionBonus),
          'إجمالي المخالفات': formatNumber(row.totalViolations),
          'خصم قسط المخالفات': formatNumber(row.violationDeduction),
          'إجمالي السلف': formatNumber(row.totalLoans),
          'خصم قسط السلف': formatNumber(row.loanDeduction),
          'جزاءات': formatNumber(row.penalties),
          'إجمالي قيمة الخصومات': formatNumber(row.totalDeductions),
          'إجمالي الإضافي': formatNumber(row.totalOvertimeAmount),
          'الصافي': formatNumber(row.finalSalary),
        })),
        {
          'كود الموظف': 'إجمالي',
          'اسم الموظف': '',
          'الراتب الأساسي': formatNumber(totals.basicSalary),
          'الراتب الإجمالي بالبدلات': formatNumber(totals.totalSalaryWithAllowances),
          'التأمين الطبي': formatNumber(totals.medicalInsurance),
          'التأمين الاجتماعي': formatNumber(totals.socialInsurance),
          'بدل الوجبة': formatNumber(totals.mealAllowance),
          'خصومات بدل الوجبة': formatNumber(totals.mealDeduction),
          'بدل الوجبة المتبقي': formatNumber(totals.remainingMealAllowance),
          'نوع الشيفت': '',
          'إجمالي أيام الحضور': formatNumber(totals.totalAttendanceDays),
          'إجمالي الإجازات الأسبوعية': formatNumber(totals.totalWeeklyOffDays),
          'إجمالي بدل الإجازة': formatNumber(totals.totalLeaveAllowance),
          'إجمالي الغياب': formatNumber(totals.totalAbsentDays),
          'إجمالي الساعات المخصومة': formatNumber(totals.totalDeductedHours),
          'إجمالي الإجازات السنوية': formatNumber(totals.totalAnnualLeaveDays),
          'إجمالي خصم الإجازة المرضية': formatNumber(totals.totalSickLeaveDeduction),
          'رصيد الإجازة السنوية': formatNumber(totals.annualLeaveBalance),
          'إجمالي الإجازات الرسمية': formatNumber(totals.totalOfficialLeaveDays),
          'إجمالي الأيام المخصومة': formatNumber(totals.totalDeductedDays),
          'إجمالي الساعات الإضافية': formatNumber(totals.totalOvertimeHours),
          'منحة مناسبة': formatNumber(totals.occasionBonus),
          'إجمالي المخالفات': formatNumber(totals.totalViolations),
          'خصم قسط المخالفات': formatNumber(totals.violationDeduction),
          'إجمالي السلف': formatNumber(totals.totalLoans),
          'خصم قسط السلف': formatNumber(totals.loanDeduction),
          'جزاءات': formatNumber(totals.penalties),
          'إجمالي قيمة الخصومات': formatNumber(totals.totalDeductions),
          'إجمالي الإضافي': formatNumber(totals.totalOvertimeAmount),
          'الصافي': formatNumber(totals.finalSalary),
        },
      ];
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير الرواتب');
      XLSX.writeFile(wb, 'monthly_salary_report.xlsx');
      toast.success('تم تصدير التقرير إلى Excel بنجاح', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#F3E8FF', color: '#6B46C1', fontFamily: 'Noto Sans Arabic' },
      });
    } catch (err) {
      toast.error(`حدث خطأ أثناء تصدير Excel: ${err.message}`, {
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

  const exportToPDF = async () => {
    setLoading(true);
    try {
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
      const totalsRow = tempContainer.querySelector('table').insertRow(0);
      totalsRow.className = 'bg-purple-50 font-bold';
      totalsRow.innerHTML = `
        <td class="py-4 px-6 text-right text-sm text-gray-800" colspan="2">إجمالي</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.basicSalary)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalSalaryWithAllowances)}</td>
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
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.violationDeduction)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalLoans)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.loanDeduction)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.penalties)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalDeductions)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.totalOvertimeAmount)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800">${formatNumber(totals.finalSalary)}</td>
        <td class="py-4 px-6 text-right text-sm text-gray-800"></td>
      `;
      document.body.appendChild(tempContainer);
      const canvas = await html2canvas(tempContainer, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: 420 * 3,
        windowHeight: 297 * 3,
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
      toast.success('تم تصدير التقرير إلى PDF بنجاح', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        style: { backgroundColor: '#F3E8FF', color: '#6B46C1', fontFamily: 'Noto Sans Arabic' },
      });
    } catch (err) {
      toast.error(`حدث خطأ أثناء تصدير PDF: ${err.message}`, {
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

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 sm:p-6 md:p-8 font-noto-sans-arabic dir=rtl" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'none' }}>
      <div className="container mx-auto max-w-7xl">
        <motion.h2
          variants={inputVariants}
          initial="hidden"
          animate="visible"
          className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 text-center tracking-tight"
        >
          NileMix HR System - تقرير الرواتب الشهري
        </motion.h2>
        <div className="flex justify-center mb-6">
          <img
            src="http://www.nilemix.com/wp-content/uploads/2016/05/logo.png"
            alt="NileMix Logo"
            className="h-16 sm:h-20"
          />
        </div>
        <div className="flex items-center space-x-4 space-x-reverse mb-6">
          <SalaryIcon />
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">تقرير الرواتب الشهري</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mb-6">
          <motion.input
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
            type="text"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            placeholder="أدخل كود الموظف"
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
            disabled={loading}
          />
          <motion.input
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
            disabled={loading}
          />
          <motion.select
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right"
            disabled={loading}
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
            disabled={loading}
            className="px-4 py-3 bg-purple-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md disabled:bg-purple-400"
          >
            بحث
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleShowAll}
            disabled={loading}
            className="px-4 py-3 bg-purple-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md disabled:bg-purple-400"
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
                disabled={loading}
                className="px-4 py-3 bg-purple-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md disabled:bg-purple-400 flex items-center justify-center"
              >
                <Download className="h-4 w-4 ml-2" /> تصدير إلى Excel
              </motion.button>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={exportToPDF}
                disabled={loading}
                className="px-4 py-3 bg-purple-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md disabled:bg-purple-400 flex items-center justify-center"
              >
                <Download className="h-4 w-4 ml-2" /> تصدير إلى PDF
              </motion.button>
            </>
          )}
        </div>
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
        <motion.div
          variants={tableVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 border border-gray-200/50 backdrop-blur-sm mt-8 overflow-x-auto"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">قائمة الرواتب</h3>
          {data.length === 0 ? (
            <p className="text-gray-600 text-center">لا توجد رواتب مسجلة</p>
          ) : (
            <table ref={tableRef} className="w-full text-right border-separate border-spacing-y-2">
              <thead>
                <tr className="bg-gray-50 text-gray-900">
                  <th className="p-4 rounded-xl">كود الموظف</th>
                  <th className="p-4 rounded-xl">اسم الموظف</th>
                  <th className="p-4 rounded-xl">الراتب الأساسي</th>
                  <th className="p-4 rounded-xl">الراتب الإجمالي بالبدلات</th>
                  <th className="p-4 rounded-xl">التأمين الطبي</th>
                  <th className="p-4 rounded-xl">التأمين الاجتماعي</th>
                  <th className="p-4 rounded-xl">بدل الوجبة</th>
                  <th className="p-4 rounded-xl">خصومات بدل الوجبة</th>
                  <th className="p-4 rounded-xl">بدل الوجبة المتبقي</th>
                  <th className="p-4 rounded-xl">نوع الشيفت</th>
                  <th className="p-4 rounded-xl">إجمالي أيام الحضور</th>
                  <th className="p-4 rounded-xl">إجمالي الإجازات الأسبوعية</th>
                  <th className="p-4 rounded-xl">إجمالي بدل الإجازة</th>
                  <th className="p-4 rounded-xl">إجمالي الغياب</th>
                  <th className="p-4 rounded-xl">إجمالي الساعات المخصومة</th>
                  <th className="p-4 rounded-xl">إجمالي الإجازات السنوية</th>
                  <th className="p-4 rounded-xl">إجمالي خصم الإجازة المرضية</th>
                  <th className="p-4 rounded-xl">رصيد الإجازة السنوية</th>
                  <th className="p-4 rounded-xl">إجمالي الإجازات الرسمية</th>
                  <th className="p-4 rounded-xl">إجمالي الأيام المخصومة</th>
                  <th className="p-4 rounded-xl">إجمالي الساعات الإضافية</th>
                  <th className="p-4 rounded-xl">منحة مناسبة</th>
                  <th className="p-4 rounded-xl">إجمالي المخالفات</th>
                  <th className="p-4 rounded-xl">خصم قسط المخالفات</th>
                  <th className="p-4 rounded-xl">إجمالي السلف</th>
                  <th className="p-4 rounded-xl">خصم قسط السلف</th>
                  <th className="p-4 rounded-xl">جزاءات</th>
                  <th className="p-4 rounded-xl">إجمالي قيمة الخصومات</th>
                  <th className="p-4 rounded-xl">إجمالي الإضافي</th>
                  <th className="p-4 rounded-xl">الصافي</th>
                  {userRole === 'admin' && <th className="p-4 rounded-xl">إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-all duration-200 rounded-xl bg-white">
                    <td className="p-4 border-b border-gray-200">{row.employeeCode}</td>
                    <td className="p-4 border-b border-gray-200">{row.employeeName}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.basicSalary)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalSalaryWithAllowances)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.medicalInsurance)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.socialInsurance)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.mealAllowance)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.mealDeduction)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.remainingMealAllowance)}</td>
                    <td className="p-4 border-b border-gray-200">{row.shiftName}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalAttendanceDays)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalWeeklyOffDays)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalLeaveAllowance)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalAbsentDays)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalDeductedHours)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalAnnualLeaveDays)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalSickLeaveDeduction)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.annualLeaveBalance)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalOfficialLeaveDays)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalDeductedDays)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalOvertimeHours)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.occasionBonus)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalViolations)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.violationDeduction)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalLoans)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.loanDeduction)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.penalties)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalDeductions)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.totalOvertimeAmount)}</td>
                    <td className="p-4 border-b border-gray-200">{formatNumber(row.finalSalary)}</td>
                    {userRole === 'admin' && (
                      <td className="p-4 border-b border-gray-200 flex space-x-2 space-x-reverse">
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => openEditModal(row)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-md"
                        >
                          تعديل
                        </motion.button>
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="p-4" colSpan="2">إجمالي</td>
                  <td className="p-4">{formatNumber(totals.basicSalary)}</td>
                  <td className="p-4">{formatNumber(totals.totalSalaryWithAllowances)}</td>
                  <td className="p-4">{formatNumber(totals.medicalInsurance)}</td>
                  <td className="p-4">{formatNumber(totals.socialInsurance)}</td>
                  <td className="p-4">{formatNumber(totals.mealAllowance)}</td>
                  <td className="p-4">{formatNumber(totals.mealDeduction)}</td>
                  <td className="p-4">{formatNumber(totals.remainingMealAllowance)}</td>
                  <td className="p-4"></td>
                  <td className="p-4">{formatNumber(totals.totalAttendanceDays)}</td>
                  <td className="p-4">{formatNumber(totals.totalWeeklyOffDays)}</td>
                  <td className="p-4">{formatNumber(totals.totalLeaveAllowance)}</td>
                  <td className="p-4">{formatNumber(totals.totalAbsentDays)}</td>
                  <td className="p-4">{formatNumber(totals.totalDeductedHours)}</td>
                  <td className="p-4">{formatNumber(totals.totalAnnualLeaveDays)}</td>
                  <td className="p-4">{formatNumber(totals.totalSickLeaveDeduction)}</td>
                  <td className="p-4">{formatNumber(totals.annualLeaveBalance)}</td>
                  <td className="p-4">{formatNumber(totals.totalOfficialLeaveDays)}</td>
                  <td className="p-4">{formatNumber(totals.totalDeductedDays)}</td>
                  <td className="p-4">{formatNumber(totals.totalOvertimeHours)}</td>
                  <td className="p-4">{formatNumber(totals.occasionBonus)}</td>
                  <td className="p-4">{formatNumber(totals.totalViolations)}</td>
                  <td className="p-4">{formatNumber(totals.violationDeduction)}</td>
                  <td className="p-4">{formatNumber(totals.totalLoans)}</td>
                  <td className="p-4">{formatNumber(totals.loanDeduction)}</td>
                  <td className="p-4">{formatNumber(totals.penalties)}</td>
                  <td className="p-4">{formatNumber(totals.totalDeductions)}</td>
                  <td className="p-4">{formatNumber(totals.totalOvertimeAmount)}</td>
                  <td className="p-4">{formatNumber(totals.finalSalary)}</td>
                  {userRole === 'admin' && <td className="p-4"></td>}
                </tr>
              </tbody>
            </table>
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
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full border border-gray-200/50 backdrop-blur-sm"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">تعديل الرواتب</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">إجمالي المخالفات</label>
                    <input
                      type="number"
                      name="totalViolations"
                      value={editValues.totalViolations}
                      onChange={handleEditChange}
                      placeholder="إجمالي المخالفات"
                      className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">خصم قسط المخالفات</label>
                    <input
                      type="number"
                      name="violationDeduction"
                      value={editValues.violationDeduction}
                      onChange={handleEditChange}
                      placeholder="خصم قسط المخالفات"
                      className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">إجمالي السلف</label>
                    <input
                      type="number"
                      name="totalLoans"
                      value={editValues.totalLoans}
                      onChange={handleEditChange}
                      placeholder="إجمالي السلف"
                      className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">خصم قسط السلف</label>
                    <input
                      type="number"
                      name="loanDeduction"
                      value={editValues.loanDeduction}
                      onChange={handleEditChange}
                      placeholder="خصم قسط السلف"
                      className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">منحة مناسبة</label>
                    <input
                      type="number"
                      name="occasionBonus"
                      value={editValues.occasionBonus}
                      onChange={handleEditChange}
                      placeholder="منحة مناسبة"
                      className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">جزاءات</label>
                    <input
                      type="number"
                      name="penalties"
                      value={editValues.penalties}
                      onChange={handleEditChange}
                      placeholder="جزاءات"
                      className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 transition-all duration-200 bg-gray-50 text-sm shadow-sm text-right w-full"
                    />
                  </div>
                </div>
                <div className="flex justify-between mt-6 space-x-4 space-x-reverse">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={saveEdit}
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

export default MonthlySalaryReport;
