// /backend/routes/stripe.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
require('dotenv').config();
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Campaign = require('../models/Campaign');
const { User } = require('../models/User');
const { sendSubscriptionConfirmationEmail } = require('../utils/emailService');

// @route   POST /api/stripe/create-checkout-session
// @desc    Create a Stripe checkout session
// @access  Private
// @route   POST /api/stripe/create-checkout-session
// @desc    Create a Stripe checkout session (handles plan upgrades/downgrades)
// @access  Private
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const { planName, planPrice, billing, features, preferences, campaignId } = req.body;
    console.log("data:", req.body);
    
    // Validate required fields
    if (!planName) {
      return res.status(400).json({ message: 'Plan name is required' });
    }
    
    // Ensure planPrice is a valid number
    const price = parseFloat(planPrice);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ message: 'Plan price must be a valid positive number' });
    }
    
    // Check for existing active subscription
    const existingSubscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active'
    });
    
    // If user has an active subscription, we need to handle the upgrade/downgrade
    if (existingSubscription) {
      console.log('User has existing subscription:', existingSubscription._id);
      
      // Cancel the old subscription in Stripe
      if (existingSubscription.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(existingSubscription.stripeSubscriptionId);
          console.log('Cancelled old Stripe subscription:', existingSubscription.stripeSubscriptionId);
        } catch (stripeError) {
          console.error('Error cancelling old subscription in Stripe:', stripeError);
          // Continue anyway - we'll update our database
        }
      }
      
      // Update the old subscription status in our database
      existingSubscription.status = 'cancelled';
      await existingSubscription.save();
      console.log('Marked old subscription as cancelled in database');
    }
    
    let campaign;
    
    // Use existing campaign if ID is provided, otherwise create new one
    if (campaignId) {
      campaign = await Campaign.findOne({ 
        _id: campaignId,
        user: req.user.id 
      });
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Update campaign with latest preferences if needed
      if (preferences) {
        campaign.demographics = preferences.demographics || campaign.demographics;
        campaign.interests = preferences.interests || campaign.interests;
        campaign.behaviors = preferences.behaviors || campaign.behaviors;
        campaign.socialMedia = preferences.socialMedia || campaign.socialMedia;
        await campaign.save();
      }
    } else if (preferences) {
      // Create new campaign
      campaign = new Campaign({
        user: req.user.id,
        demographics: preferences.demographics || {},
        interests: preferences.interests || [],
        behaviors: preferences.behaviors || [],
        socialMedia: preferences.socialMedia || {},
        status: 'draft'
      });
      
      await campaign.save();
    } else {
      return res.status(400).json({ message: 'Campaign preferences are required for new campaigns' });
    }
    
    // Find or create the plan in database
    let plan = await Plan.findOne({ name: planName });
    
    if (!plan) {
      // Calculate prices for monthly/annual correctly
      const monthlyPrice = billing === 'monthly' ? price : (price * 12 / 11); // 1 month free for annual
      const annualPrice = billing === 'annual' ? price : (price / 12); // Convert to annual if monthly
      
      // Create a new plan if it doesn't exist
      plan = new Plan({
        name: planName,
        monthlyPrice: monthlyPrice,
        annualPrice: annualPrice,
        features: features || []
      });
      
      try {
        await plan.save();
      } catch (planError) {
        console.error('Plan creation error:', planError);
        return res.status(400).json({ 
          message: 'Failed to create plan',
          details: planError.message
        });
      }
    }
    
    // Helper function to check if customer exists in Stripe
    async function isCustomerMissing(customerId) {
      try {
        await stripe.customers.retrieve(customerId);
        return false;
      } catch (error) {
        return error.type === 'StripeInvalidRequestError' && 
               error.raw?.code === 'resource_missing';
      }
    }
    
    // Find or create Stripe customer with better error handling
    let customer;
    if (!req.user.stripeCustomerId) {
      // No customer ID, create new one
      customer = await stripe.customers.create({
        email: req.user.email,
        name: `${req.user.firstName} ${req.user.lastName}`,
        metadata: {
          userId: req.user._id.toString()
        }
      });
      
      // Save Stripe customer ID to user
      await User.findByIdAndUpdate(req.user._id, {
        stripeCustomerId: customer.id
      });
    } else {
      // Check if the customer ID is valid
      const customerMissing = await isCustomerMissing(req.user.stripeCustomerId);
      
      if (customerMissing) {
        // Customer doesn't exist in Stripe, create a new one
        console.log(`Customer ${req.user.stripeCustomerId} not found in Stripe, creating new customer`);
        customer = await stripe.customers.create({
          email: req.user.email,
          name: `${req.user.firstName} ${req.user.lastName}`,
          metadata: {
            userId: req.user._id.toString()
          }
        });
        
        // Update user with new customer ID
        await User.findByIdAndUpdate(req.user._id, {
          stripeCustomerId: customer.id
        });
      } else {
        // Customer exists, use it
        customer = { id: req.user.stripeCustomerId };
      }
    }
    
    // Create line items for checkout
    const lineItems = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${planName} Plan - ${billing === 'annual' ? 'Annual' : 'Monthly'} Billing`,
          description: `Instagram Growth Campaign - ${features?.join(', ') || 'Standard features'}`
        },
        unit_amount: Math.round(price * 100), // Convert to cents and ensure it's an integer
        recurring: {
          interval: billing === 'annual' ? 'year' : 'month',
          interval_count: 1
        }
      },
      quantity: 1
    }];
    
    // Create Stripe checkout session with more detailed metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/campaign-preferences`,
      metadata: {
        userId: req.user.id.toString(),
        campaignId: campaign._id.toString(),
        planId: plan._id.toString(),
        planName,
        billing,
        amount: price.toString(), // Convert to string for metadata
        features: JSON.stringify(features || []),
        isUpgrade: existingSubscription ? 'true' : 'false', // Track if this is an upgrade/change
        oldSubscriptionId: existingSubscription ? existingSubscription._id.toString() : ''
      }
    });
    
    console.log('Created checkout session:', session.id);
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    res.status(500).json({ message: 'Failed to create checkout session', error: error.message });
  }
});
// @route   GET /api/checkout-session
// @desc    Get checkout session details & complete the payment process
// @access  Private
// Update the checkout-session endpoint in /backend/routes/stripe.js

