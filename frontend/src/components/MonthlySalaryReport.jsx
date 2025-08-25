import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// مكونات مخصصة للتحميل والنجاح
const CustomCheckIcon = () => (
  <svg className="w-16 h-16 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const CustomLoadingSpinner = () => (
  <svg className="w-16 h-16 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"></path>
  </svg>
);

function MonthlySalaryReport() {
  const [data, setData] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [yearMonth, setYearMonth] = useState('2025-05');
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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في جلب الشيفتات');
      }
      const shiftsData = await response.json();
      setShifts(shiftsData);
    } catch (err) {
      setError(`حدث خطأ أثناء جلب الشيفتات: ${err.message}`);
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      // التحقق من صيغة yearMonth
      const [year, month] = yearMonth.split('-');
      if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        throw new Error('تنسيق الشهر غير صالح، استخدم YYYY-MM');
      }

      // التحقق من وجود التوكن
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
        if (response.status === 401) {
          throw new Error('التوكن غير صالح أو منتهي الصلاحية، يرجى تسجيل الدخول مرة أخرى');
        }
        if (response.status === 400) {
          throw new Error(errorData.message || 'بيانات الإدخال غير صالحة');
        }
        if (response.status === 404) {
          throw new Error(errorData.message || 'لا يوجد بيانات للتقرير');
        }
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
      }));
      setData(processedData);
      setShowSuccessAnimation(true);
      setSuccessMessage('تم جلب التقرير بنجاح');
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    } catch (err) {
      setError(`حدث خطأ أثناء جلب التقرير: ${err.message}`);
      console.error('Error fetching report:', err);
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
      if (!editUser || !editUser.employeeCode) {
        throw new Error('كود الموظف غير موجود');
      }
      if (
        editValues.totalViolations === undefined ||
        editValues.violationDeduction === undefined ||
        editValues.totalLoans === undefined ||
        editValues.loanDeduction === undefined ||
        editValues.occasionBonus === undefined
      ) {
        throw new Error('يرجى ملء جميع الحقول بقيم صالحة');
      }
      if (editValues.violationDeduction > editValues.totalViolations) {
        throw new Error('قسط المخالفات لا يمكن أن يكون أكبر من إجمالي المخالفات');
      }
      if (editValues.loanDeduction > editValues.totalLoans) {
        throw new Error('قسط السلف لا يمكن أن يكون أكبر من إجمالي السلف');
      }
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
                totalDeductions:
                  Number(row.totalDeductions) -
                  Number(row.violationDeduction) -
                  Number(row.loanDeduction) +
                  Number(responseData.data.violationDeduction || 0) +
                  Number(responseData.data.loanDeduction || 0),
                finalSalary:
                  Number(row.totalOvertimeAmount) -
                  (Number(row.totalDeductions) -
                    Number(row.violationDeduction) -
                    Number(row.loanDeduction) +
                    Number(responseData.data.violationDeduction || 0) +
                    Number(responseData.data.loanDeduction || 0)),
              }
            : row
        )
      );
      setShowSuccessAnimation(true);
      setSuccessMessage('تم التعديل بنجاح');
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setEditModalOpen(false);
      }, 2000);
    } catch (err) {
      setError(`حدث خطأ أثناء التعديل: ${err.message}`);
      console.error('Error saving edit:', err);
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
          'إجمالي قيمة الخصومات': formatNumber(totals.totalDeductions),
          'إجمالي الإضافي': formatNumber(totals.totalOvertimeAmount),
          'الصافي': formatNumber(totals.finalSalary),
        },
      ];
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير الرواتب');
      XLSX.writeFile(wb, 'monthly_salary_report.xlsx');
    } catch (err) {
      setError(`حدث خطأ أثناء تصدير Excel: ${err.message}`);
      console.error('Error exporting to Excel:', err);
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
    } catch (err) {
      setError(`حدث خطأ أثناء تصدير PDF: ${err.message}`);
      console.error('Error exporting to PDF:', err);
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

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3, ease: 'easeIn' } },
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
        {successMessage && (
          <p className="text-purple-600 mb-4 text-sm text-right font-medium bg-purple-50 p-3 rounded-xl">
            {successMessage}
          </p>
        )}
        {showSuccessAnimation && (
          <div className="flex justify-center mb-6">
            <CustomCheckIcon />
          </div>
        )}
        <div className="mb-6 flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4 md:space-x-reverse">
          <input
            type="text"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            placeholder="كود الموظف"
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
          />
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
          />
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full md:w-1/5 p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm text-sm bg-white"
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
                <th className="py-4 px-6 text-right text-sm font-bold text-purple-600 uppercase tracking-wider">الراتب الإجمالي بالبدلات</th>
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
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{row.employeeName}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.basicSalary)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalSalaryWithAllowances)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.medicalInsurance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.socialInsurance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.mealAllowance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.mealDeduction)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.remainingMealAllowance)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{row.shiftName}</td>
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
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.violationDeduction)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalLoans)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.loanDeduction)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalDeductions)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.totalOvertimeAmount)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-700">{formatNumber(row.finalSalary)}</td>
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
                <td className="py-4 px-6 text-right text-sm text-gray-800" colSpan="2">إجمالي</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.basicSalary)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalSalaryWithAllowances)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.medicalInsurance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.socialInsurance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.mealAllowance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.mealDeduction)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.remainingMealAllowance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800"></td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalAttendanceDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalWeeklyOffDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalLeaveAllowance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalAbsentDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalDeductedHours)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalAnnualLeaveDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalSickLeaveDeduction)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.annualLeaveBalance)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalOfficialLeaveDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalDeductedDays)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalOvertimeHours)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.occasionBonus)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalViolations)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.violationDeduction)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalLoans)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.loanDeduction)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalDeductions)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.totalOvertimeAmount)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800">{formatNumber(totals.finalSalary)}</td>
                <td className="py-4 px-6 text-right text-sm text-gray-800"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <AnimatePresence>
          {editModalOpen && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
                <h3 className="text-xl font-bold text-purple-600 mb-6 text-right">تعديل بيانات الراتب</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">إجمالي المخالفات</label>
                    <input
                      type="number"
                      name="totalViolations"
                      value={editValues.totalViolations || ''}
                      onChange={handleEditChange}
                      className="mt-1 w-full p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">خصم قسط المخالفات</label>
                    <input
                      type="number"
                      name="violationDeduction"
                      value={editValues.violationDeduction || ''}
                      onChange={handleEditChange}
                      className="mt-1 w-full p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">إجمالي السلف</label>
                    <input
                      type="number"
                      name="totalLoans"
                      value={editValues.totalLoans || ''}
                      onChange={handleEditChange}
                      className="mt-1 w-full p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">خصم قسط السلف</label>
                    <input
                      type="number"
                      name="loanDeduction"
                      value={editValues.loanDeduction || ''}
                      onChange={handleEditChange}
                      className="mt-1 w-full p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">منحة مناسبة</label>
                    <input
                      type="number"
                      name="occasionBonus"
                      value={editValues.occasionBonus || ''}
                      onChange={handleEditChange}
                      className="mt-1 w-full p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
                      min="0"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={saveEdit}
                    className="bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700 transition duration-300 text-sm font-medium shadow-md"
                  >
                    حفظ
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setEditModalOpen(false)}
                    className="bg-gray-600 text-white p-3 rounded-2xl hover:bg-gray-700 transition duration-300 text-sm font-medium shadow-md"
                  >
                    إلغاء
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default MonthlySalaryReport;
