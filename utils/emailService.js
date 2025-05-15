// /backend/utils/emailService.js
const nodemailer = require('nodemailer');

/**
 * Send an email using nodemailer
 * In development mode, sends real emails if credentials are provided or logs to console if not
 */
const sendEmail = async (options) => {
  // Check if email credentials are missing
  if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
    // Log the email details instead of sending
    console.log('\n==== EMAIL CREDENTIALS MISSING: EMAIL NOT SENT ====');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    
    // For verification emails, log the verification URL for easy testing
    if (options.html && options.html.includes('verify-email')) {
      const match = options.html.match(/href="([^"]*verify-email[^"]*)"/);
      if (match && match[1]) {
        console.log('\n✅ VERIFICATION URL:');
        console.log(match[1]);
        console.log('Copy this URL to verify the account in development');
      }
    }
    
    // For password reset emails, log the reset URL
    if (options.html && options.html.includes('reset-password')) {
      const match = options.html.match(/href="([^"]*reset-password[^"]*)"/);
      if (match && match[1]) {
        console.log('\n🔑 PASSWORD RESET URL:');
        console.log(match[1]);
        console.log('Copy this URL to reset password in development');
      }
    }
    
    console.log('==========================================\n');
    return; // Skip actual sending
  }

  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 2525,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // // Define email options
    // const mailOptions = {
    //   from: process.env.EMAIL_FROM || 'support@socialboost.com',
    //   to: options.email,
    //   subject: options.subject,
    //   html: options.html
    // };

    // Locate the mailOptions definition in the sendEmail function and modify it like this:
const mailOptions = {
  from: process.env.EMAIL_FROM || 'support@socialboost.com',
  to: options.email || options.to, // Accept both options.email and options.to
  subject: options.subject,
  // Include both text and html options if they exist
  ...(options.text ? { text: options.text } : {}),
  ...(options.html ? { html: options.html } : {})
};

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    // Log email info in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n==== EMAIL SENT SUCCESSFULLY ====');
      console.log(`To: ${options.email}`);
      console.log(`Message ID: ${info.messageId}`);
      
      // Log preview URL if available (for services like Mailtrap)
      if (info.previewUrl) {
        console.log(`Preview URL: ${info.previewUrl}`);
      }
      
      console.log('==================================\n');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    // In development, provide more detailed error info
    if (process.env.NODE_ENV !== 'production') {
      console.error('Email error details:', error.message);
    }
    throw error; // Re-throw to allow handling in the calling function
  }
};

// Email template for verification
const getVerificationEmailHtml = (name, verificationUrl) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="background-color: #6200ea; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0; text-align: center;">SocialBoost</h2>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
        <h3 style="color: #333;">Verify Your Email Address</h3>
        <p style="color: #555;">Hi ${name},</p>
        <p style="color: #555;">Thank you for registering with SocialBoost. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #6200ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
        </div>
        <p style="color: #555;">If you didn't create an account, you can safely ignore this email.</p>
        <p style="color: #555;">This link will expire in 24 hours.</p>
        <p style="color: #555;">Best regards,<br>The SocialBoost Team</p>
      </div>
      <div style="text-align: center; padding-top: 20px; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} SocialBoost. All rights reserved.</p>
      </div>
    </div>
  `;
};

// Email template for password reset
const getPasswordResetEmailHtml = (name, resetUrl) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="background-color: #6200ea; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0; text-align: center;">SocialBoost</h2>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
        <h3 style="color: #333;">Reset Your Password</h3>
        <p style="color: #555;">Hi ${name},</p>
        <p style="color: #555;">You requested to reset your password. Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #6200ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #555;">If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color: #555;">This link will expire in 10 minutes.</p>
        <p style="color: #555;">Best regards,<br>The SocialBoost Team</p>
      </div>
      <div style="text-align: center; padding-top: 20px; color: #999; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} SocialBoost. All rights reserved.</p>
      </div>
    </div>
  `;
};

// Add to your emailService.js file

