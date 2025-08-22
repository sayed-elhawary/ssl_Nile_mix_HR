const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));
const path = require('path');
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));


const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/shift');
const userRoutes = require('./routes/user');
const attendanceRoutes = require('./routes/attendance');
const violationRoutes = require('./routes/violations');
app.use('/api/violations', violationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shift', shiftRoutes);
app.use('/api/user', userRoutes);
app.use('/api/attendance', attendanceRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
