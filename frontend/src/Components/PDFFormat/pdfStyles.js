// PDF Friendly Styles for all PDF Formats
export const pdfFriendlyStyles = `
  /* ===== UNIVERSAL PDF STYLES ===== */
  
  .preview-wrapper * {
    box-sizing: border-box;
  }

  /* SCREEN VIEW - Preview Mode */
  .preview-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding-bottom: 40px;
  }

  /* A4 Page Container - Screen View */
  .preview-wrapper .invoice-container,
  .preview-wrapper .pdf-page {
    width: 250mm;
    height: 297mm;
    background: white;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    margin: 0 auto 40px auto;
    display: flex;
    flex-direction: column;
    overflow: visible;
    page-break-inside: avoid;
  }

  /* FORCED PDF CAPTURE WIDTH - Ensures 100% Fidelity without shrinking */
  .preview-wrapper .invoice-container.pdf-capture,
  .preview-wrapper .invoice-box.pdf-capture,
  .preview-wrapper .letterhead-container.pdf-capture,
  .preview-wrapper .report-container.pdf-capture {
    width: 210mm !important;
    min-height: 297mm !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 15mm !important; /* Default padding for most formats */
    border: none !important;
  }

  .preview-wrapper .pdf-page {
    page-break-after: always;
  }

  .preview-wrapper .pdf-page:last-child {
    page-break-after: avoid;
  }

  /* Page Padding - Flexible Layout */
  .preview-wrapper .page-padding {
    padding: 12px;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    overflow: visible;
  }

  /* Content Area - Grows to fill space */
  .preview-wrapper .page-content {
    flex: 1;
    overflow: visible;
  }

  /* Signature Section - Always at bottom right */
  .preview-wrapper .signature-section {
    margin-top: auto;
    padding-top: 12px;
    border-top: 2px solid #999999;
    flex-shrink: 0;
    min-height: 120px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    text-align: right;
  }

  .preview-wrapper .signature-image {
    max-width: 150px;
    max-height: 80px;
    object-fit: contain;
  }

  .preview-wrapper .stamp-image {
    max-width: 120px;
    max-height: 100px;
    object-fit: contain;
    margin-left: 20px;
  }

  /* Terms Section - Flexible */
  .preview-wrapper .terms-section {
    flex: 1;
    overflow: visible;
    margin: 10px 0;
    padding: 0;
  }

  /* Bullet points and lists styling */
  .preview-wrapper .terms-section-content ul,
  .preview-wrapper .terms-section-content ol {
    margin: 8px 0;
    padding-left: 24px;
    display: block;
  }

  .preview-wrapper .terms-section-content ul li,
  .preview-wrapper .terms-section-content ol li {
    margin-bottom: 6px;
    display: list-item;
    list-style-position: outside;
    line-height: 1.5;
    margin-left: 0;
  }

  .preview-wrapper .terms-section-content ul {
    list-style-type: disc;
  }

  .preview-wrapper .terms-section-content ul ul {
    list-style-type: circle;
    margin-left: 20px;
  }

  .preview-wrapper .terms-section-content ul ul ul {
    list-style-type: square;
    margin-left: 20px;
  }

  .preview-wrapper .terms-section-content ol {
    list-style-type: decimal;
  }

  .preview-wrapper .terms-section-content ol ol {
    list-style-type: lower-alpha;
    margin-left: 20px;
  }

  .preview-wrapper .terms-section-content ol ol ol {
    list-style-type: lower-roman;
    margin-left: 20px;
  }

  /* ===== PRINT / PDF MODE ===== */
  @media print {
    @page {
      size: A4;
      margin: 0;
    }

    .preview-wrapper * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* Target specific wrappers only for print */
    .preview-wrapper .invoice-container,
    .preview-wrapper .pdf-page {
      width: 210mm !important;
      height: 297mm !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      page-break-after: always;
      page-break-inside: avoid;
      overflow: visible !important;
      background: white !important;
    }

    .preview-wrapper .invoice-container:last-child,
    .preview-wrapper .pdf-page:last-child {
      page-break-after: avoid;
    }

    .preview-wrapper .page-padding {
      padding: 12mm !important;
      min-height: 273mm !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: visible !important;
    }

    .preview-wrapper .page-content {
      flex: 1;
      overflow: visible !important;
    }

    .preview-wrapper .signature-section {
      margin-top: auto;
      padding-top: 12px;
      border-top: 2px solid #999999;
      flex-shrink: 0;
      min-height: 120px;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-end;
      text-align: right;
    }

    .preview-wrapper .signature-image {
      max-width: 150px;
      max-height: 80px;
      object-fit: contain;
    }

    .preview-wrapper .stamp-image {
      max-width: 120px;
      max-height: 100px;
      object-fit: contain;
      margin-left: 20px;
    }

    .preview-wrapper .terms-section {
      flex: 1;
      overflow: visible !important;
    }
  }

  /* ===== MOBILE RESPONSIVE ===== */
  @media (max-width: 768px) {
    .preview-wrapper .invoice-container,
    .preview-wrapper .pdf-page {
      width: 100%;
      min-height: auto;
      margin: 0 0 20px 0;
    }

    .preview-wrapper .page-padding {
      padding: 8px;
    }
  }
`;

export default pdfFriendlyStyles;
