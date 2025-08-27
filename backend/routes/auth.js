const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { employeeCode, password } = req.body;
  try {
    const user = await User.findOne({ employeeCode });
    if (!user) {
      return res.status(400).json({ success: false, message: 'كود الموظف غير موجود' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'كلمة المرور غير صحيحة' });
    }
    const token = jwt.sign({ id: user._id, employeeCode: user.employeeCode, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      success: true, 
      token,
      user: {
        employeeCode: user.employeeCode,
        name: user.name,
        department: user.department,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ، حاول مرة أخرى' });
  }
});

module.exports = router;
