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

  router.post('/activate-custom-plan', auth, async (req, res) => {
  const { customPlanId, paymentIntentId } = req.body;

  try {
    // 1. Verify the custom plan booking exists and is approved
    const booking = await CustomPlanBooking.findOne({
      _id: customPlanId,
      user: req.user.id,
      'customPlan.approved': true
    });

    if (!booking) {
      return res.status(404).json({ message: 'Approved custom plan not found' });
    }

    // 2. Verify payment intent exists and is successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment has not been completed' });
    }

    // 3. Create or get stripe customer
    let customer;
    if (req.user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(req.user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: req.user.email,
        name: `${req.user.firstName} ${req.user.lastName}`,
        metadata: {
          userId: req.user.id
        }
      });

      // Update user with stripe customer ID
      await User.findByIdAndUpdate(req.user.id, {
        stripeCustomerId: customer.id
      });
    }

    // 4. Create subscription in Stripe
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: booking.planName,
              description: 'Custom Elite Plan',
              metadata: {
                type: 'custom_plan',
                customPlanId: booking._id.toString()
              }
            },
            unit_amount: booking.customPlan.monthlyPrice * 100, // convert to cents
            recurring: {
              interval: 'month'
            }
          }
        }
      ],
      metadata: {
        userId: req.user.id,
        customPlanId: booking._id.toString()
      }
    });

    // 5. Save the payment record
    const payment = new Payment({
      user: req.user.id,
      amount: booking.customPlan.monthlyPrice,
      currency: 'usd',
      stripePaymentIntentId: paymentIntentId,
      stripeCustomerId: customer.id,
      status: 'succeeded',
      paymentMethod: 'card',
      receiptUrl: paymentIntent.charges.data[0]?.receipt_url
    });

    await payment.save();

    // 6. Calculate next billing date
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // 7. Create subscription record
    const subscription = new Subscription({
      user: req.user.id,
      plan: null, // Custom plan doesn't have a pre-defined plan record
      planName: booking.planName,
      amount: booking.customPlan.monthlyPrice,
      billingType: 'monthly',
      status: 'active',
      startDate: new Date(),
      nextBillingDate,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customer.id
    });

    await subscription.save();

    // Update payment with subscription reference
    payment.subscription = subscription._id;
    await payment.save();

    // 8. Update booking status and link to subscription
    booking.status = 'completed';
    booking.subscription = subscription._id;
    await booking.save();

    // 9. Send success response
    res.status(201).json({
      success: true,
      subscription: {
        id: subscription._id,
        planName: subscription.planName,
        amount: subscription.amount,
        billingType: subscription.billingType,
        status: subscription.status,
        startDate: subscription.startDate,
        nextBillingDate: subscription.nextBillingDate
      }
    });
  } catch (error) {
    console.error('Error activating custom plan:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;