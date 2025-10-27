const mongoose = require('mongoose');

const comparisonFeatureSchema = new mongoose.Schema({
  feature: {
    type: String,
    required: true,
    trim: true
  },
  us: {
    type: Boolean,
    default: true
  },
  others: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ComparisonFeature', comparisonFeatureSchema);