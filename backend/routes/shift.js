const express = require('express');
const Shift = require('../models/Shift');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const shifts = await Shift.find();
    res.json(shifts);
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ، حاول مرة أخرى' });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { shiftType, startTime, endTime, baseHours, maxOvertimeHours, deductions, isCrossDay, ...rest } = req.body;
    if (Number(baseHours) <= 0) {
      return res.status(400).json({ success: false, message: 'الساعات الأساسية يجب أن تكون قيمة إيجابية' });
    }
    if (shiftType === 'morning' || shiftType === 'evening') {
      if (!startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'يجب إدخال وقت البداية والنهاية للشيفت الصباحي أو المسائي' });
      }
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      let [endHours, endMinutes] = endTime.split(':').map(Number);
      const start = new Date(2025, 0, 1, startHours, startMinutes);
      let end = new Date(2025, 0, 1, endHours, endMinutes);
      if (shiftType === 'evening' && end <= start) {
        end.setDate(end.getDate() + 1); // الشيفت المسائي يمتد لليوم التالي
      }
      const calculatedBaseHours = (end - start) / (1000 * 60 * 60);
      if (calculatedBaseHours !== Number(baseHours)) {
        return res.status(400).json({ success: false, message: 'الساعات الأساسية يجب أن تتطابق مع الفرق بين وقت البداية والنهاية' });
      }
      for (const deduction of deductions) {
        const [dedStartHours, dedStartMinutes] = deduction.start.split(':').map(Number);
        let [dedEndHours, dedEndMinutes] = deduction.end.split(':').map(Number);
        const dedStart = new Date(2025, 0, 1, dedStartHours, dedStartMinutes);
        let dedEnd = new Date(2025, 0, 1, dedEndHours, dedEndMinutes);
        if (shiftType === 'evening' && dedEnd <= dedStart) {
          dedEnd.setDate(dedEnd.getDate() + 1);
        }
        if (dedEnd <= dedStart) {
          return res.status(400).json({ success: false, message: 'وقت نهاية الخصم يجب أن يكون بعد وقت البداية' });
        }
      }
    } else if (shiftType === '24/24') {
      if (Number(maxOvertimeHours) <= 0) {
        return res.status(400).json({ success: false, message: 'الساعات الإضافية يجب أن تكون قيمة إيجابية لشيفت 24/24' });
      }
      for (const deduction of deductions) {
        if (Number(deduction.duration) <= 0 || Number(deduction.deductionAmount) <= 0) {
          return res.status(400).json({ success: false, message: 'مدة الخصم ومقدار الخصم يجب أن يكونا قيمتين إيجابيتين' });
        }
        if (Number(deduction.duration) > Number(baseHours) * 60) {
          return res.status(400).json({ success: false, message: 'مدة الخصم يجب ألا تتجاوز الساعات الأساسية' });
        }
      }
    }
    const shift = new Shift(req.body);
    await shift.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ، حاول مرة أخرى' });
  }
});

router.put('/update/:id', async (req, res) => {
  try {
    const { shiftType, startTime, endTime, baseHours, maxOvertimeHours, deductions, isCrossDay, ...rest } = req.body;
    if (Number(baseHours) <= 0) {
      return res.status(400).json({ success: false, message: 'الساعات الأساسية يجب أن تكون قيمة إيجابية' });
    }
    if (shiftType === 'morning' || shiftType === 'evening') {
      if (!startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'يجب إدخال وقت البداية والنهاية للشيفت الصباحي أو المسائي' });
      }
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      let [endHours, endMinutes] = endTime.split(':').map(Number);
      const start = new Date(2025, 0, 1, startHours, startMinutes);
      let end = new Date(2025, 0, 1, endHours, endMinutes);
      if (shiftType === 'evening' && end <= start) {
        end.setDate(end.getDate() + 1);
      }
      const calculatedBaseHours = (end - start) / (1000 * 60 * 60);
      if (calculatedBaseHours !== Number(baseHours)) {
        return res.status(400).json({ success: false, message: 'الساعات الأساسية يجب أن تتطابق مع الفرق بين وقت البداية والنهاية' });
      }
      for (const deduction of deductions) {
        const [dedStartHours, dedStartMinutes] = deduction.start.split(':').map(Number);
        let [dedEndHours, dedEndMinutes] = deduction.end.split(':').map(Number);
        const dedStart = new Date(2025, 0, 1, dedStartHours, dedStartMinutes);
        let dedEnd = new Date(2025, 0, 1, dedEndHours, dedEndMinutes);
        if (shiftType === 'evening' && dedEnd <= dedStart) {
          dedEnd.setDate(dedEnd.getDate() + 1);
        }
        if (dedEnd <= dedStart) {
          return res.status(400).json({ success: false, message: 'وقت نهاية الخصم يجب أن يكون بعد وقت البداية' });
        }
      }
    } else if (shiftType === '24/24') {
      if (Number(maxOvertimeHours) <= 0) {
        return res.status(400).json({ success: false, message: 'الساعات الإضافية يجب أن تكون قيمة إيجابية لشيفت 24/24' });
      }
      for (const deduction of deductions) {
        if (Number(deduction.duration) <= 0 || Number(deduction.deductionAmount) <= 0) {
          return res.status(400).json({ success: false, message: 'مدة الخصم ومقدار الخصم يجب أن يكونا قيمتين إيجابيتين' });
        }
        if (Number(deduction.duration) > Number(baseHours) * 60) {
          return res.status(400).json({ success: false, message: 'مدة الخصم يجب ألا تتجاوز الساعات الأساسية' });
        }
      }
    }
    await Shift.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ، حاول مرة أخرى' });
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    await Shift.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ، حاول مرة أخرى' });
  }
});

module.exports = router;
