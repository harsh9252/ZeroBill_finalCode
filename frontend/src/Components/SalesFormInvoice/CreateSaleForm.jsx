// CreateSaleForm.jsx - Now a minimal component for other invoice types
import React from "react";

export default function CreateSaleForm() {
  return (
    <div className="min-h-screen mt-4 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-yellow-200 p-8 text-center max-w-md">
        <h2 className="text-xl font-bold text-yellow-900 mb-4">Create Sale Form</h2>
        <p className="text-gray-600 mb-6">
          This component is now available for other invoice types.
          Quotation functionality has been moved to QuotationForm.jsx
        </p>
        <div className="text-sm text-gray-500">
          Use QuotationForm.jsx for quotation-specific forms
        </div>
      </div>
    </div>
  );
}
