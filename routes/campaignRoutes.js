// /backend/routes/campaigns.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Campaign = require('../models/Campaign');

// @route   GET /api/campaigns
// @desc    Get all user campaigns
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ user: req.user.id });
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/campaigns/:id
// @desc    Get campaign by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/campaigns
// @desc    Create a new campaign
// @access  Private
// /backend/routes/campaigns.js - Update to use authenticated user
router.post('/', auth, async (req, res) => {
  try {
    const {
      demographics,
      interests,
      behaviors,
      socialMedia
    } = req.body;
    
    // req.user is now available from the auth middleware via cookie
    const campaign = new Campaign({
      user: req.user.id, // User ID from authenticated cookie
      demographics,
      interests,
      behaviors,
      socialMedia,
      status: 'draft'
    });
    
    await campaign.save();
    
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/campaigns/:id
// @desc    Update campaign
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Update allowed fields
    const { demographics, interests, behaviors, socialMedia, status } = req.body;
    
    if (demographics) campaign.demographics = demographics;
    if (interests) campaign.interests = interests;
    if (behaviors) campaign.behaviors = behaviors;
    if (socialMedia) campaign.socialMedia = socialMedia;
    if (status && ['draft', 'active', 'paused'].includes(status)) {
      campaign.status = status;
    }
    
    await campaign.save();
    
    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;