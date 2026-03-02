// /backend/routes/adminSubscriptions.js
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { UserRole } = require('../models/User');
const Subscription = require('../models/Subscription');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @route   POST /api/admin/subscriptions/:id/cancel
// @desc    Cancel a user's subscription (Admin only)
// @access  Private (Admin, SuperAdmin)
router.post(
  '/:id/cancel',
  [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)],
  async (req, res) => {
    try {
      const subscriptionId = req.params.id;
      const { cancelImmediately } = req.body; // Option to cancel immediately or at period end

      // Find the subscription
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      // Check if already cancelled
      if (subscription.status === 'cancelled') {
        return res.status(400).json({ message: 'Subscription is already cancelled' });
      }

      // Cancel in Stripe
      if (subscription.stripeSubscriptionId) {
        try {
          if (cancelImmediately) {
            // Cancel immediately
            await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
            
            // Update subscription status immediately
            subscription.status = 'cancelled';
            subscription.nextBillingDate = new Date(); // Set to current date
          } else {
            // Cancel at period end
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
              cancel_at_period_end: true
            });
            
            // Keep status as active but mark for cancellation
            subscription.status = 'cancelled';
            // nextBillingDate remains the same - when it will actually end
          }
        } catch (stripeError) {
          console.error('Stripe cancellation error:', stripeError);
          return res.status(500).json({ 
            message: 'Failed to cancel subscription in Stripe',
            error: stripeError.message 
          });
        }
      } else {
        // No Stripe subscription ID, just update database
        subscription.status = 'cancelled';
        subscription.nextBillingDate = cancelImmediately ? new Date() : subscription.nextBillingDate;
      }

      await subscription.save();

      res.json({ 
        message: cancelImmediately 
          ? 'Subscription cancelled immediately' 
          : 'Subscription will be cancelled at period end',
        subscription: {
          id: subscription._id,
          status: subscription.status,
          nextBillingDate: subscription.nextBillingDate
        }
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ 
        message: 'Server error',
        error: error.message 
      });
    }
  }
);

// @route   POST /api/admin/subscriptions/:id/reactivate
// @desc    Reactivate a cancelled subscription (Admin only)
// @access  Private (Admin, SuperAdmin)
router.post(
  '/:id/reactivate',
  [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)],
  async (req, res) => {
    try {
      const subscriptionId = req.params.id;

      // Find the subscription
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      // Check if it's cancelled
      if (subscription.status !== 'cancelled') {
        return res.status(400).json({ message: 'Subscription is not cancelled' });
      }

      // Reactivate in Stripe
      if (subscription.stripeSubscriptionId) {
        try {
          // Remove the cancellation flag
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: false
          });
        } catch (stripeError) {
          console.error('Stripe reactivation error:', stripeError);
          return res.status(500).json({ 
            message: 'Failed to reactivate subscription in Stripe',
            error: stripeError.message 
          });
        }
      }

      subscription.status = 'active';
      await subscription.save();

      res.json({ 
        message: 'Subscription reactivated successfully',
        subscription: {
          id: subscription._id,
          status: subscription.status,
          nextBillingDate: subscription.nextBillingDate
        }
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      res.status(500).json({ 
        message: 'Server error',
        error: error.message 
      });
    }
  }
);

module.exports = router;