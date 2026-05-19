import React, { forwardRef } from 'react';
import DOMPurify from 'dompurify';
import { Phone, Mail, MapPin } from 'lucide-react';

/**
 * CustomQuotation_2 - High Fidelity A4 Multi-page Format
 * Page 1: Custom Background (custom_quotation-2.jpg)
 * Subsequent Pages: Clean White A4
 */
const CustomQuotation_2 = forwardRef(({ quotationData: data, letterheadImage }, ref) => {
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
          box-shadow: 0 0 50px rgba(0,0,0,0.15);
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          page-break-after: always;
          flex-shrink: 0;
          border-radius: 4px;
        }

        @media print {
          .preview-wrapper .a4-page {
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }

        /* Page 1 Specific Styling */
        .preview-wrapper .page-1-bg {
          background-image: url('/custom_quotation-2.jpg');
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
          padding: 20mm;
          font-family: 'Inter', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #333;
        }

        .preview-wrapper .page-content-rich table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 1em 0 !important;
        }

        .preview-wrapper .page-content-rich table td, .preview-wrapper .page-content-rich table th {
          border: 1px solid #000 !important;
          padding: 8px !important;
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
        <div className="page-1-content px-[12mm] flex flex-col items-center">
          {/* Top Section - Centered with Format 1 Style */}
          <div className="w-full flex flex-col items-center pt-[45mm] text-center">
            {company.logo?.url && (
              <img src={company.logo.url} alt="Logo" className="max-h-20 max-w-[180px] object-contain mb-4" />
            )}
            
            <h2 className="text-7xl font-semibold text-slate-900 mb-1 font-head uppercase tracking-tighter leading-[0.85] max-w-[500px] whitespace-pre-wrap">
              {(quotation.headerText || "QUOTATION")
                .trim()
                .split(/\s+/)
                .join('\n')
              }
            </h2>
            <p className="text-lg font-semibold text-slate-600 mt-2">Date: {quotation.date}</p>
            {quotation.number && (
              <p className="text-md font-bold text-slate-800 mt-1 uppercase tracking-wider italic">Ref: {quotation.number}</p>
            )}
            <div className="w-32 h-[2px] bg-slate-900 opacity-20 mt-3 rounded-full" />
          </div>

          {/* Bottom Footer Section - Refined Compact White */}
          <div className="mt-auto mb-[63mm] w-full max-w-[170mm] flex flex-col items-center">
            {/* Minimal White Divider */}
            <div className="w-20 h-px bg-white opacity-30 mb-6" />
            
            <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-[0.15em] text-center drop-shadow-sm">
              {company.name}
            </h3>
            
            {/* Contact Info Bar - Subtler/Tighter */}
            <div className="flex items-center justify-center gap-6 mb-1 text-sm font-medium text-white tracking-widest drop-shadow-sm">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-white opacity-80" />
                <span>{company.tel}</span>
              </div>
              <div className="w-1 h-1 bg-white rounded-full opacity-40" />
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-white opacity-80" />
                <span>{company.email}</span>
              </div>
            </div>

            {/* Address Block - Tighter */}
            <div className="flex flex-col items-center text-center max-w-[140mm]">
              <div className="flex items-start gap-2 text-[13px] font-normal text-white leading-tight drop-shadow-sm opacity-90">
                <MapPin size={14} className="text-white opacity-80 mt-0.5 shrink-0" />
                <span>{company.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subsequent Pages (2+) */}
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
           <div className="absolute bottom-10 left-0 right-0 px-20 border-t pt-4 flex justify-between text-[10px] text-gray-400">
             <span>{company.name} | Quotation {quotation.number}</span>
           </div>
        </div>
      ))}
    </div>
  );
});

CustomQuotation_2.displayName = 'CustomQuotation_2';
export default CustomQuotation_2;