// OTP Email HTML template
const getOTPEmailHtml = (firstName, otp) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Login Verification</h2>
      <p>Hello ${firstName},</p>
      <p>Your verification code for login is:</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 4px;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.</p>
      <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
        &copy; SocialBoost. All rights reserved.
      </p>
    </div>
  `;
};

// Create this function in your emailService.js file

/**
 * Generate HTML template for strategy call confirmation
 * @param {Object} booking - The booking details
 * @param {string} meetingLink - The Google Meet link
 * @returns {string} HTML email content
 */
const getStrategyCallConfirmationHtml = (booking, meetingLink) => {
  const { companyName, preferredDate, preferredTime } = booking;
  const formattedDate = new Date(preferredDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Strategy Call Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; color: #374151;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-width: 100%; background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Instagram-inspired gradient header -->
              <tr>
                <td>
                  <div style="background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); height: 8px;"></div>
                </td>
              </tr>
              
              <!-- Logo and brand -->
              <tr>
                <td align="center" style="padding: 30px 40px 20px;">
                  <img src="https://i.ibb.co/BVmxCNt/instagram-growth.png" alt="SocialBoost" width="200" style="display: block; max-width: 100%;">
                </td>
              </tr>
              
              <!-- Confirmation message -->
              <tr>
                <td align="center" style="padding: 0 40px 30px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center">
                        <div style="background-color: #d1fae5; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                          <div style="font-size: 40px;">✓</div>
                        </div>
                        <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 15px;">Your Strategy Call is Confirmed!</h1>
                        <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
                          Thank you for booking a strategy call for our Custom Elite Plan. We're excited to discuss your Instagram growth goals!
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Meeting details -->
              <tr>
                <td style="padding: 0 40px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8fafc; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td>
                              <h2 style="margin: 0 0 20px; color: #111827; font-size: 18px; font-weight: 600;">Meeting Details</h2>
                              
                              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                  <td style="padding-bottom: 15px;">
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                      <tr>
                                        <td width="24" valign="top">
                                          <img src="https://i.ibb.co/7YGxzLb/calendar.png" alt="Date" width="20" style="margin-right: 10px;">
                                        </td>
                                        <td valign="top">
                                          <div style="font-weight: 600; color: #111827;">${formattedDate}</div>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom: 15px;">
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                      <tr>
                                        <td width="24" valign="top">
                                          <img src="https://i.ibb.co/tZqWNqP/clock.png" alt="Time" width="20" style="margin-right: 10px;">
                                        </td>
                                        <td valign="top">
                                          <div style="font-weight: 600; color: #111827;">${preferredTime}</div>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                                <tr>
                                  <td>
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                      <tr>
                                        <td width="24" valign="top">
                                          <img src="https://i.ibb.co/6BwXJsC/video.png" alt="Meet" width="20" style="margin-right: 10px;">
                                        </td>
                                        <td valign="top">
                                          <div style="font-weight: 600; color: #111827;">
                                            <a href="${meetingLink}" target="_blank" style="color: #8B5CF6; text-decoration: none;">Join Google Meet</a>
                                          </div>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- What to expect -->
              <tr>
                <td style="padding: 0 40px 30px;">
                  <h3 style="color: #111827; font-size: 16px; margin: 0 0 15px;">What to expect:</h3>
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
                    <tr>
                      <td style="padding-bottom: 15px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="30" valign="top">
                              <div style="width: 24px; height: 24px; background-color: #8B5CF6; border-radius: 50%; color: white; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold;">1</div>
                            </td>
                            <td style="padding-left: 10px; color: #4b5563; font-size: 14px; line-height: 21px;">
                              We'll discuss your Instagram growth goals and current challenges.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 15px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="30" valign="top">
                              <div style="width: 24px; height: 24px; background-color: #8B5CF6; border-radius: 50%; color: white; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold;">2</div>
                            </td>
                            <td style="padding-left: 10px; color: #4b5563; font-size: 14px; line-height: 21px;">
                              Our team will create a custom growth strategy tailored to your specific needs.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="30" valign="top">
                              <div style="width: 24px; height: 24px; background-color: #8B5CF6; border-radius: 50%; color: white; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold;">3</div>
                            </td>
                            <td style="padding-left: 10px; color: #4b5563; font-size: 14px; line-height: 21px;">
                              You'll receive a detailed proposal with pricing options based on your goals.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #4b5563; font-size: 14px; line-height: 21px; margin-bottom: 0;">
                    This meeting has been added to your Google Calendar. You'll receive a reminder notification before it starts.
                  </p>
                </td>
              </tr>
              
              <!-- Preparation tips -->
              <tr>
                <td style="padding: 0 40px 30px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #EEF2FF; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="padding: 20px;">
                        <h3 style="color: #4F46E5; font-size: 16px; margin: 0 0 10px;">Quick preparation tips:</h3>
                        <ul style="color: #4b5563; font-size: 14px; line-height: 21px; margin: 0; padding-left: 20px;">
                          <li style="margin-bottom: 8px;">Have your Instagram profile ready to share</li>
                          <li style="margin-bottom: 8px;">Think about your specific growth goals (followers, engagement, etc.)</li>
                          <li>Prepare any questions you have about our process</li>
                        </ul>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Need to reschedule -->
              <tr>
                <td style="padding: 0 40px 40px; text-align: center;">
                  <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
                    Need to reschedule?
                  </p>
                  <a href="mailto:support@socialboost.com" style="color: #8B5CF6; font-weight: 500; text-decoration: none;">Contact us</a>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center">
                        <p style="margin: 0 0 10px; color: #9ca3af; font-size: 12px;">© 2025 SocialBoost. All rights reserved.</p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                          1234 Social Media Ave., San Francisco, CA 94107
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Send OTP Email function
const sendOTPEmail = async (email, otp, firstName) => {
  return sendEmail({
    email,
    subject: 'Your Login Verification Code',
    html: getOTPEmailHtml(firstName, otp)
  });
};

// Add to /backend/utils/emailService.js

// Subscription confirmation email template
// Updated getSubscriptionConfirmationEmailHtml function in /backend/utils/emailService.js

const getSubscriptionConfirmationEmailHtml = (firstName, planName, amount, billing, orderId) => {
  const billingText = billing === 'annual' ? 'yearly' : 'monthly';
  const nextBillingDate = new Date();
  if (billing === 'annual') {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  } else {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }
  
  const formattedDate = nextBillingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentYear = new Date().getFullYear();
  
  // Get plan color based on name
  let planColor = '#4F46E5'; // Default indigo
  let planGradient = 'linear-gradient(135deg, #4F46E5, #7C3AED)';
  let planIcon = '⚡'; // Default
  
  if (planName.toLowerCase().includes('starter')) {
    planColor = '#3B82F6'; // Blue
    planGradient = 'linear-gradient(135deg, #3B82F6, #2563EB)';
    planIcon = '⚡';
  } else if (planName.toLowerCase().includes('pro') || planName.toLowerCase().includes('professional')) {
    planColor = '#8B5CF6'; // Purple
    planGradient = 'linear-gradient(135deg, #8B5CF6, #7C3AED)';
    planIcon = '👑';
  } else if (planName.toLowerCase().includes('enterprise') || planName.toLowerCase().includes('custom')) {
    planColor = '#14B8A6'; // Teal
    planGradient = 'linear-gradient(135deg, #14B8A6, #0D9488)';
    planIcon = '🛡️';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; color: #374151;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-width: 100%; background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Instagram-inspired gradient header -->
              <tr>
                <td>
                  <div style="background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); height: 8px;"></div>
                </td>
              </tr>
              
              <!-- Logo and brand -->
              <tr>
                <td align="center" style="padding: 30px 40px 20px;">
                  <img src="https://i.ibb.co/BVmxCNt/instagram-growth.png" alt="SocialBoost" width="200" style="display: block; max-width: 100%;">
                </td>
              </tr>
              
              <!-- Success message -->
              <tr>
                <td align="center" style="padding: 0 40px 30px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center">
                        <div style="background-color: #d1fae5; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                          <div style="font-size: 40px;">✓</div>
                        </div>
                        <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 15px;">Payment Successful!</h1>
                        <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
                          Hi ${firstName}, thank you for subscribing to SocialBoost! Your Instagram growth journey begins now.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Plan details -->
              <tr>
                <td style="padding: 0 40px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8fafc; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td>
                              <div style="display: flex; align-items: center;">
                                <div style="width: 50px; height: 50px; border-radius: 12px; background: ${planGradient}; color: white; font-size: 24px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">
                                  ${planIcon}
                                </div>
                                <div>
                                  <h2 style="margin: 0 0 5px; color: #111827; font-size: 18px; font-weight: 600;">${planName} Plan</h2>
                                  <p style="margin: 0; color: #6b7280; font-size: 14px;">${billing === 'annual' ? 'Annual' : 'Monthly'} Billing</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Order details -->
              <tr>
                <td style="padding: 0 40px 30px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: #f8fafc; padding: 15px 20px; border-bottom: 1px solid #e5e7eb;">
                        <h3 style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">Order Summary</h3>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #f3f4f6;">
                              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                  <td style="color: #6b7280; font-size: 14px;">Order ID</td>
                                  <td align="right" style="font-weight: 600; color: #111827; font-size: 14px;">#${orderId}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #f3f4f6;">
                              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                  <td style="color: #6b7280; font-size: 14px;">Amount</td>
                                  <td align="right" style="font-weight: 600; color: #111827; font-size: 14px;">$${amount}/${billingText}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #f3f4f6;">
                              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                  <td style="color: #6b7280; font-size: 14px;">Payment Status</td>
                                  <td align="right">
                                    <span style="background-color: #d1fae5; color: #065f46; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 12px;">Successful</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 15px 20px;">
                              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                  <td style="color: #6b7280; font-size: 14px;">Next Billing Date</td>
                                  <td align="right" style="font-weight: 600; color: #111827; font-size: 14px;">${formattedDate}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- What happens next -->
              <tr>
                <td style="padding: 0 40px 30px;">
                  <h3 style="color: #111827; font-size: 16px; margin: 0 0 15px;">What happens next:</h3>
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
                    <tr>
                      <td style="padding-bottom: 15px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="30" valign="top">
                              <div style="width: 24px; height: 24px; background-color: ${planColor}; border-radius: 50%; color: white; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold;">1</div>
                            </td>
                            <td style="padding-left: 10px; color: #4b5563; font-size: 14px; line-height: 21px;">
                              Our team will begin setting up your Instagram growth campaign within the next 24 hours based on your preferences.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 15px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="30" valign="top">
                              <div style="width: 24px; height: 24px; background-color: ${planColor}; border-radius: 50%; color: white; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold;">2</div>
                            </td>
                            <td style="padding-left: 10px; color: #4b5563; font-size: 14px; line-height: 21px;">
                              You'll start seeing increased engagement and follower growth within the first week.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="30" valign="top">
                              <div style="width: 24px; height: 24px; background-color: ${planColor}; border-radius: 50%; color: white; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold;">3</div>
                            </td>
                            <td style="padding-left: 10px; color: #4b5563; font-size: 14px; line-height: 21px;">
                              You'll receive weekly reports on your campaign's performance, and you can track your growth in real-time from your dashboard.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding: 0 40px 40px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="background: ${planGradient}; border-radius: 6px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="display: inline-block; color: white; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 30px;">View Your Dashboard</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Support info -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td>
                        <p style="margin: 0 0 15px; color: #111827; font-size: 14px; font-weight: 600;">Need help? We're here for you.</p>
                        <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">Email us at <a href="mailto:support@socialboost.com" style="color: ${planColor}; text-decoration: none;">support@socialboost.com</a></p>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Call us at <a href="tel:+18005551234" style="color: ${planColor}; text-decoration: none;">+1 (800) 555-1234</a></p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 30px 40px; color: #9ca3af; font-size: 12px;">
                  <p style="margin: 0 0 10px;">© ${currentYear} SocialBoost. All rights reserved.</p>
                  <p style="margin: 0 0 10px;">
                    <a href="#" style="color: #9ca3af; text-decoration: none; margin: 0 10px;">Privacy Policy</a> • 
                    <a href="#" style="color: #9ca3af; text-decoration: none; margin: 0 10px;">Terms of Service</a> • 
                    <a href="#" style="color: #9ca3af; text-decoration: none; margin: 0 10px;">Unsubscribe</a>
                  </p>
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 0 5px;">
                        <a href="#" style="display: inline-block; padding: 5px;">
                          <img src="https://i.ibb.co/g9Cg31T/facebook.png" alt="Facebook" width="24">
                        </a>
                      </td>
                      <td style="padding: 0 5px;">
                        <a href="#" style="display: inline-block; padding: 5px;">
                          <img src="https://i.ibb.co/C76Bcj9/twitter.png" alt="Twitter" width="24">
                        </a>
                      </td>
                      <td style="padding: 0 5px;">
                        <a href="#" style="display: inline-block; padding: 5px;">
                          <img src="https://i.ibb.co/CHT1Syr/instagram.png" alt="Instagram" width="24">
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Send subscription confirmation email
const sendSubscriptionConfirmationEmail = async (email, firstName, planName, amount, billing, orderId) => {
  return sendEmail({
    email,
    subject: 'Your SocialBoost Subscription Confirmation',
    html: getSubscriptionConfirmationEmailHtml(firstName, planName, amount, billing, orderId)
  });
};

// Make sure to export the new functions
module.exports = {
  sendEmail,
  getVerificationEmailHtml,
  getPasswordResetEmailHtml,
  sendOTPEmail,
  getOTPEmailHtml,
  sendSubscriptionConfirmationEmail,
  getSubscriptionConfirmationEmailHtml,
    getStrategyCallConfirmationHtml
};