import React, { useEffect } from "react";
import { CURRENCY_SYMBOLS, refreshRates } from "../config/currencyConfig";

/**
 * Legacy currencyList — kept for backward compatibility with any component
 * that imports it directly. Rates will be 0 here; use convertAmount() from
 * currency.js for actual conversions (it uses live XE rates).
 */
export const currencyList = Object.fromEntries(
  Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => [code, { symbol, rate: 0 }])
);

const CurrencyAmount = ({
  currency,
  amount,
  onCurrencyChange,
  onAmountChange,
}) => {
  // Trigger a background rate refresh whenever the selector is mounted
  useEffect(() => {
    refreshRates().catch(() => { });
  }, []);

  return (
    <div>
      <select
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        style={styles.select}
        className="notranslate border rounded px-2 py-1 text-xs"
        translate="no"
      >
        {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
          <option key={code} value={code}>
            {code} ({symbol})
          </option>
        ))}
      </select>
    </div>
  );
};

const styles = {
  select: {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  amountBox: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "10px",
  },
  symbol: {
    fontSize: "20px",
    fontWeight: "600",
    marginRight: "8px",
  },
  input: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: "16px",
  },
};

export default CurrencyAmount;

