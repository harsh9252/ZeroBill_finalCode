/**
 * currencyConfig.js
 * -----------------
 * Manages live exchange rates from XE.com via our backend proxy.
 * Rates are USD-based (1 USD = X currency).
 * INR conversion: amount_in_INR / (rate_USD_to_INR) * rate_USD_to_TARGET
 *
 * Usage:
 *   import { getCurrencyRate, refreshRates, CURRENCY_SYMBOLS } from './currencyConfig';
 */

import { appConfig } from './appConfig';

// ─── Currency Symbols ─────────────────────────────────────────────────────────
export const CURRENCY_SYMBOLS = {
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

// ─── Fallback static rates (INR-based, used if API fails) ────────────────────
// These are the original hardcoded rates from CurrencyAmount.jsx
const FALLBACK_RATES_INR = {
    USD: 90.19, INR: 1, EUR: 105.17, GBP: 120.21, AED: 24.60,
    AUD: 59.66, CAD: 65.00, NZD: 52.00, SGD: 67.50, HKD: 11.50,
    JPY: 0.58, CNY: 11.80, CHF: 99.50, SAR: 24.10, QAR: 24.05,
    KWD: 295.00, BHD: 240.00, PKR: 0.32, BDT: 0.79, LKR: 0.25,
    NPR: 0.58, THB: 2.30, MYR: 19.50, IDR: 0.0055, KRW: 0.068,
    RUB: 1.10, ZAR: 4.85, TRY: 3.40, MXN: 5.00, BRL: 17.50,
};

// ─── Internal state ───────────────────────────────────────────────────────────
let _rates = null;          // USD-based rates from XE
let _fetchedAt = 0;
let _fetchPromise = null;   // deduplicates concurrent fetches
const CACHE_MS = 60_000;    // refresh every 60s (matches backend cache)

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Fetch and cache live rates from our backend proxy.
 */
export async function refreshRates() {
    const now = Date.now();
    if (_rates && (now - _fetchedAt) < CACHE_MS) return _rates;  // fresh cache

    // Deduplicate concurrent calls
    if (_fetchPromise) return _fetchPromise;

    _fetchPromise = (async () => {
        try {
            const backendUrl = appConfig.backendUrl;
            const res = await fetch(`${backendUrl}/api/currency/rates`);
            const data = await res.json();
            if (data.success && data.rates) {
                _rates = data.rates;
                _fetchedAt = Date.now();
          
            }
        } catch (err) {
            console.warn('[Currency] Failed to fetch live rates, using fallback:', err.message);
        } finally {
            _fetchPromise = null;
        }
        return _rates;
    })();

    return _fetchPromise;
}

/**
 * Convert an INR amount to the target currency.
 * Uses live USD-based rates: INR → USD → target
 *
 * @param {number} amountINR - amount in Indian Rupees
 * @param {string} targetCurrency - e.g. 'USD', 'EUR'
 * @returns {number}
 */
export function convertFromINR(amountINR, targetCurrency) {
    const amt = parseFloat(amountINR) || 0;
    if (amt === 0 || !targetCurrency) return 0;
    if (targetCurrency === 'INR') return amt;

    if (_rates && _rates['INR'] && _rates[targetCurrency]) {
        // _rates are USD-based: 1 USD = _rates[X]
        // INR→USD = amt / _rates['INR']
        // USD→target = * _rates[targetCurrency]
        const inUSD = amt / _rates['INR'];
        return inUSD * _rates[targetCurrency];
    }

    // Fallback to static rates (INR-based)
    const fallbackRate = FALLBACK_RATES_INR[targetCurrency];
    if (fallbackRate) {
        return amt / fallbackRate;
    }

    return amt;
}

/**
 * Convert an amount from target currency back to INR.
 * Uses live USD-based rates: target → USD → INR
 * 
 * @param {number} amountTarget - amount in target currency
 * @param {string} sourceCurrency - e.g. 'USD', 'EUR'
 * @returns {number}
 */
export function convertToINR(amountTarget, sourceCurrency) {
    const amt = parseFloat(amountTarget) || 0;
    if (amt === 0 || !sourceCurrency || sourceCurrency === 'INR') return amt;

    if (_rates && _rates['INR'] && _rates[sourceCurrency]) {
        // target→USD = amt / _rates[sourceCurrency]
        // USD→INR = * _rates['INR']
        const inUSD = amt / _rates[sourceCurrency];
        return inUSD * _rates['INR'];
    }

    // Fallback to static rates (sourceCurrency-based)
    const fallbackRate = FALLBACK_RATES_INR[sourceCurrency];
    if (fallbackRate) {
        return amt * fallbackRate;
    }

    return amt;
}

/**
 * Get currency symbol.
 */
export function getCurrencySymbol(currency) {
    return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Get the live INR→target rate (how many target units per 1 INR).
 */
export function getCurrencyRate(targetCurrency) {
    if (!targetCurrency || targetCurrency === 'INR') return 1;

    if (_rates && _rates['INR'] && _rates[targetCurrency]) {
        return _rates[targetCurrency] / _rates['INR'];
    }

    const fallback = FALLBACK_RATES_INR[targetCurrency];
    return fallback ? 1 / fallback : 1;
}

/**
 * Get all supported currency codes (intersection of symbols + rates).
 */
export function getSupportedCurrencies() {
    return Object.keys(CURRENCY_SYMBOLS);
}

/**
 * Format an INR amount as a currency string.
 * e.g. formatFromINR(1000, 'USD') → '$ 11.09'
 */
export function formatFromINR(amountINR, currency) {
    const converted = convertFromINR(amountINR, currency);
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${converted.toFixed(2)}`;
}
