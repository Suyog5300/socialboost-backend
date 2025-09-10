// test-conversions-api.js
const axios = require('axios');

// Your actual Pixel ID and access token
const pixelId = '589529720483518';
const accessToken = 'EAAQEmc9bFbQBO9ntsBn2M9hZCU3Tv4Vr2ZBzNaVIEMQxLt6CSKgqkETiiAXVc1wvZATF4O7DQkimgrn0dAz3kqE44vsDdO9peST8U4mUcgYFi495xZCDpQkye879US8VPikxyElOgEbJDstye00mNhdoIJKpmWpN4xtGTWlkYbSv6sw8wKpSV3UrzJL9SQZDZD';

// Get test code from Events Manager
const testEventCode = 'TEST96702'; // Replace with code from Events Manager

// Current timestamp
const eventTime = Math.floor(Date.now() / 1000);

async function testConversionsAPI() {
  try {
    const response = await axios({
      method: 'post',
      url: `https://graph.facebook.com/v18.0/${pixelId}/events`,
      data: {
        data: [{
          event_name: 'TestEvent',
          event_time: eventTime,
          action_source: 'website',
          user_data: {
            client_ip_address: '127.0.0.1',
            client_user_agent: 'Mozilla/5.0 Test Agent'
          }
        }],
        test_event_code: testEventCode,
        access_token: accessToken
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testConversionsAPI();