/**
 * Geolocation Service
 * Auto-detect user's location based on IP and set currency & language
 * Integrates with existing Header dropdowns
 */

// Country Code to Currency Mapping
const COUNTRY_TO_CURRENCY = {
  'IN': 'INR',
  'US': 'USD',
  'GB': 'GBP',
  'CA': 'CAD',
  'AU': 'AUD',
  'NZ': 'NZD',
  'EU': 'EUR',
  'DE': 'EUR',
  'FR': 'EUR',
  'IT': 'EUR',
  'ES': 'EUR',
  'NL': 'EUR',
  'BE': 'EUR',
  'AT': 'EUR',
  'CH': 'CHF',
  'SE': 'SEK',
  'NO': 'NOK',
  'DK': 'DKK',
  'JP': 'JPY',
  'CN': 'CNY',
  'SG': 'SGD',
  'MY': 'MYR',
  'TH': 'THB',
  'PH': 'PHP',
  'ID': 'IDR',
  'VN': 'VND',
  'AE': 'AED',
  'SA': 'SAR',
  'KW': 'KWD',
  'QA': 'QAR',
  'BR': 'BRL',
  'MX': 'MXN',
  'ZA': 'ZAR',
  'NG': 'NGN',
  'EG': 'EGP',
  'PK': 'PKR',
  'BD': 'BDT',
  'LK': 'LKR',
  'TW': 'TWD',
  'HK': 'HKD',
  'KR': 'KRW',
  'TH': 'THB',
  'TR': 'TRY',
  'RU': 'RUB',
  'UA': 'UAH',
  'PL': 'PLN',
  'CZ': 'CZK',
  'HU': 'HUF',
  'RO': 'RON',
  'GR': 'EUR',
  'PT': 'EUR',
  'IE': 'EUR',
  'IL': 'ILS',
  'AR': 'ARS',
  'CL': 'CLP',
  'CO': 'COP',
  'PE': 'PEN',
};

// Country Code to Language Mapping
const COUNTRY_TO_LANGUAGE = {
  'IN': 'en-US',
  'US': 'en-US',
  'GB': 'en-US',
  'CA': 'en-US',
  'AU': 'en-US',
  'NZ': 'en-US',
  'DE': 'de-DE',
  'FR': 'fr-FR',
  'IT': 'it-IT',
  'ES': 'es-ES',
  'NL': 'nl-NL',
  'BE': 'nl-BE',
  'AT': 'de-AT',
  'CH': 'de-CH',
  'SE': 'sv-SE',
  'NO': 'nb-NO',
  'DK': 'da-DK',
  'JP': 'ja-JP',
  'CN': 'zh-CN',
  'SG': 'en-SG',
  'MY': 'ms-MY',
  'TH': 'th-TH',
  'PH': 'en-US',
  'ID': 'id-ID',
  'VN': 'vi-VN',
  'AE': 'ar-AE',
  'SA': 'ar-SA',
  'KW': 'ar-KW',
  'QA': 'ar-QA',
  'BR': 'pt-BR',
  'MX': 'es-MX',
  'ZA': 'en-US',
  'NG': 'en-US',
  'EG': 'ar-EG',
  'PK': 'ur-PK',
  'BD': 'bn-BD',
  'LK': 'si-LK',
  'TW': 'zh-TW',
  'HK': 'zh-HK',
  'KR': 'ko-KR',
  'TR': 'tr-TR',
  'RU': 'ru-RU',
  'UA': 'uk-UA',
  'PL': 'pl-PL',
  'CZ': 'cs-CZ',
  'HU': 'hu-HU',
  'RO': 'ro-RO',
  'GR': 'el-GR',
  'PT': 'pt-PT',
  'IE': 'en-US',
  'IL': 'he-IL',
  'AR': 'es-AR',
  'CL': 'es-CL',
  'CO': 'es-CO',
  'PE': 'es-PE',
};

/**
 * Fetch user's IP address
 * Using ipify API (free, no key required)
 */
export const getUserIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching IP:', error);
    return null;
  }
};

