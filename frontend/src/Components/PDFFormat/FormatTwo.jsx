// ============================================================
// FormatTwo.jsx — Complete PDF Generator (Professional Overhaul)
// ============================================================

import React, { useState, useEffect } from "react";
import { DOCUMENT_TYPES } from "./documentTypeConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────────────────────────────────
// numberToWords — Indian numbering system
// ─────────────────────────────────────────────
function numberToWords(num) {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const w = (n) =>
    n < 20 ? a[n]
      : n < 100 ? b[~~(n / 10)] + " " + a[n % 10]
        : n < 1e3 ? a[~~(n / 100)] + " Hundred " + w(n % 100)
          : n < 1e5 ? w(~~(n / 1e3)) + " Thousand " + w(n % 1e3)
            : n < 1e7 ? w(~~(n / 1e5)) + " Lakh " + w(n % 1e5)
              : w(~~(n / 1e7)) + " Crore " + w(n % 1e7);
  return w(num).trim() + " Only";
}

// ─────────────────────────────────────────────
// getBase64Image — Robust image loader
// ─────────────────────────────────────────────
const getBase64Image = async (url, label = "Image") => {
  if (!url) return null;
  let cleanUrl = typeof url === 'string' ? url : (url.url || '');
  if (!cleanUrl) return null;

  const dataMatch = cleanUrl.match(/data:image\/[^;]+;base64,[^"']+/);
  if (dataMatch) cleanUrl = dataMatch[0];
  else if (cleanUrl.includes('data:')) cleanUrl = cleanUrl.substring(cleanUrl.indexOf('data:'));

  if (cleanUrl.startsWith('data:')) return cleanUrl;

  try {
    const response = await fetch(cleanUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
};

// ─────────────────────────────────────────────
// renderHTMLToPDF — Specialized HTML renderer
// ─────────────────────────────────────────────
function renderHTMLToPDF(doc, html, x, startY, maxWidth, defaultLineHeight, pageBreakCallback) {
  if (!html) return startY;
  let curX = x;
  let curY = startY;
  let lineBottomY = startY - 4;
  let pendingMarker = null;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  let currentFont = { name: "helvetica", style: "normal", size: 8, isUnderline: false, isStrike: false, color: [0, 0, 0], align: 'left' };

  const applyFont = (f) => {
    doc.setFont(f.name, f.style);
    doc.setFontSize(f.size);
    doc.setTextColor(f.color[0], f.color[1], f.color[2]);
  };

  const newLine = (spacing = 1, forceIndent = null) => {
    lineBottomY = curY + spacing;
    if (forceIndent !== null) curX = forceIndent;
  };

  const drawTextWrapped = (text, indentX) => {
    if (!text) return;
    const clean = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "");
    if (!clean.trim()) return;

    applyFont(currentFont);
    let remaining = clean;
    while (remaining.length > 0) {
      let available = x + maxWidth - curX;
      if (available < 10) { newLine(1.2, indentX); available = x + maxWidth - curX; }

      const lines = doc.splitTextToSize(remaining, available);
      const first = lines[0];
      const lineHeight = currentFont.size * 0.38;
      const neededY = lineBottomY + lineHeight;

      if (curY < neededY) {
        curY = neededY;
        if (curY > 275) {
          if (pageBreakCallback) pageBreakCallback();
          curY = 25; lineBottomY = 21;
        }
      }

      applyFont(currentFont);
      let drawX = curX;
      const textW = doc.getTextWidth(first);
      const rowW = x + maxWidth - indentX;
      if (currentFont.align === 'center' && curX === indentX) drawX = indentX + (rowW - textW) / 2;
      else if (currentFont.align === 'right' && curX === indentX) drawX = indentX + (rowW - textW);

      if (pendingMarker) {
        if (pendingMarker.type === 'text') doc.text(pendingMarker.prefix, pendingMarker.x, curY);
        else {
          doc.setFillColor(0, 0, 0);
          const mSz = currentFont.size * 0.06;
          const mY = curY - currentFont.size * 0.12;
          if (pendingMarker.depth === 1) doc.circle(pendingMarker.x + 4, mY, mSz * 0.8, "D");
          else if (pendingMarker.depth >= 2) doc.rect(pendingMarker.x + 3.5, mY - mSz / 2, mSz, mSz, "F");
          else doc.circle(pendingMarker.x + 4, mY, mSz, "F");
        }
        pendingMarker = null;
      }

      doc.text(first, drawX, curY);
      if (currentFont.isUnderline) { doc.setLineWidth(0.2); doc.line(drawX, curY + 0.5, drawX + textW, curY + 0.5); }
      if (currentFont.isStrike) { doc.setLineWidth(0.2); doc.line(drawX, curY - currentFont.size * 0.15, drawX + textW, curY - currentFont.size * 0.15); }

      if (lines.length > 1) {
        newLine(1.2, indentX);
        remaining = remaining.substring(first.length).trimStart();
      } else {
        curX += textW;
        remaining = "";
      }
    }
  };

  const blockTags = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TR'];

  const processNodes = (node, iX) => {
    const isBlock = blockTags.includes(node.nodeName);

    if (node.nodeName === 'BR') { newLine(1.2, iX); return; }

    if (isBlock) {
      if (curX > iX && curX < iX + 10) lineBottomY += 0.5;
      else if (curX > iX) newLine(1.5, iX);
      else lineBottomY += 1.5;

      if (node.nodeName.startsWith('H')) {
        const n = parseInt(node.nodeName[1]);
        currentFont.size = 14 - n * 1.2;
        currentFont.style = "bold";
      }
    }

    if (node.nodeName === 'TABLE') {
      if (curX > iX) newLine(2, iX);
      const tableY = Math.max(curY, lineBottomY + 2);
      autoTable(doc, {
        html: node, startY: tableY, theme: 'grid',
        margin: { left: iX, right: 14 },
        styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
      });
      curY = doc.lastAutoTable.finalY; lineBottomY = curY + 3; curX = iX; return;
    }

    if (node.nodeName === 'UL' || node.nodeName === 'OL') {
      let listDepth = parseInt(node.getAttribute("data-depth")) || 0;
      let childIdx = 1;
      if (curX > iX) newLine(1.5, iX);

      node.childNodes.forEach(child => {
        if (child.nodeName === 'LI') {
          if (curX > iX) newLine(1.2, iX);
          const lineHeight = currentFont.size * 0.38;
          if (lineBottomY + lineHeight > curY) curY = lineBottomY + lineHeight;
          if (curY > 275) { if (pageBreakCallback) pageBreakCallback(); curY = 25; lineBottomY = 21; }
          applyFont(currentFont);
          const itemBaselineY = curY;
          lineBottomY = itemBaselineY - lineHeight;

          if (node.nodeName === 'OL') {
            pendingMarker = { type: 'text', prefix: `${childIdx}. `, x: iX + 2 };
          } else {
            pendingMarker = { type: 'bullet', depth: listDepth, x: iX };
          }
          curX = iX + 8; childIdx++;
          child.childNodes.forEach(n => {
            if (n.nodeName === 'UL' || n.nodeName === 'OL') n.setAttribute("data-depth", listDepth + 1);
            processNodes(n, iX + 8);
          });
          if (curY > itemBaselineY) lineBottomY = curY - lineHeight;
          else lineBottomY = itemBaselineY;
        }
      });
      if (curX > iX) newLine(1.5, iX);
      return;
    }

    if (node.nodeType === 3) {
      drawTextWrapped(node.textContent, iX);
    } else {
      const savedFont = { ...currentFont };
      if (node.nodeName === 'STRONG' || node.nodeName === 'B') currentFont.style = currentFont.style.includes("italic") ? "bolditalic" : "bold";
      if (node.nodeName === 'EM' || node.nodeName === 'I') currentFont.style = currentFont.style.includes("bold") ? "bolditalic" : "italic";
      if (node.nodeName === 'U') currentFont.isUnderline = true;
      if (node.nodeName === 'S' || node.nodeName === 'STRIKE' || node.nodeName === 'DEL') currentFont.isStrike = true;

      if (node.style) {
        if (node.style.textAlign) currentFont.align = node.style.textAlign;
        if (node.style.fontWeight === 'bold' || parseInt(node.style.fontWeight) >= 600) currentFont.style = currentFont.style.includes("italic") ? "bolditalic" : "bold";
        if (node.style.fontStyle === 'italic') currentFont.style = currentFont.style.includes("bold") ? "bolditalic" : "italic";
        if (node.style.fontSize) { const px = parseInt(node.style.fontSize); if (px) currentFont.size = Math.max(7, px * 0.5); }
        if (node.style.color) { const rgb = node.style.color.match(/\d+/g); if (rgb?.length >= 3) currentFont.color = [+rgb[0], +rgb[1], +rgb[2]]; }
        const rawStyle = node.getAttribute?.('style') || '';
        const tdValue = node.style.textDecoration || (rawStyle.match(/text-decoration\s*:\s*([^;]+)/i)?.[1] || '');
        if (tdValue.includes('underline')) currentFont.isUnderline = true;
        if (tdValue.includes('line-through')) currentFont.isStrike = true;
      }
      node.childNodes.forEach(n => {
        if (n.nodeName === 'UL' || n.nodeName === 'OL') n.setAttribute("data-depth", parseInt(node.getAttribute("data-depth") || 0) + 1);
        processNodes(n, iX);
      });
      currentFont = savedFont;
    }

    if (isBlock) {
      if (curX > iX) newLine(1.5, iX);
      else lineBottomY += 1.5;
      if (node.nodeName.startsWith('H') || node.nodeName === 'P') {
        currentFont.style = "normal";
        currentFont.size = 8;
      }
    }
  };

  processNodes(tempDiv, x);
  return curY + 5;
}

async function buildPDF(data) {
  const doc = new jsPDF("p", "mm", "a4");
  const F = "helvetica";
  const docNo = data.quotation?.number || data.invoice_number || data.po_number || "Document";
  doc.setProperties({ title: docNo });

  // Standardize Global Border Style
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  const sym = data.activeCurrency || "INR";
  const PW = 210, PH = 297, ML = 14, MR = 14, sigSpace = 32;
  const addNewPage = () => { doc.addPage(); y = 15; };


  const sf = (style = "normal", size = 9) => {
    doc.setFont(F, style);
    doc.setFontSize(size);
  };

  const fmt = (v, showSym = true) => {
    const val = Number(v || 0).toLocaleString(data.activeCurrency === "NPR" ? "en-US" : "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace(/\s/g, '');

    if (!showSym) return val;
    const displaySym = (sym === "₹" || data.activeCurrency === "INR") ? "INR" : sym;
    return `${displaySym} ${val}`;
  };

  // Helper to format address safely without duplicating city, state, pin, or country
  const formatAddressSafe = (addrStr, line2, city, state, pin, country) => {
    const parts = [];
    if (addrStr) parts.push(addrStr.trim());
    if (line2) {
      const l2 = line2.trim();
      if (!addrStr.toLowerCase().includes(l2.toLowerCase())) parts.push(l2);
    }
    if (city) {
      const c = city.trim();
      if (!addrStr.toLowerCase().includes(c.toLowerCase())) parts.push(c);
    }
    if (state) {
      const s = state.trim();
      if (!addrStr.toLowerCase().includes(s.toLowerCase())) parts.push(s);
    }
    if (pin) {
      const p = String(pin).trim();
      if (!addrStr.toLowerCase().includes(p.toLowerCase())) parts.push(p);
    }
    if (country) {
      const co = country.trim();
      if (!addrStr.toLowerCase().includes(co.toLowerCase())) parts.push(co);
    }
    return parts.filter(Boolean).join(", ");
  };

  // ── Pre-load all images ──
  const [logoB64, productImages, bankQR, stampB64, sigB64, einvoiceQR] = await Promise.all([
    getBase64Image(data.company?.logo?.url || data.company?.logoUrl || data.company?.logo, "Logo"),
    Promise.all(data.products.map(async (p, i) => ({
      id: p.srNo || i + 1,
      b64: await getBase64Image(p.image_url || p.image, `Product ${i + 1}`)
    }))),
    getBase64Image(data.bank?.qr_code, "Bank QR"),
    getBase64Image(data.company?.stampUrl || data.company?.stamp?.url, "Stamp"),
    getBase64Image(data.company?.signatureUrl || data.quotation?.signatureUrl || data.company?.signature?.url, "Signature"),
    data.einvoice?.signed_qr_code
      ? getBase64Image(
        `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.einvoice.signed_qr_code)}&size=100x100`,
        "E-Invoice QR"
      )
      : Promise.resolve(null)
  ]);
  const imgMap = productImages.reduce((a, c) => { a[c.id] = c.b64; return a; }, {});

  // ══════════════════════════════════════════
  // SECTION 1: HEADER (LOGO & INFO)
  // ══════════════════════════════════════════
  const headerBoxY = 8;
  const busName = (data.company?.name || data.company_name || data.companyName || data.business_name).toUpperCase();
  const busNameLines = doc.splitTextToSize(busName, 125);
  const busTaxLabel = data.company?.businessTypeLabel || "GSTIN";
  const addrParts = [];
  if (data.company?.addressLines) addrParts.push(data.company.addressLines);
  if (data.company?.gstin) addrParts.push(`${busTaxLabel}: ${data.company.gstin}`);
  if (data.company?.tel) addrParts.push(`Phone: ${data.company.tel}`);
  if (data.company?.email) addrParts.push(`Email: ${data.company.email}`);
  if (data.company?.website) addrParts.push(`Website: ${data.company.website}`);
  const addrText = addrParts.join("\n");
  const addrLines = doc.splitTextToSize(addrText, 125);

  const contentH = (busNameLines.length * 5.5) + (addrLines.length * 4.2) + 12;
  const headerBoxH = Math.max(contentH, 38);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(ML, headerBoxY, PW - ML - MR, headerBoxH);

  if (logoB64) {
    try {
      const props = doc.getImageProperties(logoB64);
      const maxW = 40, maxH = 28;
      const ratio = props.width / props.height;
      let w = maxW, h = maxW / ratio;
      if (h > maxH) { h = maxH; w = maxH * ratio; }
      doc.addImage(logoB64, "PNG", ML + 2, headerBoxY + 4, w, h);
    } catch (e) { }
  }

  // Use dynamic X depending on logo presence
  const finalBusX = logoB64 ? ML + 50 : ML + 5;
  sf("bold", 12.5); doc.setTextColor(0, 0, 0);
  let busY = headerBoxY + 8;
  busNameLines.forEach(line => { doc.text(line, finalBusX, busY); busY += 5.5; });

  sf("normal", 8.2);
  doc.setTextColor(0, 0, 0);
  addrLines.forEach(line => { doc.text(line, finalBusX, busY); busY += 4.2; });

  const titleMap = {
    [DOCUMENT_TYPES.QUOTATION]: "QUOTATION",
    [DOCUMENT_TYPES.PROFORMA]: "PROFORMA INVOICE",
    [DOCUMENT_TYPES.SALES_INVOICE]: "TAX INVOICE",
    [DOCUMENT_TYPES.PURCHASE_ORDER]: "PURCHASE ORDER",
    [DOCUMENT_TYPES.DELIVERY_CHALLAN]: "DELIVERY CHALLAN",
    [DOCUMENT_TYPES.CREDIT_NOTE]: "CREDIT NOTE",
    [DOCUMENT_TYPES.DEBIT_NOTE]: "DEBIT NOTE",
    [DOCUMENT_TYPES.SALES_RETURN]: "SALES RETURN",
    [DOCUMENT_TYPES.PURCHASE_RETURN]: "PURCHASE RETURN",
    [DOCUMENT_TYPES.PURCHASE_INVOICE]: "BOOK PURCHASE ORDER",
    [DOCUMENT_TYPES.BOOK_INVOICE]: "BOOK INVOICE",
    [DOCUMENT_TYPES.EINVOICE]: "E-INVOICE",
    [DOCUMENT_TYPES.CUSTOM_QUOTATION]: "CUSTOM QUOTATION",
  };
  const DOC_LABEL = titleMap[data.documentType] || (data.documentType || "INVOICE").toUpperCase();
  sf("normal", 22);
  doc.setTextColor(0, 0, 0);
  doc.text(DOC_LABEL, PW - MR - 4, headerBoxY + headerBoxH - 3, { align: "right" });

  let y = headerBoxY + headerBoxH;

  // ══════════════════════════════════════════
  // SECTION 2: METADATA
  // ══════════════════════════════════════════
  const prefixMap = {
    [DOCUMENT_TYPES.QUOTATION]: "Quotation",
    [DOCUMENT_TYPES.PROFORMA]: "Proforma",
    [DOCUMENT_TYPES.SALES_INVOICE]: "Invoice",
    [DOCUMENT_TYPES.PURCHASE_ORDER]: "Order",
    [DOCUMENT_TYPES.DELIVERY_CHALLAN]: "Challan",
    [DOCUMENT_TYPES.CREDIT_NOTE]: "Credit Note",
    [DOCUMENT_TYPES.DEBIT_NOTE]: "Debit Note",
    [DOCUMENT_TYPES.SALES_RETURN]: "Return",
    [DOCUMENT_TYPES.PURCHASE_RETURN]: "Return",
    [DOCUMENT_TYPES.PURCHASE_INVOICE]: "Purchase",
    [DOCUMENT_TYPES.BOOK_INVOICE]: "Invoice",
    [DOCUMENT_TYPES.EINVOICE]: "E-Invoice",
    [DOCUMENT_TYPES.CUSTOM_QUOTATION]: "Quotation",
  };
  const prefix = prefixMap[data.documentType] || "Invoice";

  const metaItems = [
    { label: `${prefix} Number`, value: data.quotation?.number || data.invoice_number },
    { label: `${prefix} Date`, value: data.quotation?.date || data.invoice_date },
    { label: "Terms", value: data.totals?.paymentTerms ? `${data.totals.paymentTerms} Days` : null },
    { label: "Due Date", value: data.quotation?.dueDate },
    { label: "P.O/Aggr No", value: data.quotation?.po_agreement_number },
    { label: "Reference", value: data.quotation?.reference },
  ].filter(item => item.value);

  const metaRowH = 4.2;
  const metaH = (metaItems.length * metaRowH) + 4;
  const CX = PW / 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(ML, y, PW - ML - MR, metaH);
  doc.line(CX, y, CX, y + metaH);

  metaItems.forEach((item, i) => {
    const rowY = y + 5.5 + (i * metaRowH);
    const colX = ML + 4;
    const labelW = 38;

    sf("normal", 9); doc.setTextColor(0, 0, 0);
    doc.text(item.label, colX, rowY);
    doc.text(":", colX + labelW, rowY);
    sf("bold", 8.5); doc.setTextColor(0, 0, 0);
    doc.text(String(item.value), colX + labelW + 4, rowY);
  });

  y += metaH;

  // ══════════════════════════════════════════
  // SECTION 3: BILL / SHIP TO
  // ══════════════════════════════════════════
  // Helper to split text with word-breaking for long strings
  const safeSplit = (text, width) => {
    if (!text) return [];
    const lines = doc.splitTextToSize(String(text), width);
    const result = [];
    lines.forEach(line => {
      if (doc.getTextWidth(line) > width + 0.5) {
        let current = "";
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (doc.getTextWidth(current + char) > width) {
            result.push(current);
            current = char;
          } else {
            current += char;
          }
        }
        if (current) result.push(current);
      } else {
        result.push(line);
      }
    });
    return result;
  };

  // Helper to extract values from all possible locations (top-level, meta, invoice_data, quotation_data)

  const getV = (field) => {
    return data[field] ||
      data.meta?.[field] ||
      data.invoice_data?.[field] ||
      data.quotation_data?.[field] ||
      data.shipping?.[field] ||
      data.shipping_party?.[field] ||
      data.customer?.[field] || "";
  };

  // ══════════════════════════════════════════
  // BILL TO: Logic & Formatting
  // ══════════════════════════════════════════
  const boxW = (PW - ML - MR) / 2;
  const textWrapW = boxW - 8;

  const bName = getV('billing_attention') ||
    data.billing?.attention ||
    data.customer?.name ||
    data.party?.name || "";


  const bNameLines = safeSplit(bName, textWrapW);

  const bAddrStr = getV('billing_address') || data.customer?.address || "";
  const bAddr2 = getV('billing_line2') || "";
  const bCity = getV('city') || data.customer?.city || "";
  const bState = getV('state') || data.customer?.state || "";
  const bPin = getV('pincode') || data.customer?.pincode || "";

  const bCountryVal = (getV('country') || data.customer?.country || "").trim();
  const bFullAddr = formatAddressSafe(bAddrStr, bAddr2, bCity, bState, bPin, bCountryVal);
  const bAddrLines = safeSplit(bFullAddr, textWrapW);

  // ══════════════════════════════════════════
  // SHIP TO: Logic & Formatting
  // ══════════════════════════════════════════

  const sName = getV('shipping_attention') ||
    data.shipping?.attention ||
    data.shipping_address?.attention ||
    data.shipping_party?.attention ||
    "";


  const sNameLines = sName ? safeSplit(sName, textWrapW) : [];

  const sAddrStr = getV('shipping_address') || data.shipping?.address || "";
  const sAddr2 = getV('shipping_line2') || "";
  const sCity = getV('ship_city') || data.shipping?.city || "";
  const sState = getV('ship_state') || data.shipping?.state || "";
  const sPin = getV('ship_pincode') || data.shipping?.pincode || "";

  const sCountryVal = (getV('ship_country') || data.shipping?.country || "").trim();
  const sFullAddr = formatAddressSafe(sAddrStr, sAddr2, sCity, sState, sPin, sCountryVal);
  const sAddrLines = safeSplit(sFullAddr, textWrapW);



  const bTaxLabel = (data.customer?.customerTypeLabel || (data.activeCurrency === "NPR" ? "VAT No" : "GSTIN")).replace(/:/g, "").trim();
  const bTax = data.customer?.gstin || "";
  const bPh = data.customer?.tel || data.customer?.phone || "";

  const sTaxLabel = (data.shipping?.customerTypeLabel || bTaxLabel).replace(/:/g, "").trim();
  const sTax = data.shippingGstin || data.shipping_gstin || data.shipping?.gstin || bTax;
  const sPh = data.shippingPhone || data.shipping_phone || data.shipping?.phone || data.shipping?.tel || bPh;


  const bHeight = (bNameLines.length * 4) + (bAddrLines.length * 4) + (bPh ? 4 : 0) + (bTax ? 4 : 0) + 12;
  const sHeight = (sNameLines.length * 4) + (sAddrLines.length * 4) + (sPh ? 4 : 0) + (sTax ? 4 : 0) + 12;
  const boxH = Math.max(bHeight, sHeight, 30);

  doc.setFillColor(248, 248, 248);
  doc.rect(ML, y, boxW, 6, "F");
  doc.rect(CX, y, boxW, 6, "F");

  // Unified Border to prevent gaps or doubled lines
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(ML, y, PW - ML - MR, boxH);
  doc.line(CX, y, CX, y + boxH); // Vertical divider
  doc.line(ML, y + 6, PW - MR, y + 6); // Header divider

  sf("bold", 9);
  doc.setTextColor(0, 0, 0);
  const billToLabel = data.documentType === DOCUMENT_TYPES.PURCHASE_ORDER ? "Supplier / Service Provider" : "BILL TO";
  const shipToLabel = "SHIP TO";

  doc.setCharSpace(0.5);
  doc.text(billToLabel, ML + 3, y + 4.2);
  doc.text(shipToLabel, CX + 3, y + 4.2);
  doc.setCharSpace(0);

  let ty = y + 10;
  sf("bold", 9.5); doc.setTextColor(0, 0, 0);
  bNameLines.forEach(l => { doc.text(l, ML + 3, ty); ty += 4; });
  sf("normal", 8.5); doc.setTextColor(0, 0, 0);
  bAddrLines.forEach(l => { doc.text(l, ML + 3, ty); ty += 4; });
  if (bPh) { doc.text(`Ph: ${bPh}`, ML + 3, ty); ty += 4; }
  if (bTax) { doc.text(`${bTaxLabel}: ${bTax}`, ML + 3, ty); ty += 4; }

  ty = y + 10;
  sf("bold", 9.5); doc.setTextColor(0, 0, 0);
  sNameLines.forEach(l => { doc.text(l, CX + 3, ty); ty += 4; });
  sf("normal", 8.5); doc.setTextColor(0, 0, 0);
  sAddrLines.forEach(l => { doc.text(l, CX + 3, ty); ty += 4; });
  if (sPh) { doc.text(`Ph: ${sPh}`, CX + 3, ty); ty += 4; }
  if (sTax) { doc.text(`${sTaxLabel}: ${sTax}`, CX + 3, ty); ty += 4; }

  y += boxH;

  // ================= E-INVOICE SECTION =================
  if (data.einvoice && data.einvoice.irn) {
    const ewayBillNo = data.einvoice.eway_bill_no || data.einvoice.ewayBillNo;
    const ewayBillDate = data.einvoice.eway_bill_date || data.einvoice.ewayBillDate;
    const hasEway = !!ewayBillNo;
    const einvH = hasEway ? 38 : 32;

    if (y + einvH > PH - 40) {
      addNewPage();
    }

    doc.setFillColor(250, 250, 250);
    doc.rect(ML, y, PW - ML - MR, einvH, "F");
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(ML, y, PW - ML - MR, einvH, "D");

    sf("bold", 9.5);
    doc.setTextColor(0, 0, 0);
    doc.text("E-INVOICE & E-WAY BILL DETAILS", ML + 5, y + 7);
    doc.line(ML + 5, y + 9, PW - MR - 5, y + 9);

    const irn = data.einvoice.irn;
    const ackNo = data.einvoice.ack_no;
    const ackDate = data.einvoice.ack_date;

    sf("normal", 8.5);
    doc.text("IRN:", ML + 5, y + 15);
    sf("bold", 8.5);
    const irnLines = doc.splitTextToSize(irn, PW - ML - MR - 45);
    doc.text(irnLines, ML + 25, y + 15);

    sf("normal", 8.5);
    doc.text("Ack No:", ML + 5, y + 23);
    sf("bold", 8.5);
    doc.text(String(ackNo || "-"), ML + 25, y + 23);

    sf("normal", 8.5);
    doc.text("Ack Date:", ML + 60, y + 23);
    sf("bold", 8.5);
    doc.text(String(ackDate || "-"), ML + 80, y + 23);

    if (ewayBillNo) {
      sf("normal", 8.5);
      doc.text("E-Way Bill No:", ML + 5, y + 31);
      sf("bold", 8.5);
      doc.text(String(ewayBillNo), ML + 25, y + 31);

      sf("normal", 8.5);
      doc.text("E-Way Bill Date:", ML + 60, y + 31);
      sf("bold", 8.5);
      doc.text(String(ewayBillDate || "-"), ML + 85, y + 31);
    }

    if (einvoiceQR) {
      try {
        doc.addImage(einvoiceQR, "PNG", PW - MR - 28, y + 3, 25, 25);
      } catch (e) {
        console.warn("E-Invoice QR Error", e);
      }
    }
    y += einvH;
  }

  // ══════════════════════════════════════════
  // SECTION 4: TABLE
  // ══════════════════════════════════════════
  // --- Dynamic Geographic Tax Logic ---
  const normalizeCountry = (c) => {
    const country = (c || '').trim().toLowerCase();
    if (country === 'in' || country === 'india' || country === 'ind') return 'india';
    return country;
  };

  const compCountry = normalizeCountry(data.company?.country || "India");
  const rawCustCountry = normalizeCountry(getV('ship_country') || getV('country') || data.shipping?.country || data.customer?.country || "");

  // Robust check if this is an export/international bill
  const currencyVal = (data.activeCurrency || "INR").toUpperCase();
  const addressText = `${getV('billing_address')} ${getV('shipping_address')} ${data.customer?.address || ""}`.toLowerCase();

  const hasInternationalKeyword = ["united states", "usa", "u.s.a.", "nepal", "germany", "united kingdom", "london", "canada", "australia", "singapore", "dubai", "uae"].some(keyword => addressText.includes(keyword));

  const isExport = (rawCustCountry && rawCustCountry !== "india" && rawCustCountry !== compCountry) ||
    (currencyVal !== "INR") ||
    hasInternationalKeyword;

  const custCountry = isExport ? (rawCustCountry || "united states") : "india";
  const compState = (data.company?.state || "").toLowerCase().trim();
  const custState = (getV('ship_state') || getV('state') || data.shipping?.state || data.customer?.state || "").toLowerCase().trim();

  // Primary Check: If data has both CGST and SGST values, we MUST split it.
  const hasSplitValues = data.products.some(p => p.cgstPct > 0 && p.sgstPct > 0);
  const hasTax = data.products.some(p => (p.tax || 0) > 0 || (p.cgstPct || 0) > 0 || (p.sgstPct || 0) > 0 || (p.igstPct || 0) > 0 || (p.vatPct || 0) > 0);

  let showIGST = false;
  let showCGST_SGST = false;
  let showVAT = false;
  let showSingleGST = false;

  if (hasSplitValues) {
    showCGST_SGST = true;
  } else if (compCountry === "india" && custCountry === "india") {
    // Domestic India but no split values (Likely IGST)
    if (compState !== custState && custState !== "") {
      showIGST = true;
    } else {
      showSingleGST = true;
    }
  } else if (compCountry !== "india" && custCountry !== "india") {
    // Both Outside India
    showVAT = true;
  } else {
    // Cross-border (Export/Import like India to Nepal)
    showSingleGST = true;
  }

  // Final Overrides (Only if specific taxType is forced and no split values exist)
  const firstP = data.products[0] || {};
  if (!hasSplitValues) {
    if (firstP.taxType === "VAT") { showVAT = true; showIGST = false; showSingleGST = false; }
    if (firstP.taxType === "IGST") { showIGST = true; showVAT = false; showSingleGST = false; }
    if (firstP.taxType === "GST") {
      if (compCountry === "india" && custCountry === "india" && compState !== custState && custState !== "") {
        showIGST = true;
        showSingleGST = false;
        showVAT = false;
      } else {
        showSingleGST = true;
        showIGST = false;
        showVAT = false;
      }
    }
  }

  let headRows;
  if (hasTax) {
    const headRow1 = [
      { content: 'S. NO.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Img.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Item Names', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'HSN/SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Qty', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: `Rate (${sym})`, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
    ];
    const headRow2 = [];

    if (showIGST) {
      const taxLabel = (compCountry !== custCountry) ? 'GST' : 'IGST';
      headRow1.push({ content: taxLabel, colSpan: 2, styles: { halign: 'center' } });
      headRow2.push('%', 'Amt');
    } else if (showCGST_SGST) {
      headRow1.push({ content: 'CGST', colSpan: 2, styles: { halign: 'center' } });
      headRow1.push({ content: 'SGST', colSpan: 2, styles: { halign: 'center' } });
      headRow2.push('%', 'Amt', '%', 'Amt');
    } else if (showVAT) {
      headRow1.push({ content: 'VAT', colSpan: 2, styles: { halign: 'center' } });
      headRow2.push('%', 'Amt');
    } else if (showSingleGST) {
      headRow1.push({ content: 'GST', colSpan: 2, styles: { halign: 'center' } });
      headRow2.push('%', 'Amt');
    }

    headRow1.push({ content: 'Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } });
    headRows = [headRow1, headRow2];
  } else {
    const headRow = [
      { content: 'S. NO.', styles: { halign: 'center' } },
      { content: 'Img.', styles: { halign: 'center' } },
      { content: 'Item Names', styles: { halign: 'center' } },
      { content: 'HSN/SAC', styles: { halign: 'center' } },
      { content: 'Qty', styles: { halign: 'center' } },
      { content: `Rate (${sym})`, styles: { halign: 'center' } },
      { content: 'Amount', styles: { halign: 'center' } }
    ];
    headRows = [headRow];
  }

  const columnStyles = {
    0: { cellWidth: 8, halign: 'center' },
    1: { cellWidth: 12, halign: 'center' },
    2: { cellWidth: 'auto', halign: 'left' },
    3: { cellWidth: 20, halign: 'center' },
    4: { cellWidth: 15, halign: 'center' },
    5: { cellWidth: 22, halign: 'right' },
  };

  let colIdx = 6;
  if (hasTax) {
    if (showCGST_SGST) {
      columnStyles[colIdx++] = { halign: 'center' };
      columnStyles[colIdx++] = { halign: 'right' };
      columnStyles[colIdx++] = { halign: 'center' };
      columnStyles[colIdx++] = { halign: 'right' };
    } else {
      columnStyles[colIdx++] = { halign: 'center' };
      columnStyles[colIdx++] = { halign: 'right' };
    }
  }
  columnStyles[colIdx] = { cellWidth: 25, halign: 'right' };

  autoTable(doc, {
    startY: y,
    head: headRows,
    body: data.products.map((p, i) => {
      const row = [i + 1, "", p.description || "", p.hsn || "", `${p.qty} ${p.unit}`, (p.price).toFixed(2)];
      const lineTaxable = p.price * p.qty;

      if (hasTax) {
        if (showIGST) {
          row.push(`${p.igstPct || 0}%`, (p.tax || 0).toFixed(2));
        } else if (showCGST_SGST) {
          row.push(`${p.cgstPct || 0}%`, ((lineTaxable * (p.cgstPct || 0)) / 100).toFixed(2));
          row.push(`${p.sgstPct || 0}%`, ((lineTaxable * (p.sgstPct || 0)) / 100).toFixed(2));
        } else if (showVAT) {
          row.push(`${p.vatPct || 0}%`, (p.tax || 0).toFixed(2));
        } else if (showSingleGST) {
          // Combined GST percentage
          const totalGstPct = (p.cgstPct || 0) + (p.sgstPct || 0) + (p.igstPct || 0) + (p.vatPct || 0);
          row.push(`${totalGstPct || 0}%`, (p.tax || 0).toFixed(2));
        }
      }
      row.push((p.total).toFixed(2));
      return row;
    }),

    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1, minCellHeight: 10, valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 8, halign: 'center', cellPadding: 0.8, minCellHeight: 6 },
    columnStyles: columnStyles,
    didDrawCell: (cellData) => {
      if (cellData.section === "body" && cellData.column.index === 1) {
        const id = data.products[cellData.row.index].srNo || cellData.row.index + 1;
        const b64 = imgMap[id];
        if (b64) {
          try {
            const padding = 1.5;
            const size = Math.min(cellData.cell.width, cellData.cell.height) - (padding * 2);
            const posX = cellData.cell.x + (cellData.cell.width - size) / 2;
            const posY = cellData.cell.y + (cellData.cell.height - size) / 2;
            doc.addImage(b64, "PNG", posX, posY, size, size);
          } catch (e) { }
        }
      }
    },
  });

  

  y = doc.lastAutoTable.finalY;

  // ══════════════════════════════════════════
  // SECTION 5: FOOTER (Words, Bank, Summary, Notes/Remark, Signature)
  // ══════════════════════════════════════════
  const splitX = ML + 110;

  // Minimum space check for footer
  if (y + 50 > PH - 10) { doc.addPage(); y = 15; }
  const footerStartY = y;

  // --- 5A: RIGHT SIDE (Summary then Signature) ---
  let ry = footerStartY;

  // Dynamic Summary Calculation
  const tt = data.totals?.taxTotal || data.totals?.tax_total || data.totals?.total_tax || data.totals?.tax_amount || data.totals?.gst_amount || 0;
  const addChg = data.totals?.additionalCharges || 0;
  const discAT = data.totals?.discountAfterTax || 0;
  const discBT = data.totals?.discount || data.totals?.discountAmount || 0;

  let summaryRows = 2; // Subtotal + Total
  if (tt > 0) summaryRows++;
  if (addChg > 0) summaryRows++;
  if (discAT > 0) summaryRows++;
  if (discBT > 0) summaryRows++;

  const isChallan = data.documentType === DOCUMENT_TYPES.DELIVERY_CHALLAN;
  const summaryBoxH = isChallan ? 0 : (summaryRows * 5) + 12;

  // Draw Summary Box
  if (summaryBoxH > 0) {
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.2);
    doc.rect(splitX, footerStartY, PW - MR - splitX, summaryBoxH);
  }


  // Summary Content
  ry += 5;
  const drawR = (l, v, b = false, isNeg = false) => {
    sf(b ? "bold" : "normal", 8.8);
    doc.text(l, PW - MR - 45, ry, { align: "right" });
    let valStr = v;
    if (isNeg) valStr = "- " + valStr;
    doc.text(valStr, PW - MR - 3, ry, { align: "right" });
    ry += 5;
  };



  if (!isChallan) {
    drawR("Sub Total", fmt(data.totals.taxableAmount || data.totals.subtotal, false));
    if (discBT > 0) drawR("Discount", fmt(discBT, false), false, true);
    if (tt > 0) drawR("Total Tax", fmt(tt, false));
    if (addChg > 0) drawR("Additional Charges", fmt(addChg, false));
    if (discAT > 0) drawR("Discount After Tax", fmt(discAT, false), false, true);

    drawR("Grand Total", fmt(data.totals.total, true), true);

    // Highlighting the Grand Total with larger font
    ry -= 5;
    doc.setFillColor(255, 255, 255);
    doc.rect(splitX + 0.2, ry - 4, PW - MR - splitX - 0.4, 4.8, 'F');
    sf("bold", 11);
    doc.text("Grand Total", PW - MR - 45, ry, { align: "right" });
    doc.text(fmt(data.totals.total, true), PW - MR - 3, ry, { align: "right" });
  }




  // Signature Block (Starts immediately after Summary)
  const sigStartY = footerStartY + summaryBoxH;
  const sigBoxH = 35;
  doc.setLineWidth(0.2);
  doc.rect(splitX, sigStartY, PW - MR - splitX, sigBoxH);

  const rightColW = PW - MR - splitX;
  sf("bold", 8.5);
  
  const compNameStr = data.company?.name || "";
  const compNameLines = doc.splitTextToSize(compNameStr, rightColW - 4).slice(0, 2);
  let cY = sigStartY + 5;
  compNameLines.forEach(l => {
    doc.text(l, splitX + rightColW / 2, cY, { align: "center" });
    cY += 3.5;
  });

  const totalImgW = 42;
  const startImgX = splitX + (rightColW - totalImgW) / 2;
  const sigImgY = sigStartY + (compNameLines.length > 1 ? 11.5 : 9);

  if (stampB64) { try { doc.addImage(stampB64, "PNG", startImgX, sigImgY, 22, 14); } catch (e) { } }
  if (sigB64) { try { doc.addImage(sigB64, "PNG", startImgX + 22, sigImgY, 20, 14); } catch (e) { } }
  doc.setLineWidth(0.2);
  doc.line(splitX, sigStartY + 26, PW - MR, sigStartY + 26);
  sf("bold", 9);
  doc.text("Authorized Signature", splitX + rightColW / 2, sigStartY + 31, { align: "center" });

  // --- 5B: LEFT SIDE (Bank then Notes) ---
  let ly = footerStartY;

  // Total in Words & Bank
  let bankContentH = 0;
  let validBankLines = [];

  if (data.bank && !isChallan) {
    const check = (lbl, val) => {
      if (!val || String(val).trim() === "" || String(val).toLowerCase() === lbl.toLowerCase()) return;
      validBankLines.push({ lbl, val });
    };
    check("Bank", data.bank.bank_name);
    check("Holder", data.bank.account_holder_name);
    check("A/C No", data.bank.account_number);
    check("Branch", data.bank.branch);
    check("IFSC", data.bank.ifsc);
    check("UPI", data.bank.upi);
    if (validBankLines.length > 0) {
      bankContentH = 5 + (validBankLines.length * 4.2);
    }
  }

  const wordsText = numberToWords(Math.round(data.totals.total));
  const wordsLines = doc.splitTextToSize(wordsText, splitX - ML - 6);
  const wordsH = (wordsLines.length * 4);

  const bankBoxH = isChallan ? 0 : Math.max(15 + bankContentH + wordsH, 45); // Added more base padding
  if (bankBoxH > 0) {
    doc.setLineWidth(0.2);
    doc.rect(ML, footerStartY, splitX - ML, bankBoxH);
  }


  ly += 4;
  if (!isChallan) {
    sf("normal", 8.2); doc.text("Total In Words", ML + 3, ly); ly += 4;
    sf("bolditalic", 8.8);
    wordsLines.forEach(line => {
      doc.text(line, ML + 3, ly);
      ly += 4;
    });
  }

  ly += 6;
  if (validBankLines.length > 0) {
    sf("bold", 8.5); doc.text("Bank Details", ML + 4, ly); ly += 5;
    sf("normal", 8);
    const bankStartYText = ly;
    validBankLines.forEach(item => {
      doc.text(`${item.lbl}`, ML + 4, ly);
      doc.text(":", ML + 18, ly);
      doc.text(`${item.val}`, ML + 21, ly);
      ly += 4.2;
    });
    if (bankQR) {
      try {
        const qrX = splitX - 30;
        doc.addImage(bankQR, "PNG", qrX, bankStartYText - 4, 22, 22);
        sf("normal", 7.5); doc.text("Scan to Pay", qrX + 11, bankStartYText + 19, { align: "center" });
      } catch (e) { }
    }
  }

  const pageBeforeNotes = doc.getNumberOfPages();
  // Notes & Remark (Starts immediately after Bank)
  const notesStartY = footerStartY + bankBoxH;
  const notesAreaW = splitX - ML;
  autoTable(doc, {
    startY: notesStartY,
    margin: { left: ML, right: PW - splitX },
    head: [[{ content: "Notes : ", styles: { fontStyle: 'bold', halign: 'left' } }, { content: "Remark :", styles: { fontStyle: 'bold', halign: 'left' } }]],
    body: [[{ content: data.notes || "", styles: { fontStyle: 'normal' } }, { content: data.remark || " ", styles: { fontStyle: 'normal' } }]],
    showHead: 'firstPage', theme: "grid",
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], minCellHeight: 6, cellPadding: 1.5 },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0], minCellHeight: 12, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: notesAreaW * 0.5 }, 1: { cellWidth: notesAreaW * 0.5 } }
  });
  const pageAfterNotes = doc.getNumberOfPages();
  const notesEndY = doc.lastAutoTable.finalY;

  // Logic to prevent massive gaps:
  // If the notes box moved to a new page, the signature block (drawn earlier) 
  // is likely on a previous page. In that case, we only care about the notesEndY.
  if (pageAfterNotes > pageBeforeNotes) {
    y = notesEndY + 2;
  } else {
    // Both are on the same page, use whichever is lower
    const signatureEndY = sigStartY + sigBoxH;
    y = Math.max(notesEndY, signatureEndY) + 2;
  }



  // SECTION 6: TERMS & CONDITIONS 
  // ══════════════════════════════════════════
  const hasValidTerms = data.termsSections?.some(s => s.content && s.content.trim().replace(/<[^>]*>?/gm, "").length > 0);
  if (hasValidTerms) {
    // Space check: If we are too low on the page, add a new page. Otherwise start immediately.
    let ty = y + 2;
    if (ty > 270) {
      doc.addPage();
      ty = 20;
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line(ML, ty, PW - MR, ty);
    ty += 5;



    data.termsSections.forEach(s => {
      if (!s.content || s.content.trim().replace(/<[^>]*>?/gm, "").length === 0) return;
      if (ty > 260) { doc.addPage(); ty = 20; }
      sf("bold", 14);
      doc.text(s.heading || "", ML, ty);
      ty += 6;
      const pBreak = () => { doc.addPage(); ty = 20; };
      ty = renderHTMLToPDF(doc, s.content, ML, ty, PW - ML - MR, 5, pBreak);
      ty += 6;
    });
  }

  return doc;
}

export default function FormatTwo({ data }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  useEffect(() => {
    if (!data) return;
    buildPDF(data).then(doc => setPdfUrl(URL.createObjectURL(doc.output("blob"))));
  }, [data]);

  if (!pdfUrl) return <div style={{ textAlign: "center", padding: 50 }}>Generating Preview...</div>;

  return <iframe src={pdfUrl} width="100%" height="850px" style={{ border: "none" }} />;
}