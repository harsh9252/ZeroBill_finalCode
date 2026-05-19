/**
 * geolocation.js
 * Detects user's country based on IP and returns appropriate currency
 */

import { config } from '../config/env';

// Country to Currency mapping
const COUNTRY_CURRENCY_MAP = {
  US: 'USD', CA: 'CAD', MX: 'MXN',
  GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', CH: 'CHF',
  AU: 'AUD', NZ: 'NZD', SG: 'SGD', HK: 'HKD', JP: 'JPY', CN: 'CNY', KR: 'KRW', TH: 'THB', MY: 'MYR', ID: 'IDR', PH: 'PHP',
  IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', JO: 'JOD', EG: 'EGP', IL: 'ILS',
  RU: 'RUB', TR: 'TRY', ZA: 'ZAR', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
  TW: 'TWD', VN: 'VND', TH: 'THB', MM: 'MMK', KZ: 'KZT', UZ: 'UZS', UA: 'UAH',
};

let _cachedCountry = null;
let _cachedCurrency = null;
let _fetchedAt = 0;
const CACHE_MS = 3600000; // 1 hour

/**
 * Detect user's country via IP.
 * Strategy:
 *  1. Call ipapi.co directly from the browser  → uses the browser's real/VPN IP ✓
 *  2. Fallback: backend proxy                  → uses X-Forwarded-For header
 *  3. Last resort: India (IN)
 */
export async function getUserCountry() {
  const now = Date.now();

  // Return cached value if fresh
  if (_cachedCountry && (now - _fetchedAt) < CACHE_MS) {
    return _cachedCountry;
  }

  // ── 1. Try multiple browser-side providers (VPN-aware) ─────────────────
  const providers = [
    {
      url: 'https://api.db-ip.com/v2/free/self',
      parse: (d) => d.countryCode
    },
    {
      url: 'https://api.country.is',
      parse: (d) => d.country
    },
    {
      url: 'https://ipapi.co/json/',
      parse: (d) => d.country_code
    },
    {
      url: 'https://ipwho.is/',
      parse: (d) => d.country_code
    }
  ];

  for (const provider of providers) {
    try {
      const res = await fetch(provider.url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const code = provider.parse(data);
        if (code && code.length === 2 && !data.error) {
          _cachedCountry = code.toUpperCase();
          _fetchedAt = now;
          
          return _cachedCountry;
        }
      }
    } catch (err) {
      console.warn(`[Geolocation] Provider ${provider.url} failed:`, err.message);
    }
  }

  // ── 2. Fallback: backend proxy ──────────────────────────────────────────
  try {
    const response = await fetch(`${config.backendUrl}/api/currency/geolocation`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.country) {
        _cachedCountry = data.country;
        _fetchedAt = now;
        
        return _cachedCountry;
      }
    }
  } catch (error) {
    console.warn('[Geolocation] Backend fallback failed:', error.message);
  }

  // ── 3. Last resort: India ────────────────────────────────────────────────
  _cachedCountry = 'IN';
  _fetchedAt = now;
 
  return _cachedCountry;
}

/**
 * Get currency code based on country code
 */
export function getCurrencyByCountry(countryCode) {
  return COUNTRY_CURRENCY_MAP[countryCode] || 'INR';
}

/**
 * Get user's currency based on IP geolocation
 */
export async function getUserCurrency() {
  if (_cachedCurrency) {
    return _cachedCurrency;
  }

  const country = await getUserCountry();
  _cachedCurrency = getCurrencyByCountry(country);

  return _cachedCurrency;
}

/**
 * Reset cache (useful for testing)
 */
export function resetGeolocationCache() {
  _cachedCountry = null;
  _cachedCurrency = null;
  _fetchedAt = 0;
}
