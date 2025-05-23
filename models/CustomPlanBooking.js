// /backend/models/CustomPlanBooking.js - Updated with Google Calendar fields
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
  // goalFollowers: {
  //   type: String,
  //   // required: true
  // },
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
    enum: ['pending', 'scheduled', 'completed', 'cancelled', 'rescheduled'],
    default: 'pending'
  },
  meetingLink: String,
  
  // Google Calendar Integration Fields
  googleCalendarEventId: {
    type: String,
    index: true // Add index for faster queries
  },
  calendarEventUrl: String, // Direct link to the calendar event
  
  // Meeting Details
  meetingDuration: {
    type: Number,
    default: 30, // Duration in minutes
  },
  timeZone: {
    type: String,
    default: 'America/New_York'
  },
  
  // Rescheduling History
  rescheduleHistory: [{
    originalDate: Date,
    originalTime: String,
    newDate: Date,
    newTime: String,
    reason: String,
    rescheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rescheduledAt: {
      type: Date,
      default: Date.now
    }
  }],
  
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
    enum: ['converted', 'not_interested', 'follow_up_needed', 'no_show'],
  },
  customPlan: {
    monthlyPrice: Number,
    features: [String],
    additionalDetails: String,
    approved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date
  },
  
  // Email Tracking
  emailsSent: {
    confirmationSent: {
      type: Boolean,
      default: false
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    followUpSent: {
      type: Boolean,
      default: false
    }
  },
  
  // Meeting Feedback
  meetingFeedback: {
    attended: Boolean,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    followUpRequired: Boolean
  }
}, {
  timestamps: true
});

// Index for efficient queries
customPlanBookingSchema.index({ user: 1, status: 1 });
customPlanBookingSchema.index({ preferredDate: 1 });
customPlanBookingSchema.index({ googleCalendarEventId: 1 });

// Virtual for formatted date
customPlanBookingSchema.virtual('formattedDate').get(function() {
  return this.preferredDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Instance method to check if booking is in the past
customPlanBookingSchema.methods.isPastDue = function() {
  const now = new Date();
  const bookingDateTime = new Date(`${this.preferredDate.toISOString().split('T')[0]}T${this.preferredTime}`);
  return bookingDateTime < now;
};

// Instance method to get time until meeting
customPlanBookingSchema.methods.getTimeUntilMeeting = function() {
  const now = new Date();
  const bookingDateTime = new Date(`${this.preferredDate.toISOString().split('T')[0]}T${this.preferredTime}`);
  const diffInMs = bookingDateTime - now;
  
  if (diffInMs < 0) return 'Past due';
  
  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days} days, ${hours} hours`;
  if (hours > 0) return `${hours} hours, ${minutes} minutes`;
  return `${minutes} minutes`;
};

// Static method to find upcoming bookings
customPlanBookingSchema.statics.findUpcomingBookings = function(daysAhead = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + daysAhead);
  
  return this.find({
    preferredDate: {
      $gte: now,
      $lte: future
    },
    status: { $in: ['scheduled', 'pending'] }
  }).populate('user assignedTo');
};

// Pre-save middleware to track rescheduling
customPlanBookingSchema.pre('save', function(next) {
  if (this.isModified('preferredDate') && !this.isNew) {
    // Track rescheduling history
    const originalDate = this.constructor.findById(this._id).then(original => {
      if (original && original.preferredDate.getTime() !== this.preferredDate.getTime()) {
        this.rescheduleHistory.push({
          originalDate: original.preferredDate,
          originalTime: original.preferredTime,
          newDate: this.preferredDate,
          newTime: this.preferredTime,
          reason: 'Rescheduled via admin panel'
        });
      }
    });
  }
  next();
});

const CustomPlanBooking = mongoose.model('CustomPlanBooking', customPlanBookingSchema);

module.exports = CustomPlanBooking;