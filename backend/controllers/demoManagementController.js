const { pool } = require('../config/database');
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

// OAuth2 Client for Google Calendar integration
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/calendar/auth/callback`
);

/**
 * Get all availability overrides
 */
exports.getOverrides = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM demo_availability_overrides ORDER BY override_date ASC'
        );
        
        // Format dates to prevent timezone shifting during JSON serialization
        const formattedOverrides = rows.map(row => {
            const d = new Date(row.override_date);
            return {
                ...row,
                override_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            };
        });

        res.status(200).json({
            success: true,
            overrides: formattedOverrides
        });
    } catch (error) {
        console.error('Error fetching overrides:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch availability overrides.'
        });
    }
};

/**
 * Set an availability override (toggle slot or day)
 */
exports.setOverride = async (req, res) => {
    const { override_date, slot_time, is_available, reason } = req.body;

    if (!override_date || !slot_time) {
        return res.status(400).json({
            success: false,
            message: 'Date and slot time are required.'
        });
    }

    try {
        await pool.query(
            `INSERT INTO demo_availability_overrides (override_date, slot_time, is_available, reason) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), reason = VALUES(reason)`,
            [override_date, slot_time, is_available, reason]
        );

        res.status(200).json({
            success: true,
            message: 'Availability override updated successfully.'
        });
    } catch (error) {
        console.error('Error setting override:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update availability override.'
        });
    }
};

/**
 * Remove an availability override (revert to default)
 */
exports.removeOverride = async (req, res) => {
    const { override_date, slot_time } = req.body;

    try {
        await pool.query(
            'DELETE FROM demo_availability_overrides WHERE override_date = ? AND slot_time = ?',
            [override_date, slot_time]
        );

        res.status(200).json({
            success: true,
            message: 'Override removed successfully.'
        });
    } catch (error) {
        console.error('Error removing override:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove override.'
        });
    }
};

/**
 * Get ALL booked and blocked slots (for the public booking calendar)
 * Combines:
 * 1. Google Calendar events
 * 2. Manual blocks (is_available = false)
 * 3. Sunday logic (all slots blocked)
 */
exports.getPublicBookedSlots = async (req, res) => {
    try {
        // 1. Fetch Google Calendar Booked Slots
        let googleBookedSlots = [];
        if (process.env.GOOGLE_REFRESH_TOKEN) {
            try {
                const refreshToken = process.env.GOOGLE_REFRESH_TOKEN.replace(/\"/g, '');
                oauth2Client.setCredentials({ refresh_token: refreshToken });
                const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

                const now = new Date();
                const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

                const events = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: now.toISOString(),
                    timeMax: sixtyDaysLater.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                googleBookedSlots = events.data.items
                    .filter(event => event.summary && event.summary.includes('Demo'))
                    .map(event => {
                        const startTime = new Date(event.start.dateTime || event.start.date);
                        // Google API already returns ISO strings or dates, this part is usually fine, 
                        // but let's be consistent with local date for the user's timezone.
                        const date = `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}`;
                        const time = startTime.toTimeString().slice(0, 5);
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
            } catch (err) {
                console.error('Google Calendar fetch error:', err.message);
            }
        }

        // 2. Fetch DB Overrides
        const [overrides] = await pool.query(
            'SELECT override_date, slot_time, is_available FROM demo_availability_overrides'
        );

        // 3. Sundays logic (Next 60 days)
        const sundayBlocks = [];
        const now = new Date();
        for (let i = 0; i < 60; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() + i);
            if (d.getDay() === 0) { // Sunday
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                sundayBlocks.push({ date: dateStr, time: 'FULL_DAY', type: 'holiday' });
            }
        }

        // 4. Combine and apply manual overrides with priority
        // Priority: Manual Overrides > Google Calendar > Sundays
        let combined = [...googleBookedSlots];

        // Add Sunday blocks ONLY if there isn't a manual override for that date/time
        sundayBlocks.forEach(sun => {
            const hasOverride = overrides.find(ov => {
                const d = new Date(ov.override_date);
                const ovDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return ovDate === sun.date && ov.slot_time === 'FULL_DAY';
            });
            // If no override exists, or the override specifically says unavailable, keep the Sunday block
            if (!hasOverride || !hasOverride.is_available) {
                combined.push(sun);
            }
        });

        // Apply specific overrides
        overrides.forEach(ov => {
            const d = new Date(ov.override_date);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!ov.is_available) {
                // If marked unavailable, add to combined (blocked) list
                // Deduplicate if already there
                if (!combined.find(c => c.date === dateStr && c.time === ov.slot_time)) {
                    combined.push({ date: dateStr, time: ov.slot_time, type: 'blocked' });
                }
            } else {
                // If marked available, remove from combined list (e.g., overriding a Sunday or an accidental GCal block)
                combined = combined.filter(c => !(c.date === dateStr && (c.time === ov.slot_time || (c.time === 'FULL_DAY' && ov.slot_time !== 'FULL_DAY'))));
            }
        });

        // Optimization: If FULL_DAY is blocked, we don't need individual slots
        // But for UI it doesn't hurt.

        res.status(200).json({
            success: true,
            bookedSlots: combined
        });

    } catch (error) {
        console.error('Error fetching public availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch demo availability.'
        });
    }
};
