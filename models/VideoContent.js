const mongoose = require('mongoose');

const videoContentSchema = new mongoose.Schema({
  testimonialId: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
  },
  borderColor: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  textOverlay: {
    type: String,
    default: ''
  },
  followers: {
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

module.exports = mongoose.model('VideoContent', videoContentSchema);