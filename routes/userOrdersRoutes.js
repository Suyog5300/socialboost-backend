// /backend/routes/userOrdersRoutes.js
const express = require('express');
const router = express.Router();
const {auth} = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Campaign = require('../models/Campaign');
const CustomPlanBooking = require('../models/CustomPlanBooking');
const Plan = require('../models/Plan');
const { User } = require('../models/User');

// Get current user's subscription
router.get('/current-subscription', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the user's current active subscription
    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    }).populate('plan', 'name monthlyPrice annualPrice features');

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    // Format the response to match frontend interface
    const formattedSubscription = {
      id: subscription._id,
      planName: subscription.planName || subscription.plan?.name,
      status: subscription.status,
      amount: subscription.amount,
      billingType: subscription.billingType,
      startDate: subscription.startDate,
      nextBillingDate: subscription.nextBillingDate,
      stripeSubscriptionId: subscription.stripeSubscriptionId
    };

    res.json(formattedSubscription);
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's payment history
router.get('/payments', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Find all payments for the user, sorted by date (newest first)
    const payments = await Payment.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('subscription', 'planName');

    // Get total count for pagination
    const totalPayments = await Payment.countDocuments({ user: userId });

    // Format payments to match frontend interface
    const formattedPayments = payments.map(payment => ({
      id: payment._id,
      amount: payment.amount,
      status: payment.status,
      date: payment.createdAt,
      receiptUrl: payment.receiptUrl,
      paymentMethod: payment.paymentMethod,
      currency: payment.currency || 'usd',
      subscriptionName: payment.subscription?.planName
    }));

    res.json({
      payments: formattedPayments,
      pagination: {
        current: page,
        total: Math.ceil(totalPayments / limit),
        count: totalPayments
      }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's campaigns
router.get('/my-campaigns', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all campaigns for the user
    const campaigns = await Campaign.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('subscription', 'planName');

    // Format campaigns to match frontend interface
    const formattedCampaigns = campaigns.map(campaign => ({
      id: campaign._id,
      status: campaign.status,
      demographics: {
        age: campaign.demographics?.age || [],
        gender: campaign.demographics?.gender || '',
        location: campaign.demographics?.location || ''
      },
      interests: campaign.interests || [],
      behaviors: campaign.behaviors || [],
      socialMedia: {
        platform: campaign.socialMedia?.platform || 'instagram',
        username: campaign.socialMedia?.username || ''
      },
      metrics: {
        impressions: campaign.metrics?.impressions || 0,
        engagements: campaign.metrics?.engagements || 0,
        followers: campaign.metrics?.followers || 0,
        lastUpdated: campaign.metrics?.lastUpdated || campaign.updatedAt
      },
      startDate: campaign.startDate || campaign.createdAt,
      endDate: campaign.endDate,
      subscriptionName: campaign.subscription?.planName
    }));

    res.json(formattedCampaigns);
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's custom bookings
router.get('/custom-bookings', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all custom bookings for the user
    const bookings = await CustomPlanBooking.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'firstName lastName email')
      .populate('user', 'firstName lastName email');

    // Format bookings to match frontend interface
    const formattedBookings = bookings.map(booking => ({
      id: booking._id,
      planName: booking.planName,
      companyName: booking.companyName,
      website: booking.website,
      instagramHandle: booking.instagramHandle,
      currentFollowers: booking.currentFollowers,
      targetAudience: booking.targetAudience,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      additionalInfo: booking.additionalInfo,
      status: booking.status,
      meetingLink: booking.meetingLink,
      googleCalendarEventId: booking.googleCalendarEventId,
      calendarEventUrl: booking.calendarEventUrl,
      meetingDuration: booking.meetingDuration || 30,
      timeZone: booking.timeZone || 'America/New_York',
      assignedTo: booking.assignedTo ? {
        id: booking.assignedTo._id,
        name: `${booking.assignedTo.firstName} ${booking.assignedTo.lastName}`,
        email: booking.assignedTo.email
      } : null,
      leadResult: booking.leadResult,
      meetingFeedback: booking.meetingFeedback,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error('Error fetching custom bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get complete orders summary (all data in one call) - Optional optimization
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all data in parallel
    const [subscription, payments, campaigns, customBookings] = await Promise.all([
      // Current subscription
      Subscription.findOne({
        user: userId,
        status: 'active'
      }).populate('plan', 'name monthlyPrice annualPrice features'),

      // Recent payments (last 10)
      Payment.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('subscription', 'planName'),

      // All campaigns
      Campaign.find({ user: userId })
        .sort({ createdAt: -1 })
        .populate('subscription', 'planName'),

      // All custom bookings
      CustomPlanBooking.find({ user: userId })
        .sort({ createdAt: -1 })
        .populate('assignedTo', 'firstName lastName email')
    ]);

    // Format subscription
    const formattedSubscription = subscription ? {
      id: subscription._id,
      planName: subscription.planName || subscription.plan?.name,
      status: subscription.status,
      amount: subscription.amount,
      billingType: subscription.billingType,
      startDate: subscription.startDate,
      nextBillingDate: subscription.nextBillingDate,
      stripeSubscriptionId: subscription.stripeSubscriptionId
    } : null;

    // Format payments
    const formattedPayments = payments.map(payment => ({
      id: payment._id,
      amount: payment.amount,
      status: payment.status,
      date: payment.createdAt,
      receiptUrl: payment.receiptUrl,
      paymentMethod: payment.paymentMethod,
      currency: payment.currency || 'usd'
    }));

    // Format campaigns
    const formattedCampaigns = campaigns.map(campaign => ({
      id: campaign._id,
      status: campaign.status,
      demographics: {
        age: campaign.demographics?.age || [],
        gender: campaign.demographics?.gender || '',
        location: campaign.demographics?.location || ''
      },
      interests: campaign.interests || [],
      behaviors: campaign.behaviors || [],
      socialMedia: {
        platform: campaign.socialMedia?.platform || 'instagram',
        username: campaign.socialMedia?.username || ''
      },
      metrics: {
        impressions: campaign.metrics?.impressions || 0,
        engagements: campaign.metrics?.engagements || 0,
        followers: campaign.metrics?.followers || 0,
        lastUpdated: campaign.metrics?.lastUpdated || campaign.updatedAt
      },
      startDate: campaign.startDate || campaign.createdAt
    }));

    // Format custom bookings
    const formattedBookings = customBookings.map(booking => ({
      id: booking._id,
      planName: booking.planName,
      companyName: booking.companyName,
      website: booking.website,
      instagramHandle: booking.instagramHandle,
      currentFollowers: booking.currentFollowers,
      targetAudience: booking.targetAudience,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      additionalInfo: booking.additionalInfo,
      status: booking.status,
      meetingLink: booking.meetingLink,
      googleCalendarEventId: booking.googleCalendarEventId,
      calendarEventUrl: booking.calendarEventUrl,
      meetingDuration: booking.meetingDuration || 30,
      timeZone: booking.timeZone || 'America/New_York',
      assignedTo: booking.assignedTo ? {
        id: booking.assignedTo._id,
        name: `${booking.assignedTo.firstName} ${booking.assignedTo.lastName}`,
        email: booking.assignedTo.email
      } : null,
      leadResult: booking.leadResult,
      meetingFeedback: booking.meetingFeedback
    }));

    // Calculate summary stats
    const totalSpent = formattedPayments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);

    const activeCampaignsCount = formattedCampaigns.filter(c => c.status === 'active').length;
    const totalBookings = formattedBookings.length;

    const summary = {
      subscription: formattedSubscription,
      payments: formattedPayments,
      campaigns: formattedCampaigns,
      customBookings: formattedBookings,
      stats: {
        totalSpent,
        activeCampaigns: activeCampaignsCount,
        totalBookings,
        hasActiveSubscription: !!formattedSubscription
      }
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching orders summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user stats only (lightweight endpoint for dashboard)
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get counts and totals efficiently
    const [activeSubscription, totalSpent, activeCampaigns, totalBookings] = await Promise.all([
      Subscription.countDocuments({ user: userId, status: 'active' }),
      Payment.aggregate([
        { $match: { user: userId, status: 'succeeded' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Campaign.countDocuments({ user: userId, status: 'active' }),
      CustomPlanBooking.countDocuments({ user: userId })
    ]);

    res.json({
      hasActiveSubscription: activeSubscription > 0,
      totalSpent: totalSpent[0]?.total || 0,
      activeCampaigns,
      totalBookings
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update custom booking status (for user actions like rescheduling)
router.patch('/custom-bookings/:id/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.id;
    const { status, reason } = req.body;

    const validStatuses = ['pending', 'scheduled', 'completed', 'cancelled', 'rescheduled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await CustomPlanBooking.findOne({
      _id: bookingId,
      user: userId
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Track status change in reschedule history if applicable
    if (status === 'rescheduled' && booking.status !== 'rescheduled') {
      booking.rescheduleHistory.push({
        originalDate: booking.preferredDate,
        originalTime: booking.preferredTime,
        reason: reason || 'Status updated by user',
        rescheduledBy: userId,
        rescheduledAt: new Date()
      });
    }

    booking.status = status;
    await booking.save();

    res.json({ message: 'Booking status updated successfully', booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get upcoming bookings (next 30 days)
router.get('/upcoming-bookings', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const upcomingBookings = await CustomPlanBooking.find({
      user: userId,
      status: { $in: ['scheduled', 'pending'] },
      preferredDate: {
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    }).sort({ preferredDate: 1 })
      .populate('assignedTo', 'firstName lastName email');

    const formattedBookings = upcomingBookings.map(booking => ({
      id: booking._id,
      planName: booking.planName,
      companyName: booking.companyName,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      status: booking.status,
      meetingLink: booking.meetingLink,
      assignedTo: booking.assignedTo ? {
        id: booking.assignedTo._id,
        name: `${booking.assignedTo.firstName} ${booking.assignedTo.lastName}`,
        email: booking.assignedTo.email
      } : null
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;