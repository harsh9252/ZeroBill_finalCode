const nodemailer = require('nodemailer');

const currentYear = new Date().getFullYear();

// Initialize Nodemailer transporter
let transporter = null;
let emailServiceInitialized = false;

const initializeEmailService = () => {
  try {
    // If transporter already exists, don't re-initialize unless forced or it's dead
    if (transporter && emailServiceInitialized) {
      return true;
    }

    const emailService = process.env.EMAIL_SERVICE;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;

    if (!emailService || !emailUser || !emailPass) {
      console.warn('[EMAIL] Service not configured. Check EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASSWORD in .env');
      return false;
    }

    const commonConfig = {
      pool: true, // Use connection pooling
      maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS || '5'),
      maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES || '100'),
      rateDelta: parseInt(process.env.EMAIL_RATE_DELTA || '1000'), // 1 second
      rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT || '5'), // 5 messages per second
    };

    if (emailService === 'gmail') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        ...commonConfig,
        auth: {
          user: emailUser,
          pass: emailPass, // Use App Password
        },
      });
    } else if (emailService === 'smtp') {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        ...commonConfig,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });
    } else {
      console.warn(`[EMAIL] Unsupported service: ${emailService}`);
      return false;
    }

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('[EMAIL ERROR] Connection failed:', error.message);
        if (error.code === 'EAUTH') {
          console.error('[EMAIL HINT] Authentication failed. Check your App Password or SMTP credentials.');
        } else if (error.code === 'ETIMEDOUT') {
          console.error('[EMAIL HINT] Connection timed out. Check your host and port settings.');
        }
        emailServiceInitialized = false;
      } else {
        console.log(`[EMAIL] Service (${emailService}) initialized with pooling`);
        emailServiceInitialized = true;
      }
    });

    return true;
  } catch (error) {
    console.error('[EMAIL] Initialization error:', error.message);
    return false;
  }
};

/**
 * Core internal function to send email with consistent logging and error handling
 */