// @route   GET /api/stripe/checkout-session
// @desc    Get checkout session details & complete the payment process
// @access  Public (no auth required as it's called from success page)
// @route   GET /api/stripe/checkout-session
// @desc    Get checkout session details & complete the payment process
// @access  Public (no auth required as it's called from success page)
// In routes/stripe.js
// @route   GET /api/stripe/checkout-session
// @desc    Process successful checkout and store subscription
// @access  Public (called from success page)
router.get('/checkout-session', async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }
    
    console.log('Processing checkout session:', sessionId);
    
    // Retrieve the session from Stripe with expanded data
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });
    
    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Payment not completed' });
    }
    
    console.log('Payment successful, storing subscription data');
    
    // Check if this subscription was already stored
    const existingSubscription = await Subscription.findOne({
      stripeSubscriptionId: session.subscription.id
    });
    
    if (existingSubscription) {
      console.log('Subscription already exists, returning data');
      
      // Return the existing subscription data
      return res.json({
        success: true,
        orderId: existingSubscription._id.toString().slice(-8).toUpperCase(),
        planName: existingSubscription.planName,
        amount: existingSubscription.amount,
        billing: existingSubscription.billingType
      });
    }
    
    // Get data from metadata
    const { userId, campaignId, planId, planName, billing } = session.metadata;
    const amount = parseFloat(session.metadata.amount);
    
    if (!userId || !campaignId || !planId || !planName || isNaN(amount)) {
      return res.status(400).json({ message: 'Invalid session metadata' });
    }
    
    // Calculate subscription end date based on billing type
    let endDate = new Date();
    if (billing === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // 1 month from now
    }
    
    // Create a new subscription record
    const subscription = new Subscription({
      user: userId,
      plan: planId,
      planName: planName,
      amount: amount,
      billingType: billing,
      status: 'active',
      nextBillingDate: endDate,
      stripeSubscriptionId: session.subscription.id,
      stripeCustomerId: session.customer.id,
      campaign: campaignId
    });
    
    const savedSubscription = await subscription.save();
    console.log('Subscription saved:', savedSubscription._id);
    
    // Update campaign status
    await Campaign.findByIdAndUpdate(campaignId, {
      status: 'active',
      subscription: savedSubscription._id,
      startDate: new Date()
    });
    
    // Create payment record
    const payment = new Payment({
      user: userId,
      subscription: savedSubscription._id,
      amount: amount,
      currency: session.currency || 'usd',
      stripePaymentIntentId: session.payment_intent,
      stripeCustomerId: session.customer.id,
      status: 'succeeded',
      paymentMethod: 'card'
    });
    
    const savedPayment = await payment.save();
    
    // Return success with order details
    return res.json({
      success: true,
      orderId: savedPayment._id.toString().slice(-8).toUpperCase(),
      planName: planName,
      amount: amount,
      billing: billing
    });
  } catch (error) {
    console.error('Error processing checkout session:', error);
    return res.status(500).json({ 
      message: 'Failed to process checkout session',
      error: error.message
    });
  }
});

