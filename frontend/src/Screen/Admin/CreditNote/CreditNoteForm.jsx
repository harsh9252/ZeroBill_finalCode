import React from 'react';
import QuotationForm from '../Quotation/QuotationForm.jsx';

function CreditNoteForm({
  onSave,
  onBack,
  initialData = {},
  formTitle = "Create Credit Note",
  showTopActions = true,
  showBottomActions = true,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  currency = "INR",
}) {
  return (
    <QuotationForm
      onSave={onSave}
      onBack={onBack}
      initialData={initialData}
      formTitle={formTitle}
      showTopActions={showTopActions}
      showBottomActions={showBottomActions}
      saveLabel={saveLabel}
      cancelLabel={cancelLabel}
      currency={currency}
    />
  );
}

export default CreditNoteForm;
