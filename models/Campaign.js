// /backend/models/Campaign.js
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed'],
    default: 'draft'
  },
  demographics: {
    age: [String],
    gender: String,
    location: String
  },
  interests: [String],
  behaviors: [String],
  socialMedia: {
    platform: {
      type: String,
      default: 'instagram'
    },
    username: String
  },
  metrics: {
    impressions: { type: Number, default: 0 },
    engagements: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    lastUpdated: Date
  },
  startDate: Date,
  endDate: Date
}, {
  timestamps: true
});

const Campaign = mongoose.model('Campaign', campaignSchema);
module.exports = Campaign;