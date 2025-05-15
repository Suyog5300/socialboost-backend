// 1. First, install the Google API client library
// npm install googleapis

// 2. Create a new file: utils/googleCalendarService.js

const { google } = require('googleapis');
const calendar = google.calendar('v3');

// Create OAuth2 client
const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// This function creates a meeting and returns the meeting link
const createMeeting = async (
  summary,
  description,
  startDateTime,
  endDateTime,
  attendees,
  timeZone = 'America/New_York'
) => {
  try {
    const oauth2Client = createOAuth2Client();
    
    // Set credentials - use service account for backend applications
    // If you're using a service account:
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    // Create event with conferencing data
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
      attendees: attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(2),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    // Insert event to the calendar
    const { data } = await calendar.events.insert({
      auth: oauth2Client,
      calendarId: 'primary', // Use your calendar ID or 'primary'
      resource: event,
      conferenceDataVersion: 1
    });

    // Extract the Google Meet link
    const meetLink = data.conferenceData?.entryPoints?.find(
      entryPoint => entryPoint.entryPointType === 'video'
    )?.uri;

    return {
      eventId: data.id,
      meetLink: meetLink || 'No meeting link generated',
      htmlLink: data.htmlLink, // Link to the event in Google Calendar
    };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw new Error('Failed to create meeting: ' + error.message);
  }
};

module.exports = {
  createMeeting
};

// 3. Update your bookings route to use this service
// In routes/bookings.js:

const { createMeeting } = require('../utils/googleCalendarService');
const { sendEmail } = require('../utils/emailService');

// Inside the POST handler for custom-plan bookings:
router.post('/custom-plan', auth, async (req, res) => {
  try {
    const {
      planName,
      companyName,
      website,
      instagramHandle,
      currentFollowers,
      goalFollowers,
      targetAudience,
      preferredDate,
      preferredTime,
      additionalInfo
    } = req.body;

    // Parse the date and time
    const startDateTime = new Date(`${preferredDate}T${preferredTime}`);
    
    // Set the meeting duration (e.g., 30 minutes)
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(startDateTime.getMinutes() + 30);
    
    // Create the meeting
    const meetingResult = await createMeeting(
      `Strategy Call: ${companyName}`,
      `Custom Plan Strategy Call with ${companyName} (@${instagramHandle}).\n\nAdditional Info: ${additionalInfo || 'None'}`,
      startDateTime.toISOString(),
      endDateTime.toISOString(),
      [req.user.email] // Add the user's email as an attendee
    );

    // Create a new booking with the meeting link
    const booking = new CustomPlanBooking({
      user: req.user.id,
      planName,
      companyName,
      website,
      instagramHandle,
      currentFollowers,
      goalFollowers,
      targetAudience,
      preferredDate: startDateTime,
      preferredTime,
      additionalInfo,
      status: 'scheduled', // Automatically scheduled since we created the meeting
      meetingLink: meetingResult.meetLink,
      googleCalendarEventId: meetingResult.eventId
    });

    await booking.save();

    // Send confirmation email with the meeting link
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">Your Strategy Call is Confirmed!</h2>
        
        <p>Thank you for booking a strategy call for our Custom Elite Plan!</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Date:</strong> ${startDateTime.toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${preferredTime}</p>
          <p><strong>Meeting Link:</strong> <a href="${meetingResult.meetLink}" target="_blank">Join Google Meet</a></p>
        </div>
        
        <p>This meeting has been added to your Google Calendar. You'll receive a notification before the meeting starts.</p>
        
        <p>We're looking forward to discussing your Instagram growth goals and creating a custom plan that works for you!</p>
        
        <p>Best regards,<br>The SocialBoost Team</p>
      </div>
    `;

    await sendEmail({
      email: req.user.email,
      subject: 'Your Strategy Call is Confirmed!',
      html: emailHTML
    });

    // Notify admin team
    const admins = await User.find({ role: { $in: [UserRole.ADMIN, UserRole.SUPERADMIN] } });
    
    if (admins.length > 0) {
      const adminEmails = admins.map(admin => admin.email);
      
      const adminEmailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
          <h2 style="color: #333;">New Strategy Call Booking</h2>
          
          <p>A new strategy call has been booked and automatically scheduled.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Company/Brand:</strong> ${companyName}</p>
            <p><strong>Instagram:</strong> @${instagramHandle}</p>
            <p><strong>Date:</strong> ${startDateTime.toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${preferredTime}</p>
            <p><strong>Meeting Link:</strong> <a href="${meetingResult.meetLink}" target="_blank">Join Google Meet</a></p>
            <p><strong>Additional Info:</strong> ${additionalInfo || 'None'}</p>
          </div>
          
          <p>This meeting has been added to the company calendar.</p>
        </div>
      `;
      
      await sendEmail({
        email: adminEmails,
        subject: 'New Custom Plan Strategy Call Booking',
        html: adminEmailHTML
      });
    }

    res.status(201).json({
      success: true,
      booking: {
        id: booking._id,
        planName: booking.planName,
        preferredDate: booking.preferredDate,
        preferredTime: booking.preferredTime,
        status: booking.status,
        meetingLink: booking.meetingLink
      }
    });
  } catch (error) {
    console.error('Error booking custom plan strategy call:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});