// @route   POST /api/webhooks/stripe
// @desc    Handle Stripe webhook events
// @access  Public (Stripe calls this)
// Update the webhook handler in /backend/routes/stripe.js

// @route   POST /api/webhooks/stripe
// @desc    Handle Stripe webhook events
// @access  Public (Stripe calls this)
// In routes/stripe.js
// @route   POST /api/stripe/webhooks/stripe
// @desc    Handle Stripe webhook events
// @access  Public (Stripe calls this)
router.post('/webhooks/stripe', async (req, res) => {
  console.log('⭐ Webhook received');
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    console.error('⚠️ No Stripe signature found in request headers');
    return res.status(400).send('No signature provided');
  }

  let event;
  
  try {
    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('⚠️ STRIPE_WEBHOOK_SECRET environment variable not set');
      return res.status(500).send('Webhook secret not configured');
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
    
    console.log(`✅ Webhook verified: ${event.type}`);
  } catch (err) {
    console.error(`❌ Webhook signature verification failed:`, err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event based on type
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      // Add other events as needed
      default:
        console.log(`🔵 Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return res.json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    // Still return 200 to acknowledge receipt (prevents Stripe from retrying)
    return res.status(200).json({ 
      received: true, 
      error: error.message,
      note: 'Error occurred but webhook receipt acknowledged'
    });
  }
});

// Separate the event handling into dedicated functions
// Separate the event handling into dedicated functions
async function handleCheckoutSessionCompleted(session) {
  console.log('🟢 Processing checkout.session.completed');
  console.log('Session ID:', session.id);
  console.log('Session metadata:', session.metadata);
  
  // Validate session metadata
  if (!session.metadata) {
    throw new Error('Session metadata is missing');
  }
  
  const { userId, campaignId, planId, planName, billing, amount, isUpgrade, oldSubscriptionId } = session.metadata;
  
  if (!userId || !campaignId || !planId) {
    throw new Error(`Missing required metadata: userId=${userId}, campaignId=${campaignId}, planId=${planId}`);
  }
  
  // Check if this subscription was already processed
  const existingSubscription = await Subscription.findOne({
    stripeSubscriptionId: session.subscription
  });
  
  if (existingSubscription) {
    console.log('✅ Subscription already processed:', existingSubscription._id);
    return;
  }
  
  // If this is an upgrade/change, cancel the old subscription
  if (isUpgrade === 'true' && oldSubscriptionId) {
    console.log('🔄 This is a plan change, handling old subscription:', oldSubscriptionId);
    
    try {
      const oldSub = await Subscription.findById(oldSubscriptionId);
      if (oldSub && oldSub.status === 'active') {
        // Make sure it's cancelled in Stripe (should already be done, but double-check)
        if (oldSub.stripeSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(oldSub.stripeSubscriptionId);
            console.log('✅ Cancelled old Stripe subscription:', oldSub.stripeSubscriptionId);
          } catch (stripeError) {
            console.log('⚠️ Old subscription already cancelled in Stripe');
          }
        }
        
        // Update old subscription status
        oldSub.status = 'cancelled';
        await oldSub.save();
        console.log('✅ Marked old subscription as cancelled');
      }
    } catch (error) {
      console.error('⚠️ Error handling old subscription:', error);
      // Continue with creating new subscription even if old one fails
    }
  }
  
  // Get subscription details from Stripe
  console.log('🔵 Retrieving subscription data from Stripe:', session.subscription);
  const subscriptionData = await stripe.subscriptions.retrieve(session.subscription);
  
  // Calculate next billing date
  const nextBillingDate = new Date(subscriptionData.current_period_end * 1000);
  
  // Parsed amount as a number
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) {
    throw new Error(`Invalid amount value: ${amount}`);
  }
  
  // Create subscription record
  console.log('🔵 Creating subscription record...');
  const subscription = new Subscription({
    user: userId,
    plan: planId,
    planName: planName,
    stripeSubscriptionId: session.subscription,
    stripeCustomerId: session.customer,
    amount: numericAmount,
    billingType: billing,
    status: 'active',
    nextBillingDate: nextBillingDate,
    campaign: campaignId
  });
  
  const savedSubscription = await subscription.save();
  console.log('✅ Subscription saved:', savedSubscription._id);
  
  // Update campaign status to active
  console.log('🔵 Updating campaign status...');
  const updatedCampaign = await Campaign.findByIdAndUpdate(campaignId, {
    status: 'active',
    subscription: savedSubscription._id,
    startDate: new Date()
  }, { new: true });
  
  if (!updatedCampaign) {
    throw new Error(`Failed to update campaign ${campaignId}`);
  }
  
  console.log('✅ Campaign updated:', updatedCampaign._id);
  
  // Create payment record
  console.log('🔵 Creating payment record...');
  const payment = new Payment({
    user: userId,
    subscription: savedSubscription._id,
    amount: numericAmount,
    currency: session.currency || 'usd',
    stripePaymentIntentId: session.payment_intent,
    stripeCustomerId: session.customer,
    status: 'succeeded',
    paymentMethod: 'card'
  });
  
  const savedPayment = await payment.save();
  console.log('✅ Payment record created:', savedPayment._id);
  
  // Get user information for the email
  const user = await User.findById(userId);
  if (user) {
    // Send confirmation email
    try {
      await sendSubscriptionConfirmationEmail(
        user.email,
        user.firstName,
        planName,
        numericAmount,
        billing,
        savedPayment._id.toString().slice(-8).toUpperCase()
      );
      console.log('✅ Confirmation email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send confirmation email:', emailError);
    }
  } else {
    console.error('⚠️ User not found:', userId);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('🟢 Processing invoice.payment_succeeded:', invoice.id);
  
  // Find the subscription
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription
  });
  
  if (!subscription) {
    console.log('⚠️ Subscription not found for invoice:', invoice.id);
    return;
  }
  
  // Create payment record for the renewal
  const payment = new Payment({
    user: subscription.user,
    subscription: subscription._id,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency || 'usd',
    stripePaymentIntentId: invoice.payment_intent,
    stripeCustomerId: invoice.customer,
    status: 'succeeded',
    paymentMethod: 'card'
  });
  
  await payment.save();
  console.log('✅ Renewal payment created:', payment._id);
  
  // Update subscription next billing date
  if (invoice.lines && invoice.lines.data && invoice.lines.data.length > 0) {
    subscription.nextBillingDate = new Date(invoice.lines.data[0].period.end * 1000);
    await subscription.save();
    console.log('✅ Subscription updated with new billing date');
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('🟠 Processing invoice.payment_failed:', invoice.id);
  
  // Find the subscription
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription
  });
  
  if (!subscription) {
    console.log('⚠️ Subscription not found for failed invoice:', invoice.id);
    return;
  }
  
  // Create payment record for the failed payment
  const payment = new Payment({
    user: subscription.user,
    subscription: subscription._id,
    amount: invoice.amount_due / 100,
    currency: invoice.currency || 'usd',
    stripePaymentIntentId: invoice.payment_intent,
    stripeCustomerId: invoice.customer,
    status: 'failed',
    paymentMethod: 'card'
  });
  
  await payment.save();
  console.log('✅ Failed payment recorded:', payment._id);
}

// @route   GET /api/subscriptions/current
// @desc    Get user's current subscription
// @access  Private
router.get('/subscriptions/current', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active'
    }).populate('campaign');
    
    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/subscriptions/cancel
// @desc    Cancel subscription
// @access  Private
router.post('/subscriptions/cancel', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active'
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }
    
    // Cancel subscription in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });
    
    // Update subscription in database
    subscription.status = 'cancelled';
    await subscription.save();
    
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/stripe/diagnostics
// @desc    Test Stripe and database connectivity
// @access  Private
router.get('/diagnostics', auth, async (req, res) => {
  try {
    // Test Stripe API connection
    const stripeTest = await stripe.customers.list({ limit: 1 });
    
    // Test MongoDB connections
    const planCount = await Plan.countDocuments();
    const subscriptionCount = await Subscription.countDocuments();
    const paymentCount = await Payment.countDocuments();
    const campaignCount = await Campaign.countDocuments();
    
    // Check webhook config
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ? 'Configured' : 'Missing';
    
    res.json({
      status: 'success',
      timestamp: new Date(),
      stripe: {
        connected: true,
        customer_count: stripeTest.data.length
      },
      database: {
        plans: planCount,
        subscriptions: subscriptionCount,
        payments: paymentCount,
        campaigns: campaignCount
      },
      config: {
        webhook_secret: webhookSecret,
        stripe_key: process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Missing',
        frontend_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      }
    });
  } catch (error) {
    console.error('❌ Diagnostics error:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;