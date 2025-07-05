// server/utils/metaConversionsAPI.js
const axios = require('axios');
const crypto = require('crypto');

// Load from your environment variables
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PIXEL_ID = process.env.META_PIXEL_ID;

// Hash function for PII data
const hashData = (data) => {
  if (!data) return null;
  const normalized = data.toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

// Send event to Meta Conversions API
const sendServerEvent = async (eventName, eventData, req) => {
  try {
    // Prepare user data with matching parameters
    const userData = {
      // Client identifiers - critical for good matching
      client_ip_address: req.ip || req.connection.remoteAddress,
      client_user_agent: req.headers['user-agent'],
      fbp: eventData.fbp, // Facebook Browser ID
      fbc: eventData.fbc, // Facebook Click ID
      
      // Customer information parameters (hashed)
      em: eventData.email ? hashData(eventData.email) : undefined,
      fn: eventData.firstName ? hashData(eventData.firstName) : undefined,
      ln: eventData.lastName ? hashData(eventData.lastName) : undefined,
      ph: eventData.phone ? hashData(eventData.phone) : undefined,
      ct: eventData.city ? hashData(eventData.city) : undefined,
      st: eventData.state ? hashData(eventData.state) : undefined,
      country: eventData.country,
      external_id: eventData.userId ? hashData(eventData.userId) : undefined,
    };
    
    // Remove undefined values
    Object.keys(userData).forEach(key => {
      if (userData[key] === undefined) delete userData[key];
    });

    // Prepare custom data
    const customData = {};
    
    // Add standard e-commerce parameters if available
    if (eventData.value) customData.value = eventData.value;
    if (eventData.currency) customData.currency = eventData.currency;
    if (eventData.contentIds) customData.content_ids = eventData.contentIds;
    if (eventData.contentType) customData.content_type = eventData.contentType;
    if (eventData.contentName) customData.content_name = eventData.contentName;
    
    // Prepare the event for Meta
    const eventRequest = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(eventData.eventTime || Date.now() / 1000),
        action_source: 'website',
        event_source_url: eventData.sourceUrl || req.headers.referer,
        user_data: userData,
        custom_data: customData
      }],
      access_token: META_ACCESS_TOKEN,
    };
    
    // Send to Meta Conversions API
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events`,
      eventRequest
    );
    
    console.log('Conversions API event sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending Conversions API event:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { sendServerEvent };