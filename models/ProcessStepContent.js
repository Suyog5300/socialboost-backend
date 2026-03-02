const mongoose = require('mongoose');

const processStepSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    enum: ['target', 'users', 'trendingUp', 'barChart4', 'search', 'zap'],
    required: true
  },
  color: {
    type: String,
    required: true,
    default: 'from-blue-500 to-indigo-600'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProcessStep', processStepSchema);