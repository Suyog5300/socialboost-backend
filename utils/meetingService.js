/**
 * Utility for generating meeting links without using Google API
 */

// Function to generate a Google Meet link
const generateGoogleMeetLink = () => {
  // Generate a unique meeting ID (3 letters + 4 letters + 3 letters)
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let meetingId = '';
  
  // First group (3 characters)
  for (let i = 0; i < 3; i++) {
    meetingId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  meetingId += '-';
  
  // Second group (4 characters)
  for (let i = 0; i < 4; i++) {
    meetingId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  meetingId += '-';
  
  // Third group (3 characters)
  for (let i = 0; i < 3; i++) {
    meetingId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return `https://meet.google.com/pfh-bgna-tbf`;
};

// Add more meeting utilities as needed here

module.exports = {
  generateGoogleMeetLink
};