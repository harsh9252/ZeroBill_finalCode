const { google } = require('googleapis');
const User = require('../models/userModel'); // Adjust if you need a different model or if we just use ENV
const dotenv = require('dotenv');
const { sendDemoBookingEmail, sendDemoAdminNotification } = require('../utils/nodemailerService');

dotenv.config();

// Initialize the OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET, // Make sure this is added to .env
    `${process.env.BACKEND_URL}/api/calendar/auth/callback`
);

// Define the scopes required for Google Calendar
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
];

/**
 * 1. Generate Auth URL for Admin
 * Access this route in the browser once to authorize the backend.
 */
exports.generateAuthUrl = (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial for receiving a Refresh Token
        prompt: 'consent',      // Force consent screen to ensure refresh token is provided
        scope: SCOPES,
    });
    res.redirect(authUrl);
};

/**
 * 2. Handle Google OAuth Callback
 * Google redirects here after admin authorizes.
 * It exchanges the code for tokens and prints the Refresh Token.
 */
exports.authCallback = async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        res.send(`
            <h1>Authorization Successful!</h1>
            <p><strong>Refresh Token:</strong> <code style="background: #f4f4f4; padding: 5px; border-radius: 3px;">${tokens.refresh_token || "Already Authorized (No new token returned)"}</code></p>
            <p>Please copy this token and add it to your <strong>Backend/.env</strong> file as: <code>GOOGLE_REFRESH_TOKEN="your_token_here"</code></p>
            <p><em>Note: If you didn't get a new token, try visiting the auth URL again in an Incognito window.</em></p>
        `);
    } catch (error) {
        console.error('Error retrieving access token', error);
        res.status(500).send('Authentication Failed');
    }
};

/**
 * Get booked slots from Google Calendar
 * Returns all booked demo slots for the next 30 days
 */
exports.getBookedSlots = async (req, res) => {
    try {
        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            return res.status(500).json({
                success: false,
                message: "Calendar integration not configured."
            });
        }

        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN.replace(/\"/g, '');
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Get events for next 30 days
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: thirtyDaysLater.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        // Extract booked slots (date + time + meeting details)
        const bookedSlots = events.data.items
            .filter(event => event.summary && event.summary.includes('Demo'))
            .map(event => {
                const startTime = new Date(event.start.dateTime);
                const date = startTime.toISOString().split('T')[0]; // YYYY-MM-DD
                const time = startTime.toTimeString().slice(0, 5); // HH:MM
                return { 
                    date, 
                    time,
                    type: 'booked',
                    eventId: event.id,
                    summary: event.summary,
                    description: event.description,
                    attendees: event.attendees || []
                };
            });

        res.status(200).json({
            success: true,
            bookedSlots: bookedSlots
        });

    } catch (error) {
        console.error('Error fetching booked slots:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booked slots.",
            error: error.message
        });
    }
};

/**
 * 3. Book Demo (Called by Frontend Form)
 * Uses the saved Refresh Token to create a calendar event.
 */
exports.bookDemo = async (req, res) => {
    try {
        const { name, phone, email, countryCode, remark } = req.body;

        // 1. Send Admin Notification Email
        try {
            await sendDemoAdminNotification({
                name,
                email,
                countryCode,
                phone,
                remark
            });
        } catch (adminEmailErr) {
            console.error('Failed to send admin notification:', adminEmailErr.message);
        }

        // 2. Send User Confirmation Email
        try {
            await sendDemoBookingEmail({
                name,
                email,
                remark
            });
        } catch (userEmailErr) {
            console.error('Failed to send user confirmation email:', userEmailErr.message);
        }

        res.status(200).json({
            success: true,
            message: "Demo request received! Our team will contact you soon."
        });

    } catch (error) {
        console.error('Error in bookDemo:', error);
        res.status(500).json({
            success: false,
            message: "Failed to process demo request.",
            error: error.message
        });
    }
};
/**
 * 4. Cancel Demo
 * Deletes an event from Google Calendar.
 */
exports.cancelDemo = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            return res.status(500).json({
                success: false,
                message: "Calendar integration not configured."
            });
        }

        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN.replace(/\"/g, '');
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
            sendUpdates: 'all', // Notifies the attendee about cancellation
        });

        res.status(200).json({
            success: true,
            message: "Demo cancelled successfully!"
        });

    } catch (error) {
        console.error('Error cancelling demo:', error);

        // Specific error for expired/revoked token
        if (error.message && error.message.includes('invalid_grant')) {
            return res.status(500).json({
                success: false,
                message: "Google Calendar session expired. Please re-authorize.",
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to cancel demo on calendar.",
            error: error.message
        });
    }
};
