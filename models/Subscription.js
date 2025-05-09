// models/Subscription.js
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  planName: String,
  amount: Number,
  billingType: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  nextBillingDate: Date,
  stripeSubscriptionId: String,
  stripeCustomerId: String,
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  }
}, {
  timestamps: true
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;