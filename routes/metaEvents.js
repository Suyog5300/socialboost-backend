// server/routes/metaEvents.js
const express = require('express');
const router = express.Router();
const { sendServerEvent } = require('../utils/metaConversionsAPI');

// POST /api/meta-conversions
router.post('/meta-conversions', async (req, res) => {
  try {
    const { eventName, eventParams, test_event_code } = req.body;

    if (!eventName || !eventParams) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: eventName or eventParams'
      });
    }

    console.log(`📥 Meta Event Received: ${eventName}`, {
      test_event_code: test_event_code || 'none'
    });

    const result = await sendServerEvent(
      eventName,
      eventParams,
      req,
      test_event_code || null
    );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Meta Event Route Error:', error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// GET /api/meta-debug - health check
router.get('/meta-debug', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Meta Conversions API route is working',
    pixelId: process.env.META_PIXEL_ID ? '✅ Set' : '❌ Missing',
    accessToken: process.env.META_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'
  });
});

module.exports = router;