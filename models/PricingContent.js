const mongoose = require('mongoose');

const pricingContentSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  monthlyPrice: {
    type: Number,
    default: null
  },
  annualPrice: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  features: [{
    title: String,
    included: Boolean
  }],
  cta: {
    type: String,
    required: true
  },
  highlight: {
    type: String,
    required: true
  },
  popular: {
    type: Boolean,
    default: false
  },
  badge: {
    type: String,
    default: null
  },
  accentGradient: {
    type: String,
    required: true
  },
  accentLight: {
    type: String,
    required: true
  },
  accentText: {
    type: String,
    required: true
  },
  accentBorder: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
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

module.exports = mongoose.model('PricingContent', pricingContentSchema);