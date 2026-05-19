// dropdownOptions.js
// Centralized dropdown options for the application

export const PARTY_TYPE_OPTIONS = [
  { id: "customer", label: "Customer" },
  { id: "vendor", label: "Vendor" },
  { id: "supplier", label: "Supplier" },
  { id: "other", label: "Other" }
];

export const BALANCE_TYPE_OPTIONS = [
  { id: "receivable", label: "To Collect" },
  { id: "payable", label: "To Pay" },
];

export const TXN_TYPE_OPTIONS = [
  { id: "", label: "All Types" },
  { id: "Sale", label: "Sale" },
  { id: "Purchase", label: "Purchase" },
  { id: "Payment", label: "Payment" },
  { id: "Receipt", label: "Receipt" },
];

export const STATUS_OPTIONS = [
  { id: "", label: "All Status" },
  { id: "Paid", label: "Paid" },
  { id: "Unpaid", label: "Unpaid" },
  { id: "Partial", label: "Partial" },
];

export const STATE_OPTIONS = [
  { id: "Andhra Pradesh", label: "Andhra Pradesh" },
  { id: "Arunachal Pradesh", label: "Arunachal Pradesh" },
  { id: "Assam", label: "Assam" },
  { id: "Bihar", label: "Bihar" },
  { id: "Chhattisgarh", label: "Chhattisgarh" },
  { id: "Goa", label: "Goa" },
  { id: "Gujarat", label: "Gujarat" },
  { id: "Haryana", label: "Haryana" },
  { id: "Himachal Pradesh", label: "Himachal Pradesh" },
  { id: "Jharkhand", label: "Jharkhand" },
  { id: "Karnataka", label: "Karnataka" },
  { id: "Kerala", label: "Kerala" },
  { id: "Madhya Pradesh", label: "Madhya Pradesh" },
  { id: "Maharashtra", label: "Maharashtra" },
  { id: "Manipur", label: "Manipur" },
  { id: "Meghalaya", label: "Meghalaya" },
  { id: "Mizoram", label: "Mizoram" },
  { id: "Nagaland", label: "Nagaland" },
  { id: "Odisha", label: "Odisha" },
  { id: "Punjab", label: "Punjab" },
  { id: "Rajasthan", label: "Rajasthan" },
  { id: "Sikkim", label: "Sikkim" },
  { id: "Tamil Nadu", label: "Tamil Nadu" },
  { id: "Telangana", label: "Telangana" },
  { id: "Tripura", label: "Tripura" },
  { id: "Uttar Pradesh", label: "Uttar Pradesh" },
  { id: "Uttarakhand", label: "Uttarakhand" },
  { id: "West Bengal", label: "West Bengal" },
  { id: "Delhi", label: "Delhi" },
  { id: "Jammu and Kashmir", label: "Jammu and Kashmir" },
  { id: "Ladakh", label: "Ladakh" },
  { id: "Puducherry", label: "Puducherry" },
  { id: "Chandigarh", label: "Chandigarh" },
  { id: "Andaman and Nicobar Islands", label: "Andaman and Nicobar Islands" },
  { id: "Dadra and Nagar Haveli and Daman and Diu", label: "Dadra and Nagar Haveli and Daman and Diu" },
  { id: "Lakshadweep", label: "Lakshadweep" },
];

