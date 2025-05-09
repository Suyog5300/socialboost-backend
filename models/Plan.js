// /backend/models/Plan.js
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  monthlyPrice: {
    type: Number,
    required: [true, 'Monthly price is required'],
    min: 0,
    validate: {
      validator: function(value) {
        return !isNaN(value);
      },
      message: props => `${props.value} is not a valid number for monthlyPrice`
    }
  },
  annualPrice: {
    type: Number,
    required: [true, 'Annual price is required'],
    min: 0,
    validate: {
      validator: function(value) {
        return !isNaN(value);
      },
      message: props => `${props.value} is not a valid number for annualPrice`
    }
  },
  features: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

const Plan = mongoose.model('Plan', planSchema);
module.exports = Plan;