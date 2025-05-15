// /backend/routes/preferencesRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const externalApis = require('../services/externalApis');

/**
 * @route   GET /api/preferences/interests
 * @desc    Get interest categories from external API
 * @access  Public
 */
router.get('/interests', async (req, res) => {
  try {
    const interests = await externalApis.getInterestCategories();
    res.json(interests);
  } catch (error) {
    console.error('Error fetching interests:', error);
    res.status(500).json({ message: 'Error fetching interests' });
  }
});

/**
 * @route   GET /api/preferences/behaviors
 * @desc    Get behavior options from external API
 * @access  Public
 */
router.get('/behaviors', async (req, res) => {
  try {
    const behaviors = await externalApis.getBehaviorOptions();
    res.json(behaviors);
  } catch (error) {
    console.error('Error fetching behaviors:', error);
    res.status(500).json({ message: 'Error fetching behaviors' });
  }
});

/**
 * @route   GET /api/preferences/locations/search
 * @desc    Search locations using external API
 * @access  Public
 */
router.get('/locations/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(200).json([]);
    }
    
    const locations = await externalApis.searchLocations(query);
    res.json(locations);
  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json({ message: 'Error searching locations' });
  }
});

/**
 * @route   GET /api/preferences/locations/:id
 * @desc    Get location details by ID
 * @access  Public
 */
router.get('/locations/:id', async (req, res) => {
  try {
    const locationDetails = await externalApis.getLocationDetails(req.params.id);
    res.json(locationDetails);
  } catch (error) {
    console.error('Error fetching location details:', error);
    res.status(500).json({ message: 'Error fetching location details' });
  }
});

module.exports = router;