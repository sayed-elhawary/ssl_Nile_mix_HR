const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Shift = require('../models/Shift');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await User.find().populate('shiftType');
    res.json(users);
  } catch (err) {
    console.error('Error in GET /user:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.get('/shifts', async (req, res) => {
  try {
    const shifts = await Shift.find();
    res.json(shifts);
  } catch (err) {
    console.error('Error in GET /shifts:', err);
    res.status(500).json({ success: false, message: `حدث خطأ أثناء جلب الشيفتات: ${err.message}` });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { password, ...otherData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ ...otherData, password: hashedPassword });
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /create:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.put('/update/:id', async (req, res) => {
  try {
    const { password, ...otherData } = req.body;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(req.params.id, { ...otherData, password: hashedPassword });
    } else {
      await User.findByIdAndUpdate(req.params.id, otherData);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /update/:id:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.put('/update-many', async (req, res) => {
  try {
    const { updates, shiftType, excludedUsers, annualIncreasePercentage } = req.body;
    let filter = shiftType ? { shiftType } : {};
    if (excludedUsers && excludedUsers.length > 0) {
      filter._id = { $nin: excludedUsers };
    }
    if (annualIncreasePercentage) {
      await User.updateMany(filter, [
        {
          $set: {
            basicSalary: { $multiply: ['$basicSalary', 1 + annualIncreasePercentage / 100] },
            netSalary: {
              $add: [
                { $multiply: ['$basicSalary', 1 + annualIncreasePercentage / 100] },
                '$basicBonus',
                '$mealAllowance',
              ],
            },
          },
        },
      ]);
    } else {
      await User.updateMany(filter, updates);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /update-many:', err);
    res.status(500).json({ success: false, message: `حدث خطأ، حاول مرة أخرى: ${err.message}` });
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /delete/:id:', err);
    res.status(500).json({ success: false, message: `حدث خطأ أثناء الحذف: ${err.message}` });
  }
});

module.exports = router;
