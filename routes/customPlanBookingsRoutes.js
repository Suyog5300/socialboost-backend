// /backend/routes/bookings.js
const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const CustomPlanBooking = require("../models/CustomPlanBooking");
const { User, UserRole } = require("../models/User");
const { sendEmail, getStrategyCallConfirmationHtml } = require("../utils/emailService");
const { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('../utils/googleCalendarService');

// @route   POST /api/bookings/custom-plan
// @desc    Book a strategy call for custom plan
// @access  Private
// Add this import at the top of the file

// Then find your POST /custom-plan route handler and update it like this:
router.post("/custom-plan", auth, async (req, res) => {
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
      additionalInfo,
    } = req.body;

    // Parse the date and time to create proper DateTime objects
    const startDateTime = new Date(`${preferredDate}T${preferredTime}`);
    
    // Set meeting duration (30 minutes by default)
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(startDateTime.getMinutes() + 30);

    // Prepare event details for Google Calendar
    const eventDetails = {
      summary: `Strategy Call: ${companyName}`,
      description: `
Custom Plan Strategy Call

Company/Brand: ${companyName}
Instagram: @${instagramHandle}
Current Followers: ${currentFollowers}
// Goal Followers: ${goalFollowers}
Target Audience: ${targetAudience}

Additional Information: ${additionalInfo || 'None provided'}

This is a strategy call to discuss custom Instagram growth plans.
      `.trim(),
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      attendeeEmails: [req.user.email],
      timeZone: 'America/New_York' // You can make this dynamic based on user preference
    };

    // Create Google Calendar event
    console.log('Creating Google Calendar event...');
    const calendarResult = await createCalendarEvent(eventDetails);

    if (!calendarResult.success) {
      console.error('Failed to create calendar event:', calendarResult.error);
      return res.status(500).json({ 
        message: 'Failed to schedule meeting in calendar',
        error: calendarResult.error 
      });
    }

    // Create booking record with calendar event details
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
      status: "scheduled", // Automatically scheduled since calendar event was created
      meetingLink: calendarResult.meetLink,
      googleCalendarEventId: calendarResult.eventId
    });

    await booking.save();
    console.log('Booking saved:', booking._id);

    // Get the user's name for the email
    const user = await User.findById(req.user.id);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'Client';

    // Send confirmation email with the meeting link using the HTML template
    const emailHTML = getStrategyCallConfirmationHtml(booking, calendarResult.meetLink);

    try {
      await sendEmail({
        email: req.user.email,
        subject: "Your Strategy Call is Confirmed!",
        html: emailHTML
      });
      console.log('Confirmation email sent to user');
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the whole request if email fails
    }

    // Send email notification to admin team
    const admins = await User.find({
      role: { $in: [UserRole.ADMIN, UserRole.SUPERADMIN] },
    });

    if (admins.length > 0) {
      const adminEmails = admins.map((admin) => admin.email);

      // Admin notification with HTML
      const adminEmailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
          <h2 style="color: #333;">New Strategy Call Booking</h2>
          
          <p>A new strategy call has been booked and automatically scheduled in Google Calendar.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Company/Brand:</strong> ${companyName}</p>
            <p><strong>Instagram:</strong> @${instagramHandle}</p>
            <p><strong>Date:</strong> ${startDateTime.toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${preferredTime}</p>
            <p><strong>Meeting Link:</strong> <a href="${calendarResult.meetLink}" target="_blank">Join Google Meet</a></p>
            <p><strong>Calendar Event:</strong> <a href="${calendarResult.htmlLink}" target="_blank">View in Google Calendar</a></p>
            <p><strong>Additional Info:</strong> ${additionalInfo || 'None'}</p>
          </div>
          
          <p>The meeting has been automatically added to the company calendar and invitations have been sent.</p>
        </div>
      `;

      try {
        await sendEmail({
          email: adminEmails,
          subject: "New Custom Plan Strategy Call Booking",
          html: adminEmailHTML
        });
        console.log('Admin notification sent');
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      booking: {
        id: booking._id,
        planName: booking.planName,
        preferredDate: booking.preferredDate,
        preferredTime: booking.preferredTime,
        status: booking.status,
        meetingLink: calendarResult.meetLink,
        calendarEventId: calendarResult.eventId,
        calendarLink: calendarResult.htmlLink
      },
    });
  } catch (error) {
    console.error("Error booking custom plan strategy call:", error);
    res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/bookings/my-bookings
// @desc    Get user's bookings
// @access  Private
router.get("/my-bookings", auth, async (req, res) => {
  try {
    const bookings = await CustomPlanBooking.find({ user: req.user.id });
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const booking = await CustomPlanBooking.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin Routes

// @route   GET /api/bookings/admin/all
// @desc    Get all custom plan bookings (Admin only)
// @access  Private (Admin)
router.get(
  "/admin/all",
  [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)],
  async (req, res) => {
    try {
      const bookings = await CustomPlanBooking.find()
        .populate("user", "firstName lastName email")
        .populate("assignedTo", "firstName lastName");

      res.json(bookings);
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/bookings/admin/:id
// @desc    Update booking status (Admin only)
// @access  Private (Admin)
// @route   PUT /api/bookings/admin/:id
// @desc    Update booking status (Admin only)
// @access  Private (Admin)
router.put(
  "/admin/:id",
  [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)],
  async (req, res) => {
    try {
      const { status, meetingLink, assignedTo, notes, customPlan, rescheduleDate, rescheduleTime } = req.body;

      const booking = await CustomPlanBooking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Handle rescheduling
      if (rescheduleDate && rescheduleTime && booking.googleCalendarEventId) {
        const newStartDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
        const newEndDateTime = new Date(newStartDateTime);
        newEndDateTime.setMinutes(newStartDateTime.getMinutes() + 30);

        // Update the Google Calendar event
        const updateResult = await updateCalendarEvent(booking.googleCalendarEventId, {
          start: {
            dateTime: newStartDateTime.toISOString(),
            timeZone: 'America/New_York'
          },
          end: {
            dateTime: newEndDateTime.toISOString(),
            timeZone: 'America/New_York'
          }
        });

        if (updateResult.success) {
          booking.preferredDate = newStartDateTime;
          booking.preferredTime = rescheduleTime;
          console.log('Calendar event updated for rescheduling');
        } else {
          console.error('Failed to update calendar event:', updateResult.error);
        }
      }

      // Handle cancellation
      if (status === 'cancelled' && booking.googleCalendarEventId) {
        const deleteResult = await deleteCalendarEvent(booking.googleCalendarEventId);
        if (deleteResult.success) {
          console.log('Calendar event deleted for cancelled booking');
        } else {
          console.error('Failed to delete calendar event:', deleteResult.error);
        }
      }

      // Update booking fields
      if (status) booking.status = status;
      if (meetingLink) booking.meetingLink = meetingLink;
      if (assignedTo) booking.assignedTo = assignedTo;

      // Add note if provided
      if (notes?.content) {
        booking.notes.push({
          content: notes.content,
          createdBy: req.user.id,
        });
      }

      // Update custom plan details if provided
      if (customPlan) {
        booking.customPlan = {
          ...booking.customPlan,
          ...customPlan,
        };
      }

      await booking.save();

      // Send confirmation emails as before...
      // (Keep the existing email logic)

      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/bookings/:id
// @desc    Delete booking and associated calendar event
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const booking = await CustomPlanBooking.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Delete associated Google Calendar event
    if (booking.googleCalendarEventId) {
      const deleteResult = await deleteCalendarEvent(booking.googleCalendarEventId);
      if (deleteResult.success) {
        console.log('Calendar event deleted');
      } else {
        console.error('Failed to delete calendar event:', deleteResult.error);
      }
    }

    // Delete the booking
    await CustomPlanBooking.findByIdAndDelete(req.params.id);

    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add this route to your /backend/routes/bookings.js file

// @route   POST /api/bookings/check-availability
// @desc    Check availability of time slots for given dates
// @access  Public (no auth required for checking availability)
router.post('/check-availability', async (req, res) => {
  try {
    const { dates } = req.body;
    
    if (!dates || !Array.isArray(dates)) {
      return res.status(400).json({ message: 'Dates array is required' });
    }
    
    const availabilityData = await Promise.all(
      dates.map(async (date) => {
        // Find all bookings for this date
        const bookingsForDate = await CustomPlanBooking.find({
          preferredDate: {
            $gte: new Date(date + 'T00:00:00.000Z'),
            $lt: new Date(date + 'T23:59:59.999Z')
          },
          status: { $in: ['scheduled', 'pending'] } // Only count confirmed bookings
        }).select('preferredTime status user');
        
        // Business hours: 9am - 5pm, excluding lunch (12pm)
        const businessHours = [];
        for (let hour = 9; hour <= 17; hour++) {
          if (hour === 12) continue; // Skip lunch hour
          businessHours.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        
        // Get booked time slots
        const bookedSlots = bookingsForDate.map(booking => ({
          time: booking.preferredTime,
          status: booking.status,
          // Don't expose user info for privacy
          bookedBy: booking.status === 'scheduled' ? 'confirmed' : 'pending'
        }));
        
        const bookedTimes = bookedSlots.map(slot => slot.time);
        
        // Calculate available slots
        const availableSlots = businessHours.filter(time => !bookedTimes.includes(time));
        
        return {
          date,
          availableSlots,
          bookedSlots: bookedSlots.map(slot => ({ time: slot.time })), // Remove sensitive info
          totalSlots: businessHours.length,
          availableCount: availableSlots.length
        };
      })
    );
    
    res.json(availabilityData);
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ message: 'Server error while checking availability' });
  }
});

// @route   GET /api/bookings/availability/:date
// @desc    Get detailed availability for a specific date (optional - for admin)
// @access  Private (Admin)
router.get('/availability/:date', [auth, authorize(UserRole.ADMIN, UserRole.SUPERADMIN)], async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Find all bookings for this date with user details
    const bookingsForDate = await CustomPlanBooking.find({
      preferredDate: {
        $gte: new Date(date + 'T00:00:00.000Z'),
        $lt: new Date(date + 'T23:59:59.999Z')
      }
    })
    .populate('user', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName')
    .sort({ preferredTime: 1 });
    
    // Business hours
    const businessHours = [];
    for (let hour = 9; hour <= 17; hour++) {
      if (hour === 12) continue;
      businessHours.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    // Create detailed availability map
    const timeSlots = businessHours.map(time => {
      const booking = bookingsForDate.find(b => b.preferredTime === time);
      
      return {
        time,
        available: !booking,
        booking: booking ? {
          id: booking._id,
          companyName: booking.companyName,
          user: booking.user,
          status: booking.status,
          assignedTo: booking.assignedTo,
          createdAt: booking.createdAt
        } : null
      };
    });
    
    res.json({
      date,
      timeSlots,
      summary: {
        totalSlots: businessHours.length,
        bookedSlots: bookingsForDate.length,
        availableSlots: businessHours.length - bookingsForDate.length
      }
    });
  } catch (error) {
    console.error('Error getting detailed availability:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/bookings/bulk-availability
// @desc    Check availability for multiple date ranges (for calendar widgets)
// @access  Public
router.post('/bulk-availability', async (req, res) => {
  try {
    const { startDate, endDate, timeZone = 'America/New_York' } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }
    
    // Generate all dates in range (excluding weekends)
    const dates = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        dates.push(currentDate.toISOString().split('T')[0]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Check availability for all dates
    const availabilityData = await Promise.all(
      dates.map(async (date) => {
        const bookingsCount = await CustomPlanBooking.countDocuments({
          preferredDate: {
            $gte: new Date(date + 'T00:00:00.000Z'),
            $lt: new Date(date + 'T23:59:59.999Z')
          },
          status: { $in: ['scheduled', 'pending'] }
        });
        
        const totalSlots = 8; // 9am-5pm excluding 12pm lunch
        const availableSlots = Math.max(0, totalSlots - bookingsCount);
        
        return {
          date,
          available: availableSlots > 0,
          availableSlots,
          totalSlots,
          utilization: Math.round((bookingsCount / totalSlots) * 100)
        };
      })
    );
    
    res.json({
      dateRange: { startDate, endDate },
      timeZone,
      availability: availabilityData,
      summary: {
        totalDays: dates.length,
        fullyAvailableDays: availabilityData.filter(d => d.availableSlots === d.totalSlots).length,
        partiallyAvailableDays: availabilityData.filter(d => d.availableSlots > 0 && d.availableSlots < d.totalSlots).length,
        fullyBookedDays: availabilityData.filter(d => d.availableSlots === 0).length
      }
    });
  } catch (error) {
    console.error('Error checking bulk availability:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
