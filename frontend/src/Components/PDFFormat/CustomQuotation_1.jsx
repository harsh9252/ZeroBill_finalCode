import React, { forwardRef } from 'react';
import DOMPurify from 'dompurify';
import { Phone, Mail, MapPin } from 'lucide-react';

/**
 * CustomQuotation_1 - High Fidelity A4 Multi-page Format
 * Page 1: Custom Background (custom_quotation.jpg)
 * Subsequent Pages: Clean White A4
 */
const CustomQuotation_1 = forwardRef(({ quotationData: data }, ref) => {
  if (!data) return <div className="p-8 text-center text-gray-400">Loading Preview...</div>;

  const { company, customer, quotation, termsSections } = data;

  return (
    <div ref={ref} className="preview-wrapper py-10 flex flex-col items-center gap-10 w-full font-sans print:py-0">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        .preview-wrapper .a4-page {
          width: 210mm;
          height: 297mm;
          background: white;
          position: relative;
          box-sizing: border-box;
          page-break-after: always;
          flex-shrink: 0;
          overflow: hidden;
          border: none !important;
          box-shadow: none !important;
        }

        @media print {
          @page {
            margin: 15mm;
            size: auto;
          }
          .preview-wrapper.py-10 { padding: 0 !important; }
          .preview-wrapper .a4-page {
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            page-break-after: always;
            overflow: visible !important;
          }
        }

        /* Page 1 Specific Styling */
        .preview-wrapper .page-1-bg {
          background-image: url('/custom_quotation.jpg');
          background-size: 100% 100%;
          background-position: center;
          background-repeat: no-repeat;
          display: flex;
          flex-direction: column;
        }

        .preview-wrapper .page-1-content {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
        }

        .preview-wrapper .page-content-rich {
          padding: 25mm;
          font-family: 'Inter', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #333;
        }

        .preview-wrapper .rich-text-container {
          word-break: normal;
          overflow-wrap: break-word;
          max-width: 100%;
          line-height: 1.8;
          color: #000;
        }

        .preview-wrapper .rich-text-container p { margin-bottom: 12px; }
        .preview-wrapper .rich-text-container ul, .preview-wrapper .rich-text-container ol { padding-left: 25px; margin-bottom: 15px; }
        .preview-wrapper .rich-text-container ul { list-style-type: disc !important; }
        .preview-wrapper .rich-text-container ol { list-style-type: decimal !important; }
        .preview-wrapper .rich-text-container li { margin-bottom: 6px; }
        .preview-wrapper .rich-text-container h1, .preview-wrapper .rich-text-container h2, .preview-wrapper .rich-text-container h3 { 
          margin-top: 20px; 
          margin-bottom: 10px; 
          font-weight: bold; 
          border-bottom: 1px solid #ddd;
          padding-bottom: 4px;
        }
        .preview-wrapper .rich-text-container strong { font-weight: 700; color: #000; }

        .preview-wrapper .page-content-rich table, .preview-wrapper .rich-text-container table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 20px 0 !important;
          border: 1.5px solid #000 !important;
          background-color: #fff !important;
        }

        .preview-wrapper .page-content-rich table td, .preview-wrapper .page-content-rich table th, .preview-wrapper .rich-text-container th, .preview-wrapper .rich-text-container td {
          border: 1px solid #000 !important;
          padding: 10px 12px !important;
          vertical-align: top !important;
          text-align: left !important;
          min-width: 50px !important;
          color: #000 !important;
        }

        .preview-wrapper .rich-text-container th {
          background-color: #f8f9fa !important;
          font-weight: bold !important;
        }

        .preview-wrapper .info-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
      `}</style>

      {/* Page 1 */}
      <div className="a4-page page-1-bg">
        <div className="page-1-content px-[20px] flex flex-col justify-between">
          {/* Top Section */}
          <div className="flex justify-between items-start pt-[45mm]">
            <div className="text-left">
              <h2 className="text-7xl font-semibold text-blue-900 mb-2 font-head uppercase tracking-tighter leading-[0.85] max-w-[400px] whitespace-pre-wrap">
                {(quotation.headerText || "QUOTATION")
                  .trim()
                  .split(/\s+/)
                  .join('\n')
                }
              </h2>
              <p className="text-lg font-semibold text-gray-700 mt-4 ml-3">Date: {quotation.date}</p>
              {quotation.number && (
                <p className="text-md font-bold text-blue-900 ml-3 mt-1 underline decoration-blue-200">Quotation No: {quotation.number}</p>
              )}
            </div>

            {company.logo?.url && (
              <img src={company.logo.url} alt="Logo" className="max-h-20 max-w-[180px] object-contain" />
            )}
          </div>

          {/* Bottom Footer Section - Company Info */}
          <div className="mt-auto pb-[15mm]">
            <h3 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">
              {company.name}
            </h3>
            <div className="text-sm font-semibold text-gray-700">
              <div className="info-row">
                <Phone size={14} className="text-blue-900" />
                <p>Phone: {company.tel}</p>
              </div>
              <div className="info-row">
                <Mail size={14} className="text-blue-900" />
                <p>Email: {company.email}</p>
              </div>
              <div className="info-row items-start">
                <MapPin size={14} className="text-blue-900 mt-1" />
                <p className="whitespace-pre-wrap whitespace-normal break-words max-w-[100mm] leading-relaxed">
                  {company.address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subsequent Pages (2+) - Manual Pagination */}
      {termsSections.map((section, idx) => (
        <div key={idx} className="a4-page">
          <div className="page-content-rich">
            {section.heading && (
              <h2 className="text-xl font-bold border-b-2 border-blue-900 pb-2 mb-6 uppercase tracking-wider">
                {section.heading}
              </h2>
            )}
            <div
              className="rich-text-container"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.content) }}
            />
          </div>

          {/* Footer for content pages */}
          <div className="absolute bottom-4 left-0 right-0 px-[20px] bg-white py-1 flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-200">
            <span>{company.name} | Quotation {quotation.number}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

CustomQuotation_1.displayName = 'CustomQuotation_1';
export default CustomQuotation_1;
