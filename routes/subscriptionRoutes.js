const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

// Add to your routes/subscriptions.js or wherever appropriate
// @route   GET /api/subscriptions/my-subscriptions
// @desc    Get user's active subscriptions
// @access  Private
router.get('/my-subscriptions', auth, async (req, res) => {
    try {
      // Find all active subscriptions for the current user
      const subscriptions = await Subscription.find({
        user: req.user.id,
        status: 'active'
      }).populate('plan').populate('campaign');
      
      res.json(subscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // @route   GET /api/subscriptions/current
  // @desc    Get user's current subscription
  // @access  Private
  router.get('/current', auth, async (req, res) => {
    try {
      // Find the most recent active subscription
      const subscription = await Subscription.findOne({
        user: req.user.id,
        status: 'active'
      })
      .sort({ createdAt: -1 })
      .populate('plan')
      .populate('campaign');
      
      if (!subscription) {
        return res.status(404).json({ message: 'No active subscription found' });
      }
      
      res.json(subscription);
    } catch (error) {
      console.error('Error fetching current subscription:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });


module.exports = router;