import React, { forwardRef } from 'react';
import DOMPurify from 'dompurify';
import { Phone, Mail, MapPin } from 'lucide-react';
import { numberToWords } from "../../utils/numberToWords";
import { getDocumentConfig } from './documentTypeConfig';
import { getImageURL } from '../../utils/config';

const CustomQuotationLetterhead = forwardRef(({ quotationData, letterheadImage }, ref) => {
  const { company, customer, quotation, products, totals, terms, termsSections } = quotationData;
  const documentType = quotationData.documentType || 'quotation';
  const docConfig = getDocumentConfig(documentType);

  // Deduplicate remark if it is already in terms to prevent "Terms & Conditions" showing twice
  const allTermsText = (termsSections || [])
    .map(s => (s.content || "").replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim())
    .join('\n');
  const cleanRemark = (quotation.remark || "").replace(/&nbsp;/g, ' ').trim();
  const finalShowRemark = cleanRemark && !allTermsText.includes(cleanRemark);

  // Function to calculate how many pages are needed (Total Height Approach)
  const splitContentIntoPages = (htmlContent) => {
    if (!htmlContent) return [{ pageIdx: 0 }];

    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: 160mm;
      padding: 0;
      box-sizing: border-box;
      font-size: 11px;
      line-height: 1.7;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(tempDiv);

    // --- PAGE DIMENSIONS ---
    const PAGE_HEIGHT = 300; // Total A4 height in mm
    const HEADER_SPACE = 55; // Fixed Blank Space at Top
    const FOOTER_SPACE = 35; // Increased Space at Bottom to avoid footer graphics
    const maxPageHeight = PAGE_HEIGHT - HEADER_SPACE - FOOTER_SPACE; 

    // Measure TOTAL height of the entire content
    tempDiv.innerHTML = htmlContent;
    const totalHeight = (tempDiv.offsetHeight * 0.264583);
    const pageCount = Math.ceil(totalHeight / maxPageHeight);

    document.body.removeChild(tempDiv);

    // Return an array with page indices
    return Array.from({ length: pageCount || 1 }, (_, i) => ({
      pageIdx: i,
      headerSpace: HEADER_SPACE,
      footerSpace: FOOTER_SPACE,
      contentWindow: maxPageHeight
    }));
  };

  return (
    <div ref={ref}>
      {/* Inline CSS for proper page structure */}
      <style>{`
        .preview-wrapper * {
          box-sizing: border-box;
        }

        .preview-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding-bottom: 40px;
        }

        /* ===== PAGE CONTAINER ===== */
        .preview-wrapper .letterhead-container {
          width: 210mm;
          height: 297mm;
          background: #fff;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          page-break-inside: avoid;
          page-break-after: always;
        }

        /* ===== PDF PAGE BREAK ===== */
        .preview-wrapper .pdf-page {
          page-break-after: always;
        }

        .preview-wrapper .pdf-page:last-child {
          page-break-after: avoid;
          margin-bottom: 0;
        }

        /* ===== PRINT FIX ===== */
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .preview-wrapper {
            padding: 0;
            gap: 0;
            background: white !important;
          }

          .preview-wrapper .letterhead-container {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-inside: avoid;
            page-break-after: always;
            overflow: hidden !important;
          }

          .preview-wrapper .letterhead-container:last-child {
            page-break-after: avoid;
          }
        }

        /* ===== BACKGROUND ===== */
        .preview-wrapper .letterhead-background {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .preview-wrapper .letterhead-background img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* ===== MAIN CONTENT ===== */
        .letterhead-content {
          position: relative;
          z-index: 10;
          padding: 0; 
          font-family: Arial, sans-serif;
          color: #000;
          display: flex;
          flex-direction: column;
          overflow: visible;
        }

        /* ===== TERMS CONTENT ===== */
        .preview-wrapper .letterhead-terms-content {
          word-break: normal;
          overflow-wrap: break-word;
          line-height: 1.7;
          color: #000;
          padding: 0 25mm; 
        }

        /* TEXT Styles matching Emerald */
        .preview-wrapper .letterhead-terms-content p {
          margin: 0 0 14px 0;
          line-height: 1.8;
          font-size: 11px;
        }

        .preview-wrapper .letterhead-terms-content ul,
        .preview-wrapper .letterhead-terms-content ol {
          padding-left: 20px;
          margin: 14px 0;
        }

        .preview-wrapper .letterhead-terms-content li {
          margin-bottom: 8px;
          font-size: 11px;
          line-height: 1.7;
        }

        .preview-wrapper .letterhead-terms-content h1,
        .preview-wrapper .letterhead-terms-content h2,
        .preview-wrapper .letterhead-terms-content h3 {
          font-weight: bold;
          border-bottom: 1px solid #ddd;
          padding-bottom: 6px;
          font-size: 14px;
          margin: 20px 0 10px 0;
        }

        .preview-wrapper .letterhead-terms-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 18px 0;
          border: 1.5px solid #000;
        }

        .preview-wrapper .letterhead-terms-content th,
        .preview-wrapper .letterhead-terms-content td {
          border: 1px solid #000;
          padding: 10px 12px;
          font-size: 11px;
        }
      `}</style>

      <div className="preview-wrapper">
        {/* Page 1: Cover Page */}
        <div className="letterhead-container pdf-page cover-page">
          {letterheadImage && (
            <div className="letterhead-background">
              <img src={letterheadImage} alt="Letterhead" />
            </div>
          )}

          <div className="letterhead-content" style={{ padding: '45mm 25mm 35mm 25mm', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginTop: '-40mm', marginBottom: 'auto' }}>
              <h1 style={{ fontSize: '64px', fontWeight: '900', color: '#000000', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>
                {quotation.headerText || docConfig.title}
              </h1>
              <p style={{ fontSize: '18px', fontWeight: '400', color: '#000000', marginTop: '10px', opacity: 0.8 }}>
                {quotation.date}
              </p>
              {quotation.number && (
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#000000', marginTop: '5px', opacity: 0.7 }}>
                  {quotation.number}
                </p>
              )}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '0', color: '#000000', width: '100%' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{company.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '10px', fontWeight: '500', opacity: 0.9 }}>
                {company.tel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={11} strokeWidth={2} />
                    <span>{company.tel}</span>
                  </div>
                )}
                {company.tel && company.email && <span style={{ opacity: 0.4 }}>|</span>}
                {company.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={11} strokeWidth={2} />
                    <span>{company.email}</span>
                  </div>
                )}
                {company.email && <span style={{ opacity: 0.4 }}>|</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={11} strokeWidth={2} />
                  <span>{company.address}</span>
                </div>
                {quotation.remark && <span style={{ opacity: 0.4 }}>|</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{`REMARK : ${quotation.remark}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- CONTENT PAGES (Continuous Flow Approach) --- */}
        {(() => {
          const unifiedHtml = (termsSections || []).map(s => `
            ${s.heading ? `<h2 style="font-size: 18px; font-weight: bold; color: #0d4022; text-transform: uppercase; margin-bottom: 20px;">${s.heading}</h2>` : ''}
            ${s.content || ''}
          `).join('');

          const pageInfos = splitContentIntoPages(unifiedHtml);

          return pageInfos.map((info, idx) => (
            <div key={`page-${idx}`} className="letterhead-container pdf-page relative">
              {letterheadImage && (
                <div className="letterhead-background">
                  <img src={letterheadImage} alt="Letterhead" />
                </div>
              )}

              {/* Fixed Content Window to prevent overlap with footer */}
              <div className="absolute overflow-hidden" 
                   style={{ 
                     top: `${info.headerSpace}mm`, 
                     height: `${info.contentWindow}mm`,
                     width: '100%',
                     left: 0
                   }}>
                <div
                  className="letterhead-terms-content absolute w-full"
                  style={{
                    marginTop: `-${idx * info.contentWindow}mm`,
                    top: 0,
                    left: 0
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(unifiedHtml) }}
                />
              </div>

              {/* Page Number Footer */}
              <div style={{ position: 'absolute', bottom: '15mm', right: '25mm', zIndex: 20, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '2px' }}>PAGE</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#000' }}>{idx + 2}</span>
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
});

CustomQuotationLetterhead.displayName = 'CustomQuotationLetterhead';

export default CustomQuotationLetterhead;
