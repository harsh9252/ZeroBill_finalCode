import React, { forwardRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Phone, Mail, MapPin, Globe, User, Users, Calendar, Leaf, FileText } from 'lucide-react';

/**
 * CustomQuotation_Emerald - Premium Emerald Geometric A4 Design
 * Page 1: High-fidelity "Project Proposal" Cover
 * Subsequent Pages: Professional Clean Document Style with Automatic Splitting
 */
const CustomQuotation_Emerald = forwardRef(({ quotationData: data, letterheadImage }, ref) => {
  if (!data) return <div className="p-8 text-center text-gray-400 font-sans tracking-widest uppercase text-xs">Matching Pixel Perfect Design...</div>;

  const { company, customer, quotation, termsSections } = data;

  /**
   * Advanced Page Splitting Algorithm
   * Processes HTML content and distributes it across multiple A4 pages
   * while respecting fixed header/footer spacing.
   */
  const splitContentIntoPages = (htmlContent) => {
    if (!htmlContent) return [''];

    // Measurement container to accurately calculate element heights
    // Pinned to top:0, left:0 and hidden to prevent body expansion or scroll jumps
    const container = document.createElement('div');
    container.className = 'preview-wrapper';
    container.style.cssText = 'position: absolute; top: 0; left: 0; visibility: hidden; width: 210mm; pointer-events: none; z-index: -9999; overflow: hidden;';
    
    const tempDiv = document.createElement('div');
    tempDiv.className = 'rich-text-container';
    tempDiv.style.cssText = 'width: 180mm; padding: 0; margin: 0; box-sizing: border-box; font-size: 10.5pt; line-height: 1.6; font-family: "Inter", Arial, sans-serif; white-space: pre-wrap; text-align: justify;';
    container.appendChild(tempDiv);
    document.body.appendChild(container);

    const pages = [];
    const maxPageHeight = 275; 

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
    const root = doc.body.firstChild;

    let currentPageHtml = '';

    const addNode = (node, canRetry = true) => {
      const tempWrapper = document.createElement('div');
      tempWrapper.appendChild(node.cloneNode(true));
      const nodeHtml = tempWrapper.innerHTML;
      
      tempDiv.innerHTML = currentPageHtml + nodeHtml;
      const heightMm = (tempDiv.offsetHeight * 0.264583);

      if (heightMm <= maxPageHeight) {
        currentPageHtml += nodeHtml;
        return;
      }

      if (node.nodeName === 'TABLE') {
        // Force table to start on a new page to avoid cropping
        if (currentPageHtml) {
          pages.push(currentPageHtml);
          currentPageHtml = '';
        }
        // Add the table (allow it to occupy the new page; if too large, it will overflow but not be cropped)
        currentPageHtml += nodeHtml;
        return;
      }

      // Split between child elements only (paragraphs, list items, etc.)
      if (node.nodeType === Node.ELEMENT_NODE && ['DIV', 'P', 'SECTION', 'UL', 'OL'].includes(node.nodeName)) {
        if (node.childNodes.length > 1) {
          Array.from(node.childNodes).forEach(child => {
            const wrappedChild = node.cloneNode(false);
            wrappedChild.appendChild(child.cloneNode(true));
            addNode(wrappedChild, canRetry);
          });
          return;
        } else if (node.childNodes.length === 1) {
          if (node.firstChild.nodeType === Node.ELEMENT_NODE) {
            addNode(node.firstChild, canRetry);
            return;
          } else if (node.firstChild.nodeType === Node.TEXT_NODE) {
            // HIGH-PRECISION SPLIT: Use binary search to find exactly how many words fit on this page
            const text = node.firstChild.textContent;
            const parts = text.match(/\S+|\s+/g) || []; 
            
            if (parts.length > 1) {
              let low = 0;
              let high = parts.length;
              let fitCount = 0;

              // Binary search to find the maximum words that fit in the remaining space
              while (low <= high) {
                let mid = Math.floor((low + high) / 2);
                const testNode = node.cloneNode(false);
                testNode.textContent = parts.slice(0, mid).join('');
                tempDiv.innerHTML = currentPageHtml + testNode.outerHTML;
                
                if ((tempDiv.offsetHeight * 0.264583) <= maxPageHeight) {
                  fitCount = mid;
                  low = mid + 1;
                } else {
                  high = mid - 1;
                }
              }

              if (fitCount > 0 && fitCount < parts.length) {
                // Add only the part that fits to the current page
                const n1 = node.cloneNode(false);
                n1.textContent = parts.slice(0, fitCount).join('');
                n1.style.marginBottom = '0';
                currentPageHtml += n1.outerHTML;

                // Move to the next page
                pages.push(currentPageHtml);
                currentPageHtml = '';

                // Retry the remaining text on the fresh page
                const n2 = node.cloneNode(false);
                n2.textContent = parts.slice(fitCount).join('');
                addNode(n2, false); 
                return;
              }
            }
          }
        }
      }

      // Only if it's completely unsplittable, then push the page
      if (currentPageHtml && canRetry) {
        pages.push(currentPageHtml);
        currentPageHtml = '';
        addNode(node, false); 
      } else {
        currentPageHtml += nodeHtml;
      }
    };

    const validNodes = Array.from(root.childNodes).filter(node => {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return false;
      return true;
    });

    validNodes.forEach(node => addNode(node));
    if (currentPageHtml) pages.push(currentPageHtml);

    document.body.removeChild(container);
    return pages.length > 0 ? pages : [''];
  };

  // Memoize splitting logic to prevent "double scroll" artifacts caused by 
  // temporary DOM nodes created during the render cycle.
  const contentPages = useMemo(() => {
    const unifiedHtml = (termsSections || []).map((s, idx) => `
      ${s.heading ? `<h2 class="section-heading">${s.heading}</h2>` : ''}
      ${s.content || ''}
      ${idx < termsSections.length - 1 ? '<div class="section-separator"></div>' : ''}
    `).join('').trim();

    return splitContentIntoPages(unifiedHtml).filter(p => {
      if (!p) return false;
      const tester = document.createElement('div');
      tester.innerHTML = p;
      return tester.textContent.trim().length > 0 || tester.querySelector('img, table, h1, h2, h3, h4');
    });
  }, [termsSections]);

  return (
    <div ref={ref} className="preview-wrapper py-10 flex flex-col items-center gap-10 w-full font-sans print:py-0 overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
        
        .preview-wrapper .a4-page {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          background: white;
          position: relative;
          box-sizing: border-box;
          page-break-after: always;
          page-break-inside: avoid;
          flex-shrink: 0;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        @media print {
          @page { margin: 0; size: A4 portrait; }
          body { margin: 0; padding: 0; }
          .preview-wrapper.py-10 { padding: 0 !important; gap: 0 !important; }
          .preview-wrapper .a4-page { margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
        }

        .preview-wrapper .text-forest { color: #0d4022; }
        .preview-wrapper .text-emerald-main { color: #129046; }
        .preview-wrapper .text-soft-green { color: #8dad8a; }

        .preview-wrapper .section-heading {
          margin: 0 0 12pt 0; 
          font-weight: 800; 
          color: #0d4022;
          text-transform: uppercase;
          font-family: 'Plus Jakarta Sans', sans-serif;
          line-height: 1.2;
          font-size: 20pt;
          border-left: 5pt solid #129046;
          padding-left: 12pt;
          margin-left: -12pt;
        }

        .preview-wrapper .section-separator {
          height: 30pt;
          border-bottom: 1.5pt solid #F3F4F6;
          margin-bottom: 25pt;
          width: 100%;
        }

        .preview-wrapper .rich-text-container {
          line-height: 1.6;
          color: #374151;
          font-size: 10.5pt;
          white-space: pre-wrap;
          text-align: justify;
        }

        .preview-wrapper .rich-text-container p { margin-bottom: 12pt; }

        .preview-wrapper .rich-text-container th, .preview-wrapper .rich-text-container td { border: 1px solid #E5E7EB; padding: 6pt 10pt; text-align: left; }
        .preview-wrapper .rich-text-container th { background: #F9FAFB; font-weight: 700; color: #111827; }
      `}</style>

      {/* --- PAGE 1: COVER --- */}
      <div className="a4-page relative overflow-hidden">
        {/* Background Design Elements */}
        <div className="absolute top-[-25px] right-[25px] w-[70px] h-[70px] border-[8px] border-[#9ccc53] rotate-45 opacity-25 z-1" />
        <div className="absolute top-[-70px] right-[-70px] w-[250px] h-[220px] bg-[#0d4022] -rotate-[35deg] skew-x-[-15deg] z-10 shadow-xl" />
        <div className="absolute top-0 right-[130px] w-[60px] h-[380px] bg-[#129046] -rotate-[35deg] skew-x-[-15deg] z-5" />
        <div className="absolute top-[-30px] right-[200px] w-[18px] h-[320px] border-r-[6px] border-[#9ccc53] -rotate-[35deg] skew-x-[-15deg] z-6" />
        <div className="absolute top-[240px] left-0 w-[20px] h-[80px] bg-[#129046] z-10" />

        <div className="absolute bottom-[-100px] left-[-120px] w-[500px] h-[400px] z-10 -rotate-[35deg] skew-x-[-15deg] flex items-flex-end gap-[10px]">
          <div className="w-[280px] h-full bg-[#0d4022]" />
          <div className="w-[45px] h-full bg-[#129046]" />
          <div className="w-[22px] h-full bg-[#9ccc53]" />
          <div className="absolute top-[60px] right-[90px] w-[90px] h-[90px] border-[5px] border-[#9ccc53]" />
        </div>

        {/* Cover Content */}
        <div className="relative z-20 h-full flex flex-col px-16 py-20">
          <div className="flex items-center gap-4">
            {company.logo?.url ? (
              <img src={company.logo.url} alt="Logo" className="max-h-[60px] max-w-[150px] object-contain" />
            ) : (
              <h2 className="text-forest font-black text-2xl uppercase tracking-tighter">{company.name}</h2>
            )}
          </div>

          <div className="mt-40">
            <h1 className="text-[52pt] font-black text-forest uppercase leading-[0.85] tracking-tighter transform scale-x-[0.85] origin-left">
              {(quotation.headerText || quotation.header_text || "PROJECT\nPROPOSAL").split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
            </h1>
            <div className="w-[85%] h-[4px] bg-forest mt-12" />
          </div>

          <div className="mt-auto self-end text-right space-y-12">
            <div>
              <p className="text-soft-green text-xl font-bold tracking-tight">Prepared By:</p>
              <h2 className="text-forest text-[34pt] font-black leading-tight -mt-1">{company.name}</h2>
              {quotation.business_name && <p className="text-forest text-xl opacity-80 font-medium">{quotation.business_name}</p>}
            </div>
            <div>
              <p className="text-soft-green text-xl font-bold tracking-tight">
                {new Date(quotation.quotation_date || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-forest text-[80pt] font-black leading-none -mt-2">{new Date(quotation.quotation_date || Date.now()).getFullYear()}</h1>
            </div>
            <div>
              <p className="text-soft-green text-xl font-bold tracking-tight">Proposal For:</p>
              <h2 className="text-forest text-[28pt] font-black uppercase leading-tight -mt-1">
                {customer?.name || quotation.customer_name || data.customer?.name || company.email || "Client Name"}
              </h2>
              <p className="text-forest text-lg font-bold opacity-80">
                Phone / Email : {customer?.phone || quotation.customer_phone || data.customer?.phone || company.tel || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT PAGES --- */}
      {contentPages.map((pageHtml, idx) => (
        <div key={idx} className="a4-page relative flex flex-col">
          {/* Emerald Accent Bar - Full Height Side Decoration */}
          <div className="absolute left-0 top-0 bottom-0 w-[12px] bg-emerald-main opacity-90" />
          <div className="absolute left-[12px] top-0 bottom-0 w-[4px] bg-soft-green opacity-30" />

          {/* Main Content Area - Flows automatically */}
          <div className="px-[15mm] py-[20mm] flex-grow overflow-hidden relative">
            <div 
              className="rich-text-container"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(pageHtml) }}
            />
          </div>

          {/* Page Footer - Fixed Space (20mm) */}
          <div className="h-[20mm] px-[15mm] flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <span className="text-[8pt] font-bold text-soft-green uppercase tracking-[0.2em]">{company.name}</span>
              <span className="text-[7pt] text-gray-400 font-medium tracking-tight">CONFIDENTIAL PROPOSAL</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[10pt] font-bold text-soft-green uppercase tracking-[0.4em]">PAGE</span>
              <span className="text-lg font-black text-forest leading-none">{idx + 2}</span>
            </div>
          </div>

          {/* Bottom Geometric Accents */}
          <div className="absolute bottom-0 right-0 w-[60px] h-[60px] bg-forest opacity-5 skew-x-[-45deg]" />
        </div>
      ))}
    </div>
  );
});

export default CustomQuotation_Emerald;