export const QUOTATION_STATUS_OPTIONS = [
  { id: "all", label: "Show All" },
  { id: "open", label: "Show Open" },
  { id: "closed", label: "Show Closed" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { id: "Cash", label: "Cash" },
  { id: "Card", label: "Card" },
  { id: "UPI", label: "UPI" },
  { id: "Bank Transfer", label: "Bank Transfer" },
];

export const ITEM_TYPE_OPTIONS = [
  { id: "product", label: "Product" },
  { id: "service", label: "Service" }
];

export const DEFAULT_UNIT_OPTIONS = [
  { id: "PCS", label: "Pieces (PCS)" },
  { id: "BOX", label: "Box" },
  { id: "KG", label: "Kg" },
  { id: "LTR", label: "Litre" },
  { id: "GM", label: "Gram (GM)" },
  { id: "MTR", label: "Meter (MTR)" },
  { id: "PKT", label: "Pack (PKT)" },
  { id: "DOZ", label: "Dozen (DOZ)" },
  { id: "SET", label: "Set" },
  { id: "PAIR", label: "Pair" },
  { id: "RL", label: "Roll" },
  { id: "BDL", label: "Bundle" },
  { id: "ML", label: "Millilitre (ML)" },
  { id: "MT", label: "Metric Ton" },
];

export const UNIT_OPTIONS = [
  ...DEFAULT_UNIT_OPTIONS,
  { id: "OTHER", label: "+ Other" },
];

export const getUnitOptions = (customUnits = []) => {
  const customOpts = customUnits.map(unit => ({
    id: unit,
    label: unit
  }));
  return [
    ...DEFAULT_UNIT_OPTIONS,
    ...customOpts,
    { id: "OTHER", label: "+ Other" },
  ];
};

export const GST_RATE_OPTIONS = [
  { id: "None", label: "None" },
  { id: "5%", label: "5%" },
  { id: "12%", label: "12%" },
  { id: "18%", label: "18%" },
  { id: "28%", label: "28%" }
];

export const PRICE_TAX_TYPE_OPTIONS = [
  { id: "with_tax", label: "With Tax" },
  { id: "without_tax", label: "Without Tax" }
];

export const PAGE_SIZE_OPTIONS = [
  { id: 5, label: "5" },
  { id: 10, label: "10" },
  { id: 15, label: "15" },
  { id: 25, label: "25" },
];

export const CURRENCY_OPTIONS = [
  { id: "INR", label: "INR" },
  { id: "USD", label: "USD" },
  { id: "EUR", label: "EUR" },
];

export const COUNTRY_OPTIONS = [
  // 🌎 English
  { code: "en-US", label: "English (US)", country: "US" },

  // 🇮🇳 Indian languages (Updated with State mapping)
  { code: "hi-IN", label: "Hindi (India)", country: "IN", state: "Multiple States" },
  { code: "bn-IN", label: "Bengali (India)", country: "IN", state: "West Bengal" },
  { code: "bn-BD", label: "Bengali (Bangladesh)", country: "BD" },
  { code: "ta-IN", label: "Tamil (India)", country: "IN", state: "Tamil Nadu" },
  { code: "ta-LK", label: "Tamil (Sri Lanka)", country: "LK" },
  { code: "te-IN", label: "Telugu (India)", country: "IN", state: "Andhra Pradesh, Telangana" },
  { code: "mr-IN", label: "Marathi (India)", country: "IN", state: "Maharashtra" },
  { code: "gu-IN", label: "Gujarati (India)", country: "IN", state: "Gujarat" },
  { code: "kn-IN", label: "Kannada (India)", country: "IN", state: "Karnataka" },
  { code: "ml-IN", label: "Malayalam (India)", country: "IN", state: "Kerala" },
  { code: "pa-IN", label: "Punjabi (India)", country: "IN", state: "Punjab" },
  { code: "or-IN", label: "Odia (India)", country: "IN", state: "Odisha" },
  { code: "ur-IN", label: "Urdu (India)", country: "IN", state: "Jammu & Kashmir, Telangana" },
  { code: "ur-PK", label: "Urdu (Pakistan)", country: "PK" },
  { code: "as-IN", label: "Assamese (India)", country: "IN", state: "Assam" },

  // ⭐ Additional Indian Languages (State-wise added)
  { code: "ks-IN", label: "Kashmiri (India)", country: "IN", state: "Jammu & Kashmir" },
  { code: "kok-IN", label: "Konkani (India)", country: "IN", state: "Goa" },
  { code: "ne-IN", label: "Nepali (India)", country: "IN", state: "Sikkim" },
  { code: "sd-IN", label: "Sindhi (India)", country: "IN", state: "Multiple States" },
  { code: "mt-IN", label: "Maithili (India)", country: "IN", state: "Bihar" },
  { code: "sa-IN", label: "Sanskrit (India)", country: "IN", state: "Uttarakhand" },
  { code: "mn-IN", label: "Manipuri (Meitei)", country: "IN", state: "Manipur" },
  { code: "bo-IN", label: "Bodo (India)", country: "IN", state: "Assam" },
  { code: "doi-IN", label: "Dogri (India)", country: "IN", state: "Jammu & Kashmir" },
  { code: "sat-IN", label: "Santhali (India)", country: "IN", state: "Jharkhand, Odisha, WB" },

  // 🇪🇸 Spanish variants
  { code: "es-ES", label: "Spanish (Spain)", country: "ES" },
  { code: "es-MX", label: "Spanish (Mexico)", country: "MX" },
  { code: "es-AR", label: "Spanish (Argentina)", country: "AR" },
  { code: "es-CO", label: "Spanish (Colombia)", country: "CO" },
  { code: "es-CL", label: "Spanish (Chile)", country: "CL" },
  { code: "es-PE", label: "Spanish (Peru)", country: "PE" },
  { code: "es-US", label: "Spanish (United States)", country: "US" },

  // 🇫🇷 French variants
  { code: "fr-FR", label: "French (France)", country: "FR" },
  { code: "fr-CA", label: "French (Canada)", country: "CA" },
  { code: "fr-BE", label: "French (Belgium)", country: "BE" },
  { code: "fr-CH", label: "French (Switzerland)", country: "CH" },

  // 🇩🇪 German & other European
  { code: "de-DE", label: "German (Germany)", country: "DE" },
  { code: "de-AT", label: "German (Austria)", country: "AT" },
  { code: "de-CH", label: "German (Switzerland)", country: "CH" },
  { code: "it-IT", label: "Italian (Italy)", country: "IT" },
  { code: "pt-PT", label: "Portuguese (Portugal)", country: "PT" },
  { code: "pt-BR", label: "Portuguese (Brazil)", country: "BR" },
  { code: "nl-NL", label: "Dutch (Netherlands)", country: "NL" },
  { code: "nl-BE", label: "Dutch (Belgium)", country: "BE" },
  { code: "sv-SE", label: "Swedish (Sweden)", country: "SE" },
  { code: "no-NO", label: "Norwegian (Norway)", country: "NO" },
  { code: "da-DK", label: "Danish (Denmark)", country: "DK" },
  { code: "fi-FI", label: "Finnish (Finland)", country: "FI" },
  { code: "pl-PL", label: "Polish (Poland)", country: "PL" },
  { code: "cs-CZ", label: "Czech (Czech Republic)", country: "CZ" },
  { code: "hu-HU", label: "Hungarian (Hungary)", country: "HU" },
  { code: "el-GR", label: "Greek (Greece)", country: "GR" },
  { code: "ro-RO", label: "Romanian (Romania)", country: "RO" },

  // 🇷🇺 Russian & neighbours
  { code: "ru-RU", label: "Russian (Russia)", country: "RU" },
  { code: "uk-UA", label: "Ukrainian (Ukraine)", country: "UA" },
  { code: "kk-KZ", label: "Kazakh (Kazakhstan)", country: "KZ" },

  // 🇨🇳 East Asian languages
  { code: "zh-CN", label: "Chinese (Simplified, China)", country: "CN" },
  { code: "zh-TW", label: "Chinese (Traditional, Taiwan)", country: "TW" },
  { code: "zh-HK", label: "Chinese (Hong Kong)", country: "HK" },
  { code: "ja-JP", label: "Japanese (Japan)", country: "JP" },
  { code: "ko-KR", label: "Korean (South Korea)", country: "KR" },

  // 🌏 South East Asia
  { code: "th-TH", label: "Thai (Thailand)", country: "TH" },
  { code: "vi-VN", label: "Vietnamese (Vietnam)", country: "VN" },
  { code: "id-ID", label: "Indonesian (Indonesia)", country: "ID" },
  { code: "ms-MY", label: "Malay (Malaysia)", country: "MY" },
  { code: "ms-SG", label: "Malay (Singapore)", country: "SG" },

  // 🌍 Middle East & Africa
  { code: "ar-SA", label: "Arabic (Saudi Arabia)", country: "SA" },
  { code: "ar-AE", label: "Arabic (United Arab Emirates)", country: "AE" },
  { code: "ar-EG", label: "Arabic (Egypt)", country: "EG" },
  { code: "he-IL", label: "Hebrew (Israel)", country: "IL" },
  { code: "fa-IR", label: "Persian (Iran)", country: "IR" },
  { code: "tr-TR", label: "Turkish (Turkey)", country: "TR" },
  { code: "sw-KE", label: "Swahili (Kenya)", country: "KE" },
  { code: "sw-TZ", label: "Swahili (Tanzania)", country: "TZ" },
  { code: "am-ET", label: "Amharic (Ethiopia)", country: "ET" },

  // 🌎 Latin America (extra)
  { code: "pt-AO", label: "Portuguese (Angola)", country: "AO" },
  { code: "es-VE", label: "Spanish (Venezuela)", country: "VE" },
  { code: "es-BO", label: "Spanish (Bolivia)", country: "BO" },
  { code: "es-EC", label: "Spanish (Ecuador)", country: "EC" },
];
export const currencyList = {};

export const CATEGORY_PLACEHOLDER = { id: "", label: "Select Category" };

// Function to generate category options dynamically
export const getCategoryOptions = (categories) => [
  CATEGORY_PLACEHOLDER,
  ...categories.map((cat) => ({ id: cat.id, label: cat.name })),
];

// Function to generate date range options from DATE_RANGE_OPTS
export const getDateRangeOptions = (DATE_RANGE_OPTS) =>
  DATE_RANGE_OPTS.map((opt) => ({ id: opt, label: opt }));

// Function to generate PDF format options
export const getPDFFormatOptions = (pdfFormats) =>
  Object.entries(pdfFormats).map(([key, format]) => ({ id: key, label: format.label }));

// Function to generate expense category options
export const getExpenseCategoryOptions = (CATEGORY_OPTS) =>
  CATEGORY_OPTS.map((opt) => ({ id: opt.value, label: opt.label }));

// Country phone dial codes
export const COUNTRY_PHONE_CODES = [
  { code: "+91", label: "+91 India" },
  { code: "+1", label: "+1 USA/Canada" },
  { code: "+44", label: "+44 UK" },
  { code: "+61", label: "+61 Australia" },
  { code: "+49", label: "+49 Germany" },
  { code: "+33", label: "+33 France" },
  { code: "+81", label: "+81 Japan" },
  { code: "+86", label: "+86 China" },
  { code: "+82", label: "+82 South Korea" },
  { code: "+7", label: "+7 Russia" },
  { code: "+55", label: "+55 Brazil" },
  { code: "+52", label: "+52 Mexico" },
  { code: "+34", label: "+34 Spain" },
  { code: "+39", label: "+39 Italy" },
  { code: "+31", label: "+31 Netherlands" },
  { code: "+46", label: "+46 Sweden" },
  { code: "+47", label: "+47 Norway" },
  { code: "+45", label: "+45 Denmark" },
  { code: "+358", label: "+358 Finland" },
  { code: "+41", label: "+41 Switzerland" },
  { code: "+43", label: "+43 Austria" },
  { code: "+32", label: "+32 Belgium" },
  { code: "+351", label: "+351 Portugal" },
  { code: "+48", label: "+48 Poland" },
  { code: "+420", label: "+420 Czech Republic" },
  { code: "+36", label: "+36 Hungary" },
  { code: "+30", label: "+30 Greece" },
  { code: "+40", label: "+40 Romania" },
  { code: "+380", label: "+380 Ukraine" },
  { code: "+27", label: "+27 South Africa" },
  { code: "+234", label: "+234 Nigeria" },
  { code: "+20", label: "+20 Egypt" },
  { code: "+254", label: "+254 Kenya" },
  { code: "+233", label: "+233 Ghana" },
  { code: "+251", label: "+251 Ethiopia" },
  { code: "+212", label: "+212 Morocco" },
  { code: "+213", label: "+213 Algeria" },
  { code: "+216", label: "+216 Tunisia" },
  { code: "+966", label: "+966 Saudi Arabia" },
  { code: "+971", label: "+971 UAE" },
  { code: "+974", label: "+974 Qatar" },
  { code: "+965", label: "+965 Kuwait" },
  { code: "+973", label: "+973 Bahrain" },
  { code: "+968", label: "+968 Oman" },
  { code: "+972", label: "+972 Israel" },
  { code: "+98", label: "+98 Iran" },
  { code: "+90", label: "+90 Turkey" },
  { code: "+92", label: "+92 Pakistan" },
  { code: "+880", label: "+880 Bangladesh" },
  { code: "+94", label: "+94 Sri Lanka" },
  { code: "+977", label: "+977 Nepal" },
  { code: "+960", label: "+960 Maldives" },
  { code: "+975", label: "+975 Bhutan" },
  { code: "+95", label: "+95 Myanmar" },
  { code: "+66", label: "+66 Thailand" },
  { code: "+84", label: "+84 Vietnam" },
  { code: "+62", label: "+62 Indonesia" },
  { code: "+60", label: "+60 Malaysia" },
  { code: "+65", label: "+65 Singapore" },
  { code: "+63", label: "+63 Philippines" },
  { code: "+64", label: "+64 New Zealand" },
  { code: "+54", label: "+54 Argentina" },
  { code: "+56", label: "+56 Chile" },
  { code: "+57", label: "+57 Colombia" },
  { code: "+51", label: "+51 Peru" },
  { code: "+58", label: "+58 Venezuela" },
  { code: "+53", label: "+53 Cuba" },
  { code: "+593", label: "+593 Ecuador" },
  { code: "+591", label: "+591 Bolivia" },
  { code: "+595", label: "+595 Paraguay" },
  { code: "+598", label: "+598 Uruguay" },
  { code: "+502", label: "+502 Guatemala" },
  { code: "+503", label: "+503 El Salvador" },
  { code: "+504", label: "+504 Honduras" },
  { code: "+505", label: "+505 Nicaragua" },
  { code: "+506", label: "+506 Costa Rica" },
  { code: "+507", label: "+507 Panama" },
];

