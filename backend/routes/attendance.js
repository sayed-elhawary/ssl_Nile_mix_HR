const express = require('express');
const router = express.Router();
const {
  uploadAttendance,
  getAttendance,
  deleteAllAttendance,
  updateAttendance,
  applyOfficialLeave,
  applyAnnualLeave,
  applySickLeave
} = require('../controllers/attendance');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('file'), uploadAttendance);
router.get('/', getAttendance);
router.delete('/delete-all', deleteAllAttendance);
router.patch('/:id', updateAttendance);
router.post('/official-leave', applyOfficialLeave);
router.post('/annual-leave', applyAnnualLeave);
router.post('/sick-leave', applySickLeave);

module.exports = router;
