// server/routes/metaEvents.js
const express = require('express');
const router = express.Router();
const { sendServerEvent } = require('../utils/metaConversionsAPI');

router.post('/meta-conversions', async (req, res) => {
  try {
    const { eventName, eventParams, test_event_code } = req.body;

    if (!eventName || !eventParams) {
      return res.status(400).json({
        success: false,
        message: 'Missing eventName or eventParams'
      });
    }

    console.log('Meta Event Received:', eventName);

    const result = await sendServerEvent(
      eventName,
      eventParams,
      req,
      test_event_code // optional
    );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Meta Event Error:', error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

module.exports = router;