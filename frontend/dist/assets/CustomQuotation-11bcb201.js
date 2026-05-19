import{r as f,j as e,ag as ne,ad as ie,aq as le,aG as oe,x as ke,ba as xe,bh as _e,A as re,am as ce,u as ue,aF as Se,aH as Te,aI as Ce,aJ as pe,P as te,F as Ee}from"./vendor-9994e784.js";import{n as Pe,D as Ie,i as fe,f as W,k as ze,l as Ae,e as de,t as se,o as X,p as $e,q as Oe,g as Le,M as De,b as me,G as Fe,R as Re,c as Be,h as Me}from"./index-0765d470.js";const be=f.forwardRef(({quotationData:t},x)=>{var y;if(!t)return e.jsx("div",{className:"p-8 text-center text-gray-400",children:"Loading Preview..."});const{company:d,customer:g,quotation:s,termsSections:p}=t;return e.jsxs("div",{ref:x,className:"preview-wrapper py-10 flex flex-col items-center gap-10 w-full font-sans print:py-0",children:[e.jsx("style",{children:`
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
      `}),e.jsx("div",{className:"a4-page page-1-bg",children:e.jsxs("div",{className:"page-1-content px-[20px] flex flex-col justify-between",children:[e.jsxs("div",{className:"flex justify-between items-start pt-[45mm]",children:[e.jsxs("div",{className:"text-left",children:[e.jsx("h2",{className:"text-7xl font-semibold text-blue-900 mb-2 font-head uppercase tracking-tighter leading-[0.85] max-w-[400px] whitespace-pre-wrap",children:(s.headerText||"QUOTATION").trim().split(/\s+/).join(`
`)}),e.jsxs("p",{className:"text-lg font-semibold text-gray-700 mt-4 ml-3",children:["Date: ",s.date]}),s.number&&e.jsxs("p",{className:"text-md font-bold text-blue-900 ml-3 mt-1 underline decoration-blue-200",children:["Quotation No: ",s.number]})]}),((y=d.logo)==null?void 0:y.url)&&e.jsx("img",{src:d.logo.url,alt:"Logo",className:"max-h-20 max-w-[180px] object-contain"})]}),e.jsxs("div",{className:"mt-auto pb-[15mm]",children:[e.jsx("h3",{className:"text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight",children:d.name}),e.jsxs("div",{className:"text-sm font-semibold text-gray-700",children:[e.jsxs("div",{className:"info-row",children:[e.jsx(ne,{size:14,className:"text-blue-900"}),e.jsxs("p",{children:["Phone: ",d.tel]})]}),e.jsxs("div",{className:"info-row",children:[e.jsx(ie,{size:14,className:"text-blue-900"}),e.jsxs("p",{children:["Email: ",d.email]})]}),e.jsxs("div",{className:"info-row items-start",children:[e.jsx(le,{size:14,className:"text-blue-900 mt-1"}),e.jsx("p",{className:"whitespace-pre-wrap whitespace-normal break-words max-w-[100mm] leading-relaxed",children:d.address})]})]})]})]})}),p.map((i,c)=>e.jsxs("div",{className:"a4-page",children:[e.jsxs("div",{className:"page-content-rich",children:[i.heading&&e.jsx("h2",{className:"text-xl font-bold border-b-2 border-blue-900 pb-2 mb-6 uppercase tracking-wider",children:i.heading}),e.jsx("div",{className:"rich-text-container",dangerouslySetInnerHTML:{__html:oe.sanitize(i.content)}})]}),e.jsx("div",{className:"absolute bottom-4 left-0 right-0 px-[20px] bg-white py-1 flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-200",children:e.jsxs("span",{children:[d.name," | Quotation ",s.number]})})]},c))]})});be.displayName="CustomQuotation_1";const we=f.forwardRef(({quotationData:t,letterheadImage:x},d)=>{var i;if(!t)return e.jsx("div",{className:"p-8 text-center text-gray-400",children:"Loading Preview..."});const{company:g,customer:s,quotation:p,termsSections:y}=t;return e.jsxs("div",{ref:d,className:"preview-wrapper py-10 flex flex-col items-center gap-10 w-full font-sans print:py-0",children:[e.jsx("style",{children:`
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
      `}),e.jsx("div",{className:"a4-page page-1-bg",children:e.jsxs("div",{className:"page-1-content px-[12mm] flex flex-col items-center",children:[e.jsxs("div",{className:"w-full flex flex-col items-center pt-[45mm] text-center",children:[((i=g.logo)==null?void 0:i.url)&&e.jsx("img",{src:g.logo.url,alt:"Logo",className:"max-h-20 max-w-[180px] object-contain mb-4"}),e.jsx("h2",{className:"text-7xl font-semibold text-slate-900 mb-1 font-head uppercase tracking-tighter leading-[0.85] max-w-[500px] whitespace-pre-wrap",children:(p.headerText||"QUOTATION").trim().split(/\s+/).join(`
`)}),e.jsxs("p",{className:"text-lg font-semibold text-slate-600 mt-2",children:["Date: ",p.date]}),p.number&&e.jsxs("p",{className:"text-md font-bold text-slate-800 mt-1 uppercase tracking-wider italic",children:["Ref: ",p.number]}),e.jsx("div",{className:"w-32 h-[2px] bg-slate-900 opacity-20 mt-3 rounded-full"})]}),e.jsxs("div",{className:"mt-auto mb-[63mm] w-full max-w-[170mm] flex flex-col items-center",children:[e.jsx("div",{className:"w-20 h-px bg-white opacity-30 mb-6"}),e.jsx("h3",{className:"text-2xl font-bold text-white mb-4 uppercase tracking-[0.15em] text-center drop-shadow-sm",children:g.name}),e.jsxs("div",{className:"flex items-center justify-center gap-6 mb-1 text-sm font-medium text-white tracking-widest drop-shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ne,{size:14,className:"text-white opacity-80"}),e.jsx("span",{children:g.tel})]}),e.jsx("div",{className:"w-1 h-1 bg-white rounded-full opacity-40"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ie,{size:14,className:"text-white opacity-80"}),e.jsx("span",{children:g.email})]})]}),e.jsx("div",{className:"flex flex-col items-center text-center max-w-[140mm]",children:e.jsxs("div",{className:"flex items-start gap-2 text-[13px] font-normal text-white leading-tight drop-shadow-sm opacity-90",children:[e.jsx(le,{size:14,className:"text-white opacity-80 mt-0.5 shrink-0"}),e.jsx("span",{children:g.address})]})})]})]})}),y.map((c,N)=>e.jsxs("div",{className:"a4-page",children:[e.jsxs("div",{className:"page-content-rich",children:[c.heading&&e.jsx("h2",{className:"text-xl font-bold border-b-2 border-blue-900 pb-2 mb-6 uppercase tracking-wider",children:c.heading}),e.jsx("div",{className:"rich-text-container",dangerouslySetInnerHTML:{__html:oe.sanitize(c.content)}})]}),e.jsx("div",{className:"absolute bottom-10 left-0 right-0 px-20 border-t pt-4 flex justify-between text-[10px] text-gray-400",children:e.jsxs("span",{children:[g.name," | Quotation ",p.number]})})]},N))]})});we.displayName="CustomQuotation_2";const qe=f.forwardRef(({quotationData:t,letterheadImage:x},d)=>{var N,z,S;if(!t)return e.jsx("div",{className:"p-8 text-center text-gray-400 font-sans tracking-widest uppercase text-xs",children:"Matching Pixel Perfect Design..."});const{company:g,customer:s,quotation:p,termsSections:y}=t,i=T=>{if(!T)return[""];const b=document.createElement("div");b.className="preview-wrapper",b.style.cssText="position: absolute; top: 0; left: 0; visibility: hidden; width: 210mm; pointer-events: none; z-index: -9999; overflow: hidden;";const h=document.createElement("div");h.className="rich-text-container",h.style.cssText='width: 180mm; padding: 0; margin: 0; box-sizing: border-box; font-size: 10.5pt; line-height: 1.6; font-family: "Inter", Arial, sans-serif; white-space: pre-wrap; text-align: justify;',b.appendChild(h),document.body.appendChild(b);const m=[],j=275,E=new DOMParser().parseFromString(`<div>${T}</div>`,"text/html").body.firstChild;let v="";const P=(_,A=!0)=>{const H=document.createElement("div");H.appendChild(_.cloneNode(!0));const G=H.innerHTML;if(h.innerHTML=v+G,h.offsetHeight*.264583<=j){v+=G;return}if(_.nodeType===Node.ELEMENT_NODE&&["DIV","P","SECTION","UL","OL"].includes(_.nodeName)){if(_.childNodes.length>1){Array.from(_.childNodes).forEach(J=>{const F=_.cloneNode(!1);F.appendChild(J.cloneNode(!0)),P(F,A)});return}else if(_.childNodes.length===1){if(_.firstChild.nodeType===Node.ELEMENT_NODE){P(_.firstChild,A);return}else if(_.firstChild.nodeType===Node.TEXT_NODE){const F=_.firstChild.textContent.match(/\S+|\s+/g)||[];if(F.length>1){let u=0,R=F.length,O=0;for(;u<=R;){let L=Math.floor((u+R)/2);const M=_.cloneNode(!1);M.textContent=F.slice(0,L).join(""),h.innerHTML=v+M.outerHTML,h.offsetHeight*.264583<=j?(O=L,u=L+1):R=L-1}if(O>0&&O<F.length){const L=_.cloneNode(!1);L.textContent=F.slice(0,O).join(""),L.style.marginBottom="0",v+=L.outerHTML,m.push(v),v="";const M=_.cloneNode(!1);M.textContent=F.slice(O).join(""),P(M,!1);return}}}}}v&&A?(m.push(v),v="",P(_,!1)):v+=G};return Array.from(E.childNodes).filter(_=>!(_.nodeType===Node.TEXT_NODE&&!_.textContent.trim())).forEach(_=>P(_)),v&&m.push(v),document.body.removeChild(b),m.length>0?m:[""]},c=f.useMemo(()=>{const T=(y||[]).map((b,h)=>`
      ${b.heading?`<h2 class="section-heading">${b.heading}</h2>`:""}
      ${b.content||""}
      ${h<y.length-1?'<div class="section-separator"></div>':""}
    `).join("").trim();return i(T).filter(b=>{if(!b)return!1;const h=document.createElement("div");return h.innerHTML=b,h.textContent.trim().length>0||h.querySelector("img, table, h1, h2, h3, h4")})},[y]);return e.jsxs("div",{ref:d,className:"preview-wrapper py-10 flex flex-col items-center gap-10 w-full font-sans print:py-0 overflow-x-hidden",children:[e.jsx("style",{children:`
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
        .preview-wrapper .rich-text-container table { width: 100%; border-collapse: collapse; margin: 15pt 0; }
        .preview-wrapper .rich-text-container th, .preview-wrapper .rich-text-container td { border: 1px solid #E5E7EB; padding: 6pt 10pt; text-align: left; }
        .preview-wrapper .rich-text-container th { background: #F9FAFB; font-weight: 700; color: #111827; }
      `}),e.jsxs("div",{className:"a4-page relative overflow-hidden",children:[e.jsx("div",{className:"absolute top-[-25px] right-[25px] w-[70px] h-[70px] border-[8px] border-[#9ccc53] rotate-45 opacity-25 z-1"}),e.jsx("div",{className:"absolute top-[-70px] right-[-70px] w-[250px] h-[220px] bg-[#0d4022] -rotate-[35deg] skew-x-[-15deg] z-10 shadow-xl"}),e.jsx("div",{className:"absolute top-0 right-[130px] w-[60px] h-[380px] bg-[#129046] -rotate-[35deg] skew-x-[-15deg] z-5"}),e.jsx("div",{className:"absolute top-[-30px] right-[200px] w-[18px] h-[320px] border-r-[6px] border-[#9ccc53] -rotate-[35deg] skew-x-[-15deg] z-6"}),e.jsx("div",{className:"absolute top-[240px] left-0 w-[20px] h-[80px] bg-[#129046] z-10"}),e.jsxs("div",{className:"absolute bottom-[-100px] left-[-120px] w-[500px] h-[400px] z-10 -rotate-[35deg] skew-x-[-15deg] flex items-flex-end gap-[10px]",children:[e.jsx("div",{className:"w-[280px] h-full bg-[#0d4022]"}),e.jsx("div",{className:"w-[45px] h-full bg-[#129046]"}),e.jsx("div",{className:"w-[22px] h-full bg-[#9ccc53]"}),e.jsx("div",{className:"absolute top-[60px] right-[90px] w-[90px] h-[90px] border-[5px] border-[#9ccc53]"})]}),e.jsxs("div",{className:"relative z-20 h-full flex flex-col px-16 py-20",children:[e.jsx("div",{className:"flex items-center gap-4",children:(N=g.logo)!=null&&N.url?e.jsx("img",{src:g.logo.url,alt:"Logo",className:"max-h-[60px] max-w-[150px] object-contain"}):e.jsx("h2",{className:"text-forest font-black text-2xl uppercase tracking-tighter",children:g.name})}),e.jsxs("div",{className:"mt-40",children:[e.jsx("h1",{className:"text-[52pt] font-black text-forest uppercase leading-[0.85] tracking-tighter transform scale-x-[0.85] origin-left",children:(p.headerText||p.header_text||`PROJECT
PROPOSAL`).split(`
`).map((T,b)=>e.jsxs(ke.Fragment,{children:[T,e.jsx("br",{})]},b))}),e.jsx("div",{className:"w-[85%] h-[4px] bg-forest mt-12"})]}),e.jsxs("div",{className:"mt-auto self-end text-right space-y-12",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-soft-green text-xl font-bold tracking-tight",children:"Prepared By:"}),e.jsx("h2",{className:"text-forest text-[34pt] font-black leading-tight -mt-1",children:g.name}),p.business_name&&e.jsx("p",{className:"text-forest text-xl opacity-80 font-medium",children:p.business_name})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-soft-green text-xl font-bold tracking-tight",children:new Date(p.quotation_date||Date.now()).toLocaleDateString("en-GB",{day:"numeric",month:"long"})}),e.jsx("h1",{className:"text-forest text-[80pt] font-black leading-none -mt-2",children:new Date(p.quotation_date||Date.now()).getFullYear()})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-soft-green text-xl font-bold tracking-tight",children:"Proposal For:"}),e.jsx("h2",{className:"text-forest text-[28pt] font-black uppercase leading-tight -mt-1",children:(s==null?void 0:s.name)||p.customer_name||((z=t.customer)==null?void 0:z.name)||g.email||"Client Name"}),e.jsxs("p",{className:"text-forest text-lg font-bold opacity-80",children:["Phone / Email : ",(s==null?void 0:s.phone)||p.customer_phone||((S=t.customer)==null?void 0:S.phone)||g.tel||"N/A"]})]})]})]})]}),c.map((T,b)=>e.jsxs("div",{className:"a4-page relative flex flex-col",children:[e.jsx("div",{className:"absolute left-0 top-0 bottom-0 w-[12px] bg-emerald-main opacity-90"}),e.jsx("div",{className:"absolute left-[12px] top-0 bottom-0 w-[4px] bg-soft-green opacity-30"}),e.jsx("div",{className:"px-[15mm] py-[20mm] flex-grow overflow-hidden relative",children:e.jsx("div",{className:"rich-text-container",dangerouslySetInnerHTML:{__html:oe.sanitize(T)}})}),e.jsxs("div",{className:"h-[20mm] px-[15mm] flex items-center justify-between mt-auto",children:[e.jsxs("div",{className:"flex flex-col",children:[e.jsx("span",{className:"text-[8pt] font-bold text-soft-green uppercase tracking-[0.2em]",children:g.name}),e.jsx("span",{className:"text-[7pt] text-gray-400 font-medium tracking-tight",children:"CONFIDENTIAL PROPOSAL"})]}),e.jsxs("div",{className:"flex items-baseline gap-2",children:[e.jsx("span",{className:"text-[10pt] font-bold text-soft-green uppercase tracking-[0.4em]",children:"PAGE"}),e.jsx("span",{className:"text-lg font-black text-forest leading-none",children:b+2})]})]}),e.jsx("div",{className:"absolute bottom-0 right-0 w-[60px] h-[60px] bg-forest opacity-5 skew-x-[-45deg]"})]},b))]})}),ye=f.forwardRef(({quotationData:t,letterheadImage:x},d)=>{const{company:g,customer:s,quotation:p,products:y,totals:i,terms:c,termsSections:N}=t,z=t.documentType||"quotation",S=Pe(z),T=(N||[]).map(m=>(m.content||"").replace(/<[^>]*>?/gm,"").replace(/&nbsp;/g," ").trim()).join(`
`),b=(p.remark||"").replace(/&nbsp;/g," ").trim();b&&T.includes(b);const h=m=>{if(!m)return[{pageIdx:0}];const j=document.createElement("div");j.style.cssText=`
      position: absolute;
      visibility: hidden;
      width: 160mm;
      padding: 0;
      box-sizing: border-box;
      font-size: 11px;
      line-height: 1.7;
      font-family: Arial, sans-serif;
    `,document.body.appendChild(j);const k=300,w=55,E=35,v=k-w-E;j.innerHTML=m;const P=j.offsetHeight*.264583,B=Math.ceil(P/v);return document.body.removeChild(j),Array.from({length:B||1},(_,A)=>({pageIdx:A,headerSpace:w,footerSpace:E,contentWindow:v}))};return e.jsxs("div",{ref:d,children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"preview-wrapper",children:[e.jsxs("div",{className:"letterhead-container pdf-page cover-page",children:[x&&e.jsx("div",{className:"letterhead-background",children:e.jsx("img",{src:x,alt:"Letterhead"})}),e.jsxs("div",{className:"letterhead-content",style:{padding:"45mm 25mm 35mm 25mm",height:"100%",display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",marginTop:"-40mm",marginBottom:"auto"},children:[e.jsx("h1",{style:{fontSize:"64px",fontWeight:"900",color:"#000000",margin:0,textTransform:"uppercase",letterSpacing:"2px"},children:p.headerText||S.title}),e.jsx("p",{style:{fontSize:"18px",fontWeight:"400",color:"#000000",marginTop:"10px",opacity:.8},children:p.date}),p.number&&e.jsx("p",{style:{fontSize:"14px",fontWeight:"600",color:"#000000",marginTop:"5px",opacity:.7},children:p.number})]}),e.jsxs("div",{style:{marginTop:"auto",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",paddingBottom:"0",color:"#000000",width:"100%"},children:[e.jsx("h3",{style:{fontSize:"18px",fontWeight:"800",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"1px"},children:g.name}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",fontSize:"10px",fontWeight:"500",opacity:.9},children:[g.tel&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"4px"},children:[e.jsx(ne,{size:11,strokeWidth:2}),e.jsx("span",{children:g.tel})]}),g.tel&&g.email&&e.jsx("span",{style:{opacity:.4},children:"|"}),g.email&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"4px"},children:[e.jsx(ie,{size:11,strokeWidth:2}),e.jsx("span",{children:g.email})]}),g.email&&e.jsx("span",{style:{opacity:.4},children:"|"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"4px"},children:[e.jsx(le,{size:11,strokeWidth:2}),e.jsx("span",{children:g.address})]}),p.remark&&e.jsx("span",{style:{opacity:.4},children:"|"}),e.jsx("div",{style:{display:"flex",alignItems:"center",gap:"4px"},children:e.jsx("span",{children:`REMARK : ${p.remark}`})})]})]})]})]}),(()=>{const m=(N||[]).map(k=>`
            ${k.heading?`<h2 style="font-size: 18px; font-weight: bold; color: #0d4022; text-transform: uppercase; margin-bottom: 20px;">${k.heading}</h2>`:""}
            ${k.content||""}
          `).join("");return h(m).map((k,w)=>e.jsxs("div",{className:"letterhead-container pdf-page relative",children:[x&&e.jsx("div",{className:"letterhead-background",children:e.jsx("img",{src:x,alt:"Letterhead"})}),e.jsx("div",{className:"absolute overflow-hidden",style:{top:`${k.headerSpace}mm`,height:`${k.contentWindow}mm`,width:"100%",left:0},children:e.jsx("div",{className:"letterhead-terms-content absolute w-full",style:{marginTop:`-${w*k.contentWindow}mm`,top:0,left:0},dangerouslySetInnerHTML:{__html:oe.sanitize(m)}})}),e.jsxs("div",{style:{position:"absolute",bottom:"15mm",right:"25mm",zIndex:20,display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx("span",{style:{fontSize:"10px",fontWeight:"bold",color:"#888",textTransform:"uppercase",letterSpacing:"2px"},children:"PAGE"}),e.jsx("span",{style:{fontSize:"18px",fontWeight:"900",color:"#000"},children:w+2})]})]},`page-${w}`))})()]})]})});ye.displayName="CustomQuotationLetterhead";const he=t=>{var P,B,_;if(!t)return;const{company:x,quotation:d,termsSections:g}=t,s={FOREST:"#0d4022",EMERALD:"#129046",LIME:"#9ccc53",SOFT:"#8dad8a",BODY:"#374151",WHITE:"#FFFFFF",RULE:"#E5E7EB"},p=A=>A&&A!=="null"?A:"",y=d.quotation_date||d.date,i=y?new Date(y):new Date,c=i.toLocaleDateString("en-GB",{day:"numeric",month:"long"}),N=i.getFullYear(),z=(d.headerText||d.header_text||`PROJECT
PROPOSAL`).toUpperCase(),S=p(x.name)||"Company Name",T=p(d.business_name),b=(p((P=t.customer)==null?void 0:P.name)||p(d.customer_name)||p(x.email)||"Client Name").toUpperCase(),h=p((B=t.customer)==null?void 0:B.phone)||p(d.customer_phone)||p(x.tel)||"N/A";p(x.website)||p(x.address),p(d.remark);const m="----=_NextPart_Emerald_01DAB123",j=`
    <div style='mso-element:header' id=h1>
      <!--[if gte vml 1]>
      <v:group style='position:absolute;width:595.3pt;height:841.9pt;mso-position-horizontal:left;mso-position-horizontal-relative:page;mso-position-vertical:top;mso-position-vertical-relative:page' coordsize="5953,8419">
        
        <!-- Top Right Cluster (Precision Refined) -->
        <v:rect style='position:absolute;left:5050;top:-150;width:525;height:525;z-index:-10;rotation:45' strokecolor="${s.LIME}" strokeweight="6pt" filled="f" o:allowincell="f"><v:shadow on="t" color="black" opacity="0.1"/></v:rect>
        <v:shape style='position:absolute;left:4000;top:-800;width:2400;height:2200;z-index:-5' coordsize="2400,2200" path="m 0,0 l 2000,-400 2400,2200 400,2600 x e" fillcolor="${s.FOREST}" stroked="f" o:allowincell="f"><v:shadow on="t" color="gray" opacity="0.3" offset="12pt,12pt"/></v:shape>
        <v:shape style='position:absolute;left:5050;top:-200;width:900;height:4000;z-index:-8' coordsize="900,4000" path="m 0,0 l 750,-280 900,4000 150,4280 x e" fillcolor="${s.EMERALD}" stroked="f" o:allowincell="f"/>
        <v:shape style='position:absolute;left:4900;top:-450;width:100;height:3200;z-index:-7' coordsize="100,3200" path="m 0,0 l 90,-120 100,3200 10,3120 x e" fillcolor="${s.LIME}" stroked="f" o:allowincell="f"/>

        <!-- Bottom Left Cluster (Refined with Shadows) -->
        <v:shape style='position:absolute;left:-1200;top:5800;width:4500;height:3800;z-index:-5' coordsize="4500,3800" path="m 0,0 l 2800,800 2400,3800 -400,3000 x e" fillcolor="${s.FOREST}" stroked="f" o:allowincell="f"><v:shadow on="t" color="gray" opacity="0.2" offset="6pt,6pt"/></v:shape>
        <v:shape style='position:absolute;left:1400;top:6400;width:550;height:4000;z-index:-4' coordsize="550,4000" path="m 0,0 l 550,200 500,4000 -50,3800 x e" fillcolor="${s.EMERALD}" stroked="f" o:allowincell="f"><v:shadow on="t" color="gray" opacity="0.15" offset="4pt,4pt"/></v:shape>
        <v:shape style='position:absolute;left:2000;top:6600;width:250;height:4000;z-index:-3' coordsize="250,4000" path="m 0,0 l 250,120 220,4000 -30,3880 x e" fillcolor="${s.LIME}" stroked="f" o:allowincell="f"><v:shadow on="t" color="gray" opacity="0.1" offset="3pt,3pt"/></v:shape>
        <v:rect style='position:absolute;left:2400;top:6800;width:850;height:850;z-index:-2;rotation:-35' filled="f" strokecolor="${s.LIME}" strokeweight="5pt" o:allowincell="f"><v:shadow on="t" color="black" opacity="0.1" offset="5pt,5pt"/></v:rect>
      </v:group>
      <![endif]-->
    </div>
  `,k=`
    <div style='mso-element:header' id=h2>
      <!--[if gte vml 1]>
      <v:group style='position:absolute;width:595.3pt;height:841.9pt;mso-position-horizontal:left;mso-position-horizontal-relative:page;mso-position-vertical:top;mso-position-vertical-relative:page' coordsize="5953,8419">
        <v:rect style='position:absolute;left:0;top:0;width:100;height:8419;z-index:-10' fillcolor="${s.EMERALD}" stroked="f" o:allowincell="f"/>
        <v:rect style='position:absolute;left:100;top:0;width:30;height:8419;z-index:-9' fillcolor="${s.LIME}" opacity="0.3" stroked="f" o:allowincell="f"/>
      </v:group>
      <![endif]-->
    </div>
  `,w=`MIME-Version: 1.0
Content-Type: multipart/related; boundary="${m}"

--${m}
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: 7bit

<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:v='urn:schemas-microsoft-com:vml' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <style>
    @page Section1 { size: 595.3pt 841.9pt; margin: 0in; mso-header: h1; mso-title-page: yes; }
    div.Section1 { page: Section1; }
    
    @page Section2 { size: 595.3pt 841.9pt; margin: 0.5in 0.5in 0.5in 1.0in; mso-header: h2; mso-footer: f1; }
    div.Section2 { page: Section2; }

    body { font-family: 'Segoe UI', Arial, sans-serif; color: ${s.BODY}; margin: 0; }
    p, div { mso-line-height-rule: exactly; }
    .rich-text-container { font-size: 11pt; line-height: 1.6; }
    .rich-text-container h1, .rich-text-container h2 { color: ${s.FOREST}; font-family: 'Arial Black'; text-transform: uppercase; border-left: 10pt solid ${s.EMERALD}; padding-left: 15pt; margin-top: 30pt; }
  </style>
</head>
<body>
  ${j}
  ${k}

  <div class="Section1">
    <table width="100%" height="842" border="0" cellpadding="0" cellspacing="0" style="height:842pt; width:100%; table-layout:fixed; mso-height-rule:exactly;">
      <tr>
        <td valign="top" style="padding: 60pt 50pt;">
          <div style="margin-bottom: 30pt;">
            ${(_=x.logo)!=null&&_.url?`<img src="${x.logo.url}" style="height: 45pt; width: auto;" />`:`<h2 style="color:${s.FOREST}; margin:0; font-family:'Arial Black'; text-transform:uppercase;">${p(x.name)||S}</h2>`}
          </div>

          <div style="margin-top: 30pt;">
            <table cellpadding="0" cellspacing="0" border="0" style="mso-table-lspace:0pt; mso-table-rspace:0pt;">
              <tr>
                <td width="12" style="width: 12pt; background-color: ${s.EMERALD};">&nbsp;</td>
                <td style="padding-left: 18pt;">
                  <p style="font-size: 52pt; font-weight: 900; color: ${s.FOREST}; margin: 0; line-height: 1.0; font-family: 'Arial Black'; text-transform: uppercase;">${z.replace(`
`,"<br/>")}</p>
                </td>
              </tr>
            </table>
            <div style="width: 85%; height: 4pt; background-color: ${s.FOREST}; margin-top: 15pt;"></div>
          </div>

          <!-- Robust Table-Based Vertical Spacer -->
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt; mso-table-rspace:0pt;">
            <tr>
              <td style="height: 140pt; line-height: 140pt; font-size: 1pt; mso-line-height-rule: exactly;">&nbsp;</td>
            </tr>
          </table>

          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 20pt; mso-table-lspace:0pt; mso-table-rspace:0pt; margin-left:auto;">
            <tr>
              <td>&nbsp;</td>
              <td align="right" style="text-align: right; padding-right: 30pt;">
                <div style="mso-margin-bottom-alt: 12pt; text-align:right;">
                  <p style="color: ${s.SOFT}; font-size: 12pt; font-weight: bold; margin: 0; text-transform: uppercase;">Prepared By:</p>
                  <p style="font-size: 28pt; font-weight: 900; color: ${s.FOREST}; margin: 0; font-family: 'Arial Black'; line-height: 1.0;">${S}</p>
                  ${T?`<p style="font-size: 12pt; color: ${s.FOREST}; margin-top: 2pt; opacity: 0.75; font-weight: bold;">${T}</p>`:""}
                </div>
                <div style="mso-margin-bottom-alt: 12pt; text-align:right;">
                  <p style="color: ${s.SOFT}; font-size: 12pt; font-weight: bold; margin: 0;">${c}</p>
                  <p style="font-size: 85pt; font-weight: 900; color: ${s.FOREST}; margin: 0; font-family: 'Arial Black'; line-height: 0.8;">${N}</p>
                </div>
                <div style="mso-margin-bottom-alt: 12pt; text-align:right;">
                  <p style="color: ${s.SOFT}; font-size: 12pt; font-weight: bold; margin: 0; text-transform: uppercase;">Proposal For:</p>
                  <p style="font-size: 28pt; font-weight: 900; color: ${s.FOREST}; margin: 0; font-family: 'Arial Black'; text-transform: uppercase; line-height: 1.0;">${b}</p>
                  ${h?`<p style="font-size: 11pt; font-weight: bold; color: ${s.FOREST}; margin-top: 4pt; line-height: 1.2;">Phone / Email : ${h}</p>`:""}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <br clear="all" style="mso-special-character:line-break; page-break-before:always" />
  </div>

  <div class="Section2">
    ${g.map((A,H)=>`
      <div style="padding-bottom: 40pt;">
        <div class="rich-text-container">
          <h2>${p(A.heading)||"PROJECT DETAILS"}</h2>
          ${A.content||""}
        </div>
      </div>
      ${H<g.length-1?'<br clear="all" style="mso-special-character:line-break; page-break-before:always" />':""}
    `).join("")}
    
    <div style='mso-element:footer' id=f1>
      <p class=MsoFooter align=right style='text-align:right; margin-right:40pt; color:${s.SOFT}; font-weight:bold;'>
        PAGE <span style='mso-field-code:" PAGE "'><span style='mso-no-proof:yes'></span></span>
      </p>
    </div>
  </div>
</body>
</html>

--${m}--`,E=new Blob(["\uFEFF",w],{type:"application/msword"}),v=`${(d.headerText||d.header_text||"Proposal").replace(/\s+/g,"_")}.doc`;xe.saveAs(E,v)},Qe=(t,x)=>{if(!t)return;const{company:d,customer:g,quotation:s,termsSections:p}=t,y=k=>{if(!k)return"";const w=new DOMParser().parseFromString(k,"text/html");return(w.body.textContent||w.body.innerText||"").replace(/[^\x20-\x7E\t\n\r]/g,"")},i=(s.headerText||"TAX QUOTATION").toUpperCase(),c=s.date||"",N=s.number||"",z=(g.name||"DEEPAK VAISHNAV").toUpperCase(),S="----=_NextPart_01DAB123.456789",T=x?x.split(",")[1]:"",b=x?x.split(";")[0].split(":")[1]:"image/png",h=`
<div class="Section1">
  <!-- BACKGROUND IMAGE (VML Body Background - Vivid Colors) -->
  <!--[if gte vml 1]>
  <v:rect id="LetterheadBackground" style='position:absolute;left:0;top:0;width:595.3pt;height:841.9pt;z-index:-251658240;mso-position-horizontal:left;mso-position-horizontal-relative:page;mso-position-vertical:top;mso-position-vertical-relative:page' stroked="f">
    <v:imagedata src="cid:bgImage" o:title="Letterhead" />
  </v:rect>
  <![endif]-->

  <!-- PAGE 1: COVER PAGE -->
  <div style="height:230mm; text-align:center;">
    <!-- Pulling content up to compensate for 55mm page margin -->
    <div style="margin-top:-30mm;">
      <div style="padding-top:60mm;">
        <h1 style="font-size:48pt; font-family:'Arial Black', sans-serif; color:#000; margin:0;">${i}</h1>
        <p style="font-size:16pt; font-family:'Segoe UI', sans-serif; color:#333; margin-top:10pt;">${c}</p>
        <p style="font-size:12pt; font-family:'Segoe UI', sans-serif; font-weight:bold; color:#000; margin-top:5pt;">${N}</p>
      </div>

      <div style="margin-top:80mm;">
        <h2 style="font-size:24pt; font-family:'Arial Black', sans-serif; color:#000; margin:0;">${z}</h2>
        <p style="font-size:8.5pt; font-family:'Segoe UI', sans-serif; color:#555; margin-top:8pt;">
          ${d.tel?`TEL: ${d.tel} | `:""}${d.email?`EMAIL: ${d.email} | `:""}${d.address?`ADDR: ${d.address}`:""}
        </p>
        ${s.remark?`<p style="font-size:9pt; font-family:'Segoe UI', sans-serif; font-weight:bold; margin-top:5pt;">REMARK: ${s.remark}</p>`:""}
      </div>
    </div>
  </div>

  <br clear="all" style="mso-special-character:line-break; page-break-before:always" />

  <!-- CONTENT PAGES -->
  <div class="content-body">
    ${p.map(k=>`
      <h2 style="font-size:16pt; font-family:'Arial Black', sans-serif; color:#0d4022; text-transform:uppercase; margin-top:5pt; margin-bottom:12pt; border-bottom:1px solid #ddd; padding-bottom:5pt;">${y(k.heading)}</h2>
      <div style="font-size:11pt; font-family:'Arial', sans-serif; line-height:1.7; color:#000; text-align:justify;">${y(k.content)}</div>
      <div style="height:15pt;">&nbsp;</div>
    `).join("")}
  </div>

  <!-- FOOTER -->
  <div style="mso-element:footer" id="f1">
    <p class="MsoFooter" align="right">
      <span style="font-size:9pt; font-family:'Segoe UI'; color:#888888; font-weight:bold;">PAGE </span>
      <span style="mso-field-code: PAGE " style="font-size:16pt; font-family:'Arial Black'; color:#000; font-weight:900;"></span>
    </p>
  </div>
</div>
`,m=`MIME-Version: 1.0
Content-Type: multipart/related; boundary="${S}"

--${S}
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: 7bit

<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:v='urn:schemas-microsoft-com:vml' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { 
      size: 21.0cm 29.7cm; 
      margin: 50mm 25mm 20mm 25mm; 
      mso-footer: f1; 
      mso-footer-margin: 15mm; 
    }
    body { margin: 0; padding: 0; }
    .Section1 { page: Section1; }
    h1, h2, h3, p, div { margin: 0; padding: 0; }
  </style>
</head>
<body style="tab-interval:.5in">
${h}
</body>
</html>

${x?`--${S}
Content-Type: ${b}
Content-Transfer-Encoding: base64
Content-ID: <bgImage>

${T}
`:""}
--${S}--`,j=new Blob([m],{type:"application/msword"});xe.saveAs(j,`${i.replace(/\s+/g,"_")}.doc`)},{businessAPI:Ue,getApiConfig:We}=fe;function ve({quotation:t,onBack:x}){const[d,g]=f.useState("Emerald"),[s,p]=f.useState(null);f.useState(!1),f.useState(!1);const[y,i]=f.useState(null);f.useEffect(()=>{(async()=>{try{const m=localStorage.getItem("selectedBusinessId");if(m){const j=await Ue.getById(m);j.success&&i(j.data)}}catch(m){console.error("Error loading business data:",m)}})()},[]);const c=f.useMemo(()=>{if(!t||!y)return null;const h=y.address?y.address.split(`
`).filter(j=>j.trim()):[],m=y.logo_url?`${We().backendURL}${y.logo_url}`:null;return{company:{name:t.company_name||y.business_name||"Company Name",address:t.company_address||y.address||"N/A",tel:t.company_phone||y.phone||"",email:t.company_email||y.email||"",website:y.website||"",gstin:y.gstin||"",logo:{url:t.logo||m},addressLines:h},customer:{name:t.customer_name||t.company_email||"Client Name",address:t.customer_address||"N/A",phone:t.customer_phone||t.company_phone||"N/A",email:t.customer_email||"N/A"},quotation:{number:t.quotation_number||"N/A",date:t.quotation_date?new Date(t.quotation_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"N/A",quotation_date:t.quotation_date,paymentTerms:"N/A",headerText:t.header_text||"QUOTATION",business_name:t.business_name||"",remark:t.remark||""},products:[],totals:{total:t.total_amount||0,totalInWords:""},termsSections:(t.sections||[]).map(j=>({heading:j.heading,content:j.content})),documentType:Ie.CUSTOM_QUOTATION,currencySymbol:"₹"}},[t,y]),N={Emerald:{label:"Format-3",id:3,component:qe},FormatOne:{label:"Format-1",id:1,component:be},FormatTwo:{label:"Format-2",id:2,component:we},Letterhead:{label:"Letterhead",id:"letterhead",component:ye}},z=f.useRef(null),S=_e.useReactToPrint({contentRef:z,documentTitle:c?`Custom_Quotation_${c.quotation.number||"draft"}`:"Document"}),T=()=>{c&&(d==="Emerald"?he(c):d==="Letterhead"?Qe(c,s):he(c))},b=async h=>{const m=h.target.files[0];if(!m)return;if(m.type==="application/msword"||m.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"||m.name.endsWith(".doc")||m.name.endsWith(".docx")){W("Word file is not supported for letterhead. Please upload a PDF or image file (JPEG, PNG, WEBP)."),h.target.value="";return}if(!["image/jpeg","image/jpg","image/png","image/webp","image/gif","application/pdf"].includes(m.type)){W("Please upload a valid file (PDF, JPEG, PNG, GIF, WEBP)"),h.target.value="";return}const k=m.type==="application/pdf",w=k?10*1024*1024:5*1024*1024;if(m.size>w){W(`File is too large. Please upload under ${k?"10MB":"5MB"}.`),h.target.value="";return}try{k&&ze("Converting PDF to letterhead... please wait.");const E=await Ae(m);p(E),g("Letterhead"),de(k?"PDF converted and uploaded successfully":"Letterhead uploaded successfully")}catch(E){console.error("Error processing letterhead:",E),E.message==="WORD_NOT_SUPPORTED"?W("Word file is not supported for letterhead. Please upload a PDF or image file."):W("Failed to process file. Please try a different format or an image.")}finally{h.target.value=""}};return e.jsxs("div",{className:"min-h-screen bg-white w-full flex-col flex overflow-hidden",children:[e.jsx("div",{className:"fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-6 py-3",children:e.jsxs("div",{className:"flex items-center justify-between w-full max-w-7xl mx-auto",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{onClick:x,className:"group flex items-center gap-2 px-2 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0",title:"Back",children:e.jsx(re,{className:"w-4 h-4 text-yellow-900 group-hover:text-green-700"})}),e.jsxs("h1",{className:"text-xl font-bold text-gray-800",children:["Preview - ",t.quotation_number]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>g("Emerald"),className:`h-9 px-4 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${d==="Emerald"?"border-green-600 bg-green-50 text-green-700 shadow-sm":"border-green-200 text-green-600 hover:border-green-400 bg-white"}`,children:"Design 1"}),s&&e.jsx("button",{onClick:()=>g("Letterhead"),className:`h-9 px-4 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${d==="Letterhead"?"border-blue-600 bg-blue-50 text-blue-700 shadow-sm":"border-blue-200 text-blue-600 hover:border-blue-400 bg-white"}`,children:"Letterhead"})]}),e.jsxs("div",{className:"relative",children:[e.jsx("input",{type:"file",id:"lh-upload",hidden:!0,accept:"application/pdf, .pdf, image/*",onChange:b}),e.jsx("label",{htmlFor:"lh-upload",className:"h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors",children:s?"Change Letterhead":"Upload Letterhead"})]}),e.jsxs("button",{onClick:S,disabled:!c,className:"h-9 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm",children:[e.jsx(ce,{size:16}),"Print / Save PDF"]}),e.jsxs("button",{onClick:T,className:"h-9 px-4 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm",children:[e.jsx(ce,{size:16,className:"text-blue-500"}),"Word"]})]})]})}),e.jsx("div",{className:"pt-20 bg-slate-100 w-full flex-grow overflow-auto",children:e.jsx("div",{className:"w-full flex flex-col items-center",children:c?(()=>{const h=N[d].component;return e.jsx(h,{ref:z,quotationData:c,letterheadImage:s})})():e.jsx("div",{className:"flex items-center justify-center h-96 text-gray-400 italic",children:"Preparing document preview..."})})})]})}const He=`
  @keyframes uploadBounce {
    0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
    50% { transform: translateY(25%); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
  }
  .upload-bounce-animation { animation: uploadBounce 0.6s ease-in-out; animation-iteration-count: 2; }
`,Ge=`
  .terms-content { 
    line-height: 1.8; 
    color: #000; 
    font-family: inherit; 
    word-break: normal; 
    overflow-wrap: anywhere; 
  }
  .terms-content p { margin-bottom: 12px; }
  .terms-content ul, .terms-content ol { padding-left: 25px; margin-bottom: 15px; }
  .terms-content li { margin-bottom: 6px; }
  .terms-content h1, .terms-content h2, .terms-content h3 { 
    margin-top: 20px; 
    margin-bottom: 10px; 
    font-weight: bold; 
    border-bottom: 1px solid #ddd;
    padding-bottom: 4px;
  }
  .terms-content table, 
  .terms-content table tr, 
  .terms-content table td, 
  .terms-content table th {
    border: 1px solid #000 !important;
  }
  .terms-content table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 20px 0 !important;
    border: 1.5px solid #000 !important;
    background-color: #fff !important;
  }
  .terms-content th, .terms-content td {
    padding: 10px 12px !important;
    vertical-align: top !important;
    text-align: left !important;
    min-width: 50px !important;
    color: #000 !important;
  }
  .terms-content th {
    background-color: #f8f9fa !important;
    font-weight: bold !important;
  }
  .terms-content strong { font-weight: 700; color: #000; }
`;if(typeof document<"u"){const t="quotation-form-styles";let x=document.getElementById(t);x||(x=document.createElement("style"),x.id=t,document.head.appendChild(x)),x.textContent=He+Ge}function Je({initialData:t={},onSave:x,onBack:d,formTitle:g="",saveLabel:s="Save Changes",cancelLabel:p="Cancel",formType:y="quotation"}){var Y,J,F,u,R,O,L,M,ae,K,Z,ee;ue();const i=t||{},[c,N]=f.useState(()=>{const o=i.sections||[];if(o.length>0){const n=o.slice(0).map((a,l)=>({id:a.id||`page_${Date.now()}_${l}`,type:l===0&&!a.content?"structured":"text",heading:a.heading||"",content:a.content,is_locked:a.is_locked===!0||a.is_locked===1||String(a.is_locked)==="true"}));return n[0]={...n[0],type:"structured",headerText:i.header_text||i.headerText||"PROJECT PROPOSAL",date:se(i.quotation_date||i.date)||new Date().toISOString().split("T")[0],companyName:i.company_name||i.companyName||"",address:i.company_address||i.address||"",phone:i.company_phone||i.phone||"",email:i.company_email||i.email||"",logo:i.logo||"",businessName:i.business_name||"",remark:i.remark||"",is_locked:!1,quotation_number:i.quotation_number||""},n}try{const n=localStorage.getItem("selectedBusinessId");if(n){const a=localStorage.getItem(`ctq_template_${n}`);if(a){const l=JSON.parse(a);if(Array.isArray(l)&&l.length>0)return l[0]&&(l[0].date=new Date().toISOString().split("T")[0],l[0].is_locked=!1,l[0].companyName="",l[0].address="",l[0].phone="",l[0].email="",l[0].businessName="",l[0].logo="",l[0].quotation_number=""),l}}}catch(n){console.warn("Failed to load CTQ template from localStorage",n)}return[]}),[z,S]=f.useState(!1),[T,b]=f.useState(!1),[h,m]=f.useState(null),[j,k]=f.useState(!1),[w,E]=f.useState({}),v=(o,n)=>{N(a=>a.map((l,r)=>r===0?{...l,[o]:n}:l)),w[o]&&E(a=>{const l={...a};return delete l[o],l})};f.useEffect(()=>{(async()=>{var l;const n=(t==null?void 0:t.dbId)||(t==null?void 0:t.id),a=localStorage.getItem("selectedBusinessId");if(a)try{if(n){const r=await X.getById(n);if(r!=null&&r.success&&(r!=null&&r.data)){const C=r.data,q={id:`page_1_${Date.now()}`,type:"structured",headerText:C.header_text||"",date:se(C.quotation_date)||new Date().toISOString().split("T")[0],companyName:C.company_name||"",address:C.company_address||"",phone:C.company_phone||"",email:C.company_email||"",logo:C.logo||"",businessName:C.business_name||"",remark:C.remark||"",is_locked:!1,quotation_number:C.quotation_number||""},I=(C.sections||[]).map((D,$)=>({id:D.id||`temp_${Date.now()+$+1}`,type:"text",heading:D.heading||"",content:D.content,is_locked:!!D.is_locked}));N([q,...I])}}else{const r=await X.getByBusinessId(a);if(r!=null&&r.success&&(r!=null&&r.data)&&Array.isArray(r.data)){const C=r.data.find(I=>I.is_metadata_locked==1||I.is_metadata_locked===!0),q=new Map;if(r.data.slice().reverse().forEach(I=>{I.sections&&Array.isArray(I.sections)&&I.sections.forEach(D=>{(D.is_locked==1||D.is_locked===!0)&&q.set(D.heading||"Untitled Page",{type:"text",heading:D.heading,content:D.content,is_locked:!0})})}),C||q.size>0){const I=C||r.data[0],D=I.is_metadata_locked==1||I.is_metadata_locked===!0,$={id:`page_1_${Date.now()}`,type:"structured",headerText:I.header_text||"QUOTATION",date:new Date().toISOString().split("T")[0],companyName:"",address:"",phone:"",email:"",logo:"",businessName:"",remark:"",is_locked:!1,quotation_number:""},Q=Array.from(q.values()).map((U,je)=>({...U,id:`default_${Date.now()+je}`})),V=[$,...Q];try{const U=await X.getNextNumber(a);U!=null&&U.success&&((l=U==null?void 0:U.data)!=null&&l.quotation_number)&&(V[0].quotation_number=U.data.quotation_number)}catch{}N(V),localStorage.setItem(`ctq_template_${a}`,JSON.stringify(V))}else N(I=>I.length>0?I:[{id:`blank_cover_${Date.now()}`,type:"structured",headerText:"PROJECT PROPOSAL",date:new Date().toISOString().split("T")[0],companyName:"",address:"",phone:"",email:"",logo:"",businessName:"",remark:"",is_locked:!1,quotation_number:""}])}else N(C=>C.length>0?C:[{id:`page_1_${Date.now()}`,type:"structured",headerText:"TAX QUOTATION",date:new Date().toISOString().split("T",1)[0],is_locked:!1,quotation_number:""}])}}catch(r){console.error("Error fetching custom quotation setup:",r)}})()},[t==null?void 0:t.id,t==null?void 0:t.dbId]),f.useEffect(()=>{const o=localStorage.getItem("selectedBusinessId"),n=!(t!=null&&t.id||t!=null&&t.dbId);o&&n&&X.getNextNumber(o).then(a=>{var l;a!=null&&a.success&&((l=a.data)!=null&&l.quotation_number)&&N(r=>r.length===0?r:r.map((C,q)=>q===0?{...C,quotation_number:a.data.quotation_number}:C))}).catch(a=>console.error("Error fetching next number:",a))},[t==null?void 0:t.id,t==null?void 0:t.dbId]);const P=o=>{N(n=>n.map(a=>a.id===o?{...a,is_locked:!a.is_locked}:a))},B=async()=>{var l;const o=localStorage.getItem("selectedBusinessId");let n="";if(o)try{const r=await X.getNextNumber(o);r!=null&&r.success&&((l=r==null?void 0:r.data)!=null&&l.quotation_number)&&(n=r.data.quotation_number)}catch(r){console.error("Error fetching next number:",r)}const a={id:`page_1_${Date.now()}`,type:"structured",headerText:i.headerText||"TAX QUOTATION",date:se(i.quotation_date||i.date)||new Date().toISOString().split("T")[0],companyName:i.companyName||"",address:i.address||"",phone:i.phone||"",email:i.email||"",logo:i.logo||"",businessName:i.businessName||"",remark:i.remark||"",is_locked:!1,quotation_number:n};N([a])},_=o=>{const n=o.target.files[0];if(n){if(n.size>500*1024){W("Logo size should be less than 500KB");return}const a=new FileReader;a.onloadend=()=>{const l=[...c];l[0]={...l[0],logo:a.result},N(l)},a.readAsDataURL(n)}},A=()=>{m("new"),S(!0)},H=o=>{N(n=>n.filter(a=>a.id!==o))},G=async o=>{var q,I,D;o.preventDefault();const n=c[0],a={};if((q=n.headerText)!=null&&q.trim()||(a.headerText="Quotation Title is required"),(I=n.companyName)!=null&&I.trim()||(a.companyName="Prepared By is required"),(D=n.phone)!=null&&D.trim()||(a.phone="Contact / Email is required"),Object.keys(a).length>0){E(a),W("Please fill in all required fields");return}E({});const l=localStorage.getItem("selectedBusinessId")||"1",r={business_id:l,quotation_number:n.quotation_number,header_text:n.headerText,quotation_date:n.date,company_name:n.companyName,company_address:n.address,company_phone:n.phone,company_email:n.email,logo:n.logo,business_name:n.businessName,remark:n.remark,total_amount:i.total_amount||0,is_metadata_locked:n.is_locked,sections:c.slice(1).map(($,Q)=>({section_order:Q+1,heading:$.heading,content:$.content,is_locked:$.is_locked})),status:"Saved"},C=i.dbId||i.id;try{k(!0);let $;if(C?$=await X.update(C,r):$=await X.create(r),$.success){const Q=[{...c[0],quotation_number:"",date:""},...c.slice(1).filter(V=>V.is_locked)];localStorage.setItem(`ctq_template_${l}`,JSON.stringify(Q)),de("Custom Quotation saved successfully"),x&&x($.data||r)}else throw new Error($.message||"Failed to save");k(!1)}catch($){const Q=($==null?void 0:$.message)||"Could not save";Q.toLowerCase().includes("already exists")&&Q.toLowerCase().includes("quotation number")?(E(V=>({...V,quotation_number:Q})),W("Duplicate quotation number found")):Oe({title:"Save failed",text:Q}),k(!1)}};return e.jsxs("div",{className:"min-h-screen mt-4 px-1 sm:px-2 py-4",children:[e.jsxs("div",{className:"w-full max-w-none px-2 sm:px-4",children:[e.jsxs("div",{className:"bg-white border border-gray-300 text-yellow-900 rounded-[7px] mb-4 p-4 flex items-center justify-between shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{type:"button",onClick:d,className:"text-yellow-900 hover:text-green-700 transition-all p-1 rounded-full hover:bg-yellow-50",title:"Back",children:e.jsx(re,{className:"w-6 h-6"})}),e.jsx("h3",{className:"text-xl font-bold",children:g})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{type:"button",onClick:d,className:"bg-red-600 text-white px-5 h-[34px] rounded-[7px] text-xs font-medium hover:bg-red-700 transition-colors",disabled:j,children:p}),e.jsx("button",{type:"submit",form:"termsForm",className:"bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white px-6 h-[34px] rounded-[7px] text-xs font-bold shadow-md transition-all hover:scale-[1.02]",disabled:j,children:j?"Saving...":"Save Document"})]})]}),e.jsxs("form",{id:"termsForm",onSubmit:G,className:"space-y-6 pb-28",children:[e.jsxs("div",{className:"grid grid-cols-1 gap-6",children:[c.map((o,n)=>e.jsxs("div",{className:"bg-white border border-yellow-200 rounded-[7px] overflow-hidden shadow-sm",children:[e.jsxs("div",{className:"border-b border-yellow-100 bg-yellow-50/10 px-3 py-1 flex items-center justify-between",children:[e.jsx("div",{className:"flex items-center gap-3",children:e.jsx("span",{className:"text-sm font-semibold text-yellow-900",children:n===0?"Cover Page":o.heading||`Page ${n+1}`})}),e.jsxs("div",{className:"flex items-center gap-2",children:[o.type!=="structured"&&e.jsx("button",{type:"button",onClick:()=>{m(o.id),S(!0)},className:"w-7 h-7 rounded-md flex items-center justify-center bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 transition-all shadow-sm",title:"Edit Page Content",disabled:o.is_locked,children:e.jsx(Se,{size:13,strokeWidth:2.5})}),n!==0&&e.jsx("button",{type:"button",onClick:()=>P(o.id),className:`w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm ${o.is_locked?"bg-red-600 text-white border-red-700 hover:bg-red-700":"bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"}`,title:o.is_locked?"Unlock Page":"Lock Page",children:o.is_locked?e.jsx(Te,{size:13,strokeWidth:2}):e.jsx(Ce,{size:13,strokeWidth:2})}),o.type!=="structured"&&e.jsx("button",{type:"button",onClick:()=>H(o.id),disabled:o.is_locked,className:`w-7 h-7 rounded-md flex items-center justify-center transition-all shadow-sm ${o.is_locked?"bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed":"bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"}`,title:o.is_locked?"Cannot delete locked page":"Delete Page",children:e.jsx(pe,{size:13,strokeWidth:2.5})})]})]}),e.jsx("div",{className:"p-3",children:o.type==="structured"?e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-yellow-50 pb-4",children:[e.jsxs("div",{className:"flex flex-col gap-1.5",children:[e.jsx("label",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1",children:"Business Logo"}),e.jsxs("div",{className:"flex items-center gap-3 h-10",children:[o.logo?e.jsx("div",{className:"w-10 h-10 rounded-lg border border-emerald-100 overflow-hidden bg-white shadow-sm flex-shrink-0",children:e.jsx("img",{src:o.logo,alt:"Logo",className:"w-full h-full object-contain"})}):e.jsx("div",{className:"w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0",children:e.jsx(te,{size:16,className:"text-gray-300"})}),e.jsxs("label",{className:"flex-grow h-full border-2 border-dashed border-emerald-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-4",children:[o.logo?"Change Logo":"Upload Logo",e.jsx("input",{type:"file",className:"hidden",accept:"image/*",onChange:_})]}),o.logo&&e.jsx("button",{type:"button",onClick:()=>v("logo",""),className:"w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors border border-red-100",children:e.jsx(pe,{size:16})})]})]}),e.jsxs("div",{className:"flex flex-col gap-1.5",children:[e.jsxs("label",{className:"text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1",children:["Proposal Title ",e.jsx("span",{className:"text-red-500",children:"*"})]}),e.jsx("input",{type:"text",value:o.headerText,onChange:a=>v("headerText",a.target.value),className:`w-full h-10 px-3 bg-white border-2 rounded-[7px] focus:border-[#129046] outline-none transition-all font-bold text-yellow-900 ${w.headerText?"border-red-500":"border-gray-200"}`,placeholder:"PROJECT PROPOSAL",disabled:o.is_locked}),w.headerText&&e.jsx("p",{className:"text-[10px] text-red-500 mt-0.5 ml-1 font-medium",children:w.headerText})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1",children:"Quotation No."}),e.jsx("input",{type:"text",value:o.quotation_number,onChange:a=>{v("quotation_number",a.target.value),w.quotation_number&&E(l=>{const r={...l};return delete r.quotation_number,r})},className:`w-full h-10 px-3 bg-white border-2 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900 ${w.quotation_number?"border-red-500":"border-gray-200"}`,placeholder:"CTQ-2024-25-0001",disabled:o.is_locked}),w.quotation_number&&e.jsx("p",{className:"text-[10px] text-red-500 mt-0.5 ml-1 font-medium",children:w.quotation_number})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1",children:"Date"}),e.jsx("input",{type:"date",value:o.date,onChange:a=>v("date",a.target.value),className:"w-full h-10 px-3 bg-white border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900",disabled:o.is_locked})]}),e.jsxs("div",{className:"flex flex-col gap-1.5",children:[e.jsx("label",{className:"text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1",children:"Company Name"}),e.jsx("input",{type:"text",value:o.businessName,onChange:a=>v("businessName",a.target.value),className:"w-full h-10 px-3 border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900",placeholder:"e.g. Acme Corp",disabled:o.is_locked})]}),e.jsxs("div",{className:"flex flex-col gap-1.5",children:[e.jsxs("label",{className:"text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1",children:["Prepared By ",e.jsx("span",{className:"text-red-500",children:"*"})]}),e.jsx("input",{type:"text",value:o.companyName,onChange:a=>v("companyName",a.target.value),className:`w-full h-10 px-3 border-2 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900 ${w.companyName?"border-red-500":"border-gray-200"}`,placeholder:"e.g. Naomi David",disabled:o.is_locked}),w.companyName&&e.jsx("p",{className:"text-[10px] text-red-500 mt-0.5 ml-1 font-medium",children:w.companyName})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1",children:"Proposal For"}),e.jsx("input",{type:"text",value:o.email,onChange:a=>v("email",a.target.value),className:"w-full h-10 px-3 border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900",placeholder:"Client Name",disabled:o.is_locked})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1",children:"Contact / Email"}),e.jsx("input",{type:"text",value:o.phone,onChange:a=>v("phone",a.target.value),className:`w-full h-10 px-3 border-2 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900 ${w.phone?"border-red-500":"border-gray-200"}`,placeholder:"Contact Info",disabled:o.is_locked}),w.phone&&e.jsx("p",{className:"text-[10px] text-red-500 mt-0.5 ml-1 font-medium",children:w.phone})]}),e.jsxs("div",{className:"md:col-span-2",children:[e.jsx("label",{className:"block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1",children:"Website / Address"}),e.jsx("input",{type:"text",value:o.address,onChange:a=>v("address",a.target.value),className:"w-full h-10 px-3 border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900",placeholder:"www.website.com",disabled:o.is_locked})]}),e.jsxs("div",{className:"md:col-span-2",children:[e.jsx("label",{className:"block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1",children:"Remark"}),e.jsx("textarea",{value:o.remark,onChange:a=>v("remark",a.target.value),className:"w-full h-20 px-3 py-2 border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900",placeholder:"Additional notes...",disabled:o.is_locked})]})]})]}):e.jsx("div",{className:`min-h-[50px] max-h-[100px] overflow-y-auto px-4 py-3 rounded-[7px] border-2 transition-all terms-content ${o.is_locked?"bg-gray-50 opacity-60 border-gray-200":"bg-white border-yellow-50 shadow-inner"}`,dangerouslySetInnerHTML:{__html:oe.sanitize(o.content||'<p class="text-gray-400 italic text-center">No content added yet.</p>')}})})]},o.id)),c.length===0&&e.jsx("div",{className:"flex flex-col items-center justify-center py-16 bg-white border-2 border-dashed border-yellow-200 rounded-[7px] text-yellow-900 shadow-md",children:e.jsxs("button",{type:"button",onClick:B,className:"group flex flex-col items-center gap-4 transition-all hover:scale-105",children:[e.jsx("div",{className:"w-14 h-14 bg-yellow-900 text-white rounded-full flex items-center justify-center shadow-lg group-hover:bg-yellow-800 transition-colors",children:e.jsx(te,{size:28,strokeWidth:2.5})}),e.jsx("h4",{className:"text-sm font-bold uppercase tracking-wide",children:"Add Cover Page"})]})})]}),c.length>0&&e.jsx("div",{className:"flex justify-center py-6",children:e.jsxs("button",{type:"button",onClick:A,className:"group flex items-center gap-2 bg-white text-yellow-900 font-bold px-6 py-2 rounded-xl border-2 border-dashed border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all active:scale-95 shadow-sm",children:[e.jsx("div",{className:"w-6 h-6 bg-yellow-900 text-white rounded-full flex items-center justify-center transition-transform group-hover:rotate-90",children:e.jsx(te,{size:16,strokeWidth:3})}),e.jsx("span",{className:"text-sm",children:"Add New Page"})]})}),c.length>=4&&e.jsxs("div",{className:"bg-white border border-yellow-200 p-4 flex justify-end gap-3 mt-12 rounded-[7px] shadow-sm mb-20",children:[e.jsx("button",{type:"button",onClick:d,className:"bg-red-600 text-white px-6 h-9 rounded-[7px] text-xs font-bold hover:bg-red-700 transition-colors",disabled:j,children:p}),e.jsx("button",{type:"submit",form:"termsForm",className:"bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white px-8 h-9 rounded-[7px] text-xs font-bold shadow-md hover:scale-[1.02]",disabled:j,children:j?"Saving...":"Save Document"})]})]})]}),e.jsx($e,{open:z,sectionId:h,initialContent:h&&((Y=c.find(o=>o.id===h))==null?void 0:Y.content)||"",initialHeading:h&&((J=c.find(o=>o.id===h))==null?void 0:J.heading)||"",onClose:()=>{S(!1),m(null)},onSave:(o,n,a)=>{if(h==="new"){const l={id:a||`temp_${Date.now()}`,type:"text",heading:n||`Page ${c.length+1}`,content:o,is_locked:!1};N(r=>[...r,l])}else N(l=>l.map(r=>r.id===h?{...r,id:a||r.id,content:o,heading:n}:r));S(!1),m(null)}}),T&&e.jsx("div",{className:"fixed inset-0 z-[100] bg-white overflow-hidden flex flex-col",children:e.jsx(ve,{onBack:()=>b(!1),quotation:{id:"PREVIEW-MODE",quotation_number:((F=c[0])==null?void 0:F.quotation_number)||"CTQ-XXXX",quotation_date:((u=c[0])==null?void 0:u.date)||new Date().toISOString(),header_text:((R=c[0])==null?void 0:R.headerText)||"PROJECT PROPOSAL",company_name:((O=c[0])==null?void 0:O.companyName)||"Your Name",company_email:((L=c[0])==null?void 0:L.email)||"Proposal By",company_phone:((M=c[0])==null?void 0:M.phone)||"Contact Info",company_address:((ae=c[0])==null?void 0:ae.address)||"www.yourwebsite.com",logo:((K=c[0])==null?void 0:K.logo)||"",business_name:((Z=c[0])==null?void 0:Z.businessName)||"",remark:((ee=c[0])==null?void 0:ee.remark)||"",total_amount:0,sections:c.slice(1).map((o,n)=>({section_order:n+1,heading:o.heading,content:o.content}))}})})]})}const{quotationAPI:Ye,businessAPI:Ke,partyAPI:Ze,termsConditionsAPI:et,customQuotationAPI:ge,getApiConfig:tt}=fe,Ne=[{label:"Show All",value:"all"},{label:"Show Open",value:"open"},{label:"Show Closed",value:"closed"}],ot=()=>{const t=ue(),[x,d]=f.useState("list"),[g,s]=f.useState([]),[p,y]=f.useState(!1),i=localStorage.getItem("selectedBusinessId")||"1",c=async()=>{try{y(!0);const u=await ge.getByBusinessId(i);u.success&&s(u.data||[])}catch(u){console.error("Error fetching custom quotations:",u),W("Failed to fetch custom quotations")}finally{y(!1)}},[N,z]=f.useState(""),[S,T]=f.useState("All Dates"),[b,h]=f.useState({from:"",to:""}),[m,j]=f.useState(Ne[0]),[k,w]=f.useState(null),[E,v]=f.useState(!1),[P,B]=f.useState(null),[_,A]=f.useState(null);f.useEffect(()=>{c()},[i]);const H=f.useMemo(()=>{const u=N.trim().toLowerCase(),R=Le(S,b);return g.filter(O=>{var K,Z,ee,o,n;let L=!0;if(R&&(R.start||R.end)){const a=new Date(String(O.quotation_date).split("T")[0]+"T00:00:00"),l=R.start?new Date(R.start):null,r=R.end?new Date(R.end):null;l&&l.setHours(0,0,0,0),r&&r.setHours(23,59,59,999),l&&r?L=a>=l&&a<=r:l?L=a>=l:r&&(L=a<=r)}const M=m.value==="all"?!0:O.status===m.value,ae=!u||((K=O.business_name)==null?void 0:K.toLowerCase().includes(u))||((Z=O.company_name)==null?void 0:Z.toLowerCase().includes(u))||((ee=O.quotation_number)==null?void 0:ee.toLowerCase().includes(u))||((o=O.company_email)==null?void 0:o.toLowerCase().includes(u))||((n=O.company_phone)==null?void 0:n.toLowerCase().includes(u));return L&&M&&ae})},[g,N,m,S,b]),G=[{key:"quotation_number",title:"Quotation#",sortable:!0},{key:"quotation_date",title:"Date",sortable:!0,render:u=>Me(u.quotation_date)},{key:"business_name",title:"Company Name",sortable:!0},{key:"company_email",title:"Proposal For",sortable:!0},{key:"company_phone",title:"Contact / Email",sortable:!0},{key:"company_name",title:"Prepared By",sortable:!0}],Y=u=>{w(u),d("edit")},J=u=>{B(u),v(!0)},F=async()=>{if(P)try{(await ge.delete(P.id)).success&&(de(`${P.quotation_number||"Custom Quotation"} deleted successfully`),c()),v(!1),B(null)}catch{W("Failed to delete quotation")}};return x==="preview"&&_?e.jsx(ve,{quotation:_,onBack:()=>{d("list"),A(null)}}):x==="create"||x==="edit"?e.jsx(Je,{onBack:()=>{d("list"),w(null)},formType:"custom",initialData:k,onSave:()=>{c(),w(null),d("list")},formTitle:x==="edit"?"Update Custom Proposal":"Create Custom Proposal"}):p?e.jsx(De,{message:"Loading Custom Proposals..."}):e.jsxs("div",{className:"custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4",children:[e.jsx("div",{className:"bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50",children:e.jsxs("div",{className:"w-full",children:[e.jsxs("div",{className:"md:hidden flex flex-col space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between w-full",children:[e.jsxs("button",{onClick:()=>t("/dashboard"),className:"group flex items-center gap-2 px-2 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0 !text-[10px]",title:"Back",children:[e.jsx(re,{className:"w-3 h-3 text-yellow-900 group-hover:text-green-700"}),e.jsx("span",{className:"text-[10px] font-semibold text-yellow-900 group-hover:text-green-700",children:"Back to Dashboard"})]}),e.jsxs("button",{onClick:()=>d("create"),className:"bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5","aria-label":"Create new",children:[e.jsx(te,{size:18}),"New"]})]}),e.jsx("input",{value:N,onChange:u=>z(u.target.value),placeholder:"Search by Name","aria-label":"Search",className:"w-full h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"}),e.jsx("div",{className:"flex items-center gap-2 w-full justify-end",children:e.jsx(me,{dateRangeLabel:S,onRangeChange:u=>T(u),customRange:b,onRangeApply:u=>{h(u),T("Custom Date Range")}})})]}),e.jsxs("div",{className:"hidden md:flex md:flex-row md:items-center items-stretch gap-3 justify-between w-full",children:[e.jsxs("button",{onClick:()=>t("/dashboard"),className:"group flex items-center gap-2 px-3 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0",title:"Back to Dashboard",children:[e.jsx(re,{className:"w-4 h-4 text-yellow-900 group-hover:text-green-700"}),e.jsx("span",{className:"text-xs font-semibold text-yellow-900 group-hover:text-green-700",children:"Back to Dashboard"})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("input",{value:N,onChange:u=>z(u.target.value),placeholder:"Search by Name",className:"w-48 h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors","aria-label":"Search"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(me,{dateRangeLabel:S,onRangeChange:u=>T(u),customRange:b,onRangeApply:u=>{h(u),T("Custom Date Range")}}),e.jsxs("button",{onClick:()=>d("create"),className:"bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5","aria-label":"Create new",children:[e.jsx(te,{size:18}),"New"]})]})]})]})]})}),e.jsx("div",{className:"",children:!p&&g.length===0?e.jsx(Fe,{title:"No Custom Quotations Found",description:"You haven't created any custom quotations yet. Start by creating your first custom quotation to manage professional quotes.",buttonText:"Create First Custom Quotation",onButtonClick:()=>d("create"),icon:Ee}):e.jsx(Re,{columns:G,data:H,onSearch:z,loading:p,onRowClick:u=>{A(u),d("preview")},onEdit:Y,onDelete:J,rowKey:"id"})}),e.jsx(Be,{isOpen:E,onClose:()=>v(!1),onConfirm:F,title:"Delete Custom Quotation",itemName:P==null?void 0:P.quotation_number,itemType:"quotation"})]})};Ne.map((t,x)=>({id:t.value,label:t.label,value:t.value}));export{ot as default};
