// server/routes/metaEvents.js
const express = require('express');
const router = express.Router();
const { sendServerEvent } = require('../utils/metaConversionsAPI');

router.post('/meta-conversions', async (req, res) => {
  try {
    const { eventName, eventParams } = req.body;
    
    // Validate request
    if (!eventName || !eventParams) {
      return res.status(400).json({ success: false, message: 'Missing event data' });
    }
    
    // Send to Meta Conversions API
    const result = await sendServerEvent(eventName, eventParams, req);
    
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data
    });
  }
});

module.exports = router;

// In your main Express app file:
// app.use('/api', require('./routes/metaEvents'));