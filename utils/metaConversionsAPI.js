// server/utils/metaConversionsAPI.js
const axios = require('axios');
const crypto = require('crypto');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PIXEL_ID = process.env.META_PIXEL_ID;

if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
  console.warn("⚠️ META_ACCESS_TOKEN or META_PIXEL_ID is missing in environment variables");
}

// Hash helper (Meta requires lowercase + trimmed before hashing)
const hashData = (value) => {
  if (!value) return undefined;
  const normalized = value.toString().toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const sendServerEvent = async (
  eventName,
  eventData,
  req,
  testEventCode = null
) => {
  try {

    // -----------------------------
    // Prepare User Data
    // -----------------------------
    const userData = {
      client_ip_address: req.ip || req.connection.remoteAddress,
      client_user_agent: req.headers['user-agent'],

      fbp: eventData.fbp,
      fbc: eventData.fbc,

      em: hashData(eventData.email),
      fn: hashData(eventData.firstName),
      ln: hashData(eventData.lastName),
      ph: hashData(eventData.phone),
      ct: hashData(eventData.city),
      st: hashData(eventData.state),
      country: eventData.country,
      external_id: hashData(eventData.userId)
    };

    // Remove undefined fields
    Object.keys(userData).forEach(key => {
      if (!userData[key]) delete userData[key];
    });

    // -----------------------------
    // Prepare Custom Data
    // -----------------------------
    const customData = {
      value: eventData.value,
      currency: eventData.currency,
      content_ids: eventData.contentIds,
      content_type: eventData.contentType,
      content_name: eventData.contentName
    };

    Object.keys(customData).forEach(key => {
      if (!customData[key]) delete customData[key];
    });

    // -----------------------------
    // Build Final Payload
    // -----------------------------
    const eventRequest = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000), // ALWAYS current
        action_source: 'website',
        event_id: eventData.eventId, // Important for deduplication
        event_source_url: eventData.sourceUrl || req.headers.referer,
        user_data: userData,
        custom_data: customData
      }],
      access_token: META_ACCESS_TOKEN,
      test_event_code: testEventCode || undefined
    };

    // Remove test_event_code if null
    if (!testEventCode) {
      delete eventRequest.test_event_code;
    }

    console.log("📤 Sending to Meta:", JSON.stringify(eventRequest, null, 2));

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events`,
      eventRequest
    );

    console.log("✅ Meta Response:", response.data);

    return response.data;

  } catch (error) {
    console.error("❌ Meta API Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { sendServerEvent };