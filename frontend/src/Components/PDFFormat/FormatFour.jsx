import { useState, useEffect } from "react";
import { DOCUMENT_TYPES } from "./documentTypeConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getBase64Image = async (url) => {
  if (!url) return null;
  let cleanUrl = typeof url === "string" ? url : url.url || "";
  if (!cleanUrl) return null;
  const dataMatch = cleanUrl.match(/data:image\/[^;]+;base64,[^"']+/);
  if (dataMatch) {
    cleanUrl = dataMatch[0];
  } else if (cleanUrl.includes("data:")) {
    const idx = cleanUrl.indexOf("data:");
    cleanUrl = cleanUrl.substring(idx);
  }
  if (cleanUrl.startsWith("data:")) return cleanUrl;
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
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(
      cleanUrl.substring(0, 100).replace(/\s/g, ""),
    );
    if (cleanUrl.length > 40 && isBase64)
      return `data:image/png;base64,${cleanUrl}`;
    return null;
  }
};

function renderHTMLToPDF(
  doc,
  html,
  x,
  startY,
  maxWidth,
  defaultLineHeight,
  pageBreakCallback,
) {
  if (!html) return startY;
  let curX = x;
  let curY = startY;
  let lineBottomY = startY - 4;
  let pendingMarker = null;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  let currentFont = {
    name: "helvetica",
    style: "normal",
    size: 8,
    isUnderline: false,
    isStrike: false,
    color: [0, 0, 0],
    align: "left",
  };

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
    const clean = text.replace(
      /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g,
      "",
    );
    if (!clean.trim()) return;

    applyFont(currentFont);
    let remaining = clean;
    while (remaining.length > 0) {
      let available = x + maxWidth - curX;
      if (available < 10) {
        newLine(1.2, indentX);
        available = x + maxWidth - curX;
      }

      const lines = doc.splitTextToSize(remaining, available);
      const first = lines[0];
      const lineHeight = currentFont.size * 0.38;
      const neededY = lineBottomY + lineHeight;

      if (curY < neededY) {
        curY = neededY;
        // Reserve space from bottom
        if (curY > 265) {
          if (pageBreakCallback) pageBreakCallback();
          curY = 25;
          lineBottomY = 21;
        }
      }

      applyFont(currentFont);
      let drawX = curX;
      const textW = doc.getTextWidth(first);
      const rowW = x + maxWidth - indentX;
      if (currentFont.align === "center" && curX === indentX)
        drawX = indentX + (rowW - textW) / 2;
      else if (currentFont.align === "right" && curX === indentX)
        drawX = indentX + (rowW - textW);

      if (pendingMarker) {
        if (pendingMarker.type === "text")
          doc.text(pendingMarker.prefix, pendingMarker.x, curY);
        else {
          doc.setFillColor(0, 0, 0);
          const mSz = currentFont.size * 0.06;
          const mY = curY - currentFont.size * 0.12;
          if (pendingMarker.depth === 1)
            doc.circle(pendingMarker.x + 4, mY, mSz * 0.8, "D");
          else if (pendingMarker.depth >= 2)
            doc.rect(pendingMarker.x + 3.5, mY - mSz / 2, mSz, mSz, "F");
          else doc.circle(pendingMarker.x + 4, mY, mSz, "F");
        }
        pendingMarker = null;
      }

      doc.text(first, drawX, curY);
      if (currentFont.isUnderline) {
        doc.setLineWidth(0.2);
        doc.line(drawX, curY + 0.5, drawX + textW, curY + 0.5);
      }
      if (currentFont.isStrike) {
        doc.setLineWidth(0.2);
        doc.line(
          drawX,
          curY - currentFont.size * 0.15,
          drawX + textW,
          curY - currentFont.size * 0.15,
        );
      }

      if (lines.length > 1) {
        newLine(1.2, indentX);
        remaining = remaining.substring(first.length).trimStart();
      } else {
        curX += textW;
        remaining = "";
      }
    }
  };

  const blockTags = [
    "DIV",
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "LI",
    "TR",
  ];

  const processNodes = (node, iX) => {
    const isBlock = blockTags.includes(node.nodeName);

    if (node.nodeName === "BR") {
      newLine(1.2, iX);
      return;
    }

    if (isBlock) {
      if (curX > iX && curX < iX + 10) lineBottomY += 0.5;
      else if (curX > iX) newLine(1.5, iX);
      else lineBottomY += 1.5;

      if (node.nodeName.startsWith("H")) {
        const n = parseInt(node.nodeName[1]);
        currentFont.size = 14 - n * 1.2;
        currentFont.style = "bold";
      }
    }

    if (node.nodeName === "TABLE") {
      if (curX > iX) newLine(2, iX);
      const tableY = Math.max(curY, lineBottomY + 2);
      autoTable(doc, {
        html: node,
        startY: tableY,
        theme: "grid",
        margin: { left: iX, right: 16 },
        styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
      });
      curY = doc.lastAutoTable.finalY;
      lineBottomY = curY + 3;
      curX = iX;
      return;
    }

    if (node.nodeName === "UL" || node.nodeName === "OL") {
      let listDepth = parseInt(node.getAttribute("data-depth")) || 0;
      let childIdx = 1;
      if (curX > iX) newLine(1.5, iX);

      node.childNodes.forEach((child) => {
        if (child.nodeName === "LI") {
          if (curX > iX) newLine(1.2, iX);
          const lineHeight = currentFont.size * 0.38;
          if (lineBottomY + lineHeight > curY) curY = lineBottomY + lineHeight;
          if (curY > 265) {
            if (pageBreakCallback) pageBreakCallback();
            curY = 25;
            lineBottomY = 21;
          }
          applyFont(currentFont);
          const itemBaselineY = curY;
          lineBottomY = itemBaselineY - lineHeight;

          if (node.nodeName === "OL") {
            pendingMarker = {
              type: "text",
              prefix: `${childIdx}. `,
              x: iX + 2,
            };
          } else {
            pendingMarker = { type: "bullet", depth: listDepth, x: iX };
          }
          curX = iX + 8;
          childIdx++;
          child.childNodes.forEach((n) => {
            if (n.nodeName === "UL" || n.nodeName === "OL")
              n.setAttribute("data-depth", listDepth + 1);
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
      if (node.nodeName === "STRONG" || node.nodeName === "B")
        currentFont.style = currentFont.style.includes("italic")
          ? "bolditalic"
          : "bold";
      if (node.nodeName === "EM" || node.nodeName === "I")
        currentFont.style = currentFont.style.includes("bold")
          ? "bolditalic"
          : "italic";
      if (node.nodeName === "U") currentFont.isUnderline = true;
      if (
        node.nodeName === "S" ||
        node.nodeName === "STRIKE" ||
        node.nodeName === "DEL"
      )
        currentFont.isStrike = true;

      if (node.style) {
        if (node.style.textAlign) currentFont.align = node.style.textAlign;
        if (
          node.style.fontWeight === "bold" ||
          parseInt(node.style.fontWeight) >= 600
        )
          currentFont.style = currentFont.style.includes("italic")
            ? "bolditalic"
            : "bold";
        if (node.style.fontStyle === "italic")
          currentFont.style = currentFont.style.includes("bold")
            ? "bolditalic"
            : "italic";
        if (node.style.fontSize) {
          const px = parseInt(node.style.fontSize);
          if (px) currentFont.size = Math.max(7, px * 0.5);
        }
        if (node.style.color) {
          const rgb = node.style.color.match(/\d+/g);
          if (rgb?.length >= 3) currentFont.color = [+rgb[0], +rgb[1], +rgb[2]];
        }
        const rawStyle = node.getAttribute?.("style") || "";
        const tdValue =
          node.style.textDecoration ||
          rawStyle.match(/text-decoration\s*:\s*([^;]+)/i)?.[1] ||
          "";
        if (tdValue.includes("underline")) currentFont.isUnderline = true;
        if (tdValue.includes("line-through")) currentFont.isStrike = true;
      }
      node.childNodes.forEach((n) => {
        if (n.nodeName === "UL" || n.nodeName === "OL")
          n.setAttribute(
            "data-depth",
            parseInt(node.getAttribute("data-depth") || 0) + 1,
          );
        processNodes(n, iX);
      });
      currentFont = savedFont;
    }

    if (isBlock) {
      if (curX > iX) newLine(1.5, iX);
      else lineBottomY += 1.5;
      if (node.nodeName.startsWith("H") || node.nodeName === "P") {
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
  const docNo =
    data.quotation?.number ||
    data.invoice_number ||
    data.po_number ||
    data.challan_number ||
    data.note_number ||
    "Document";
  doc.setProperties({ title: docNo });

  const isPO = data.documentType === DOCUMENT_TYPES.PURCHASE_ORDER;
  const isChallan = data.documentType === DOCUMENT_TYPES.DELIVERY_CHALLAN;

  const PW = 210,
    PH = 297,
    ML = 15,
    MR = 15;
  const ORANGE = [17, 142, 68],
    DARK = [0, 0, 0],
    GRAY = [80, 80, 80],
    LIGHT_GRAY = [245, 250, 247],
    WHITE = [255, 255, 255];
  const sf = (st = "normal", sz = 8) => {
    doc.setFont("helvetica", st);
    doc.setFontSize(sz);
  };
  const fmt = (v, showSym = true) => {
    const val = Number(v || 0).toLocaleString(
      data.activeCurrency === "NPR" ? "en-US" : "en-IN",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    );
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

  const [companyLogo, signature, stamp, lhImage, productImages, einvoiceQR] =
    await Promise.all([
      getBase64Image(data.company.logo?.url),
      getBase64Image(data.company.signatureUrl),
      getBase64Image(data.company?.stampUrl),
      getBase64Image(letterheadImage),
      Promise.all(
        data.products.map(async (p, i) => ({
          id: p.srNo || i,
          b64: await getBase64Image(p.image_url || p.image),
        })),
      ),
      data.einvoice?.signed_qr_code
        ? getBase64Image(
            `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.einvoice.signed_qr_code)}&size=100x100`,
            "E-Invoice QR",
          )
        : Promise.resolve(null),
    ]);

  const imgMap = productImages.reduce((a, c) => {
    a[c.id] = c.b64;
    return a;
  }, {});

  let y = 15;

  const drawFooterDecor = () => {
    // Left Primary Shape
    doc.setFillColor(...ORANGE);
    doc.triangle(0, PH, 0, PH - 15, PW * 0.65, PH, "F");

    // Right Overlapping Shape (lighter version of same green theme)
    doc.setFillColor(200, 232, 214);
    doc.triangle(PW, PH, PW, PH - 10, PW * 0.35, PH, "F");
  };

  const addNewPage = () => {
    doc.addPage();
    if (lhImage) {
      try {
        doc.addImage(lhImage, "PNG", 0, 0, PW, PH);
      } catch {}
    } else {
      drawFooterDecor();
    }
    y = 20;
  };

  if (lhImage) {
    try {
      doc.addImage(lhImage, "PNG", 0, 0, PW, PH);
    } catch {}
    y = 70;
  } else {
    // ================= HEADER =================
    sf("bold", 22);
    doc.setTextColor(...ORANGE);
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
    const title = titleMap[data.documentType] || "DOCUMENT";
    sf("bold", title.length > 15 ? 18 : 22);
    doc.text(title, ML, y + 8);

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
      [DOCUMENT_TYPES.PURCHASE_INVOICE]: "Purchase",
      [DOCUMENT_TYPES.BOOK_INVOICE]: "Invoice",
      [DOCUMENT_TYPES.EINVOICE]: "E-Invoice",
      [DOCUMENT_TYPES.CUSTOM_QUOTATION]: "Quotation",
    };
    const labelPrefix = labelPrefixMap[data.documentType] || "Document";

    sf("normal", 8);
    doc.setTextColor(...DARK);
    let metaY = y + 15;
    const quotationNumber =
      data.quotation?.number ||
      data.invoice_number ||
      data.po_number ||
      data.challan_number ||
      data.note_number ||
      "";
    const quotationDate =
      data.quotation?.date ||
      data.date ||
      data.invoice_date ||
      data.po_date ||
      data.challan_date ||
      "";
    const isLongQuotationNo = quotationNumber.length > 15;

    const metaRows = isLongQuotationNo
      ? [
          [`${labelPrefix} No :`, quotationNumber],
          [`${labelPrefix} Date :`, quotationDate],
          [`Due Date :`, data.quotation?.dueDate || data.due_date || ""],
          data.totals?.paymentTerms
            ? [`Payment Terms :`, `${data.totals.paymentTerms} Days`]
            : null,
          data.quotation?.po_agreement_number
            ? [`P.O/Aggr No :`, data.quotation.po_agreement_number]
            : null,
          data.quotation?.reference || data.reference
            ? [`Reference :`, data.quotation?.reference || data.reference]
            : null,
        ].filter(Boolean)
      : [
          [`${labelPrefix} No :`, quotationNumber],
          [`${labelPrefix} Date :`, quotationDate],
          [`Due Date :`, data.quotation?.dueDate || data.due_date || ""],
          data.totals?.paymentTerms
            ? [`Payment Terms :`, `${data.totals.paymentTerms} Days`]
            : null,
          data.quotation?.po_agreement_number
            ? [`P.O/Aggr No :`, data.quotation.po_agreement_number]
            : null,
          data.quotation?.reference || data.reference
            ? [`Reference :`, data.quotation?.reference || data.reference]
            : null,
        ].filter(Boolean);

    const col2X = ML + 45;
    const labelW = 22;

    if (isLongQuotationNo) {
      metaRows.forEach((row) => {
        doc.text(row[0], ML, metaY);
        const valueLines = doc.splitTextToSize(String(row[1]), 70);
        doc.text(valueLines, ML + labelW, metaY);
        metaY += Math.max(5, valueLines.length * 4);
      });
    } else {
      for (let i = 0; i < metaRows.length; i += 2) {
        if (metaRows[i]) {
          doc.text(metaRows[i][0], ML, metaY);
          doc.text(String(metaRows[i][1]), ML + labelW, metaY);
        }
        if (metaRows[i + 1]) {
          doc.text(metaRows[i + 1][0], col2X, metaY);
          doc.text(String(metaRows[i + 1][1]), col2X + labelW, metaY);
        }
        metaY += 5;
      }
    }

    // Company Logo & Info (Right)
    const textStartX = PW - MR - 60;
    if (companyLogo) {
      try {
        doc.addImage(companyLogo, undefined, textStartX - 25, y, 20, 16);
      } catch (e) {}
    }

    sf("bold", 11);
    doc.setTextColor(...DARK);
    const compName = data.company?.name || "";
    const wrappedCompName = doc.splitTextToSize(compName, 60);
    wrappedCompName.forEach((line, i) => {
      doc.text(line, textStartX, y + 4 + i * 4.5);
    });

    sf("normal", 8);
    doc.setTextColor(...GRAY);
    let headerY = y + 4 + wrappedCompName.length * 4.5;

    // Business Address in Header
    const hAddr1 =
      data.company?.addressLines?.[0] || data.company?.address_line1 || "";
    const hAddr2 =
      data.company?.addressLines?.[1] || data.company?.address_line2 || "";
    const hCity = data.company?.city || "";
    const hState = data.company?.state || "";
    const hPin = data.company?.pincode || data.company?.zip_code || "";
    let businessAddress =
      data.company?.address ||
      [hAddr1, hAddr2, hCity, hState, hPin].filter(Boolean).join(", ");

    if (businessAddress) {
      const addrLines = doc.splitTextToSize(businessAddress, 60);
      addrLines.forEach((line) => {
        doc.text(line, textStartX, headerY);
        headerY += 3.5;
      });
      headerY += 1;
    }

    const compEmail = data.company?.email || "";
    if (compEmail) {
      doc.text(compEmail, textStartX, headerY);
      headerY += 4;
    }

    const taxLabel = data.company?.businessTypeLabel || "";
    const taxNumber = data.company?.gstin || "";
    if (taxNumber) {
      doc.text(`${taxLabel} ${taxNumber}`, textStartX, headerY);
      headerY += 4;
    }

    y += Math.max(30, headerY - y + 5);

    // ================= PARTY DETAILS =================
    const partyBoxStartY = y - 2;

    // Helper to extract values from all possible locations
    const getV = (field) => {
      return (
        data[field] ||
        data.meta?.[field] ||
        data.invoice_data?.[field] ||
        data.quotation_data?.[field] ||
        data.shipping?.[field] ||
        data.shipping_party?.[field] ||
        data.customer?.[field] ||
        ""
      );
    };

    // Helper to split text with word-breaking for long strings
    const safeSplit = (text, width) => {
      if (!text) return [];
      const lines = doc.splitTextToSize(String(text), width);
      const result = [];
      lines.forEach((line) => {
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

    sf("bold", 9);
    doc.setTextColor(...ORANGE);
    const billToLabel = isPO ? "SUPPLIER / SERVICE PROVIDER" : "BILL TO";
    const shipToLabel = "SHIP TO";
    doc.text(billToLabel, ML + 3, y + 4);
    doc.text(shipToLabel, PW / 2 + 5, y + 4);
    y += 10;

    const boxW = (PW - ML - MR) / 2;
    const textWrapW = boxW - 8;

    // BILL TO DATA
    const bName =
      getV("billing_attention") ||
      data.billing?.attention ||
      data.customer?.name ||
      data.party?.name ||
      "";
    
    // Set font to match how it's drawn (bold 10) for accurate splitting
    sf("bold", 10);
    const bNameLines = safeSplit(bName, textWrapW);

    const bAddrStr = getV("billing_address") || data.customer?.address || "";
    const bAddr2 = getV("billing_line2") || "";
    const bCity = getV("city") || data.customer?.city || "";
    const bState = getV("state") || data.customer?.state || "";
    const bPin = getV("pincode") || data.customer?.pincode || "";
    const bCountryVal = (getV("country") || data.customer?.country || "").trim();
    const bFullAddr = formatAddressSafe(bAddrStr, bAddr2, bCity, bState, bPin, bCountryVal);
      
    // Set font to match how it's drawn (normal 8) for accurate splitting
    sf("normal", 8);
    const bAddrLines = safeSplit(bFullAddr, textWrapW);

    // SHIP TO DATA
    const sName =
      getV("shipping_attention") ||
      data.shipping?.attention ||
      data.shipping_address?.attention ||
      data.shipping_party?.attention ||
      "";
      
    // Set font to match how it's drawn (bold 10) for accurate splitting
    sf("bold", 10);
    const sNameLines = sName ? safeSplit(sName, textWrapW) : [];

    const sAddrStr = getV("shipping_address") || data.shipping?.address || "";
    const sAddr2 = getV("shipping_line2") || "";
    const sCity = getV("ship_city") || data.shipping?.city || "";
    const sState = getV("ship_state") || data.shipping?.state || "";
    const sPin = getV("ship_pincode") || data.shipping?.pincode || "";
    const sCountryVal = (getV("ship_country") || data.shipping?.country || "").trim();
    const sFullAddr = formatAddressSafe(sAddrStr, sAddr2, sCity, sState, sPin, sCountryVal);
      
    // Set font to match how it's drawn (normal 8) for accurate splitting
    sf("normal", 8);
    const sAddrLines = safeSplit(sFullAddr, textWrapW);

    const bTaxLabel =
      (data.customer?.customerTypeLabel ||
      (data.activeCurrency === "NPR" ? "VAT No" : "GSTIN")).replace(/:/g, "").trim();
    const bTax = data.customer?.gstin || data.party?.gstin || "";
    const bPh = data.customer?.tel || data.customer?.phone || data.party?.tel || data.party?.phone || "";
    const bEmail = data.customer?.email || data.party?.email || "";

    const sTaxLabel = (data.shipping?.customerTypeLabel || bTaxLabel).replace(/:/g, "").trim();
    const sTax =
      data.shippingGstin ||
      data.shipping_gstin ||
      data.shipping?.gstin ||
      bTax;
    const sPh =
      data.shippingPhone ||
      data.shipping_phone ||
      data.shipping?.phone ||
      data.shipping?.tel ||
      bPh;
    const sEmail = data.shipping?.email || "";

    // RENDER BILL TO
    let partyY = y;
    sf("bold", 10);
    doc.setTextColor(...DARK);
    bNameLines.forEach((line) => {
      doc.text(line, ML + 5, partyY);
      partyY += 4.5;
    });

    sf("normal", 8);
    bAddrLines.forEach((line) => {
      doc.text(line, ML + 5, partyY);
      partyY += 3.8;
    });
    if (bPh) {
      doc.text(`Phone: ${bPh}`, ML + 5, partyY);
      partyY += 4;
    }
    if (bEmail) {
      doc.text(`Email: ${bEmail}`, ML + 5, partyY);
      partyY += 4;
    }
    if (bTax) {
      doc.text(`${bTaxLabel} : ${bTax}`, ML + 5, partyY);
      partyY += 4;
    }

    // RENDER SHIP TO
    let fromY = y;
    sf("bold", 10);
    doc.setTextColor(...DARK);
    sNameLines.forEach((line) => {
      doc.text(line, PW / 2 + 5, fromY);
      fromY += 4.5;
    });

    sf("normal", 8);
    sAddrLines.forEach((line) => {
      doc.text(line, PW / 2 + 5, fromY);
      fromY += 3.8;
    });
    if (sPh) {
      doc.text(`Phone: ${sPh}`, PW / 2 + 5, fromY);
      fromY += 4;
    }
    if (sEmail) {
      doc.text(`Email: ${sEmail}`, PW / 2 + 5, fromY);
      fromY += 4;
    }
    if (sTax) {
      doc.text(`${sTaxLabel} : ${sTax}`, PW / 2 + 5, fromY);
      fromY += 4;
    }

    const partyBoxHeight = Math.max(partyY, fromY) - partyBoxStartY + 2;
    doc.setDrawColor(230, 235, 245);
    doc.setLineWidth(0.1);

    // Left Box (Invoice To)
    doc.roundedRect(ML, partyBoxStartY, 88, partyBoxHeight, 1, 1, "D");
    // Right Box (Invoice From)
    doc.roundedRect(PW / 2 + 2, partyBoxStartY, 88, partyBoxHeight, 1, 1, "D");

    // ================= E-INVOICE SECTION =================
    if (data.einvoice && data.einvoice.irn) {
      y = partyBoxStartY + partyBoxHeight;
      const ewayBillNo = data.einvoice.eway_bill_no || data.einvoice.ewayBillNo;
      const ewayBillDate = data.einvoice.eway_bill_date || data.einvoice.ewayBillDate;
      const hasEway = !!ewayBillNo;
      const einvH = hasEway ? 38 : 32;

      if (y + einvH > PH - 40) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(250, 251, 254);
      doc.roundedRect(ML, y, PW - ML - MR, einvH, 1, 1, "F");
      doc.setDrawColor(230, 235, 245);
      doc.roundedRect(ML, y, PW - ML - MR, einvH, 1, 1, "D");

      sf("bold", 9.5);
      doc.setTextColor(...ORANGE);
      doc.text("E-INVOICE & E-WAY BILL DETAILS", ML + 5, y + 7);
      doc.setDrawColor(...ORANGE);
      doc.line(ML + 5, y + 9, PW - MR - 5, y + 9);

      const irn = data.einvoice.irn;
      const ackNo = data.einvoice.ack_no;
      const ackDate = data.einvoice.ack_date;

      sf("normal", 8);
      doc.setTextColor(...GRAY);
      doc.text("IRN:", ML + 5, y + 15);
      sf("bold", 8);
      doc.setTextColor(...DARK);
      const irnLines = doc.splitTextToSize(irn, PW - ML - MR - 45);
      doc.text(irnLines, ML + 25, y + 15);

      sf("normal", 8);
      doc.setTextColor(...GRAY);
      doc.text("Ack No:", ML + 5, y + 23);
      sf("bold", 8);
      doc.setTextColor(...DARK);
      doc.text(String(ackNo || "-"), ML + 25, y + 23);

      sf("normal", 8);
      doc.setTextColor(...GRAY);
      doc.text("Ack Date:", ML + 60, y + 23);
      sf("bold", 8);
      doc.setTextColor(...DARK);
      doc.text(String(ackDate || "-"), ML + 80, y + 23);

      if (ewayBillNo) {
        sf("normal", 8);
        doc.setTextColor(...GRAY);
        doc.text("E-Way Bill No:", ML + 5, y + 31);
        sf("bold", 8);
        doc.setTextColor(...DARK);
        doc.text(String(ewayBillNo), ML + 25, y + 31);

        sf("normal", 8);
        doc.setTextColor(...GRAY);
        doc.text("E-Way Bill Date:", ML + 60, y + 31);
        sf("bold", 8);
        doc.setTextColor(...DARK);
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
    } else {
      y = partyBoxStartY + partyBoxHeight + 5;
    }
  }

  // --- Dynamic Geographic Tax Logic ---
  const normalizeCountry = (c) => {
    const country = (c || '').trim().toLowerCase();
    if (country === 'in' || country === 'india' || country === 'ind') return 'india';
    return country;
  };

  const compCountry = normalizeCountry(data.company?.country || "India");
  const custCountry = normalizeCountry(data.shipping?.country || data.customer?.country || "India");
  const compState = (data.company?.state || "").toLowerCase().trim();
  const custState = (
    data.shipping?.state ||
    data.customer?.state ||
    ""
  )
    .toLowerCase()
    .trim();

  // Primary Check: If data has both CGST and SGST values, we MUST split it.
  const hasSplitValues = data.products.some(
    (p) => p.cgstPct > 0 && p.sgstPct > 0,
  );

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
    if (firstP.taxType === "VAT") {
      showVAT = true;
      showIGST = false;
      showSingleGST = false;
    }
    if (firstP.taxType === "IGST") {
      showIGST = true;
      showVAT = false;
      showSingleGST = false;
    }
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

  const activeSym = data.activeCurrency || "INR";
  
  const headArr = [
    "NO.",
    "IMG",
    "ITEM NAME",
    "HSN",
    "QTY.",
    "UNIT",
    `PRICE (${activeSym})`,
    "DISC(%)",
  ];

  if (showIGST) {
    const taxLabel = (compCountry !== custCountry) ? 'GST (%)' : 'IGST (%)';
    headArr.push(taxLabel);
  } else if (showCGST_SGST) {
    headArr.push("CGST (%)", "SGST (%)");
  } else if (showVAT) {
    headArr.push("VAT (%)");
  } else if (showSingleGST) {
    headArr.push("GST (%)");
  }

  headArr.push(`TOTAL (${activeSym})`);

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [headArr],
    body: data.products.map((p, i) => {
      const row = [
        String(i + 1).padStart(2, "0"),
        "", // Placeholder for image
        (p.name || p.description || "").replace(/<[^>]*>?/gm, ""),
        p.hsn || "-",
        p.qty,
        p.unit || "PCS",
        fmt(p.price, false),
        `${p.discountPct || 0}%`,
      ];
      
      const lineTaxable = p.price * p.qty;

      if (showIGST) {
        row.push(`${p.igstPct || 0}%`);
      } else if (showCGST_SGST) {
        row.push(`${p.cgstPct || 0}%`, `${p.sgstPct || 0}%`);
      } else if (showVAT) {
        row.push(`${p.vatPct || 0}%`);
      } else if (showSingleGST) {
        const totalGstPct = (p.cgstPct || 0) + (p.sgstPct || 0) + (p.igstPct || 0) + (p.vatPct || 0);
        row.push(`${totalGstPct || 0}%`);
      }

      row.push(fmt(p.total, false));
      return row;
    }),
    theme: "grid",
    headStyles: {
      fillColor: ORANGE,
      textColor: WHITE,
      fontStyle: "bold",
      halign: "center",
      fontSize: 8.5,
      cellPadding: 1.2,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 1.2,
      valign: "middle",
      halign: "center",
      lineColor: [210, 220, 215],
      minCellHeight: 7,
    },
    columnStyles: (() => {
      const styles = {
        0: { cellWidth: 8, halign: "center" }, // NO.
        1: { cellWidth: 12, halign: "center" }, // IMG
        2: { cellWidth: "auto", halign: "left" }, // ITEM NAME
        3: { cellWidth: 18, halign: "center" }, // HSN
        4: { cellWidth: 10, halign: "center" }, // QTY.
        5: { cellWidth: 12, halign: "center" }, // UNIT
        6: { cellWidth: 22, halign: "right" }, // PRICE
        7: { cellWidth: 14, halign: "center" }, // DISC(%)
      };

      let colIdx = 8;
      if (showIGST || showVAT || showSingleGST) {
        styles[colIdx++] = { cellWidth: 18, halign: "center" }; // %
      } else if (showCGST_SGST) {
        styles[colIdx++] = { cellWidth: 16, halign: "center" }; // CGST %
        styles[colIdx++] = { cellWidth: 16, halign: "center" }; // SGST %
      }
      styles[colIdx] = { cellWidth: 24, halign: "right" }; // TOTAL
      return styles;
    })(),
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didDrawCell: (cellData) => {
      if (cellData.section === "body" && cellData.column.index === 1) {
        const p = data.products[cellData.row.index];
        const img = imgMap[p.srNo || cellData.row.index];
        if (img) {
          try {
            const size = 6;
            const x = cellData.cell.x + cellData.cell.width / 2 - size / 2;
            const y = cellData.cell.y + cellData.cell.height / 2 - size / 2;
            doc.addImage(img, "PNG", x, y, size, size);
          } catch (e) {}
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;
  let ly = y;

  // ================= BANK & TAX SUMMARY (Side-by-Side) =================
  if (ly + 50 > PH - 40) {
    addNewPage();
    ly = 20;
  }
  let sectionStartY = ly;

  // Left: Bank Details
  if (!isChallan && data.bank) {
    sf("bold", 9);
    doc.setTextColor(...DARK);
    doc.text("BANK DETAILS", ML + 5, ly);
    ly += 6;
    sf("normal", 8);
    const bankData = data.bank || {};
    const hasValue = (v) =>
      v &&
      v.toString().trim() &&
      v.toString().trim().toUpperCase() !== "IFSC" &&
      v.toString().trim().toUpperCase() !== "N/A";

    const drawBankRow = (label, value) => {
      if (!hasValue(value)) return;
      doc.setTextColor(...GRAY);
      doc.text(label, ML + 5, ly);
      doc.text(":", ML + 16, ly);
      doc.setTextColor(...DARK);
      doc.text(String(value), ML + 20, ly);
      ly += 4;
    };

    drawBankRow("Bank", bankData.bank_name);
    drawBankRow("Holder", bankData.account_holder_name);
    drawBankRow("A/C No", bankData.account_number);
    drawBankRow("Branch", bankData.branch);
    drawBankRow("IFSC", bankData.ifsc);
    drawBankRow("UPI", bankData.upi);

    // QR Code inside Bank Details box
    const bankQR = await getBase64Image(data.bank?.qr_code);
    if (bankQR) {
      try {
        doc.addImage(bankQR, "PNG", ML + 62, sectionStartY + 4, 22, 22);
        sf("normal", 6.5);
        doc.setTextColor(...GRAY);
        doc.text("Scan to Pay", ML + 73, sectionStartY + 28, {
          align: "center",
        });
      } catch (e) {}
    }

    // Draw border around the bank details box (after all rows, so height is known)
    const bankBoxH = ly - sectionStartY + 8;
    doc.setDrawColor(230, 235, 245);
    doc.setLineWidth(0.2);
    doc.roundedRect(ML, sectionStartY - 4, 88, bankBoxH + 4, 0.5, 1.5, "D");
  }

  // Right: Tax Calculation Summary
  let ry = sectionStartY + 5;
  
  if (!isChallan) {
    const drawR = (l, v, b = false) => {
      sf(b ? "bold" : "normal", 8.2);
      doc.setTextColor(...DARK);

      const labelX = PW - MR - 88;
      const valueX = PW - MR - 5;
      const maxValueWidth = 48;

      doc.text(l, labelX, ry);

      const valueLines = doc.splitTextToSize(String(v), maxValueWidth);
      doc.text(valueLines, valueX, ry, { align: "right" });

      ry += valueLines.length > 1 ? valueLines.length * 4 : 4.5;
    };

    drawR("Subtotal:", fmt(data.totals?.taxableAmount || 0));

    // Tax Breakdown logic
    if (data.totals?.taxBreakdown?.length > 0) {
      data.totals.taxBreakdown.forEach((t) => {
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

    const grandTotalValue = fmt(data.totals?.total || 0);
    const grandTotalBoxX = PW - MR - 88; // move box to right side
    const grandTotalBoxW = 88; // box width
    const grandTotalLines = doc.splitTextToSize(grandTotalValue, 42);
    const grandTotalBoxH = grandTotalLines.length > 1 ? 14 : 10;

    doc.setFillColor(...ORANGE);
    doc.rect(grandTotalBoxX, ry - 4, grandTotalBoxW, grandTotalBoxH, "F");

    sf("bold", 9);
    doc.setTextColor(...WHITE);
    doc.text("GRAND TOTAL:", grandTotalBoxX + 4, ry + 2.5);

    sf("bold", 9);
    doc.text(grandTotalLines, grandTotalBoxX + grandTotalBoxW - 4, ry + 2.5, {
      align: "right",
    });

    ry += grandTotalBoxH + 4;
  }

  // Stabilize layout: ensure next section starts AFTER the taller of bank or tax area
  ly = Math.max(ly, ry + 4);

  const sigSpace = 55;

  // ================= REMARK & NOTES (autoTable for Pagination) =================
  if (data.notes || data.remark) {
    const hasBoth = data.notes && data.remark;
    const tableHead = [];
    const tableBody = [];

    if (hasBoth) {
      tableHead.push([
        { content: "Notes :" },
        { content: "" }, // gap
        { content: "Remark :" },
      ]);
      tableBody.push([
        { content: data.notes },
        { content: "" }, // gap
        { content: data.remark },
      ]);
    } else {
      const label = data.notes ? "Notes :" : "Remark :";
      const val = data.notes || data.remark;
      tableHead.push([{ content: label }]);
      tableBody.push([{ content: val }]);
    }

    autoTable(doc, {
      startY: ly,
      margin: { left: ML, right: MR, bottom: sigSpace },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      showHead: "firstPage",
      headStyles: {
        fillColor: [250, 251, 254],
        lineColor: [230, 235, 245],
        lineWidth: 0.2,
        textColor: ORANGE,
        fontStyle: "bold",
        fontSize: 9.5,
        valign: "middle",
        cellPadding: 1.5,
      },
      styles: {
        fontSize: 9,
        cellPadding: 1.5,
        lineColor: [230, 235, 245],
        lineWidth: 0.2,
        textColor: DARK,
        fillColor: [250, 251, 254],
        valign: "top",
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: hasBoth ? (PW - ML - MR - 4) / 2 : "auto" },
        1: { cellWidth: hasBoth ? 4 : 0 },
        2: { cellWidth: hasBoth ? (PW - ML - MR - 4) / 2 : 0 },
      },
      willDrawCell: (cellData) => {
        // Make the gap column entirely invisible
        if (hasBoth && cellData.column.index === 1) {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(255, 255, 255);
        }
      },
    });

    ly = doc.lastAutoTable.finalY + 6;
  }

  // ================= TERMS & CONDITIONS =================
  const hasValidTerms = data.termsSections?.some(
    (s) => s.content && s.content.trim().replace(/<[^>]*>?/gm, "").length > 0,
  );

  if (hasValidTerms) {
    if (ly + 20 > PH - sigSpace) {
      addNewPage();
      ly = 20;
    }

    // Section heading
    sf("bold", 9.5);
    doc.setTextColor(...ORANGE);
    // doc.text("TERMS & CONDITIONS", ML, ly + 4);
    ly += 6;

    // Divider line under heading
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.6);
    // doc.line(ML, ly, PW - MR, ly);
    ly += 6;

    data.termsSections.forEach((s) => {
      if (!s.content || s.content.trim().replace(/<[^>]*>?/gm, "").length === 0)
        return;
      if (ly + 30 > PH - sigSpace) {
        addNewPage();
        ly = 20;
      }
      sf("bold", 13);
      doc.setTextColor(...DARK);
      doc.text(s.heading || "", ML, ly);
      ly += 5;

      const pBreak = () => {
        addNewPage();
        ly = 20;
      };
      ly = renderHTMLToPDF(doc, s.content, ML, ly, PW - ML - MR, 5, pBreak);
      ly += 6;
    });
  }

  // ================= SIGNATURE WITH STAMP =================
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);

  const sigHeight = 40;
  if (ly + sigHeight > PH - 15) {
    addNewPage();
    ly = 20;
  }

  const sx = PW - 80;
  const bottomY = PH - 40;

  if (stamp) {
    try {
      doc.addImage(stamp, "PNG", sx, bottomY - 15, 25, 15);
    } catch {}
  }
  if (signature) {
    try {
      doc.addImage(signature, "PNG", sx + 30, bottomY - 15, 28, 15);
    } catch {}
  }

  sf("normal", 9);
  doc.setTextColor(...DARK);
  doc.text("Company Stamp", sx + 12.5, bottomY + 5, { align: "center" });
  doc.text("Authorized Signatory", sx + 45, bottomY + 5, { align: "center" });

  // Add Footers to all pages - recalculate total pages to include any new page added for signature
  const finalTotalPages = doc.getNumberOfPages();
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i);
    const fY = PH - 5;
    sf("bold", 11);
    doc.setTextColor(...ORANGE);
    doc.text("", PW / 2, fY - 5, { align: "center" });
    drawFooterDecor();
  }

  return doc;
}

export default function FormatFour({ data, letterheadImage }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!data) return;
    setLoading(true);
    buildPDF(data, letterheadImage)
      .then((doc) => {
        setPdfUrl(URL.createObjectURL(doc.output("blob")));
        setLoading(false);
      })
      .catch((e) => {
        console.error("PDF Fail", e);
        setLoading(false);
      });
  }, [data, letterheadImage]);

  return (
    <div style={{ minHeight: "850px" }}>
      {loading && (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            marginTop: "100px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #f3f3f3",
              borderTop: "3px solid #3498db",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 15px",
            }}
          />
          <p style={{ color: "#64748b", fontWeight: "500" }}>
            Generating Preview...
          </p>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
      {!loading && pdfUrl && (
        <iframe
          src={pdfUrl}
          title="Invoice Format 4"
          width="100%"
          height="850px"
          style={{ border: "none" }}
        />
      )}
    </div>
  );
}
