const express = require('express');
const router = express.Router();
const currencyUtils = require('../utils/currencyUtils');

/**
 * GET /api/currency/rates
 * Returns live USD-based exchange rates from XE.com (cached 60s)
 */
router.get('/rates', async (req, res) => {
    try {
        const cache = await currencyUtils.getRates();

        if (!cache) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch currency rates staff',
            });
        }

        return res.json({
            success: true,
            cached: true, // It's managed by utility now
            timestamp: cache.timestamp,
            rates: cache.rates,
        });

    } catch (error) {
        console.error('Currency rate fetch failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch currency rates error',
            error: error.message,
        });
    }
});

/**
 * GET /api/currency/geolocation
 * Returns user's country based on their IP address
 */
router.get('/geolocation', async (req, res) => {
    try {
        // Extract the real client IP (handle proxies / local environments)
        const rawIP =
            req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '';

        // Normalise IPv6 loopback → use public lookup (no IP = server's own IP via ipapi.co)
        const loopbackIPs = (process.env.LOOPBACK_IPS || '::1,127.0.0.1,::ffff:127.0.0.1').split(',').map(ip => ip.trim());
        const clientIP = loopbackIPs.includes(rawIP) ? '' : rawIP;

   

        // Pass the client IP explicitly: https://ipapi.co/{ip}/json/
        // Without an IP, ipapi.co returns the caller's (server's) location — wrong!
        const ipapiUrl = clientIP
            ? `https://ipapi.co/${clientIP}/json/`
            : 'https://ipapi.co/json/';

        try {
            // Priority 1: ipapi.co (HTTPS)
            const response = await fetch(ipapiUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.country_code && !data.error) {
                 
                    return res.json({
                        success: true,
                        country: data.country_code,
                        countryName: data.country_name || '',
                        city: data.city || '',
                    });
                }
            }
        } catch (error) {
            console.warn('[Geolocation] ipapi.co failed, trying ip-api.com:', error.message);
        }

        // Priority 2: ip-api.com (HTTP fallback, very reliable)
        try {
            const fallbackUrl = clientIP
                ? `http://ip-api.com/json/${clientIP}?fields=status,message,countryCode,country,city`
                : 'http://ip-api.com/json/?fields=status,message,countryCode,country,city';

            const response = await fetch(fallbackUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                
                    return res.json({
                        success: true,
                        country: data.countryCode,
                        countryName: data.country || '',
                        city: data.city || '',
                    });
                }
            }
        } catch (error) {
            console.warn('[Geolocation] ip-api.com failed:', error.message);
        }

        // Fallback to India
       
        return res.json({
            success: true,
            country: 'IN',
            countryName: 'India',
            city: '',
        });

    } catch (error) {
        console.error('Geolocation fetch failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to detect geolocation',
            error: error.message,
            fallback: 'IN',
        });
    }
});

module.exports = router;
