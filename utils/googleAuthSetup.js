// /backend/utils/googleAuthSetup.js
// Updated with correct redirect URI to match your Google Console setup

const { google } = require('googleapis');
const readline = require('readline');

// Replace with your actual credentials
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Updated to match your Google Console redirect URI
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Scopes for Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Step 1: Generate the authorization URL
 * Run this function first to get the authorization URL
 */
function getAuthUrl() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // This ensures you get a refresh token
  });
  
  console.log('Authorize this app by visiting this URL:');
  console.log(authUrl);
  console.log('\nAfter authorization, you will get a code. Use that code in the next step.');
  console.log('Note: You might see an error page after authorization - this is normal.');
  console.log('Just copy the "code" parameter from the URL in your browser.');
}

/**
 * Step 2: Exchange authorization code for tokens
 * @param {string} code - The authorization code from the previous step
 */
async function getTokens(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n🎉 Success! Your tokens:');
    console.log(`GOOGLE_CALENDAR_ID=primary`);
    console.log(`DEFAULT_TIMEZONE=America/New_York`);
    
    return tokens;
  } catch (error) {
    console.error('❌ Error retrieving access token:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you copied the entire authorization code');
    console.log('2. The code should be very long (usually 100+ characters)');
    console.log('3. Try getting a fresh authorization code if this one expired');
  }
}

/**
 * Interactive setup function
 */
async function setupGoogleAuth() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('=== Google Calendar API Setup ===\n');
  
  // Step 1: Get auth URL
  getAuthUrl();
  
  // Step 2: Get authorization code from user
  rl.question('\nEnter the authorization code: ', async (code) => {
    await getTokens(code.trim()); // Trim any extra whitespace
    rl.close();
  });
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupGoogleAuth();
}

module.exports = {
  getAuthUrl,
  getTokens,
  setupGoogleAuth
};