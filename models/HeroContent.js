const mongoose = require('mongoose');

const heroContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  primaryButtonText: {
    type: String,
    required: true
  },
  primaryButtonLink: {
    type: String,
    required: true
  },
  secondaryButtonText: {
    type: String,
    default: null
  },
  secondaryButtonLink: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HeroContent', heroContentSchema);