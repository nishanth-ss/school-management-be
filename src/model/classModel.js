// models/ClassInfo.js
const mongoose = require('mongoose');

const classInfoSchema = new mongoose.Schema({
  class_name: { type: String, required: true },
  section: { type: String },
  academic_year: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ClassInfo', classInfoSchema);
