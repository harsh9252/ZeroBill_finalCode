/**
 * currency.js — Re-exports from currencyConfig (live XE rates).
 * All consuming components keep the same import signatures.
 */
import {
  convertFromINR,
  formatFromINR,
  getCurrencySymbol,
  getCurrencyRate,
  getSupportedCurrencies,
  refreshRates,
  CURRENCY_SYMBOLS,
  convertToINR,
} from '../config/currencyConfig';

// ─── Legacy-compatible exports ────────────────────────────────────────────────

/**
 * Convert an INR amount to selected currency.
 * Replaces the old: inrAmount / currencyList[currency].rate
 */
export const convertAmount = (amount, currency) => convertFromINR(amount, currency);

/**
 * Format an INR amount as currency string (e.g. "$ 11.09")
 */
export const formatCurrency = (amount, currency) => formatFromINR(amount, currency);

/**
 * Get just the symbol for a currency code.
 */
export { getCurrencySymbol, getCurrencyRate, getSupportedCurrencies, refreshRates, CURRENCY_SYMBOLS, convertFromINR, formatFromINR, convertToINR };

// Trigger a background rate refresh on first import
refreshRates().catch(() => { });
