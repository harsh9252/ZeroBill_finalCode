// ============================================================
// FormatThree.jsx — Professional Multi-Section Layout
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
const getBase64Image = async (url) => {
  if (!url) return null;
  let cleanUrl = typeof url === 'string' ? url : (url.url || '');
  if (!cleanUrl) return null;
  try {
    const response = await fetch(cleanUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) { return null; }
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
        if (curY > 260) {
          if (pageBreakCallback) pageBreakCallback();
          curY = 20; lineBottomY = 16;
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
        margin: { left: iX, right: 10 },
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
          if (curY > 260) { if (pageBreakCallback) pageBreakCallback(); curY = 20; lineBottomY = 16; }
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
  const PW = 210, PH = 297, ML = 14, MR = 14, sigSpace = 32;
  const addNewPage = () => { doc.addPage(); y = 20; };

  const F = "helvetica";
  const MW = PW - ML - MR;
  const sf = (style = "normal", size = 9) => { doc.setFont(F, style); doc.setFontSize(size); };
  const fmt = (v, showSym = true) => {
    const val = Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return showSym ? `${data.activeCurrency || "INR"} ${val}` : val;
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

  const [logoB64, productImages, qrB64, stampB64, sigB64, einvoiceQR] = await Promise.all([
    getBase64Image(data.company?.logo?.url || data.company?.logoUrl || data.company?.logo),
    Promise.all(data.products.map(async (p, i) => ({ id: p.srNo || i + 1, b64: await getBase64Image(p.image_url || p.image) }))),
    getBase64Image(data.company?.bank?.qrCode || data.company?.bank?.qr_code || data.bank?.qr_code || data.qrCode),
    getBase64Image(data.company?.stampUrl || data.company?.stamp?.url),
    getBase64Image(data.company?.signatureUrl || data.company?.signature?.url),
    data.einvoice?.signed_qr_code
      ? getBase64Image(
          `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.einvoice.signed_qr_code)}&size=100x100`,
          "E-Invoice QR"
        )
      : Promise.resolve(null)
  ]);
  const imgMap = productImages.reduce((a, c) => { a[c.id] = c.b64; return a; }, {});

  let y = 10;

  const busName = (data.company?.name || "BUSINESS NAME").toUpperCase();
  const addrText = data.company?.addressLines || "";
  const addrLines = doc.splitTextToSize(addrText, 80);

  // Dynamic header height

  const headerH = Math.max(30, 15 + (addrLines.length * 4.2) + 5);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.rect(ML, y, MW, headerH);

  if (logoB64) {
    try {
      const props = doc.getImageProperties(logoB64);
      const ratio = props.width / props.height;
      let w = 35, h = 35 / ratio;
      if (h > 24) { h = 24; w = 24 * ratio; }
      doc.addImage(logoB64, "PNG", ML + 5, y + (headerH - h) / 2, w, h);
    } catch (e) { }
  }

  sf("bold", 12.5);
  doc.text(busName, PW / 2, y + 8, { align: "center" });

  sf("normal", 8);
  let ay = y + headerH - (addrLines.length * 4.2) - 2; // Position towards bottom
  addrLines.forEach(l => {
    doc.text(l, PW / 2, ay, { align: "center" });
    ay += 4.2;
  });

  y += headerH;

  // ══════════════════════════════════════════
  // SECTION 2: DOCUMENT TITLE ROW
  // ══════════════════════════════════════════
  const titleH = 8;
  doc.rect(ML, y, MW, titleH);
  sf("bold", 16);
  doc.setCharSpace(0.5);
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
  const docLabel = titleMap[data.documentType] || (data.documentType || "INVOICE").toUpperCase();
  doc.text(docLabel, PW / 2, y + 5.5, { align: "center" });
  doc.setCharSpace(0);
  y += titleH;

  // ══════════════════════════════════════════
  // SECTION 3: CONTACT & TAX DETAILS ROW (Auto-Height)
  // ══════════════════════════════════════════
  const leftFields = [
    { l: "Phone", v: data.company?.tel },
    { l: "Email", v: data.company?.email },
    { l: "Web", v: data.company?.website },
    { l: "PAN", v: data.company?.pan },
  ].filter(f => f.v && f.v !== "N/A" && String(f.v).trim() !== "");

  const taxLabel = data.company?.businessTypeLabel || "GSTIN";
  const rightFields = [
    { l: "CIN", v: data.company?.cin },
    { l: taxLabel, v: data.company?.gstin },
    { l: "IEC Code", v: data.company?.iecCode },
  ].filter(f => f.v && f.v !== "N/A" && String(f.v).trim() !== "");

  const contactH = Math.max(leftFields.length, rightFields.length, 1) * 4 + 4;
  const splitX = ML + MW / 2;

  doc.rect(ML, y, MW, contactH);
  doc.line(splitX, y, splitX, y + contactH);

  sf("normal", 8);
  const drawLine = (lbl, val, x, currentY) => {
    doc.text(lbl, x, currentY);
    doc.text(":", x + 12, currentY);
    doc.text(String(val), x + 15, currentY);
  };

  // Render Left Side
  leftFields.forEach((f, idx) => {
    drawLine(f.l, f.v, ML + 3, y + 5 + (idx * 4));
  });

  // Render Right Side
  rightFields.forEach((f, idx) => {
    drawLine(f.l, f.v, splitX + 3, y + 5 + (idx * 4));
  });

  y += contactH;

  // ══════════════════════════════════════════
  // SECTION 4: PARTY DETAILS & ORDER METADATA
  // ══════════════════════════════════════════
  const colW = MW / 3;

  // Preparation
  const bAddr = data.customer?.address || "";
  const bCity = data.customer?.city || "";
  const bState = data.customer?.state || "";
  const bPin = data.customer?.zip || data.customer?.pincode || "";
  const bCountry = data.customer?.country || "";

  const bFullAddr = formatAddressSafe(bAddr, "", bCity, bState, bPin, bCountry);

  const bLines = [
    { l: "Supplier Code", v: data.customer?.customerCode || data.customer?.id },
    { l: "", v: data.customer?.name, hideLabel: true },
    { l: "", v: bFullAddr, hideLabel: true },
    (!bAddr || !bAddr.toLowerCase().includes(String(bPin).toLowerCase())) ? { l: "PIN/ZIP Code", v: bPin } : null,
    (!bAddr || !bAddr.toLowerCase().includes(bCity.toLowerCase())) ? { l: "City", v: bCity ? `${bCity}, ${bCountry || 'India'}` : "" } : null,
    { l: "Contact No", v: data.customer?.phone },
    { l: "Mail", v: data.customer?.email },
    { l: "PAN", v: data.customer?.pan },
    { l: "GSTIN NO", v: data.customer?.gstin },
  ].filter(Boolean).filter(x => x.v);

  const sName = data.shipping?.attention || 
                data.meta?.shipping_attention ||
                data.shipping_attention || 
                "";

  const sAddr = data.shipping?.address || data.customer?.address || "";
  const sCity2 = data.shipping?.city || data.customer?.city || "";
  const sState2 = data.shipping?.state || data.customer?.state || "";
  const sPin2 = data.shipping?.zip || data.customer?.zip || "";
  const sCountry2 = data.shipping?.country || data.customer?.country || "";

  const sFullAddr = formatAddressSafe(sAddr, "", sCity2, sState2, sPin2, sCountry2);

  const sLines = [
    { l: "Receiver Code", v: data.shipping?.receiverCode || data.customer?.customerCode },
    { l: "", v: sName, hideLabel: true },
    { l: "", v: sFullAddr, hideLabel: true },
    (!sAddr || !sAddr.toLowerCase().includes(String(sPin2).toLowerCase())) ? { l: "PIN/ZIP Code", v: sPin2 } : null,
    (!sAddr || !sAddr.toLowerCase().includes(sCity2.toLowerCase())) ? { l: "City", v: sCity2 ? `${sCity2}, ${sCountry2 || 'India'}` : "" } : null,
    { l: "Contact No", v: data.shipping?.phone || data.customer?.phone },
    { l: "Mail ID", v: data.shipping?.email || data.customer?.email },
  ].filter(Boolean).filter(x => x.v);

  const getTitle = (type) => {
    const map = {
      [DOCUMENT_TYPES.QUOTATION]: "Quotation",
      [DOCUMENT_TYPES.SALES_INVOICE]: "Invoice",
      [DOCUMENT_TYPES.PURCHASE_ORDER]: "Order",
      [DOCUMENT_TYPES.DELIVERY_CHALLAN]: "Challan",
      [DOCUMENT_TYPES.PROFORMA]: "Proforma",
    };
    return map[type] || "Document";
  };
  const docPrefix = getTitle(data.documentType);

  const oLines = [
    { l: `${docPrefix} Number`, v: data.quotation?.number || data.invoice_number },
    { l: `${docPrefix} Date`, v: data.quotation?.date || data.invoice_date },
    { l: "Terms", v: data.totals?.paymentTerms ? `${data.totals.paymentTerms} Days` : null },
    { l: "Due Date", v: data.quotation?.dueDate },
    { l: "Ship Via", v: data.quotation?.ship_via },
    { l: "Reference No", v: data.quotation?.po_agreement_number || data.quotation?.reference },
  ].filter(x => x.v);

  // Calculate Dynamic Height for Party & Order Cards
  const getH = (lines, hasTitle) => {
    let py = hasTitle ? 8.5 : 4.5;
    lines.forEach(item => {
      const labelPart = item.l ? `${item.l}: ` : "";
      const fullText = item.hideLabel ? String(item.v) : `${labelPart}${item.v}`;
      const wrapped = doc.splitTextToSize(fullText, colW - 6);
      py += (wrapped.length * 4) + 0.5;
    });
    return Math.max(py + 3, 15);
  };
  const partyBoxH = Math.max(getH(bLines, true), getH(sLines, true), getH(oLines, false));

  doc.rect(ML, y, MW, partyBoxH);
  doc.line(ML + colW, y, ML + colW, y + partyBoxH);
  doc.line(ML + colW * 2, y, ML + colW * 2, y + partyBoxH);

  const drawCol = (x, title, lines) => {
    if (title) {
      sf("normal", 8.2); doc.setTextColor(0, 0, 0);
      doc.setCharSpace(0.5);
      doc.text(title, x + 3, y + 4.5);
      doc.setCharSpace(0);
    }

    let py = title ? y + 8.5 : y + 4.5;
    lines.forEach(item => {
      sf("normal", 8.2); doc.setTextColor(0, 0, 0);

      const labelPart = item.l ? `${item.l}: ` : "";
      const fullText = item.hideLabel ? String(item.v) : `${labelPart}${item.v}`;

      const wrapped = doc.splitTextToSize(fullText, colW - 6);
      wrapped.forEach(wl => {
        doc.text(wl, x + 3, py);
        py += 4;
      });
      py += 0.5;
    });
  };

  const billToTitle = data.documentType === DOCUMENT_TYPES.PURCHASE_ORDER ? "Supplier / Service Provider : " : "BILL TO : ";
  const shipToTitle = "SHIP TO : ";

  drawCol(ML, billToTitle, bLines);
  drawCol(ML + colW, shipToTitle, sLines);
  drawCol(ML + colW * 2, "", oLines);

  y += partyBoxH;

  // ================= E-INVOICE SECTION =================
  if (data.einvoice && data.einvoice.irn) {
    const ewayBillNo = data.einvoice.eway_bill_no || data.einvoice.ewayBillNo;
    const ewayBillDate = data.einvoice.eway_bill_date || data.einvoice.ewayBillDate;
    const hasEway = !!ewayBillNo;
    const einvH = hasEway ? 38 : 32;

    if (y + einvH > PH - 40) {
      addNewPage();
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(ML, y, MW, einvH, "F");
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.rect(ML, y, MW, einvH, "D");

    sf("bold", 9.5);
    doc.setTextColor(0, 0, 0);
    doc.text("E-INVOICE & E-WAY BILL DETAILS", ML + 5, y + 7);
    doc.line(ML + 5, y + 9, ML + MW - 5, y + 9);

    const irn = data.einvoice.irn;
    const ackNo = data.einvoice.ack_no;
    const ackDate = data.einvoice.ack_date;

    sf("normal", 8.5);
    doc.text("IRN:", ML + 5, y + 15);
    sf("bold", 8.5);
    const irnLines = doc.splitTextToSize(irn, MW - 45);
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
        doc.addImage(einvoiceQR, "PNG", ML + MW - 28, y + 3, 25, 25);
      } catch (e) {
        console.warn("E-Invoice QR Error", e);
      }
    }
    y += einvH;
  }

  // ══════════════════════════════════════════
  // SECTION 6: TABLE (Service Activity Details)
  // ══════════════════════════════════════════
  const normalizeCountry = (c) => {
    const country = (c || '').trim().toLowerCase();
    if (country === 'in' || country === 'india' || country === 'ind') return 'india';
    return country;
  };

  const compCountry = normalizeCountry(data.company?.country || "India");
  const custCountry = normalizeCountry(data.shipping?.country || data.customer?.country || "India");
  const compState = (data.company?.state || "").toLowerCase().trim();
  const custState = (data.shipping?.state || data.customer?.state || "").toLowerCase().trim();

  // Primary Check: If data has both CGST and SGST values, we MUST split it.
  const hasSplitValues = data.products.some(p => p.cgstPct > 0 && p.sgstPct > 0);

  let showIGST = false;
  let showCGST_SGST = false;
  let showVAT = false;
  let showSingleGST = false;

  if (hasSplitValues) {
    showCGST_SGST = true;
  } else if (compCountry === "india" && custCountry === "india") {
    if (compState !== custState && custState !== "") {
      showIGST = true;
    } else {
      showSingleGST = true;
    }
  } else if (compCountry !== "india" && custCountry !== "india") {
    showVAT = true;
  } else {
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

  const headRow1 = [
    { content: 'Item No.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'Img.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'Service / Item Name', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
    { content: 'HSN/SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'Qty', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'UOM', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: `Unit Cost`, rowSpan: 2, styles: { halign: 'right', valign: 'middle' } }
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

  headRow1.push({ content: 'Amount', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } });

  const tableBody = data.products.map((p, i) => {
    const pId = p.id || p.srNo || i + 1;
    const name = p.item_name || p.name || p.productName || p.description || "N/A";
    const code = p.productCode || p.itemCode || p.code || "";
    const hsn = p.hsn_code || p.hsnCode || p.hsn || "-";
    const qty = parseFloat(p.qty || p.quantity || 0);
    const unit = p.unit || p.uom || p.unit_name || "AU";
    const price = parseFloat(p.price || p.rate || p.unit_price || 0);
    const lineTaxable = price * qty;

    const row = [
      i + 1,
      {
        content: "",
        hasImage: !!imgMap[pId],
        productId: pId,
        styles: { minCellHeight: 12 }
      },
      code ? `${code}\n${name}` : name,
      hsn,
      qty,
      unit,
      fmt(price, false)
    ];

    if (showIGST) {
      const igst = parseFloat(p.igstPct || p.igst_rate || 0);
      row.push(`${igst}%`, fmt((lineTaxable * igst) / 100, false));
    } else if (showCGST_SGST) {
      const cgst = parseFloat(p.cgstPct || p.cgst_rate || 0);
      const sgst = parseFloat(p.sgstPct || p.sgst_rate || 0);
      row.push(`${cgst}%`, fmt((lineTaxable * cgst) / 100, false));
      row.push(`${sgst}%`, fmt((lineTaxable * sgst) / 100, false));
    } else if (showVAT) {
      const vat = parseFloat(p.vatPct || p.vat_rate || 0);
      row.push(`${vat}%`, fmt((lineTaxable * vat) / 100, false));
    } else if (showSingleGST) {
      const gstPct = parseFloat(p.gstPct || (p.cgstPct + p.sgstPct) || p.igstPct || p.vatPct || 0);
      row.push(`${gstPct}%`, fmt((lineTaxable * gstPct) / 100, false));
    }

    row.push(fmt(p.total, false));
    return row;
  });

  const colStyles = {
    0: { cellWidth: showCGST_SGST ? 8 : 10, halign: 'center' },
    1: { cellWidth: showCGST_SGST ? 10 : 12, halign: 'center', cellPadding: 0.5 },
    2: { cellWidth: 'auto', halign: 'left' },
    3: { cellWidth: showCGST_SGST ? 15 : 18, halign: 'center' },
    4: { cellWidth: showCGST_SGST ? 10 : 12, halign: 'center' },
    5: { cellWidth: showCGST_SGST ? 10 : 12, halign: 'center' },
    6: { cellWidth: showCGST_SGST ? 18 : 20, halign: 'right' }
  };
  let lastColIdx = 7;
  if (showCGST_SGST) {
    colStyles[7] = { cellWidth: 7, halign: 'center' };
    colStyles[8] = { cellWidth: 16, halign: 'right' };
    colStyles[9] = { cellWidth: 7, halign: 'center' };
    colStyles[10] = { cellWidth: 16, halign: 'right' };
    lastColIdx = 11;
  } else {
    colStyles[7] = { cellWidth: 8, halign: 'center' };
    colStyles[8] = { cellWidth: 18, halign: 'right' };
    lastColIdx = 9;
  }
  colStyles[lastColIdx] = { cellWidth: 22, halign: 'right' };

  autoTable(doc, {
    startY: y,
    margin: { top: 60, bottom: 35, left: ML, right: MR },
    head: [headRow1, headRow2],
    body: tableBody,
    theme: "grid",
    showHead: 'firstPage',
    styles: { fontSize: 8, cellPadding: 1, valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: colStyles,
    didDrawCell: (cellData) => {
      // Draw Product Image in Col 1
      if (cellData.section === 'body' && cellData.column.index === 1 && cellData.cell.raw?.hasImage) {
        const b64 = imgMap[cellData.cell.raw.productId];
        if (b64) {
          try {
            const imgSize = 9.5;
            const cellH = cellData.cell.height;
            const cellW = cellData.cell.width;
            const ix = cellData.cell.x + (cellW - imgSize) / 2;
            const iy = cellData.cell.y + (cellH - imgSize) / 2;
            doc.addImage(b64, 'PNG', ix, iy, imgSize, imgSize);
          } catch (e) { }
        }
      }
    }
  });

  y = doc.lastAutoTable.finalY + 0;
  const isChallan = data.documentType === DOCUMENT_TYPES.DELIVERY_CHALLAN;

  // --- SUMMARY TABLE ---
  if (!isChallan) {
    if (y + 55 > PH - sigSpace) addNewPage();


    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR, bottom: sigSpace },
      body: [[{ content: "", colSpan: showCGST_SGST ? 12 : 10, styles: { minCellHeight: 45 } }]],
      theme: "grid",
      rowPageBreak: 'avoid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
      didDrawCell: (cellData) => {
        const { x, y, width, height } = cellData.cell;

        // Left side: Bank
        const bankX = x + 4; let bty = y + 6;

        if (!isChallan) {
          sf("bold", 8.5); doc.text("Bank Details", bankX, bty); bty += 5;
          const bk = data.company?.bank || data.bank || {};
          const drawB = (l, v) => {
            if (!v || v === "N/A" || String(v).trim() === "") return;
            sf("bold", 7.5); doc.text(l, bankX, bty); doc.text(":", bankX + 12, bty);
            sf("normal", 7.5); doc.text(String(v), bankX + 15, bty); bty += 4;
          };
          drawB("Bank", bk.bankName || bk.bank_name || bk.bank);
          drawB("Holder", bk.accountName || bk.account_name || bk.holder_name);
          drawB("A/C No", bk.accountNumber || bk.account_number || bk.account_no);
          drawB("Branch", bk.branchName || bk.branch_name || bk.branch);
          drawB("IFSC", bk.ifscCode || bk.ifsc_code || bk.ifsc);
          drawB("UPI", bk.upiId || bk.upi_id || bk.upi);

          if (qrB64) {
            try {
              doc.addImage(qrB64, 'PNG', bankX + 55, y + 8, 18, 18);
              sf("normal", 7); doc.text("Scan to Pay", bankX + 64, y + 28, { align: "center" });
            } catch (e) { }
          }
        }

        // Right side: Totals
        if (!isChallan) {
          let rty = y + 6;
          const drawSumLine = (lbl, val, isNeg = false) => {
            sf("bold", 8.2); doc.text(lbl, x + width - 70, rty);
            let valStr = fmt(val, false); if (isNeg && val > 0) valStr = "- " + valStr;
            sf("normal", 8.2); doc.text(valStr, x + width - 4, rty, { align: "right" }); rty += 4.5;
          };
          drawSumLine("Sub Total:", data.totals.taxableAmount);
          if (data.totals.taxTotal > 0) drawSumLine("Total Tax:", data.totals.taxTotal);
          if (data.totals.additionalCharges > 0) drawSumLine("Additional Charges:", data.totals.additionalCharges);
          if (data.totals.discountAfterTax > 0) drawSumLine("Discount After Tax:", data.totals.discountAfterTax, true);

          doc.setLineWidth(0.05); doc.line(x + width - 72, rty, x + width, rty); rty += 5;
          sf("bold", 10); doc.text("TOTAL AMOUNT:", x + width - 70, rty);
          sf("bold", 10); doc.text(fmt(data.totals.total, true), x + width - 4, rty, { align: "right" }); rty += 6;

          const label = "AMOUNT IN WORDS: ";
          const value = numberToWords(Math.round(data.totals.total)).toUpperCase();
          const wordsLines = doc.splitTextToSize(label + value, width - 8);

          let curY = height > 40 ? y + height - (wordsLines.length * 4) - 2 : rty + 5;
          doc.setTextColor(0, 0, 0);

          wordsLines.forEach((line, idx) => {
            if (idx === 0) {
              sf("bold", 8.2);
              doc.text(label, x + 4, curY);
              sf("normal", 8.2);
              const firstLineVal = line.substring(label.length);
              doc.text(firstLineVal, x + 4 + doc.getTextWidth(label), curY);
            } else {
              sf("normal", 8.2);
              doc.text(line, x + 4, curY);
            }
            curY += 4;
          });
        }
    }
  });
  y = doc.lastAutoTable.finalY;
}



  // --- NOTES TABLE ---
  if (y + 15 > PH - sigSpace) addNewPage();

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR, bottom: sigSpace },
    head: [[
      { content: "Notes", styles: { fontStyle: 'bold', halign: 'left' } },
      { content: "Remark", styles: { fontStyle: 'bold', halign: 'left' } }
    ]],
    body: [[
      { content: data.notes && data.notes !== "N/A" ? data.notes : " ", styles: { fontStyle: 'normal' } },
      { content: data.remark && data.remark !== "N/A" ? data.remark : " ", styles: { fontStyle: 'normal' } }
    ]],
    showHead: 'firstPage',
    theme: "grid",
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], minCellHeight: 6, cellPadding: 1.5 },
    rowPageBreak: 'auto',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      minCellHeight: 12,
      overflow: 'linebreak'
    },
    columnStyles: { 0: { cellWidth: MW / 2 }, 1: { cellWidth: MW / 2 } }
  });

  y = doc.lastAutoTable.finalY + 2;

  // ══════════════════════════════════════════
  // SECTION 7: TERMS & CONDITIONS
  // ══════════════════════════════════════════
  const hasTerms = data.termsSections?.some(s => s.content && s.content.trim().length > 0);
  if (hasTerms) {
    if (y + 15 > PH - sigSpace) addNewPage();
    
    doc.setLineWidth(0.1);
    doc.line(ML, y, PW - MR, y);
    y += 6;


    data.termsSections.forEach(s => {
      if (!s.content) return;
      if (y + 20 > PH - sigSpace) addNewPage();
      sf("bold", 14); doc.text(s.heading || "", ML, y);
      y += 5;
      y = renderHTMLToPDF(doc, s.content, ML, y, MW, 5, addNewPage);
      y += 5;
    });
  }

  // ══════════════════════════════════════════
  // SECTION 8: GLOBAL FOOTER (All Pages)
  // ══════════════════════════════════════════
  const totalP = doc.getNumberOfPages();
  for (let i = 1; i <= totalP; i++) {
    doc.setPage(i);
    const fy = PH - 10;

    // Left Side: Company Name
    sf("bold", 9);
    doc.text(`For ${String(data.company?.name || "").toUpperCase()}`, ML, fy, { align: "left" });

    // Center: Page Numbers
    sf("normal", 8);
    doc.text(`Page ${i} of ${totalP}`, PW / 2, fy, { align: "center" });

    // Right Side: Authorized Signature Block
    const blockWidth = 45;
    const sigX = PW - MR - blockWidth;

    // Draw a line above the label
    doc.setLineWidth(0.1);
    doc.line(sigX, fy - 4, PW - MR, fy - 4);

    // Position images side-by-side above the line
    const stampWidth = 22;
    const sigWidth = 20;
    const combinedX = sigX + (blockWidth - (stampWidth + sigWidth)) / 2;

    if (stampB64) {
      try { doc.addImage(stampB64, 'PNG', combinedX, fy - 18, stampWidth, 12); } catch (e) { }
    }
    if (sigB64) {
      try { doc.addImage(sigB64, 'PNG', combinedX + stampWidth, fy - 18, sigWidth, 12); } catch (e) { }
    }

    sf("bold", 9);
    doc.text("Authorized Signature", sigX + (blockWidth / 2), fy, { align: "center" });
  }

  return doc;
}

export default function FormatThree({ data }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  useEffect(() => {
    if (!data) return;
    buildPDF(data).then(doc => setPdfUrl(URL.createObjectURL(doc.output("blob"))));
  }, [data]);

  if (!pdfUrl) return <div style={{ textAlign: "center", padding: 50 }}>Generating Preview...</div>;
  return <iframe src={pdfUrl} width="100%" height="850px" style={{ border: "none" }} />;
}