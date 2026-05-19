import React, { useState, useEffect } from "react";
import { DOCUMENT_TYPES } from "./documentTypeConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { numberToWords } from "../../utils/numberToWords";

/**
 * FormatOne - Modern & Clean Blue Theme
 */

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
        if (curY > 270) {
          if (pageBreakCallback) pageBreakCallback();
          curY = 30; lineBottomY = 26;
        }
      }

      applyFont(currentFont);
      let drawX = curX;
      const textW = doc.getTextWidth(first);
      const rowW = x + maxWidth - indentX;
      if (currentFont.align === 'center' && curX === indentX) drawX = indentX + (rowW - textW) / 2;
      else if (currentFont.align === 'right' && curX === indentX) drawX = indentX + (rowW - textW);

      if (pendingMarker) {
        if (pendingMarker.type === 'text') {
          doc.setFont("helvetica", "bold");
          doc.text(pendingMarker.prefix, pendingMarker.x, curY);
          doc.setFont("helvetica", currentFont.style);
        } else {
          doc.setFillColor(0, 0, 0);
          const mSz = 1.0;
          const mY = curY - currentFont.size * 0.12;
          if (pendingMarker.depth === 1) doc.circle(pendingMarker.x + 4, mY, mSz * 0.8, "F");
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
          if (curY > 270) { if (pageBreakCallback) pageBreakCallback(); curY = 30; lineBottomY = 26; }
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

const safeSym = (s, code) => {
  if (code === "NPR") return "NPR";
  if (code === "INR" || s === "₹" || s === "Rs.") return "INR";
  return s || code || "INR";
};

async function buildPDF(data, letterheadImage) {
  const doc = new jsPDF("p", "mm", "a4");
  const docNo = data.quotation?.number || data.invoice_number || "Document";
  doc.setProperties({ title: docNo });
  const F = "helvetica";
  const PW = 210, PH = 297, ML = 15, MR = 15;
  const PRIMARY = [60, 60, 60], DARK = [30, 30, 30], GRAY = [100, 100, 100], LT_GRAY = [240, 240, 240], WHITE = [255, 255, 255];
  const INK = [70, 70, 70], INKD = [40, 40, 40], INKA = [255, 255, 255], INKL = [245, 245, 245];

  const sf = (style = "normal", size = 9) => { doc.setFont(F, style); doc.setFontSize(size); };
  const sym = safeSym(data.currencySymbol, data.activeCurrency);
  const fmt = (v) => {
    const val = Number(v || 0).toLocaleString(data.activeCurrency === "NPR" ? "en-US" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sym} ${val}`;
  };

  // PRE-LOAD ALL IMAGES ROBUSTLY
  const [productImages, bankQR, einvoiceQR] = await Promise.all([
    Promise.all(data.products.map(async (p, i) => ({
      id: p.srNo || i,
      b64: await getBase64Image(p.image_url, `Product ${i + 1}`)
    }))),
    getBase64Image(data.bank?.qr_code, "Bank QR"),
    data.einvoice?.signed_qr_code
      ? getBase64Image(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.einvoice.signed_qr_code)}&size=100x100`, "E-Invoice QR")
      : Promise.resolve(null)
  ]);
  const lhImage = await getBase64Image(data.company?.letterheadUrl, "Letterhead");
  const imgMap = productImages.reduce((a, c) => { a[c.id] = c.b64; return a; }, {});

  // ══ HEADER — Dynamic Height ══
  // Pre-calculate how many lines the address text needs
  doc.setFont(F, "normal"); doc.setFontSize(8);

  const taxLabel = data.company.businessTypeLabel || "";
  const nameGstinText = `Name : ${data.company?.name || ""}  ${taxLabel ? ` , ${taxLabel} ${data.company.gstin}` : ''}`;
  // const nameGstinText = `Name : ${data.company?.name || ""}${taxLabel ? ` , ${taxLabel}` : ""}`;
  let compAddr = data.company?.addressLines || "";
  if (compAddr.length > 50) compAddr = compAddr.substring(0, 50) + "...";
  const addressText =
    `Address : ${compAddr} ,Phone : ${data.company?.tel || ""} , Email : ${data.company?.email || ""}`;
  const nameLines = doc.splitTextToSize(nameGstinText, 130);
  const addrLines = doc.splitTextToSize(addressText, 130);
  // Base: 10 (title) + 5 (name row) + addrLines * 4 + 4 (padding)
  const HEADER_H = Math.max(26, 10 + nameLines.length * 4.5 + addrLines.length * 4.5 + 6);

  doc.setFillColor(...INKD);
  doc.rect(0, 0, PW, HEADER_H, "F");

  // Diagonal accent strip
  doc.setFillColor(...INK);
  doc.rect(0, 0, 150, HEADER_H, "F");

  sf("bold", 17);
  doc.setTextColor(...WHITE);
  // doc.text(
  //   data.documentType === "quotation" ? "QUOTATION" : "PROFORMA INVOICE",
  //   ML,
  //   16,
  // );
  doc.text(
    data.documentType === DOCUMENT_TYPES.QUOTATION
      ? "QUOTATION"
      : data.documentType === DOCUMENT_TYPES.PROFORMA
        ? "PROFORMA INVOICE"
        : data.documentType === DOCUMENT_TYPES.SALES_INVOICE
          ? "TAX INVOICE"
          : data.documentType === DOCUMENT_TYPES.PURCHASE_ORDER
            ? "PURCHASE ORDER"
            : data.documentType === DOCUMENT_TYPES.DELIVERY_CHALLAN
              ? "DELIVERY CHALLAN"
              : data.documentType === DOCUMENT_TYPES.CREDIT_NOTE
                ? "CREDIT NOTE"
                : data.documentType === DOCUMENT_TYPES.DEBIT_NOTE
                  ? "DEBIT NOTE"
                  : data.documentType === DOCUMENT_TYPES.SALES_RETURN
                    ? "SALES RETURN"
                    : data.documentType === DOCUMENT_TYPES.PURCHASE_RETURN
                      ? "PURCHASE RETURN"
                      : data.documentType === DOCUMENT_TYPES.PURCHASE_INVOICE
                        ? "BOOK PURCHASE ORDER"
                        : data.documentType === DOCUMENT_TYPES.BOOK_INVOICE
                          ? "BOOK INVOICE"
                          : data.documentType === DOCUMENT_TYPES.EINVOICE
                            ? "E-INVOICE"
                            : data.documentType ===
                              DOCUMENT_TYPES.CUSTOM_QUOTATION
                              ? "CUSTOM QUOTATION"
                              : "DOCUMENT",
    ML,
    10,
  );

  sf("normal", 10);
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  // Draw name+gstin (may wrap)
  let hTextY = 15;
  nameLines.forEach(line => { doc.text(line, ML, hTextY); hTextY += 4.5; });
  // Draw address (may wrap)
  addrLines.forEach(line => { doc.text(line, ML, hTextY); hTextY += 4.5; });

  sf("normal", 8);
  doc.setTextColor(...INKA);

  const labelX = PW - ML;
  const startY = Math.max(6, (HEADER_H - 20) / 2 + 2); // vertically center in header
  const lineGap = 5;

  doc.text(
    `Doc No : ${data.quotation?.number || ""}`, labelX,
    startY,
    { align: "right" },
  );

  doc.text(`Date : ${data.quotation?.date || ""}`, labelX, startY + lineGap, { align: "right", });

  doc.text(
    `Valid Till : ${data.quotation?.dueDate || ""}`,
    labelX,
    startY + lineGap * 2,
    { align: "right" },
  );

  doc.text(
    `Payment Terms : ${data.totals?.paymentTerms || ""}`,
    labelX,
    startY + lineGap * 3,
    { align: "right" },
  );

  doc.setTextColor(...DARK);
  let y = HEADER_H + 2;

  //  Step 1: Calculate height
  const getBoxHeight = (w, lines) => {
    let contentHeight = 0;

    lines.forEach((l, i) => {
      const wrapped = doc.splitTextToSize(l, w - 12);
      const lineHeight = i === 0 ? 4.5 : 4;
      contentHeight += wrapped.length * lineHeight;
    });

    return Math.max(38, 14 + contentHeight);
  };

  //  Step 2: Draw box with fixed height
  const drawBox = (x, w, label, lines, boxHeight) => {
    doc.setFillColor(...INKL);
    doc.roundedRect(x, y, w, boxHeight, 3, 3, "F");

    doc.setFillColor(...INK);
    doc.rect(x, y, 3, boxHeight, "F");

    //  Title (BLUE)
    sf("bold", 8);
    doc.setTextColor(60, 60, 60); //  Dark Gray color
    doc.text(label, x + 7, y + 8);

    doc.setDrawColor(...INKA);
    doc.line(x + 7, y + 10, x + w - 4, y + 10);

    //  Content (BLACK)
    let ty = y + 16;

    lines.forEach((l, i) => {
      sf(i === 0 ? "bold" : "normal", i === 0 ? 9 : 8);

      doc.setTextColor(0, 0, 0); //  Black color

      const wrapped = doc.splitTextToSize(l, w - 12);

      wrapped.forEach((wl) => {
        if (ty < y + boxHeight - 2) {
          doc.text(wl, x + 7, ty);
          ty += i === 0 ? 5 : 4.5;
        }
      });
    });
  };

  //  Step 3: Prepare data
  const leftLines = [
    data.customer?.name || "",
    data.customer?.address || "",
    `Phone : ${data.customer?.phone || ""}`,
    `${data.customer?.customerTypeLabel}  - ${data.customer?.gstin || ""}`,
    data.shipping?.state ? `Place of Supply: ${data.shipping.state}` : (data.customer?.placeOfSupply ? `Place of Supply: ${data.customer.placeOfSupply}` : "")
  ];

  const rightLines = [
    data.shipping?.name || data.customer?.name || "",
    data.shipping?.address || data.customer?.address || "",
    data.shipping?.phone ? `Phone: ${data.shipping.phone}` : (data.customer?.phone ? `Phone: ${data.customer.phone}` : ""),
    // data.shipping?.state ? `Place of Supply: ${data.shipping.state}` : (data.customer?.placeOfSupply ? `Place of Supply: ${data.customer.placeOfSupply}` : "")
  ].filter(line => line && line.trim() !== "");

  //  Step 4: Calculate both heights
  const leftHeight = getBoxHeight(88, leftLines);
  const rightHeight = getBoxHeight(88, rightLines);

  //  Step 5: Use max height (IMPORTANT)
  // const finalHeight = Math.max(leftHeight, rightHeight);
  const finalHeight = Math.max(leftHeight + 5, rightHeight);

  //  Step 6: Draw both boxes with SAME height
  // drawBox(ML, 88, "BILL TO", leftLines, finalHeight);
  drawBox(
    ML,
    88,
    data.documentType === DOCUMENT_TYPES.PURCHASE_ORDER
      ? "Supplier / Service Provider"
      : "BILL TO",
    leftLines,
    finalHeight
  );
  drawBox(108, 80, "SHIP TO", rightLines, finalHeight);

  y += finalHeight + 5;

  // ================= E-INVOICE SECTION =================
  if (data.einvoice && data.einvoice.irn) {
    const einvH = 32;
    if (y + einvH > PH - 40) { doc.addPage(); y = 20; }

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(ML, y, PW - ML - 14, einvH, 2, 2, "F");
    doc.setDrawColor(220, 225, 235);
    doc.roundedRect(ML, y, PW - ML - 14, einvH, 2, 2, "D");

    sf("bold", 10); doc.setTextColor(...INK);
    doc.text("E-INVOICE DETAILS", ML + 5, y + 7);
    doc.setDrawColor(...INK);
    doc.line(ML + 5, y + 9, PW - 14 - 5, y + 9);

    const irn = data.einvoice.irn;
    const ackNo = data.einvoice.ack_no;
    const ackDate = data.einvoice.ack_date;

    sf("normal", 8); doc.setTextColor(...GRAY);
    doc.text("IRN:", ML + 5, y + 15);
    sf("bold", 8); doc.setTextColor(...DARK);
    const irnLines = doc.splitTextToSize(irn, PW - ML - 14 - 45);
    doc.text(irnLines, ML + 25, y + 15);

    sf("normal", 8); doc.setTextColor(...GRAY);
    doc.text("Ack No:", ML + 5, y + 23);
    sf("bold", 8); doc.setTextColor(...DARK);
    doc.text(String(ackNo || "-"), ML + 25, y + 23);

    sf("normal", 8); doc.setTextColor(...GRAY);
    doc.text("Ack Date:", ML + 60, y + 23);
    sf("bold", 8); doc.setTextColor(...DARK);
    doc.text(String(ackDate || "-"), ML + 80, y + 23);

    if (einvoiceQR) {
      try {
        doc.addImage(einvoiceQR, "PNG", PW - 14 - 28, y + 3, 25, 25);
      } catch (e) {
        console.warn("E-Invoice QR Error", e);
      }
    }
    y += einvH + 5;
  }
  // ══ TABLE ══

  // Check tax type from products
  const showIGST = data.products.some(p => Number(p.igstPct) > 0);
  const showGST = data.products.some(p => Number(p.cgstPct) > 0 || Number(p.sgstPct) > 0 || Number(p.gstPct) > 0);
  const showVAT = data.products.some(p => Number(p.vatPct) > 0);

  // Also check if any product has actual tax values regardless of taxType
  const head = ["NO", "IMAGE", "ITEM NAME", "HSN/SAC", "QTY", "UNIT PRICE", "DISC(%)"];
  if (showIGST) { head.push("IGST (%)"); }
  else if (showGST) { head.push("GST (%)"); }
  if (showVAT) { head.push("VAT (%)"); }

  head.push("TOTAL AMOUNT");
  autoTable(doc, {
    startY: y,
    head: [head],
    body: data.products.map((p, i) => {
      const discount = Number(p.discountPct || 0);

      const r = [
        p.srNo || i + 1,
        "",
        {
          content: (p.description).replace(/<[^>]*>?/gm, ""),
          isHtml: true,
          // rawHtml: p.description + (p.subtitle ? `<br/>${p.subtitle}` : ""),
          _p: p
        },
        p.hsn || "",
        `${p.qty} ${p.unit || ""}`,
        fmt(p.price),

        `${discount}%`
      ];

      // Tax values
      if (showIGST) {
        r.push(`${p.igstPct || 0}%`);
      } else if (showGST) {
        r.push(`${(p.gstPct || (p.cgstPct + p.sgstPct) || 0)}%`);
      }

      if (showVAT) {
        r.push(`${p.vatPct || 0}%`);
      }

      r.push(fmt(p.total));

      return r;
    }),
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      overflow: "linebreak",
      font: F,
      textColor: DARK,
      minCellHeight: 10,
      valign: "middle",
      halign: "center",
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: INK,
      textColor: WHITE,
      fontStyle: "bold",
      font: F,
      fontSize: 8.5,
      cellPadding: 2,
      valign: "middle",
      halign: "center",
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: [248, 248, 255], valign: "middle", halign: "center" },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },   // NO
      1: { cellWidth: 14, halign: "center" },  // IMAGE
      2: { cellWidth: "auto", halign: "left" }, // ITEM NAME
      3: { cellWidth: 20, halign: "center" },  // HSN/SAC
      4: { cellWidth: 12, halign: "center" },  // QTY
      5: { cellWidth: 24, halign: "right" },   // UNIT PRICE
      6: { cellWidth: 18, halign: "center" },  // DISC(%)
      7: { cellWidth: 18, halign: "center" },  // Tax (IGST/GST/VAT)
      8: { cellWidth: 30, halign: "right" },   // TOTAL AMOUNT
    },
    tableWidth: "auto",
    didDrawCell: function (cellData) {
      if (cellData.section === 'body' && cellData.column.index === 1) {
        const rowData = data.products[cellData.row.index];
        const img = imgMap[rowData.srNo || cellData.row.index];
        if (img) {
          const imgWidth = 10;
          const imgHeight = 8;
          const x = cellData.cell.x + (cellData.cell.width - imgWidth) / 2;
          const y = cellData.cell.y + (cellData.cell.height - imgHeight) / 2;
          try {
            doc.addImage(img, "PNG", x, y, imgWidth, imgHeight);
          } catch (e) {
            console.log("Image load error", e);
          }
        }
      }
      if (cellData.section === 'body' && cellData.column.index === 2 && cellData.cell.raw?.isHtml) {
        renderHTMLToPDF(doc, cellData.cell.raw.rawHtml, cellData.cell.x + 1, cellData.cell.y + 3, cellData.cell.width - 2, 3, null);
      }
    },
  });

  let fy = doc.lastAutoTable.finalY + 10;
  if (fy > 240) { doc.addPage(); fy = 30; }

  // ══ SUMMARY ROW ══
  // Calculate dynamic heights for both boxes
  const calculateLeftBoxHeight = () => {
    let height = 7; // Title
    height += 2; // Line

    // Amount in words (max 2 lines)
    const wl = doc.splitTextToSize(numberToWords(Math.round(data.totals.total)), 80);
    height += Math.min(wl.length, 2) * 4 + 4; // text lines + padding

    height += 5; // Bank Details title
    height += 2; // Line

    // QR code + bank details
    height += 20; // QR code space + text

    return height;
  };

  const calculateRightBoxHeight = () => {
    let height = 8; // Title
    height += 3; // Line

    // Count summary rows
    let rowCount = 2; // Total Qty + Subtotal
    if (data.totals.cgstAmount) rowCount++;
    if (data.totals.sgstAmount) rowCount++;
    if (data.totals.igstAmount) rowCount++;
    if (data.totals.taxTotal) rowCount++;
    if (data.totals.additionalCharges) rowCount++;
    if (data.totals.discountAfterTax) rowCount++;

    height += rowCount * 5 + 7; // rows + padding
    height += 3; // Line before grand total
    height += 2; // Grand total box

    return height;
  };

  const leftBoxHeight = calculateLeftBoxHeight();
  const rightBoxHeight = calculateRightBoxHeight();
  const summaryBoxHeight = Math.max(leftBoxHeight, rightBoxHeight, 54); // minimum 58mm

  // Left: Amount in words + bank
  doc.setFillColor(...INKL);
  doc.roundedRect(ML, fy, 88, summaryBoxHeight, 3, 3, "F");

  sf("bold", 8);
  doc.setTextColor(...INK);
  doc.text("AMOUNT IN WORDS", ML + 5, fy + 7);
  doc.setDrawColor(...INKA);
  doc.line(ML + 5, fy + 9, ML + 84, fy + 9);

  sf("normal", 7.5);
  doc.setTextColor(...DARK);
  const wl = doc.splitTextToSize(
    numberToWords(Math.round(data.totals.total)),
    80,
  );
  let wy = fy + 13;
  wl.slice(0, 2).forEach((l) => {
    doc.text(l, ML + 5, wy);
    wy += 4;
  });

  if (data.showBankDetails) {
    const bankDetailsY = fy + summaryBoxHeight - 35; // Position from bottom

    sf("bold", 8);
    doc.setTextColor(...INK);
    doc.text("BANK DETAILS", ML + 5, bankDetailsY);
    doc.line(ML + 5, bankDetailsY + 2, ML + 84, bankDetailsY + 2);

    const bankData = data.bank || {};
    let bY = bankDetailsY + 7;
    const drawB = (label, value) => {
      if (!value || value === "N/A" || value === "IFSC") return;
      sf("normal", 7.5);
      doc.setTextColor(...GRAY);
      doc.text(label, ML + 5, bY);
      doc.text(":", ML + 18, bY);
      doc.setTextColor(...DARK);
      doc.text(String(value), ML + 22, bY);
      bY += 4.5;
    };

    drawB("Bank", bankData.bank_name);
    drawB("Holder", bankData.account_holder_name);
    drawB("A/C No", bankData.account_number);
    drawB("Branch", bankData.branch);
    drawB("IFSC", bankData.ifsc);
    drawB("UPI", bankData.upi);

    // QR Code on RIGHT side (moved from left)
    if (bankQR) {
      try {
        // Move QR code to right side (ML + 65 gives more space for bank details on left)
        doc.addImage(bankQR, "PNG", ML + 65, bankDetailsY + 4, 20, 20);
      } catch (e) {
        console.log("QR code load error", e);
      }
    }
  }

  // Right: Dark total box
  doc.setFillColor(...INKD);
  doc.roundedRect(108, fy, 88, summaryBoxHeight, 3, 3, "F");

  sf("bold", 9);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL SUMMARY", 113, fy + 8);
  doc.setDrawColor(...INKA);
  doc.line(113, fy + 11, 192, fy + 11);

  sf("normal", 8);
  doc.setTextColor(255, 255, 255);
  const sumRows = [["Subtotal", data.totals.taxableAmount, true]];

  // Tax Breakdown logic
  if (data.totals?.taxBreakdown?.length > 0) {
    data.totals.taxBreakdown.forEach(t => {
      sumRows.push([t.label, t.amount, true]);
    });
  } else if (data.totals?.taxTotal > 0) {
    sumRows.push(["Tax", data.totals.taxTotal, true]);
  }

  if (data.totals.additionalCharges) {
    sumRows.push([`Additional Charge`, data.totals.additionalCharges, true]);
  }

  if (data.totals.discountAfterTax) {
    sumRows.push(["Discount", data.totals.discountAfterTax, true]);
  }


  let sY = fy + 18;

  sumRows.forEach(([label, value, isCurrency]) => {
    const displayValue = isCurrency ? fmt(value) : value;

    doc.text(label, 113, sY);
    doc.text(displayValue.toString(), 192, sY, { align: "right" });

    sY += 5;
  });

  const grandTotalY = fy + summaryBoxHeight - 14;

  doc.setDrawColor(...INKA);
  doc.line(113, grandTotalY - 2, 192, grandTotalY - 2);

  doc.setFillColor(...INK);
  doc.roundedRect(109, grandTotalY, 86, 12, 2, 2, "F");
  sf("bold", 10);
  doc.setTextColor(255, 255, 255);
  doc.text("GRAND TOTAL", 113, grandTotalY + 8);
  doc.text(fmt(data.totals.total), 192, grandTotalY + 8, { align: "right" });

  doc.setTextColor(...DARK);
  fy += summaryBoxHeight + 6;
  const setF = (s = "normal", sz = 10) => {
    doc.setFont("helvetica", s);
    doc.setFontSize(sz);
  };
  // ================= NOTES & REMARKS (Full Width Card) =================
  if (data.notes || data.remark) {
    const notesContent = [data.notes, data.remark].filter(Boolean).join("\n\n");
    const notesLines = doc.splitTextToSize(notesContent, 175);
    const notesHeight = notesLines.length * 5 + 12;

    fy = fy + 5;

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(ML, fy, 182, notesHeight, 2, 2, "F");
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(ML, fy, 182, notesHeight, 2, 2, "D");

    setF("bold", 8);
    doc.setTextColor(100, 100, 100);
    doc.text("NOTES & REMARKS", ML + 5, fy + 5);

    setF("normal", 8.5);
    doc.setTextColor(0, 0, 0);
    let ny = fy + 10;
    notesLines.forEach((ln) => {
      doc.text(ln, ML + 5, ny);
      ny += 5;
    });
    fy += notesHeight + 5;
  }
  // ══ TERMS ══
  const hasValidTerms = data.termsSections?.some((sec) => sec.content && sec.content.trim().replace(/<[^>]*>?/gm, "").length > 0,);

  const signatureReservedSpace = 50; // Reserve space for signature at bottom

  if (hasValidTerms) {
    // Check if we need a new page for terms
    if (fy + 20 > PH - signatureReservedSpace) {
      doc.addPage();
      if (lhImage) { try { doc.addImage(lhImage, "PNG", 0, 0, PW, PH); } catch { } }
      fy = 25;
    }

    sf("bold", 10);
    doc.setTextColor(...INK);
    doc.text(" ", ML, fy);
    // Underline below heading
    doc.setDrawColor(...INK); doc.setLineWidth(0.5);
    doc.line(ML, fy + 2, PW - ML, fy);

    fy += 8;
    data.termsSections.forEach(s => {
      if (!s.content || s.content.trim().replace(/<[^>]*>?/gm, "").length === 0) return;

      // Check if section heading needs new page
      if (fy + 30 > PH - signatureReservedSpace) {
        doc.addPage();
        if (lhImage) { try { doc.addImage(lhImage, "PNG", 0, 0, PW, PH); } catch { } }
        fy = 25;
      }

      // Section heading
      sf("bold", 10); doc.setTextColor(...INK);
      doc.text(s.heading || "", ML, fy);

      fy += 6;

      // Page break callback: adds new page and resets fy, renderHTMLToPDF uses returned curY
      const pageBreak = () => {
        doc.addPage();
        if (lhImage) { try { doc.addImage(lhImage, "PNG", 0, 0, PW, PH); } catch { } }
        fy = 25;
      };

      fy = renderHTMLToPDF(doc, s.content, ML, fy, PW - ML * 2, 5, pageBreak);

      fy += 6; // gap between sections
    });
  }

  // ================= SIGNATURE FIX (ALWAYS LAST PAGE) =================

  // 1. Go to last page
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);

  // 2. Check if enough space exists; if not, add a new page
  const signatureHeight = 40; // space needed for stamp + signature + labels
  const footerHeight = 13;
  const minSpaceNeeded = signatureHeight + footerHeight + 5;

  if (fy + minSpaceNeeded > PH - footerHeight) {
    doc.addPage();
    fy = 20;
  }

  const sx = PW - 90;
  const bottomY = PH - 40;

  // 3. Stamp
  if (data.company?.stampUrl) {
    try {
      doc.addImage(data.company.stampUrl, "PNG", sx, bottomY, 25, 18);
    } catch { }
  }

  // 4. Signature
  if (data.company?.signatureUrl) {
    try {
      doc.addImage(data.company.signatureUrl, "PNG", sx + 35, bottomY, 29, 18);
    } catch { }
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    sf("normal", 8); doc.setTextColor(...GRAY);
    doc.text(`Page ${i} / ${pages}`, PW / 2, PH - 10, { align: "center" });
  }

  return doc;
}

export default function FormatOne({ data, letterheadImage }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data) return;
    setLoading(true);
    buildPDF(data, letterheadImage)
      .then((doc) => setPdfUrl(URL.createObjectURL(doc.output("blob"))))
      .catch((err) => console.error("PDF Gen Error:", err))
      .finally(() => setLoading(false));
  }, [data, letterheadImage]);

  return (
    <div style={{ minHeight: "850px" }}>
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
      {!loading && pdfUrl && (
        <iframe src={pdfUrl} width="100%" height="850px" style={{ border: "none" }} title="PDF Preview" />
      )}
    </div>
  );
}
