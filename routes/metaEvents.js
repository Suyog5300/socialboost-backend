// server/routes/metaEvents.js
const express = require('express');
const router = express.Router();
const { sendServerEvent } = require('../utils/metaConversionsAPI');

router.post('/meta-conversions', async (req, res) => {
  try {
    const { eventName, eventParams } = req.body;
    
    console.log('Received event:', eventName);
    
    // Validate request
    if (!eventName || !eventParams) {
      return res.status(400).json({ success: false, message: 'Missing event data' });
    }
    
    // Send to Meta Conversions API
    const result = await sendServerEvent(eventName, eventParams, req);
    
    // Log response using the result variable (not response)
    console.log('Received event details:', JSON.stringify(eventParams, null, 2));
    console.log('Response from Meta:', result);
    
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing Meta event:', error.message);
    console.error('Error details:', error.response?.data || 'No additional details');
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data
    });
  }
});

module.exports = router;