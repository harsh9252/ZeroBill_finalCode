import React, { useState } from "react";
import CurrencyConverter from "./CurrencyAmount";
import { convertAmount, getCurrencySymbol } from "../utils/currency";

const ExamplePage = () => {
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState(1);

  const handleCurrencyChange = (newCurrency) => {
    // Current amount is in 'currency'. convertAmount expects INR as base.
    // However, for this dummy page, we just update the state.
    // In a real scenario, you'd likely keep the base amount in INR.
    setCurrency(newCurrency);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>All Currency Converter (Dummy)</h2>

      <CurrencyConverter
        currency={currency}
        amount={amount}
        onCurrencyChange={handleCurrencyChange}
        onAmountChange={setAmount}
      />

      <p style={{ marginTop: "15px", fontWeight: "bold" }}>
        Total: {getCurrencySymbol(currency)} {amount}
      </p>
    </div>
  );
};

export default ExamplePage;
