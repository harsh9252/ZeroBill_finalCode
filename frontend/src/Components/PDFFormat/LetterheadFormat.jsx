import { useState, useEffect } from "react";
import { DOCUMENT_TYPES } from "./documentTypeConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getBase64Image = async (url) => {
  if (!url) return null;
  let cleanUrl = typeof url === 'string' ? url : (url.url || '');
  if (!cleanUrl) return null;
  const dataMatch = cleanUrl.match(/data:image\/[^;]+;base64,[^"']+/);
  if (dataMatch) {
    cleanUrl = dataMatch[0];
  } else if (cleanUrl.includes('data:')) {
    const idx = cleanUrl.indexOf('data:');
    cleanUrl = cleanUrl.substring(idx);
  }
  if (cleanUrl.startsWith('data:')) return cleanUrl;
  try {
    const response = await fetch(cleanUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(cleanUrl.substring(0, 100).replace(/\s/g, ''));
    if (cleanUrl.length > 40 && isBase64) return `data:image/png;base64,${cleanUrl}`;
    return null;
  }
};

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
        if (curY > 247) {
          if (pageBreakCallback) pageBreakCallback();
          curY = 65; lineBottomY = 61;
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
        margin: { left: iX, right: 16 },
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
          if (curY > 272) { if (pageBreakCallback) pageBreakCallback(); curY = 65; lineBottomY = 61; }
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

function numberToWords(num) {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const w = (n) => n < 20 ? a[n] : n < 100 ? b[Math.floor(n / 10)] + " " + a[n % 10] : n < 1000 ? a[Math.floor(n / 100)] + " Hundred " + w(n % 100) : n < 100000 ? w(Math.floor(n / 1000)) + " Thousand " + w(n % 1000) : n < 10000000 ? w(Math.floor(n / 100000)) + " Lakh " + w(n % 100000) : w(Math.floor(n / 10000000)) + " Crore " + w(n % 10000000);
  return w(Math.floor(num)) + " Only";
}

const safeSym = (s, code) => {
  // jsPDF's built-in Helvetica font cannot render non-ASCII Unicode symbols
  // (e.g. €, £, ¥). Always use the ISO currency code so text is readable.
  const c = (code || "").toUpperCase().trim();
  if (c === "INR" || s === "₹" || s === "Rs.") return "INR";
  if (c === "NPR") return "NPR";
  if (c) return c;          // e.g. USD, EUR, GBP, AED, etc.
  return s || "INR";        // last resort — if no code at all
};

async function buildPDF(data, letterheadImage) {
  const doc = new jsPDF("p", "mm", "a4");
  const docNo = data.quotation?.number || data.invoice_number || data.po_number || data.challan_number || data.note_number || "Document";
  doc.setProperties({ title: docNo });
  const PW = 210, PH = 297, ML = 16, MR = 16, FOOTER_SPACE = 20;
  const BLACK = [0, 0, 0];
  const LIGHT_GRAY = [240, 240, 240];
  const WHITE = [255, 255, 255];
  const sf = (st = "normal", sz = 9) => { doc.setFont("helvetica", st); doc.setFontSize(sz); };
  const sym = safeSym(data.currencySymbol, data.activeCurrency);
  const fmt = (v) => {
    const val = Number(v || 0).toLocaleString(data.activeCurrency === "NPR" ? "en-US" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sym} ${val}`;
  };

  const [productImages, companyLogo, signature, bankQR, lhImage, einvoiceQR] = await Promise.all([
    Promise.all(data.products.map(async (p, i) => ({
      id: p.srNo || i,
      b64: await getBase64Image(p.image_url || p.image),
    }))),
    getBase64Image(data.company.logo?.url),
    getBase64Image(data.quotation?.signatureUrl),
    getBase64Image(data.bank?.qr_code),
    getBase64Image(letterheadImage),
    data.einvoice?.signed_qr_code
      ? getBase64Image(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.einvoice.signed_qr_code)}&size=100x100`, "E-Invoice QR")
      : Promise.resolve(null)
  ]);
  const imgMap = productImages.reduce((a, c) => { a[c.id] = c.b64; return a; }, {});

  const drawBG = () => {
    if (lhImage) {
      try {
        doc.addImage(lhImage, "JPEG", 0, 0, 210, 297, undefined, 'FAST');
      } catch (e) { console.warn("BG render error", e); }
    }
  };

  drawBG();

  let y = 65;
  const addNewPage = () => {
    doc.addPage();
    drawBG();
    y = 65;
  };

  // Document Title
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
  const title = (titleMap[data.documentType] || data.documentType || "INVOICE").toUpperCase();
  sf("bold", 20);
  doc.setTextColor(...BLACK);
  doc.text(title, PW / 2, y + 2, { align: "center" });

  y += 12;

  // Row 1: Bill To & Ship To
  const cardWidth = (PW - ML * 2) / 2;
  const billToName = data.customer?.name || "";
  const billToAddr = data.customer?.address || "";
  const shipToName = data.customer?.shippingName || data.customer?.name || "";
  const shipToAddr = data.customer?.shippingAddress || data.customer?.address || "";

  // Set font before splitting for accurate wrapping
  sf("bold", 9);
  const bNameLines = doc.splitTextToSize(billToName, cardWidth - 12);
  const sNameLines = doc.splitTextToSize(shipToName, cardWidth - 12);

  sf("normal", 8);
  const bAddrLines = doc.splitTextToSize(billToAddr, cardWidth - 12);
  const sAddrLines = doc.splitTextToSize(shipToAddr, cardWidth - 12);

  let bCount = bNameLines.length + bAddrLines.length;
  if (data.customer?.phone) bCount++;
  if (data.customer?.gstin) bCount++;

  let sCount = sNameLines.length + sAddrLines.length;

  const row1Height = Math.max(bCount, sCount) * 4.6 + 16;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(ML, y, cardWidth, row1Height);
  doc.rect(ML + cardWidth, y, cardWidth, row1Height);

  // Bill To Content
  sf("bold", 10); doc.text("BILL TO", ML + 5, y + 7);
  let by = y + 13;
  sf("bold", 9); bNameLines.forEach(ln => { doc.text(ln, ML + 5, by); by += 4.5; });
  sf("normal", 8); bAddrLines.forEach(ln => { doc.text(ln, ML + 5, by); by += 4.2; });
  if (data.customer?.phone) { doc.text(`Phone: ${data.customer.phone}`, ML + 5, by); by += 4.2; }
  if (data.customer?.gstin) { doc.text(`GSTIN: ${data.customer.gstin}`, ML + 5, by); by += 4.2; }

  // Ship To Content
  sf("bold", 10); doc.text("SHIP TO", ML + cardWidth + 5, y + 7);
  let sy = y + 13;
  sf("bold", 9); sNameLines.forEach(ln => { doc.text(ln, ML + cardWidth + 5, sy); sy += 4.5; });
  sf("normal", 8); sAddrLines.forEach(ln => { doc.text(ln, ML + cardWidth + 5, sy); sy += 4.2; });

  y += row1Height;

  // Row 2: Summary Details (4 Columns)
  const summaryH = 15;
  const colW = (PW - ML * 2) / 4;
  doc.rect(ML, y, PW - ML * 2, summaryH);
  doc.line(ML + colW, y, ML + colW, y + summaryH);
  doc.line(ML + colW * 2, y, ML + colW * 2, y + summaryH);
  doc.line(ML + colW * 3, y, ML + colW * 3, y + summaryH);

  const labelPrefixMap = {
    [DOCUMENT_TYPES.QUOTATION]: "Quotation",
    [DOCUMENT_TYPES.PROFORMA]: "Proforma",
    [DOCUMENT_TYPES.SALES_INVOICE]: "Invoice",
    [DOCUMENT_TYPES.PURCHASE_ORDER]: "Order",
    [DOCUMENT_TYPES.DELIVERY_CHALLAN]: "Challan",
    [DOCUMENT_TYPES.CREDIT_NOTE]: "Credit Note",
    [DOCUMENT_TYPES.DEBIT_NOTE]: "Debit Note",
    [DOCUMENT_TYPES.SALES_RETURN]: "Return",
    [DOCUMENT_TYPES.PURCHASE_RETURN]: "Return",
    [DOCUMENT_TYPES.PURCHASE_INVOICE]: "Book Purchase",
    [DOCUMENT_TYPES.BOOK_INVOICE]: "Invoice",
    [DOCUMENT_TYPES.EINVOICE]: "E-Invoice",
    [DOCUMENT_TYPES.CUSTOM_QUOTATION]: "Quotation",
  };
  const labelPrefix = labelPrefixMap[data.documentType] || "Document";

  const drawCol = (idx, label, value) => {
    const cx = ML + (idx * colW) + (colW / 2);
    sf("normal", 8); doc.text(label, cx, y + 6, { align: "center" });
    sf("bold", 9); doc.text(String(value || "N/A"), cx, y + 11, { align: "center" });
  };

  drawCol(0, `${labelPrefix} No.`, data.quotation?.number || "");
  drawCol(1, `${labelPrefix} Date`, data.quotation?.date || "");
  drawCol(2, "Due Date", data.quotation?.dueDate || "N/A");
  drawCol(3, "Payment Terms", data.totals?.paymentTerms ? `${data.totals.paymentTerms} Days` : "N/A");

  y += summaryH + 1; // Reduced from 3 to 1

  // E-INVOICE SECTION
  if (data.einvoice && data.einvoice.irn) {
    const einvH = 32;
    if (y + einvH > PH - 40) { addNewPage(); }

    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(ML, y, PW - ML * 2, einvH, "F");
    doc.setDrawColor(...BLACK);
    doc.rect(ML, y, PW - ML * 2, einvH, "D");

    sf("bold", 10); doc.setTextColor(...BLACK);
    doc.text("E-INVOICE DETAILS", ML + 5, y + 7);
    doc.setDrawColor(...BLACK);
    doc.line(ML + 5, y + 9, PW - ML - 5, y + 9);

    const irn = data.einvoice.irn;
    const ackNo = data.einvoice.ack_no;
    const ackDate = data.einvoice.ack_date;

    sf("normal", 8); doc.setTextColor(...BLACK);
    doc.text("IRN:", ML + 5, y + 15);
    sf("bold", 8); doc.setTextColor(...BLACK);
    const irnLines = doc.splitTextToSize(irn, PW - ML * 2 - 45);
    doc.text(irnLines, ML + 25, y + 15);

    sf("normal", 8); doc.setTextColor(...BLACK);
    doc.text("Ack No:", ML + 5, y + 23);
    sf("bold", 8); doc.setTextColor(...BLACK);
    doc.text(String(ackNo || "-"), ML + 25, y + 23);

    sf("normal", 8); doc.setTextColor(...BLACK);
    doc.text("Ack Date:", ML + 60, y + 23);
    sf("bold", 8); doc.setTextColor(...BLACK);
    doc.text(String(ackDate || "-"), ML + 80, y + 23);

    if (einvoiceQR) {
      try {
        doc.addImage(einvoiceQR, "PNG", PW - ML - 28, y + 3, 25, 25);
      } catch (e) {
        console.warn("E-Invoice QR Error", e);
      }
    }
    y += einvH + 5;
  }


  // REMARK
  if (data.remark) {
    const remLines = doc.splitTextToSize(data.remark, 160);
    const boxH = remLines.length * 4 + 3;

    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(ML, y, PW - ML * 2, boxH, 1, 1, "F");
    doc.setDrawColor(...BLACK);
    doc.roundedRect(ML, y, PW - ML * 2, boxH, 1, 1, "D");

    sf("bold", 8.5); doc.setTextColor(...BLACK);
    doc.text("Remark :", ML + 3, y + 4.5);

    sf("normal", 8.5); doc.setTextColor(...BLACK);
    let ry = y + 4.5;
    remLines.forEach((ln) => {
      doc.text(ln, ML + 18, ry);
      ry += 4;
    });
    y += boxH + 1.5; // Reduced from 3 to 1.5
  }

  const showIGST = data.products.some(p => p.igstPct > 0 || p.taxType === "IGST");
  const showGST = data.products.some(p => p.cgstPct > 0 || p.sgstPct > 0 || (p.taxType === "GST" && !showIGST));
  const showVAT = data.products.some(p => p.vatPct > 0 || p.taxType === "VAT");

  const head = ["NO.", "IMG", "ITEM NAME", "HSN", "QTY.", "UNIT", "PRICE", "DISC(%)"];
  if (showIGST) { head.push("IGST(%)"); }
  else if (showGST) { head.push("GST(%)"); }
  if (showVAT) { head.push("VAT(%)"); }
  head.push("TOTAL");

  autoTable(doc, {
    startY: y,
    head: [head],
    body: data.products.map((p, i) => {
      const row = [
        String(i + 1).padStart(2, '0'),
        "",
        (p.description || "").replace(/<[^>]*>?/gm, ""),
        p.hsn || "",
        p.qty,
        p.unit || "",
        fmt(p.price),
        `${p.discountPct || 0}%`
      ];

      if (showIGST) {
        row.push(`${p.igstPct || 0}%`);
      } else if (showGST) {
        row.push(`${(p.gstPct || (p.cgstPct + p.sgstPct) || 0)}%`);
      }

      if (showVAT) {
        row.push(`${p.vatPct || 0}%`);
      }

      row.push(fmt(p.total));
      return row;
    }),
    theme: "grid",
    margin: { left: ML, right: ML, top: 0, bottom: 0 },
    styles: {
      fontSize: 8.5,
      cellPadding: 1.5,
      overflow: "linebreak",
      textColor: BLACK,
      minCellHeight: 8,
      valign: "middle",
      halign: "center",
      lineColor: BLACK,
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: BLACK,
      textColor: WHITE,
      fontStyle: "bold",
      halign: "center",
      fontSize: 7.5,
      cellPadding: 1.2,
      valign: "middle",
      lineColor: BLACK,
      lineWidth: 0.1
    },
    bodyStyles: {
      lineColor: BLACK,
      lineWidth: 0.1,
      valign: "middle",
      halign: "center"
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 10, halign: 'center', valign: 'middle' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 14, halign: 'center' },
      8: { cellWidth: 14, halign: 'center' },
      9: { cellWidth: 14, halign: 'center' },
      10: { cellWidth: 28, halign: 'right' }
    },
    didDrawCell: (c) => {
      if (c.section === 'body' && c.column.index === 1) {
        const img = imgMap[data.products[c.row.index].srNo || c.row.index];
        if (img) try {
          const imgSize = 5;
          const cellCenterX = c.cell.x + (c.cell.width / 2) - (imgSize / 2);
          const cellCenterY = c.cell.y + (c.cell.height / 2) - (imgSize / 2);
          doc.addImage(img, undefined, cellCenterX, cellCenterY, imgSize, imgSize);
        } catch (e) { }
      }
      if (c.section === 'body') { doc.setDrawColor(...BLACK); doc.setLineWidth(0.2); doc.line(c.cell.x, c.cell.y + c.cell.height, c.cell.x + c.cell.width, c.cell.y + c.cell.height); }
    }
  });

  y = doc.lastAutoTable.finalY + 10;
  if (y + 50 > PH - FOOTER_SPACE) addNewPage();

  // Left: Bank Details Box
  let ly = y;
  if (data.showBankDetails) {
    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(ML, y, 90, 40, "F");

    sf("bold", 9); doc.setTextColor(...BLACK); doc.text("BANK DETAILS", ML + 5, y + 5);
    doc.setDrawColor(...BLACK); doc.setLineWidth(0.3); doc.line(ML + 5, y + 7, ML + 85, y + 7);

    ly = y + 12;
    sf("normal", 7.5);

    const bankData = data.bank || {};
    const hasValue = (v) => v && v.toString().trim() && v.toString().trim().toUpperCase() !== "IFSC" && v.toString().trim().toUpperCase() !== "N/A";

    const drawBankRow = (label, value) => {
      if (!hasValue(value)) return;
      doc.setTextColor(...BLACK);
      doc.text(label, ML + 5, ly);
      doc.text(":", ML + 16, ly);
      doc.setTextColor(...BLACK);
      doc.text(String(value), ML + 20, ly);
      ly += 4;
    };

    drawBankRow("Bank", bankData.bank_name);
    drawBankRow("Holder", bankData.account_holder_name);
    drawBankRow("A/C No", bankData.account_number);
    drawBankRow("Branch", bankData.branch);
    drawBankRow("IFSC", bankData.ifsc);
    drawBankRow("UPI", bankData.upi);

    if (bankQR) {
      try {
        doc.addImage(bankQR, "PNG", ML + 63, y + 8, 22, 22);
      } catch (e) { }
    }
  }

  // Right: Tax Calculation Summary
  let ry = y + 3;
  const drawR = (l, v, b = false) => {
    sf(b ? "bold" : "normal", 8.5);
    doc.setTextColor(...BLACK);
    doc.text(l, PW - ML - 60, ry);
    doc.text(v, PW - ML - 5, ry, { align: "right" });
    ry += 5;
  };

  drawR("Subtotal:", fmt(data.totals?.taxableAmount || 0));

  if (data.totals?.taxBreakdown?.length > 0) {
    data.totals.taxBreakdown.forEach(t => {
      drawR(`${t.label}:`, fmt(t.amount));
    });
  } else if (data.totals?.taxTotal > 0) {
    drawR("Tax:", fmt(data.totals.taxTotal));
  }

  if (data.totals?.additionalCharges > 0) {
    drawR("Additional Charge:", fmt(data.totals.additionalCharges));
  }

  if (data.totals?.discountAfterTax > 0) {
    drawR("Discount:", `-${fmt(data.totals.discountAfterTax)}`);
  }

  ry += 2;
  doc.setFillColor(...BLACK);
  doc.rect(PW - ML - 65, ry - 4, 65, 10, "F");
  sf("bold", 10);
  doc.setTextColor(...WHITE);
  doc.text("GRAND TOTAL:", PW - ML - 60, ry + 2);
  doc.text(fmt(data.totals?.total || 0), PW - ML - 5, ry + 2, { align: "right" });

  ly = Math.max(ly, ry + 10, y + 45);

  // NOTES
  if (data.notes) {
    const notesLines = doc.splitTextToSize(data.notes, 175);
    const notesHeight = notesLines.length * 4.1 + 12;
    ly = ly + 5;

    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(ML, ly, PW - ML * 2, notesHeight, 2, 2, "F");
    doc.setDrawColor(...BLACK);
    doc.roundedRect(ML, ly, PW - ML * 2, notesHeight, 2, 2, "D");

    sf("bold", 8);
    doc.setTextColor(...BLACK);
    doc.text("CUSTOMER NOTES", ML + 5, ly + 5);

    sf("normal", 8.5);
    doc.setTextColor(...BLACK);
    let ny = ly + 10;
    notesLines.forEach((ln) => {
      doc.text(ln, ML + 5, ny);
      ny += 5;
    });
    ly += notesHeight + 5;
  }

  // TERMS
  const hasValidTerms = data.termsSections?.some((sec) => sec.content && sec.content.trim().replace(/<[^>]*>?/gm, "").length > 0);
  const signatureReservedSpace = 50;

  if (hasValidTerms) {
    if (ly + 20 > PH - signatureReservedSpace) {
      addNewPage();
      ly = 65;
    }

    sf("bold", 10);
    doc.setTextColor(...BLACK);
    doc.text("", ML, ly);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.5);
    doc.line(ML, ly, PW - ML, ly);

    ly += 8;
    data.termsSections.forEach(s => {
      if (!s.content || s.content.trim().replace(/<[^>]*>?/gm, "").length === 0) return;

      if (ly + 30 > PH - signatureReservedSpace) {
        addNewPage();
        ly = 65;
      }

      sf("bold", 15);
      doc.setTextColor(...BLACK);
      doc.text(s.heading || "", ML, ly);

      ly += 6;

      const pageBreak = () => {
        addNewPage();
        ly = 65;
      };

      ly = renderHTMLToPDF(doc, s.content, ML, ly, PW - ML * 2, 5, pageBreak);

      ly += 6;
    });
  }

  // SIGNATURE
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);

  const signatureHeight = 40;
  const footerHeight = 13;
  const minSpaceNeeded = signatureHeight + footerHeight + 5;

  if (ly + minSpaceNeeded > PH - footerHeight) {
    addNewPage();
    ly = 65;
  }

  const sx = PW - 75;
  const bottomY = PH - 60;

  if (data.company?.stampUrl) {
    try {
      doc.addImage(data.company.stampUrl, "PNG", sx, bottomY, 25, 15);
    } catch { }
  }

  if (data.company?.signatureUrl) {
    try {
      doc.addImage(data.company.signatureUrl, "PNG", sx + 27, bottomY, 28, 15);
    } catch { }
  }

  sf("normal", 9);
  doc.setTextColor(...BLACK);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  doc.line(sx, bottomY + 18, sx + 57, bottomY + 18);
  doc.text("Company Stamp", sx, bottomY + 22);
  doc.text("Authorized Signatory", sx + 27, bottomY + 22);

  const tp = doc.getNumberOfPages();
  for (let i = 1; i <= tp; i++) {
    doc.setPage(i);
    const fY = PH - 17;



    sf("normal", 7);
    doc.text(`Page ${i}/${tp}`, PW - ML, PH - 5, { align: "right" });
  }
  return doc;
}
export default function FormatThree({ data, letterheadImage }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data) return;
    setLoading(true);
    buildPDF(data, letterheadImage).then(doc => {
      setPdfUrl(URL.createObjectURL(doc.output("blob")));
      setLoading(false);
    }).catch(e => {
      console.error("PDF Fail", e);
      setLoading(false);
    });
  }, [data, letterheadImage]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      {loading && (
        <div style={{
          padding: "40px",
          textAlign: "center",
          marginTop: "100px"
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "3px solid #f3f3f3",
            borderTop: "3px solid #3498db",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 15px"
          }} />
          <p style={{ color: "#64748b", fontWeight: "500" }}>Generating Preview...</p>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {pdfUrl && (
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
          <iframe src={pdfUrl} width="100%" height="850px" style={{ border: "none" }} />
        </div>
      )}
    </div>
  );
}