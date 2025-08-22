const mongoose = require('mongoose');
const violationSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String },
  violationPrice: { type: Number, required: true },
  date: { type: Date, required: true },
  vehicleCode: { type: String, required: true },
  station: { type: String, required: true },
  violationImage: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('Violation', violationSchema);
