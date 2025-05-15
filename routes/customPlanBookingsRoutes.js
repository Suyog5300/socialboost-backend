// /backend/routes/bookings.js
const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const CustomPlanBooking = require("../models/CustomPlanBooking");
const { User, UserRole } = require("../models/User");
const { sendEmail, getStrategyCallConfirmationHtml } = require("../utils/emailService");
const { generateGoogleMeetLink } = require('../utils/meetingService');

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

    // Generate a Google Meet link directly (no API needed)
    const meetingLink = generateGoogleMeetLink();

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
      preferredDate: new Date(preferredDate),
      preferredTime,
      additionalInfo,
      status: "scheduled", // Set as scheduled since we're providing the meeting link
      meetingLink: meetingLink
    });

    await booking.save();

    // Get the user's name for the email
    const user = await User.findById(req.user.id);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'Client';

    // Send confirmation email with the meeting link using the HTML template
    const emailHTML = getStrategyCallConfirmationHtml(booking, meetingLink);

    await sendEmail({
      email: req.user.email,
      subject: "Your Strategy Call is Confirmed!",
      html: emailHTML
    });

    // Send email notification to admin
    const admins = await User.find({
      role: { $in: [UserRole.ADMIN, UserRole.SUPERADMIN] },
    });

    if (admins.length > 0) {
      const adminEmails = admins.map((admin) => admin.email);

      // Admin notification with HTML
      const adminEmailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
          <h2 style="color: #333;">New Strategy Call Booking</h2>
          
          <p>A new strategy call has been booked and automatically scheduled.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Company/Brand:</strong> ${companyName}</p>
            <p><strong>Instagram:</strong> @${instagramHandle}</p>
            <p><strong>Date:</strong> ${new Date(preferredDate).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${preferredTime}</p>
            <p><strong>Meeting Link:</strong> <a href="${meetingLink}" target="_blank">Join Google Meet</a></p>
            <p><strong>Additional Info:</strong> ${additionalInfo || 'None'}</p>
          </div>
          
          <p>Please add this meeting to your calendar.</p>
        </div>
      `;

      await sendEmail({
        email: adminEmails,
        subject: "New Custom Plan Strategy Call Booking",
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
      },
    });
  } catch (error) {
    console.error("Error booking custom plan strategy call:", error);
    res.status(500).json({ message: "Server error" });
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
      const { status, meetingLink, assignedTo, notes, customPlan } = req.body;

      const booking = await CustomPlanBooking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update fields
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

      // If status changed to scheduled, send confirmation email to user
      if (status === "scheduled" && booking.status !== status) {
        const user = await User.findById(booking.user);

        if (user) {
          // Use HTML template for better email
          const emailHTML = getStrategyCallConfirmationHtml(booking, booking.meetingLink);
          
          await sendEmail({
            email: user.email,
            subject: "Your Strategy Call is Confirmed",
            html: emailHTML
          });
        }
      }

      // If custom plan is approved, notify user
      if (
        customPlan?.approved &&
        customPlan.approved !== booking.customPlan?.approved
      ) {
        const user = await User.findById(booking.user);

        if (user) {
          await sendEmail({
            email: user.email,
            subject: "Your Custom Elite Plan is Ready",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
                <h2 style="color: #333; text-align: center;">Your Custom Plan is Ready!</h2>
                
                <p>Great news! We've created a custom plan based on our strategy call.</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>Monthly Price:</strong> $${customPlan.monthlyPrice}</p>
                  
                  <p><strong>Features:</strong></p>
                  <ul>
                    ${customPlan.features.map(f => `<li>${f}</li>`).join('')}
                  </ul>
                  
                  <p><strong>Additional Details:</strong> ${customPlan.additionalDetails}</p>
                </div>
                
                <p>Please log in to your account to review and activate your custom plan.</p>
                
                <div style="text-align: center; margin-top: 20px;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate-custom-plan" 
                     style="background-color: #6200ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    Review & Activate Plan
                  </a>
                </div>
              </div>
            `
          });
        }
      }

      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
