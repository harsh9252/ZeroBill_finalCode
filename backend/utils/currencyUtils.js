/**
 * currencyUtils.js
 * ----------------
 * Shared utility for currency conversion and live rate fetching in the backend.
 * Synchronized with frontend currencyConfig.js logic.
 */

// XE API credentials
const XE_URL = 'https://www.xe.com/api/protected/midmarket-converter/';
const XE_AUTH = 'Basic bG9kZXN0YXI6cHVnc25heA==';

// In-memory cache
let ratesCache = null;
const CACHE_TTL_MS = 60 * 1000;

// Currency Symbols (Synchronized with Frontend)
const CURRENCY_SYMBOLS = {
    USD: '$', INR: '₹', EUR: '€', GBP: '£', AED: 'د.إ',
    AUD: 'A$', CAD: 'C$', NZD: 'NZ$', SGD: 'S$', HKD: 'HK$',
    JPY: '¥', CNY: '¥', CHF: 'CHF', SAR: '﷼', QAR: '﷼',
    KWD: 'د.ك', BHD: '.د.ب', PKR: '₨', BDT: '৳', LKR: '₨',
    NPR: '₨', THB: '฿', MYR: 'RM', IDR: 'Rp', KRW: '₩',
    RUB: '₽', ZAR: 'R', TRY: '₺', MXN: '$', BRL: 'R$',
    AFN: '؋', ALL: 'L', AMD: '֏', ANG: 'ƒ', AOA: 'Kz',
    ARS: '$', AZN: '₼', BGN: 'лв', BOB: 'Bs.', CLP: '$',
    COP: '$', CZK: 'Kč', DKK: 'kr', EGP: '£', GEL: '₾',
    HUF: 'Ft', ILS: '₪', IQD: 'ع.د', IRR: '﷼', JOD: 'د.ا',
    KZT: '₸', KES: 'KSh', LYD: 'ل.د', MAD: 'د.م.', MMK: 'Ks',
    NGN: '₦', NOK: 'kr', OMR: 'ر.ع.', PHP: '₱', PLN: 'zł',
    RON: 'lei', SEK: 'kr', TWD: 'NT$', UAH: '₴', UZS: "soʻm",
    VND: '₫', XOF: 'CFA', ZMW: 'ZK',
};

// Fallback static rates (INR-based)
const FALLBACK_RATES_INR = {
    USD: 90.19, INR: 1, EUR: 105.17, GBP: 120.21, AED: 24.60,
    AUD: 59.66, CAD: 65.00, NZD: 52.00, SGD: 67.50, HKD: 11.50,
    JPY: 0.58, CNY: 11.80, CHF: 99.50, SAR: 24.10, QAR: 24.05,
    KWD: 295.00, BHD: 240.00, PKR: 0.32, BDT: 0.79, LKR: 0.25,
    NPR: 0.58, THB: 2.30, MYR: 19.50, IDR: 0.0055, KRW: 0.068,
    RUB: 1.10, ZAR: 4.85, TRY: 3.40, MXN: 5.00, BRL: 17.50,
};

/**
 * Fetch and cache live rates from XE (USD-based).
 */
async function getRates() {
    const now = Date.now();
    if (ratesCache && (now - ratesCache.fetchedAt) < CACHE_TTL_MS) {
        return ratesCache;
    }

    try {
        const response = await fetch(XE_URL, {
            headers: {
                'Authorization': XE_AUTH,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                'Referer': 'https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=INR',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`XE API responded with ${response.status}`);
        }

        const data = await response.json();
        ratesCache = {
            rates: data.rates,
            timestamp: data.timestamp,
            fetchedAt: now,
        };
      
        return ratesCache;
    } catch (error) {
        console.error('[Currency] Failed to fetch live rates:', error.message);
        return ratesCache; // Return stale cache if exists, or null
    }
}

/**
 * Convert an INR amount to a target currency.
 */
async function convertFromINR(amountINR, targetCurrency) {
    const amt = parseFloat(amountINR) || 0;
    if (amt === 0 || !targetCurrency || targetCurrency === 'INR') return amt;

    const cache = await getRates();
    if (cache && cache.rates['INR'] && cache.rates[targetCurrency]) {
        const inUSD = amt / cache.rates['INR'];
        return inUSD * cache.rates[targetCurrency];
    }

    // Fallback to static rates
    const fallbackRate = FALLBACK_RATES_INR[targetCurrency];
    if (fallbackRate) {
        return amt / fallbackRate;
    }

    return amt;
}

/**
 * Synchronous version of convertFromINR.
 * Requires rates to be already loaded/cached.
 */
function convertFromINRSync(amountINR, targetCurrency) {
    const amt = parseFloat(amountINR) || 0;
    if (amt === 0 || !targetCurrency || targetCurrency === 'INR') return amt;

    if (ratesCache && ratesCache.rates['INR'] && ratesCache.rates[targetCurrency]) {
        const inUSD = amt / ratesCache.rates['INR'];
        return inUSD * ratesCache.rates[targetCurrency];
    }

    // Fallback to static rates
    const fallbackRate = FALLBACK_RATES_INR[targetCurrency];
    if (fallbackRate) {
        return amt / fallbackRate;
    }

    return amt;
}

/**
 * Get currency symbol.
 */
function getCurrencySymbol(currency) {
    return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Format an INR amount as a currency string.
 */
async function formatFromINR(amountINR, currency) {
    const converted = await convertFromINR(amountINR, currency);
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${converted.toFixed(2)}`;
}

/**
 * Synchronous version of formatFromINR.
 */
function formatFromINRSync(amountINR, currency) {
    const converted = convertFromINRSync(amountINR, currency);
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${converted.toFixed(2)}`;
}

module.exports = {
    getRates,
    convertFromINR,
    convertFromINRSync,
    getCurrencySymbol,
    formatFromINR,
    formatFromINRSync,
    CURRENCY_SYMBOLS,
    FALLBACK_RATES_INR
};
