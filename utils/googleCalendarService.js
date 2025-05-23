// /backend/utils/googleCalendarService.js
const { google } = require('googleapis');

// Create OAuth2 client
const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// Initialize Google Calendar API
const calendar = google.calendar('v3');

/**
 * Create a Google Calendar event with Google Meet link
 * @param {Object} eventDetails - Event details
 * @returns {Object} - Event data with meeting link
 */
const createCalendarEvent = async (eventDetails) => {
  try {
    const oauth2Client = createOAuth2Client();
    
    // Set credentials using service account or refresh token
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      access_token: process.env.GOOGLE_ACCESS_TOKEN
    });

    const {
      summary,
      description,
      startDateTime,
      endDateTime,
      attendeeEmails = [],
      timeZone = 'America/New_York'
    } = eventDetails;

    // Create the event object
    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
      attendees: attendeeEmails.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(2, 15),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    // Insert the event
    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all' // Send calendar invites to attendees
    });

    // Extract the Google Meet link
    const meetLink = response.data.conferenceData?.entryPoints?.find(
      entryPoint => entryPoint.entryPointType === 'video'
    )?.uri;

    return {
      success: true,
      eventId: response.data.id,
      meetLink: meetLink || null,
      htmlLink: response.data.htmlLink,
      eventData: response.data
    };

  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    
    // Return error details
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null
    };
  }
};

/**
 * Update an existing Google Calendar event
 * @param {string} eventId - Event ID to update
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated event data
 */
const updateCalendarEvent = async (eventId, updateData) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      access_token: process.env.GOOGLE_ACCESS_TOKEN
    });

    const response = await calendar.events.patch({
      auth: oauth2Client,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: eventId,
      resource: updateData,
      sendUpdates: 'all'
    });

    return {
      success: true,
      eventData: response.data
    };

  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete a Google Calendar event
 * @param {string} eventId - Event ID to delete
 * @returns {Object} - Success status
 */
const deleteCalendarEvent = async (eventId) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      access_token: process.env.GOOGLE_ACCESS_TOKEN
    });

    await calendar.events.delete({
      auth: oauth2Client,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: eventId,
      sendUpdates: 'all'
    });

    return {
      success: true,
      message: 'Event deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get available time slots (optional - for advanced booking)
 * @param {string} startDate - Start date for availability check
 * @param {string} endDate - End date for availability check
 * @returns {Array} - Available time slots
 */
const getAvailableTimeSlots = async (startDate, endDate) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      access_token: process.env.GOOGLE_ACCESS_TOKEN
    });

    const response = await calendar.freebusy.query({
      auth: oauth2Client,
      resource: {
        timeMin: startDate,
        timeMax: endDate,
        items: [{ id: process.env.GOOGLE_CALENDAR_ID || 'primary' }]
      }
    });

    const busyTimes = response.data.calendars[process.env.GOOGLE_CALENDAR_ID || 'primary'].busy;
    
    // You can process busy times to generate available slots
    return {
      success: true,
      busyTimes,
      // Add logic to generate available slots based on busy times
    };

  } catch (error) {
    console.error('Error getting available time slots:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getAvailableTimeSlots
};