const _sendEmailInternal = async (mailOptions) => {
  try {
    if (!transporter) {
      const initialized = initializeEmailService();
      if (!initialized) {
        throw new Error('Email service could not be initialized');
      }
    }

    const fromEmail = `${process.env.EMAIL_FROM_NAME || 'InvoiceBillBook'} <${process.env.EMAIL_USER}>`;
    
    const finalOptions = {
      from: fromEmail,
      ...mailOptions
    };

    const info = await transporter.sendMail(finalOptions);

    console.log(`[EMAIL SUCCESS] Sent to ${mailOptions.to}. MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error(`[EMAIL FAILURE] Failed to send to ${mailOptions.to}:`, error.message);
    
    // Check for specific limit errors
    if (error.message && (error.message.includes('Limit reached') || error.responseCode === 421)) {
      console.error('[EMAIL CRITICAL] Provider limit reached! Please slow down or use a professional email service.');
    }

    return { success: false, error: error.message, code: error.code };
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp, purpose = 'login', metadata = {}) => {
  let subject, html;
  const expiry = process.env.OTP_EXPIRY_MINUTES || 10;

  switch (purpose) {
    case 'login':
      subject = 'Your InvoiceBillBook Login OTP';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #129046 0%, #9ccc53 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">InvoiceBillBook</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Your Login OTP</h2>
            <p style="color: #666; font-size: 16px;">Please use the following OTP to log in to your account:</p>
            <div style="background-color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #129046; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP is valid for ${expiry} minutes.</p>
          </div>
          <div style="background-color: #333; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">© ${currentYear} InvoiceBillBook. All rights reserved.</p>
          </div>
        </div>
      `;
      break;

    case 'signup':
      subject = 'Verify Your InvoiceBillBook Account';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #129046 0%, #9ccc53 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome!</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Verify Your Email</h2>
            <p style="color: #666; font-size: 16px;">Use the following OTP to verify your email address:</p>
            <div style="background-color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #129046; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP is valid for ${expiry} minutes.</p>
          </div>
          <div style="background-color: #333; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">© ${currentYear} InvoiceBillBook. All rights reserved.</p>
          </div>
        </div>
      `;
      break;

    case 'reset_password':
      subject = 'Reset Your InvoiceBillBook Password';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #129046 0%, #9ccc53 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">InvoiceBillBook</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Password Reset</h2>
            <p style="color: #666; font-size: 16px;">Use the following OTP to reset your password:</p>
            <div style="background-color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #129046; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP is valid for ${expiry} minutes.</p>
          </div>
          <div style="background-color: #333; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">© ${currentYear} InvoiceBillBook. All rights reserved.</p>
          </div>
        </div>
      `;
      break;

    case 'business_verification':
      const taxLabel = metadata.gstin ? 'GSTIN' : (metadata.vatNumber ? 'VAT Number' : 'Tax ID');
      const taxId = metadata.gstin || metadata.vatNumber || 'Not provided';
      subject = 'Business Verification OTP - InvoiceBillBook';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #129046 0%, #9ccc53 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Business Verification</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <p style="color: #666; font-size: 16px;">Verifying business <strong>${taxLabel}</strong>: <strong>${taxId}</strong>.</p>
            <div style="background-color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #129046; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP is valid for ${expiry} minutes.</p>
          </div>
          <div style="background-color: #333; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">© ${currentYear} InvoiceBillBook. All rights reserved.</p>
          </div>
        </div>
      `;
      break;

    default:
      subject = 'Your InvoiceBillBook OTP';
      html = `<p>Your OTP is: <strong>${otp}</strong></p>`;
  }

  return await _sendEmailInternal({
    to: email,
    subject: subject,
    html: html
  });
};

// Send support email
const sendSupportEmail = async (userEmail, userName, subject, message) => {
  const adminEmail = process.env.EMAIL_USER;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #129046 0%, #9ccc53 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Support Request</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 20px; border-radius: 8px;">
          <p><strong>From:</strong> ${userName} (${userEmail})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr/>
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
      </div>
      <div style="background-color: #333; padding: 20px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">© ${currentYear} InvoiceBillBook. All rights reserved.</p>
      </div>
    </div>
  `;

  return await _sendEmailInternal({
    to: adminEmail,
    replyTo: userEmail,
    subject: `Support: ${subject}`,
    html: html
  });
};

// Send welcome email
const sendWelcomeEmail = async (userDetails, planDetails, attachmentPath = null) => {
  const { firstName, lastName, email, password } = userDetails;
  const { planName, planPrice, planPeriod, validityDays } = planDetails;

  const subject = 'Welcome to InvoiceBillBook - Your Account is Ready!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #129046 0%, #9ccc53 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome, ${firstName}!</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9;">
        <h3>Your Account is Active</h3>
        <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #129046; margin: 20px 0;">
          <p><strong>Login Email:</strong> ${email}</p>
          <p><strong>Password:</strong> <code style="background:#f5f5f5; padding:2px 5px;">${password}</code></p>
        </div>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Validity:</strong> ${validityDays} Days</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL}/login" style="background: #129046; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login Now</a>
        </div>
      </div>
    </div>
  `;

  return await _sendEmailInternal({
    to: email,
    subject: subject,
    html: html,
    attachments: attachmentPath ? [{ filename: 'Welcome-Invoice.pdf', path: attachmentPath }] : []
  });
};

// Send generic email
const sendEmail = async (to, subject, html, attachments = []) => {
  return await _sendEmailInternal({
    to: to,
    subject: subject,
    html: html,
    attachments: attachments
  });
};

// Send welcome email to sub-user
const sendSubUserWelcomeEmail = async (name, email, password, businessNames) => {
  const businessesList = businessNames?.length > 0
    ? businessNames.map(name => `<li>${name}</li>`).join('')
    : '<li>All accessible businesses</li>';

  const subject = 'Your Sub-User Account is Ready!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #129046; padding: 30px; text-align: center; color: white;">
        <h1>InvoiceBillBook</h1>
      </div>
      <div style="padding: 30px;">
        <h2>Hello ${name},</h2>
        <p>Your admin has created a sub-user account for you.</p>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code>${password}</code></p>
        </div>
        <h3>Assigned Businesses:</h3>
        <ul>${businessesList}</ul>
        <p>Please change your password after logging in.</p>
      </div>
    </div>
  `;

  return await _sendEmailInternal({
    to: email,
    subject: subject,
    html: html
  });
};

// Send Demo Booking Confirmation
const sendDemoBookingEmail = async (details) => {
  const { name, email, remark } = details;
  const subject = 'Confirmed: Your Demo Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #129046; padding: 30px; text-align: center; color: white;">
        <h1>Demo Request Received</h1>
      </div>
      <div style="padding: 30px;">
        <p>Hello ${name},</p>
        <p>Thank you for your interest. We've received your request for a demo.</p>
        ${remark ? `<p><strong>Your Requirements:</strong><br/>${remark}</p>` : ''}
        <p>Our team will contact you shortly to schedule a time.</p>
      </div>
    </div>
  `;

  return await _sendEmailInternal({
    to: email,
    subject: subject,
    html: html
  });
};

// Send Demo Alert to Admin
const sendDemoAdminNotification = async (details) => {
  const { name, email, phone, remark } = details;
  const adminEmail = process.env.EMAIL_USER || "invoicebillbook@gmail.com";
  const subject = `NEW DEMO REQUEST: ${name}`;
  const html = `
    <div style="padding: 20px; font-family: Arial;">
      <h2>New Demo Request</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Requirements:</strong> ${remark || 'N/A'}</p>
    </div>
  `;

  return await _sendEmailInternal({
    to: adminEmail,
    subject: subject,
    html: html
  });
};

module.exports = {
  initializeEmailService,
  sendOTPEmail,
  sendSupportEmail,
  sendWelcomeEmail,
  sendSubUserWelcomeEmail,
  sendEmail,
  sendDemoBookingEmail,
  sendDemoAdminNotification
};
