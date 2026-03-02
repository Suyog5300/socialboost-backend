// server/utils/metaConversionsAPI.js
const axios = require('axios');
const crypto = require('crypto');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PIXEL_ID = process.env.META_PIXEL_ID;

if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
  console.warn('⚠️ META_ACCESS_TOKEN or META_PIXEL_ID is missing in environment variables');
}

// Hash helper - Meta requires lowercase + trimmed before hashing
const hashData = (value) => {
  if (!value) return undefined;
  const normalized = value.toString().toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const sendServerEvent = async (eventName, eventData, req, testEventCode = null) => {
  try {
    // -----------------------------
    // Prepare User Data
    // -----------------------------
    const userData = {
      client_ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1',
      client_user_agent: req.headers['user-agent'],
      fbp: eventData.fbp,
      fbc: eventData.fbc,
      em: hashData(eventData.email),
      fn: hashData(eventData.firstName),
      ln: hashData(eventData.lastName),
      ph: hashData(eventData.phone),
      ct: hashData(eventData.city),
      st: hashData(eventData.state),
      country: eventData.country ? hashData(eventData.country) : undefined,
      external_id: hashData(eventData.userId)
    };

    // Remove undefined/null fields
    Object.keys(userData).forEach((key) => {
      if (userData[key] === undefined || userData[key] === null) {
        delete userData[key];
      }
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

    Object.keys(customData).forEach((key) => {
      if (customData[key] === undefined || customData[key] === null) {
        delete customData[key];
      }
    });

    // -----------------------------
    // Build Event Object
    // -----------------------------
    const eventObject = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_id: eventData.eventId,
      // ✅ REQUIRED for server events to show correctly in Test Events
      event_source_url:
        eventData.sourceUrl ||
        req.headers.referer ||
        'https://www.socialboosts.co',
      user_data: userData,
      ...(Object.keys(customData).length > 0 && { custom_data: customData })
    };

    // -----------------------------
    // Build Final Request Body
    // ✅ access_token MUST be in query params, NOT in body
    // -----------------------------
    const requestBody = {
      data: [eventObject]
    };

    // Only add test_event_code if provided
    if (testEventCode) {
      requestBody.test_event_code = testEventCode;
    }

    console.log('📤 Sending to Meta CAPI:', JSON.stringify(requestBody, null, 2));

    // ✅ access_token passed as query param via `params`
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events`,
      requestBody,
      {
        params: {
          access_token: META_ACCESS_TOKEN
        }
      }
    );

    console.log('✅ Meta CAPI Response:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Meta CAPI Error:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { sendServerEvent };