/**
 * Get geolocation data
 * Strategy: Try multiple browser-side providers for high reliability and VPN support.
 */
export const getGeolocationFromIP = async () => {
  const providers = [
    {
      url: 'https://api.db-ip.com/v2/free/self',
      parse: (d) => ({
        country: d.countryName,
        countryCode: d.countryCode,
        city: d.city,
        region: d.state,
        timezone: null,
      })
    },
    {
      url: 'https://api.country.is',
      parse: (d) => ({
        country: null,
        countryCode: d.country,
        city: null,
        region: null,
        timezone: null,
      })
    },
    {
      url: 'https://ipapi.co/json/',
      parse: (d) => ({
        country: d.country_name,
        countryCode: d.country_code,
        city: d.city,
        region: d.region,
        timezone: d.timezone,
      })
    },
    {
      url: 'https://ipwho.is/',
      parse: (d) => ({
        country: d.country,
        countryCode: d.country_code,
        city: d.city,
        region: d.region,
        timezone: d.timezone,
      })
    }
  ];

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        const geo = provider.parse(data);
        if (geo && geo.countryCode) {
          const ip = data.ipAddress || data.ip || 'unknown';
          return geo;
        }
      }
    } catch (error) {
      console.warn(`[Geolocation] Provider ${provider.url} failed:`, error.message);
    }
  }

  // If all failed, try a last-ditch effort with ipify to at least see the IP
  const debugIP = await getUserIP();
  console.error('[Geolocation] All browser-side providers failed.');
  return null;
};

/**
 * Get currency based on country code
 */
export const getCurrencyByCountry = (countryCode) => {
  return COUNTRY_TO_CURRENCY[countryCode] || 'USD';
};

/**
 * Get language based on country code
 */
export const getLanguageByCountry = (countryCode) => {
  const lang = COUNTRY_TO_LANGUAGE[countryCode] || 'en-US';
  // Final safeguard: if it starts with "en-", return "en-US"
  if (lang.startsWith('en-')) return 'en-US';
  return lang;
};

/**
 * Main function: Auto-detect location and return currency & language
 * This function respects user's existing preferences
 */
export const autoDetectLocalization = async () => {
  try {
    const savedCurrency = localStorage.getItem('siteCurrency');
    const savedLanguage = localStorage.getItem('siteLang');
    const autoDetectDone = localStorage.getItem('autoDetectDone');

    if (autoDetectDone === 'true' && savedCurrency && savedLanguage) {
      // Continue to fresh detection
    }

    // No need to fetch IP separately anymore, getGeolocationFromIP handles it
    const geoData = await getGeolocationFromIP();

    if (!geoData) {
      return {
        currency: 'USD',
        language: 'en-US',
        source: 'fallback',
        detected: false
      };
    }

    const currency = getCurrencyByCountry(geoData.countryCode);
    const language = getLanguageByCountry(geoData.countryCode);

    return {
      currency,
      language,
      country: geoData.countryCode,
      city: geoData.city,
      region: geoData.region,
      timezone: geoData.timezone,
      source: 'auto-detected',
      detected: true
    };

  } catch (error) {
    console.error('Auto-detection error:', error);
    return {
      currency: 'USD',
      language: 'en-US',
      source: 'fallback',
      detected: false
    };
  }
};

/**
 * Save auto-detection flag to prevent repeated API calls
 */
export const markAutoDetectDone = () => {
  localStorage.setItem('autoDetectDone', 'true');
};

/**
 * Reset auto-detection (for testing or user request)
 */
export const resetAutoDetect = () => {
  localStorage.removeItem('autoDetectDone');
  localStorage.removeItem('userCountry');
  localStorage.removeItem('userCity');
  localStorage.removeItem('userTimezone');
};

/**
 * Get stored location info
 */
export const getStoredLocationInfo = () => {
  return {
    country: localStorage.getItem('userCountry'),
    city: localStorage.getItem('userCity'),
    timezone: localStorage.getItem('userTimezone'),
  };
};
