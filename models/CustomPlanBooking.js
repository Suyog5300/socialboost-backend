// /backend/models/CustomPlanBooking.js
const mongoose = require('mongoose');

const customPlanBookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  website: String,
  instagramHandle: {
    type: String,
    required: true
  },
  currentFollowers: {
    type: String,
    required: true
  },
  goalFollowers: {
    type: String,
    required: true
  },
  targetAudience: {
    type: String,
    required: true
  },
  preferredDate: {
    type: Date,
    required: true
  },
  preferredTime: {
    type: String,
    required: true
  },
  additionalInfo: String,
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'completed', 'cancelled'],
    default: 'pending'
  },
// Add these fields if they don't exist already
meetingLink: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  leadResult: {
    type: String,
    enum: ['converted', 'not_interested', 'follow_up_needed'],
  },
  customPlan: {
    monthlyPrice: Number,
    features: [String],
    additionalDetails: String,
    approved: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

const CustomPlanBooking = mongoose.model('CustomPlanBooking', customPlanBookingSchema);
module.exports = CustomPlanBooking;