import { useState, useEffect } from "react";
import { DOCUMENT_TYPES } from "./documentTypeConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ═══════════════════════════════════════════════════════════════════
//  UTILITY — base64 image loader
// ═══════════════════════════════════════════════════════════════════
const getBase64Image = async (url) => {
  if (!url) return null;
  let u = typeof url === "string" ? url : url.url || "";
  if (!u) return null;
  const dm = u.match(/data:image\/[^;]+;base64,[^"']+/);
  if (dm) u = dm[0];
  else if (u.includes("data:")) u = u.substring(u.indexOf("data:"));
  if (u.startsWith("data:")) return u;
  try {
    const res = await fetch(u);
    if (!res.ok) throw new Error(`${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    const isB64 = /^[A-Za-z0-9+/=]+$/.test(
      u.substring(0, 100).replace(/\s/g, ""),
    );
    return u.length > 40 && isB64 ? `data:image/png;base64,${u}` : null;
  }
};

// ═══════════════════════════════════════════════════════════════════
//  UTILITY — render HTML rich text into jsPDF
// ═══════════════════════════════════════════════════════════════════
function renderHTMLToPDF(doc, html, x, startY, maxW, _lh, pageBreak) {
  if (!html) return startY;
  let cX = x,
    cY = startY,
    lBY = startY - 4,
    pm = null;
  const div = document.createElement("div");
  div.innerHTML = html;
  let cf = {
    name: "helvetica",
    style: "normal",
    size: 8,
    ul: false,
    st: false,
    color: [0, 0, 0],
    align: "left",
  };
  const af = (f) => {
    doc.setFont(f.name, f.style);
    doc.setFontSize(f.size);
    doc.setTextColor(f.color[0], f.color[1], f.color[2]);
  };
  const nl = (sp = 1, ind = null) => {
    lBY = cY + sp;
    if (ind !== null) cX = ind;
  };

  const drawTxt = (txt, iX) => {
    if (!txt) return;
    const clean = txt.replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,
      "",
    );
    if (!clean.trim()) return;
    af(cf);
    let rem = clean;
    while (rem.length > 0) {
      let av = x + maxW - cX;
      if (av < 10) {
        nl(1.2, iX);
        av = x + maxW - cX;
      }
      const ls = doc.splitTextToSize(rem, av),
        first = ls[0];
      const lh = cf.size * 0.38;
      if (cY < lBY + lh) {
        cY = lBY + lh;
        if (cY > 265) {
          if (pageBreak) pageBreak();
          cY = 25;
          lBY = 21;
        }
      }
      af(cf);
      let dx = cX;
      const tw = doc.getTextWidth(first),
        rw = x + maxW - iX;
      if (cf.align === "center" && cX === iX) dx = iX + (rw - tw) / 2;
      else if (cf.align === "right" && cX === iX) dx = iX + (rw - tw);
      if (pm) {
        if (pm.type === "text") doc.text(pm.prefix, pm.x, cY);
        else {
          doc.setFillColor(0, 0, 0);
          const ms = cf.size * 0.06,
            my = cY - cf.size * 0.12;
          if (pm.depth === 1) doc.circle(pm.x + 4, my, ms * 0.8, "D");
          else if (pm.depth >= 2)
            doc.rect(pm.x + 3.5, my - ms / 2, ms, ms, "F");
          else doc.circle(pm.x + 4, my, ms, "F");
        }
        pm = null;
      }
      doc.text(first, dx, cY);
      if (cf.ul) {
        doc.setLineWidth(0.2);
        doc.line(dx, cY + 0.5, dx + tw, cY + 0.5);
      }
      if (cf.st) {
        doc.setLineWidth(0.2);
        doc.line(dx, cY - cf.size * 0.15, dx + tw, cY - cf.size * 0.15);
      }
      if (ls.length > 1) {
        nl(1.2, iX);
        rem = rem.substring(first.length).trimStart();
      } else {
        cX += tw;
        rem = "";
      }
    }
  };
  const BLKS = ["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TR"];
  const proc = (node, iX) => {
    const isB = BLKS.includes(node.nodeName);
    if (node.nodeName === "BR") {
      nl(1.2, iX);
      return;
    }
    if (isB) {
      if (cX > iX && cX < iX + 10) lBY += 0.5;
      else if (cX > iX) nl(1.5, iX);
      else lBY += 1.5;
      if (node.nodeName.startsWith("H")) {
        const n = parseInt(node.nodeName[1]);
        cf.size = 14 - n * 1.2;
        cf.style = "bold";
      }
    }
    if (node.nodeName === "TABLE") {
      if (cX > iX) nl(2, iX);
      autoTable(doc, {
        html: node,
        startY: Math.max(cY, lBY + 2),
        theme: "grid",
        margin: { left: iX, right: 16 },
        styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
      });
      cY = doc.lastAutoTable.finalY;
      lBY = cY + 3;
      cX = iX;
      return;
    }
    if (node.nodeName === "UL" || node.nodeName === "OL") {
      const ld = parseInt(node.getAttribute("data-depth")) || 0;
      let ci = 1;
      if (cX > iX) nl(1.5, iX);
      node.childNodes.forEach((ch) => {
        if (ch.nodeName === "LI") {
          if (cX > iX) nl(1.2, iX);
          const lh = cf.size * 0.38;
          if (lBY + lh > cY) cY = lBY + lh;
          if (cY > 265) {
            if (pageBreak) pageBreak();
            cY = 25;
            lBY = 21;
          }
          af(cf);
          const iby = cY;
          lBY = iby - lh;
          pm =
            node.nodeName === "OL"
              ? { type: "text", prefix: `${ci}. `, x: iX + 2 }
              : { type: "bullet", depth: ld, x: iX };
          cX = iX + 8;
          ci++;
          ch.childNodes.forEach((n) => {
            if (n.nodeName === "UL" || n.nodeName === "OL")
              n.setAttribute("data-depth", ld + 1);
            proc(n, iX + 8);
          });
          lBY = cY > iby ? cY - lh : iby;
        }
      });
      if (cX > iX) nl(1.5, iX);
      return;
    }
    if (node.nodeType === 3) {
      drawTxt(node.textContent, iX);
      return;
    }
    const sv = { ...cf };
    if (node.nodeName === "STRONG" || node.nodeName === "B")
      cf.style = cf.style.includes("italic") ? "bolditalic" : "bold";
    if (node.nodeName === "EM" || node.nodeName === "I")
      cf.style = cf.style.includes("bold") ? "bolditalic" : "italic";
    if (node.nodeName === "U") cf.ul = true;
    if (
      node.nodeName === "S" ||
      node.nodeName === "STRIKE" ||
      node.nodeName === "DEL"
    )
      cf.st = true;
    if (node.style) {
      if (node.style.textAlign) cf.align = node.style.textAlign;
      if (
        node.style.fontWeight === "bold" ||
        parseInt(node.style.fontWeight) >= 600
      )
        cf.style = cf.style.includes("italic") ? "bolditalic" : "bold";
      if (node.style.fontStyle === "italic")
        cf.style = cf.style.includes("bold") ? "bolditalic" : "italic";
      if (node.style.fontSize) {
        const px = parseInt(node.style.fontSize);
        if (px) cf.size = Math.max(7, px * 0.5);
      }
      if (node.style.color) {
        const rgb = node.style.color.match(/\d+/g);
        if (rgb?.length >= 3) cf.color = [+rgb[0], +rgb[1], +rgb[2]];
      }
      const raw = node.getAttribute?.("style") || "";
      const td =
        node.style.textDecoration ||
        raw.match(/text-decoration\s*:\s*([^;]+)/i)?.[1] ||
        "";
      if (td.includes("underline")) cf.ul = true;
      if (td.includes("line-through")) cf.st = true;
    }
    node.childNodes.forEach((n) => {
      if (n.nodeName === "UL" || n.nodeName === "OL")
        n.setAttribute(
          "data-depth",
          parseInt(node.getAttribute("data-depth") || 0) + 1,
        );
      proc(n, iX);
    });
    cf = sv;
    if (isB) {
      if (cX > iX) nl(1.5, iX);
      else lBY += 1.5;
      if (node.nodeName.startsWith("H") || node.nodeName === "P") {
        cf.style = "normal";
        cf.size = 8;
      }
    }
  };
  proc(div, x);
  return cY + 5;
}

// ═══════════════════════════════════════════════════════════════════
//  UTILITY — currency symbol
// ═══════════════════════════════════════════════════════════════════
const safeSym = (s, code) => {
  if (code === "NPR") return "NPR";
  if (code === "INR" || s === "Rs.") return "INR";
  if (s === "$") return "$";
  if (s === "€") return "EUR";
  if (s === "£") return "GBP";
  return s || code || "INR";
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN buildPDF
// ═══════════════════════════════════════════════════════════════════
async function buildPDF(data, letterheadImage) {
  const doc = new jsPDF("p", "mm", "a4");
  doc.setProperties({
    title: data.quotation?.number || data.invoice_number || "Document",
  });

  // ── constants ──────────────────────────────────────────────────
  const PW = 210,
    PH = 297,
    ML = 13,
    MR = 13;
  const CW = PW - ML - MR; // 184mm content width

  // ── palette ────────────────────────────────────────────────────
  const BLACK = [20, 20, 20];
  const DARK = [45, 45, 45];
  const MGRAY = [95, 95, 95];
  const LGRAY = [220, 224, 230]; // divider / border
  const XLGRAY = [248, 250, 252]; // light bg / totals bg
  const HDRBG = [235, 239, 245]; // table header light
  const HDRBG2 = [245, 247, 250]; // alternate light bg
  const WHITE = [255, 255, 255];
  const GREEN = [45, 45, 45]; // highlight text as simple bold dark

  // ── helpers ────────────────────────────────────────────────────
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

  // ── load images ────────────────────────────────────────────────
  const stampImg = await getBase64Image(data.company?.stampUrl);
  const [logo, sigImg, lhImg, prodImgs, einvoiceQR] = await Promise.all([
    getBase64Image(data.company?.logo?.url),
    getBase64Image(data.company?.signatureUrl),
    getBase64Image(letterheadImage),
    Promise.all(
      data.products.map(async (p, i) => ({
        id: p.srNo ?? i,
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
  const iMap = prodImgs.reduce((a, c) => {
    a[c.id] = c.b64;
    return a;
  }, {});

  // ── page frame ────────────────────────────────────────────────
  const drawFrame = () => {
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, PW - 10, PH - 10);
  };
  const addPage = () => {
    doc.addPage();
    if (lhImg) {
      try {
        doc.addImage(lhImg, "PNG", 0, 0, PW, PH);
      } catch {}
    } else drawFrame();
  };

  if (lhImg) {
    try {
      doc.addImage(lhImg, "PNG", 0, 0, PW, PH);
    } catch {}
  } else drawFrame();

  // ─────────────────────────────────────────────────────────────
  //  SECTION 1 — HEADER
  //  [Logo] | Company Name / Address / Phone / Email / GSTIN | [Doc Title]
  // ─────────────────────────────────────────────────────────────
  const HTOP = 11; // header top Y

  // doc title — top right
  const titleMap = {
    [DOCUMENT_TYPES.QUOTATION]: "Quotation",
    [DOCUMENT_TYPES.PROFORMA]: "Proforma Invoice",
    [DOCUMENT_TYPES.SALES_INVOICE]: "Tax Invoice",
    [DOCUMENT_TYPES.PURCHASE_ORDER]: "Purchase Order",
    [DOCUMENT_TYPES.DELIVERY_CHALLAN]: "Delivery Challan",
    [DOCUMENT_TYPES.CREDIT_NOTE]: "Credit Note",
    [DOCUMENT_TYPES.DEBIT_NOTE]: "Debit Note",
    [DOCUMENT_TYPES.SALES_RETURN]: "Sales Return",
    [DOCUMENT_TYPES.PURCHASE_RETURN]: "Purchase Return",
    [DOCUMENT_TYPES.PURCHASE_INVOICE]: "Book Purchase Order",
    [DOCUMENT_TYPES.BOOK_INVOICE]: "Book Invoice",
    [DOCUMENT_TYPES.EINVOICE]: "E-Invoice",
    [DOCUMENT_TYPES.CUSTOM_QUOTATION]: "Custom Quotation",
  };
  const docTitle = titleMap[data.documentType] || "Document";

  sf("bold", 12);
  doc.setTextColor(...BLACK);
  const titleLines = doc.splitTextToSize(docTitle, 45);
  titleLines.forEach((line, i) => {
    doc.text(line, PW - 8, HTOP + 7 + i * 5, { align: "right" });
  });

  // logo — top left
  if (logo) {
    try {
      doc.addImage(logo, undefined, ML, HTOP, 22, 18);
    } catch {}
  }

  // company info — center column between logo and title
  const cX = PW / 2;
  let hy = HTOP + 6;

  // Company Name
  sf("bold", 11.5);
  doc.setTextColor(...BLACK);
  const cnLines = doc.splitTextToSize((data.company?.name || "").trim(), 100);
  cnLines.forEach((l) => {
    doc.text(l, cX, hy, { align: "center" });
    hy += 4.8;
  });

  // Contact person (optional)
  const cp = (data.company?.contactPerson || "").trim();
  if (cp) {
    sf("normal", 8);
    doc.setTextColor(...MGRAY);
    doc.text(cp, cX, hy, { align: "center" });
    hy += 3.8;
  }

  // Full address — all field shapes merged
  sf("normal", 8);
  doc.setTextColor(...DARK);
  const _a1 = (
    data.company?.addressLines?.[0] ||
    data.company?.address_line1 ||
    ""
  ).trim();
  const _a2 = (
    data.company?.addressLines?.[1] ||
    data.company?.address_line2 ||
    ""
  ).trim();
  const _city = (data.company?.city || "").trim();
  const _state = (data.company?.state || "").trim();
  const _pin = (data.company?.pincode || data.company?.zip_code || "").trim();
  const fullAddr = (
    data.company?.address ||
    [_a1, _a2, _city, _state, _pin].filter(Boolean).join(", ")
  ).trim();
  if (fullAddr) {
    const al = doc.splitTextToSize(fullAddr, 100);
    al.forEach((l) => {
      doc.text(l, cX, hy, { align: "center" });
      hy += 3.6;
    });
    hy += 0.4;
  }

  // Phone — use plain text "Ph:" prefix (no unicode — jsPDF issues)
  const phone = (
    data.company?.phone ||
    data.company?.tel ||
    data.company?.mobile ||
    ""
  ).trim();
  // Email
  const email = (data.company?.email || "").trim();

  // Show phone and email on same line if both short, else separate
  if (phone || email) {
    sf("normal", 7.8);
    doc.setTextColor(...DARK);
    const parts = [];
    if (phone) parts.push(`Ph: ${phone}`);
    if (email) parts.push(email);
    const contactLine = parts.join("    ");
    // Check if it fits in 110mm; if too long, split to two lines
    sf("normal", 7.8);
    const cw = doc.getTextWidth(contactLine);
    if (cw <= 110) {
      doc.text(contactLine, cX, hy, { align: "center" });
      hy += 3.8;
    } else {
      if (phone) {
        doc.text(`Ph: ${phone}`, cX, hy, { align: "center" });
        hy += 3.6;
      }
      if (email) {
        doc.text(email, cX, hy, { align: "center" });
        hy += 3.6;
      }
    }
  }

  // GSTIN — bold green underlined
  const gstin = (data.company?.gstin || "").trim();
  if (gstin) {
    const lbl = (data.company?.businessTypeLabel || "GSTIN")
      .replace(/:/g, "")
      .trim();
    const gTxt = `${lbl} ${gstin}`;
    sf("bold", 8.5);
    doc.setTextColor(...GREEN);
    const gw = doc.getTextWidth(gTxt);
    doc.text(gTxt, cX, hy, { align: "center" });
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.35);
    doc.line(cX - gw / 2, hy + 0.9, cX + gw / 2, hy + 0.9);
    hy += 4.5;
  }

  // Header bottom separator line
  const hBot = Math.max(hy + 2, HTOP + 24);
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.5);
  doc.line(5, hBot, PW - 5, hBot);

  let y = hBot + 4;

  // ─────────────────────────────────────────────────────────────
  //  SECTION 2 — BILL TO | SHIP TO  +  META (Quotation# Date etc)
  //  NO inner divider lines — just clean text columns
  // ─────────────────────────────────────────────────────────────
  const S2_TOP = y;

  // Layout: left 60% → BILL TO + SHIP TO (each 30%)
  //         right 40% → meta info
  const BILL_W = CW * 0.295;
  const SHIP_W = CW * 0.295;
  const BILL_X = ML;
  const SHIP_X = ML + BILL_W + 4;
  const META_X = ML + CW * 0.62;
  const META_VX = PW - MR;

  // Labels
  sf("bold", 8);
  doc.setTextColor(...GREEN);
  const billToLabel = data.documentType === DOCUMENT_TYPES.PURCHASE_ORDER ? "Supplier / Service Provider" : "BILL TO";
  doc.text(billToLabel, BILL_X, y);
  doc.text("SHIP TO", SHIP_X, y);
  y += 4;

  // Helper for safe fetching
  const getV = (field) => {
    return data[field] ||
      data.meta?.[field] ||
      data.invoice_data?.[field] ||
      data.quotation_data?.[field] ||
      data.shipping?.[field] ||
      data.shipping_party?.[field] ||
      data.customer?.[field] || "";
  };

  // Bill To
  let byB = y;
  sf("bold", 9);
  doc.setTextColor(...BLACK);
  const bName = getV('billing_attention') || data.billing?.attention || data.customer?.name || data.party?.name || "";
  if (bName) {
    doc.splitTextToSize(bName.trim(), BILL_W - 2).forEach((l) => {
      doc.text(l, BILL_X, byB);
      byB += 4.2;
    });
  }
  
  sf("normal", 7.8);
  doc.setTextColor(...DARK);
  const bAddrStr = getV('billing_address') || data.customer?.address || "";
  const bAddr2 = getV('billing_line2') || "";
  const bCity = getV('city') || data.customer?.city || "";
  const bState = getV('state') || data.customer?.state || "";
  const bPin = getV('pincode') || data.customer?.pincode || "";
  const bCountryVal = (getV('country') || data.customer?.country || "").trim();
  const bFullAddr = formatAddressSafe(bAddrStr, bAddr2, bCity, bState, bPin, bCountryVal);
  
  if (bFullAddr) {
    doc.splitTextToSize(bFullAddr.trim(), BILL_W - 2).forEach((l) => {
      doc.text(l, BILL_X, byB);
      byB += 3.5;
    });
  }
  const bPh = data.customer?.tel || data.customer?.phone || data.party?.tel || data.party?.phone || "";
  if (bPh) {
    doc.text(`Ph: ${bPh}`, BILL_X, byB);
    byB += 3.5;
  }
  const bEmail = data.customer?.email || data.party?.email || "";
  if (bEmail) {
    doc.text(bEmail, BILL_X, byB);
    byB += 3.5;
  }
  const bTaxLabel = data.customer?.customerTypeLabel || (data.activeCurrency === "NPR" ? "VAT No" : "GSTIN");
  const bTax = data.customer?.gstin || data.party?.gstin || "";
  if (bTax) {
    doc.text(`${bTaxLabel.replace(/:/g, "").trim()}: ${bTax}`, BILL_X, byB);
    byB += 3.5;
  }

  // Ship To
  let byS = y;
  sf("bold", 9);
  doc.setTextColor(...BLACK);
  const sname = getV('shipping_attention') || 
                data.shipping?.attention ||
                data.shipping_address?.attention ||
                data.shipping_party?.attention ||
                "";
  if (sname) {
    doc.splitTextToSize(sname.trim(), SHIP_W - 2).forEach((l) => {
      doc.text(l, SHIP_X, byS);
      byS += 4.2;
    });
  }
  
  sf("normal", 7.8);
  doc.setTextColor(...DARK);
  const sAddrStr = getV('shipping_address') || data.shipping?.address || "";
  const sAddr2 = getV('shipping_line2') || "";
  const sCity = getV('ship_city') || data.shipping?.city || "";
  const sState = getV('ship_state') || data.shipping?.state || "";
  const sPin = getV('ship_pincode') || data.shipping?.pincode || "";
  const sCountryVal = (getV('ship_country') || data.shipping?.country || "").trim();
  const sFullAddr = formatAddressSafe(sAddrStr, sAddr2, sCity, sState, sPin, sCountryVal);
  
  if (sFullAddr) {
    doc.splitTextToSize(sFullAddr.trim(), SHIP_W - 2).forEach((l) => {
      doc.text(l, SHIP_X, byS);
      byS += 3.5;
    });
  }
  const sp2 = data.shippingPhone || data.shipping_phone || data.shipping?.phone || data.shipping?.tel || bPh;
  if (sp2) {
    doc.text(`Ph: ${sp2}`, SHIP_X, byS);
    byS += 3.5;
  }
  const sEmail = data.shipping?.email || "";
  if (sEmail) {
    doc.text(sEmail, SHIP_X, byS);
    byS += 3.5;
  }
  const sTaxLabel = data.shipping?.customerTypeLabel || bTaxLabel;
  const sg = data.shippingGstin || data.shipping_gstin || data.shipping?.gstin || bTax;
  if (sg) {
    doc.text(`${sTaxLabel.replace(/:/g, "").trim()}: ${sg}`, SHIP_X, byS);
    byS += 3.5;
  }

  // Meta right column
  const lpMap = {
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
  const lp = lpMap[data.documentType] || "Document";

  let mY = S2_TOP;
  const drawMeta = (lbl, val) => {
    if (!val && val !== 0) return;
    sf("bold", 8.5);
    doc.setTextColor(...DARK);
    doc.text(lbl, META_X, mY);
    sf("normal", 8.5);
    doc.setTextColor(...BLACK);
    const vl = doc.splitTextToSize(
      String(val),
      META_VX - META_X - doc.getTextWidth(lbl) - 1,
    );
    doc.text(vl, META_VX, mY, { align: "right" });
    mY += Math.max(4.8, vl.length * 4.5);
  };

  const docNo =
    data.quotation?.number ||
    data.invoice_number ||
    data.po_number ||
    data.challan_number ||
    data.note_number ||
    "";
  const docDate =
    data.quotation?.date ||
    data.date ||
    data.invoice_date ||
    data.po_date ||
    data.challan_date ||
    "";
  const dueDate = data.quotation?.dueDate || data.due_date || "";
  const refVal = data.quotation?.reference || data.reference || "";

  drawMeta(`${lp} No`, docNo);
  drawMeta(`${lp} Date:`, docDate);
  if (dueDate) drawMeta("Due Date:", dueDate);
  if (data.totals?.paymentTerms)
    drawMeta("Payment Terms:", `${data.totals.paymentTerms} Days`);
  if (data.quotation?.po_agreement_number)
    drawMeta("P.O/Aggr No:", data.quotation.po_agreement_number);
  if (refVal) drawMeta("Reference:", refVal);

  y = Math.max(byB, byS, mY) + 3;

  // Section 2 bottom separator
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.4);
  doc.line(5, y, PW - 5, y);

  // ================= E-INVOICE SECTION =================
  if (data.einvoice && data.einvoice.irn) {
    const ewayBillNo = data.einvoice.eway_bill_no || data.einvoice.ewayBillNo;
    const ewayBillDate = data.einvoice.eway_bill_date || data.einvoice.ewayBillDate;
    const hasEway = !!ewayBillNo;
    const einvH = hasEway ? 38 : 32;

    if (y + einvH > PH - 40) {
      addNewPage();
    }

    doc.setFillColor(...XLGRAY);
    doc.rect(ML, y, CW, einvH, "F");
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.rect(ML, y, CW, einvH, "D");

    sf("bold", 9.5);
    doc.setTextColor(...DARK);
    doc.text("E-INVOICE & E-WAY BILL DETAILS", ML + 5, y + 7);
    doc.setDrawColor(...LGRAY);
    doc.line(ML + 5, y + 9, ML + CW - 5, y + 9);

    const irn = data.einvoice.irn;
    const ackNo = data.einvoice.ack_no;
    const ackDate = data.einvoice.ack_date;

    sf("normal", 8.5);
    doc.setTextColor(...MGRAY);
    doc.text("IRN:", ML + 5, y + 15);
    sf("bold", 8.5);
    doc.setTextColor(...DARK);
    const irnLines = doc.splitTextToSize(irn, CW - 45);
    doc.text(irnLines, ML + 25, y + 15);

    sf("normal", 8.5);
    doc.setTextColor(...MGRAY);
    doc.text("Ack No:", ML + 5, y + 23);
    sf("bold", 8.5);
    doc.setTextColor(...DARK);
    doc.text(String(ackNo || "-"), ML + 25, y + 23);

    sf("normal", 8.5);
    doc.setTextColor(...MGRAY);
    doc.text("Ack Date:", ML + 60, y + 23);
    sf("bold", 8.5);
    doc.setTextColor(...DARK);
    doc.text(String(ackDate || "-"), ML + 80, y + 23);

    if (ewayBillNo) {
      sf("normal", 8.5);
      doc.setTextColor(...MGRAY);
      doc.text("E-Way Bill No:", ML + 5, y + 31);
      sf("bold", 8.5);
      doc.setTextColor(...DARK);
      doc.text(String(ewayBillNo), ML + 25, y + 31);

      sf("normal", 8.5);
      doc.setTextColor(...MGRAY);
      doc.text("E-Way Bill Date:", ML + 60, y + 31);
      sf("bold", 8.5);
      doc.setTextColor(...DARK);
      doc.text(String(ewayBillDate || "-"), ML + 85, y + 31);
    }

    if (einvoiceQR) {
      try {
        doc.addImage(einvoiceQR, "PNG", ML + CW - 28, y + 3, 25, 25);
      } catch (e) {
        console.warn("E-Invoice QR Error", e);
      }
    }
    y += einvH;
  } else {
    y += 4;
  }

  
  //  SECTION 3 — DYNAMIC TABLE
  const isChallan = data.documentType === DOCUMENT_TYPES.DELIVERY_CHALLAN;
  const isPO = data.documentType === DOCUMENT_TYPES.PURCHASE_ORDER;

  // --- Dynamic Column Visibility Flags
  const hasHSN = data.products.some((p) => p.hsn && String(p.hsn).trim() !== "");
  const hasUnit = data.products.some((p) => p.unit && String(p.unit).trim() !== "");
  const hasDisc = data.products.some((p) => (p.discountPct || 0) > 0 || (p.discountAmt || 0) > 0);
  const hasImg = data.products.some((p) => p.image_url || p.image);

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
  
  const colDefs = [
    { key: "no", head: "S.No", w: 10, al: "center", on: true },
    { key: "img", head: "IMG", w: 10, al: "center", on: hasImg },
    { key: "desc", head: "ITEM", w: 0, al: "left", on: true },
    { key: "hsn", head: "HSN", w: 15, al: "center", on: hasHSN },
    { key: "qty", head: "QTY", w: 10, al: "center", on: true },
    { key: "unit", head: "UNIT", w: 11, al: "center", on: hasUnit },
    { key: "price", head: `PRICE (${activeSym})`, w: 22, al: "right", on: true },
    { key: "disc", head: "DISC", w: 11, al: "center", on: hasDisc },

    { key: "gst", head: "GST (%)", w: 14, al: "center", on: showSingleGST },
    { key: "cgst", head: "CGST (%)", w: 14, al: "center", on: showCGST_SGST },
    { key: "sgst", head: "SGST (%)", w: 14, al: "center", on: showCGST_SGST },
    { key: "igst", head: (compCountry !== custCountry) ? "GST (%)" : "IGST (%)", w: 14, al: "center", on: showIGST },
    { key: "vat", head: "VAT (%)", w: 14, al: "center", on: showVAT },

    { key: "total", head: `TOTAL (${activeSym})`, w: 26, al: "right", on: true },
  ];


  const aCols = colDefs.filter((c) => c.on);
  const heads = aCols.map((c) => c.head);

  const cStyles = {};
  aCols.forEach((c, i) => {
    cStyles[i] = { halign: c.al };
    if (c.w > 0) cStyles[i].cellWidth = c.w;
  });

  const rows = data.products.map((p, idx) => {
    const r = [];
    aCols.forEach((c) => {
      switch (c.key) {
        case "no":
          r.push(String(idx + 1));
          break;

        case "img":
          r.push("");
          break;

        case "desc":
          r.push(
            (p.name || p.description || "").replace(/<[^>]*>?/gm, "").trim(),
          );
          break;

        case "hsn":
          r.push(p.hsn || "");
          break;

        case "qty":
          r.push(String(p.qty ?? 1));
          break;

        case "unit":
          r.push(p.unit || "");
          break;

        case "price":
          r.push(fmt(p.price, false));
          break;

        case "disc":
          r.push(
            p.discountPct
              ? `${p.discountPct}%`
              : p.discountAmt
                ? fmt(p.discountAmt, false)
                : "-",
          );
          break;

        case "gst":
          const totalGstPct = (p.cgstPct || 0) + (p.sgstPct || 0) + (p.igstPct || 0) + (p.vatPct || 0);
          r.push(`${p.gstPct || totalGstPct || 0}%`);
          break;

        case "cgst":
          r.push(`${p.cgstPct || 0}%`);
          break;

        case "sgst":
          r.push(`${p.sgstPct || 0}%`);
          break;

        case "igst":
          r.push(`${p.igstPct || 0}%`);
          break;

        case "vat":
          r.push(`${p.vatPct || 0}%`);
          break;

        case "total":
          r.push(fmt(p.total, false));
          break;

        default:
          r.push("");
      }
    });
    return r;
  });

  const imgCI = aCols.findIndex((c) => c.key === "img");

  autoTable(doc, {
    startY: y,
    head: [heads],
    body: rows,
    theme: "grid",
    margin: { left: ML, right: MR },
    headStyles: {
      fillColor: HDRBG,
      textColor: DARK,
      fontStyle: "bold",
      halign: "center",
      fontSize: 7.5,
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
    },
    styles: {
      fontSize: 7.8,
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      valign: "middle",
      lineColor: [220, 225, 230],
      lineWidth: 0.15,
      textColor: DARK,
      overflow: "linebreak",
    },
    columnStyles: cStyles,
    alternateRowStyles: { fillColor: [248, 249, 252] }, // very light blue-tint alternate rows
    didDrawCell: (cd) => {
      if (imgCI >= 0 && cd.section === "body" && cd.column.index === imgCI) {
        const p = data.products[cd.row.index];
        const img = iMap[p.srNo ?? cd.row.index];
        if (img) {
          try {
            const s = 7,
              cx = cd.cell.x + cd.cell.width / 2 - s / 2,
              cy = cd.cell.y + cd.cell.height / 2 - s / 2;
            doc.addImage(img, "PNG", cx, cy, s, s);
          } catch {}
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY;
  let ly = y;

  // ─────────────────────────────────────────────────────────────
  //  TOTALS — right side, flush with table right edge
  //  No individual row boxes — just clean lines between rows
  // ─────────────────────────────────────────────────────────────
  // Use a fixed clean width for totals block
  const TOT_W = 90;
  const TOT_X = PW - MR - TOT_W;
  const TOT_VX = PW - MR - 2;

  ly += 5;

  const drawTot = (lbl, val, bold = false, bg = null) => {
    const H = 6.5;
    if (bg) {
      doc.setFillColor(...bg);
      doc.rect(TOT_X, ly, TOT_W, H, "F");
    }
    // only bottom line per row — clean, no box
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(TOT_X, ly + H, TOT_X + TOT_W, ly + H);
    sf(bold ? "bold" : "normal", 8.5);
    doc.setTextColor(...DARK);
    doc.text(lbl, TOT_X + 3, ly + 4.4);
    doc.text(String(val), TOT_VX, ly + 4.4, { align: "right" });
    ly += H;
  };

  if (!isChallan) {
    drawTot("SUB TOTAL", fmt(data.totals?.taxableAmount || 0));

    if (data.totals?.taxBreakdown?.length > 0) {
      data.totals.taxBreakdown.forEach((t) => drawTot(t.label, fmt(t.amount)));
    } else if ((data.totals?.taxTotal || 0) > 0) {
      const tl = showIGST ? "IGST" : (showSingleGST || showCGST_SGST) ? "GST" : showVAT ? "VAT" : "Tax";
      drawTot(tl, fmt(data.totals.taxTotal));
    }
    if ((data.totals?.additionalCharges || 0) > 0)
      drawTot("Additional Charges", fmt(data.totals.additionalCharges));
    if ((data.totals?.discountAfterTax || 0) > 0)
      drawTot("Discount", `-${fmt(data.totals.discountAfterTax)}`);

    drawTot("GRAND TOTAL", fmt(data.totals?.total || 0), true, XLGRAY);
  }

  const totalsEndY = ly;
  let bankY = doc.lastAutoTable.finalY + 5;
  ly = bankY;
  const SIG_RESV = 46;

  //  SECTION 4 — BANK DETAILS


  if (!isChallan && data.bank) {
    const bk = data.bank;
    const hv = (v) =>
      v &&
      v.toString().trim() &&
      v.toString().trim().toUpperCase() !== "N/A" &&
      v.toString().trim().toUpperCase() !== "IFSC";

    // Build display rows
    const bRows = [
      { l: "Bank", v: hv(bk.bank_name) ? bk.bank_name : null },
      {
        l: "Holder",
        v: hv(bk.account_holder_name) ? bk.account_holder_name : null,
      },
      { l: "A/C No", v: hv(bk.account_number) ? bk.account_number : null },
      { l: "IFSC", v: hv(bk.ifsc) ? bk.ifsc : null },
      { l: "Branch", v: hv(bk.branch) ? bk.branch : null },
      { l: "UPI", v: hv(bk.upi) ? bk.upi : null },
    ].filter((r) => r.v !== null);

    const BKW = CW * 0.5;
    const BKPAD = 5;
    const LH = 4.0;
    const bkH = 7 + bRows.length * LH + 4;

    // Check if fits on this page; if not, new page
    if (bankY + bkH > PH - SIG_RESV) {
      addPage();
      ly = 18;
    }

    // Square border box — matching table
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.rect(ML, ly, BKW, bkH, "D");

    // Title inside box
    sf("bold", 8.5);
    doc.setTextColor(...DARK);
    doc.text("Bank Details", ML + BKPAD, ly + 5);
    // thin underline under title
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(ML + BKPAD, ly + 6.5, ML + BKW - BKPAD, ly + 6.5);

    let by = ly + 10;
    bRows.forEach(({ l, v }) => {
      sf("bold", 7.8);
      doc.setTextColor(...MGRAY);
      doc.text(`${l}:`, ML + BKPAD, by);
      const lw = doc.getTextWidth(`${l}:`);
      sf("normal", 7.8);
      doc.setTextColor(...DARK);
      const vLines = doc.splitTextToSize(String(v), BKW - BKPAD * 2 - lw - 2);
      doc.text(vLines, ML + BKPAD + lw + 2, by);
      by += Math.max(LH, vLines.length * LH);
    });

    // QR if available
    const bqr = await getBase64Image(bk.qr_code);
    if (bqr) {
      try {
        doc.addImage(bqr, "PNG", ML + BKW - 24, ly + 4, 20, 20);
        sf("normal", 6.5);
        doc.setTextColor(...MGRAY);
        doc.text("Scan to Pay", ML + BKW - 14, ly + 26, { align: "center" });
      } catch {}
    }

    ly = Math.max(ly + bkH, by) + 5;
  }
  ly = Math.max(totalsEndY, ly) + 3;

  // Left side of totals area — keep empty or show notes/bank here if they fit
  ly += 1;

  // ─────────────────────────────────────────────────────────────
  //  NOTES / REMARK (if any) — compact, no heavy box
  // ─────────────────────────────────────────────────────────────

  if (data.notes || data.remark) {
    const hasBoth = !!(data.notes && data.remark);
    const BW = hasBoth ? CW / 2 - 2 : CW;
    const BGAP = 4;
    
    const tableBody = [];
    if (hasBoth) {
      tableBody.push([
        "Notes:",
        data.notes || "",
        "",
        "Remark:",
        data.remark || ""
      ]);
    } else {
      tableBody.push([
        data.notes ? "Notes:" : "Remark:",
        data.notes || data.remark || ""
      ]);
    }
    
    autoTable(doc, {
      startY: ly,
      margin: { left: ML, right: MR, bottom: SIG_RESV },
      body: tableBody,
      theme: "plain",
      showHead: false,
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 1, right: 1 },
        textColor: DARK,
        valign: "top",
        overflow: "linebreak",
      },
      columnStyles: hasBoth ? {
        0: { cellWidth: 14, fontStyle: "bold", textColor: GREEN, cellPadding: { left: 4, right: 0, top: 4, bottom: 4 } },
        1: { cellWidth: BW - 14, cellPadding: { left: 1, right: 4, top: 4, bottom: 4 } },
        2: { cellWidth: BGAP },
        3: { cellWidth: 16, fontStyle: "bold", textColor: GREEN, cellPadding: { left: 4, right: 0, top: 4, bottom: 4 } },
        4: { cellWidth: BW - 16, cellPadding: { left: 1, right: 4, top: 4, bottom: 4 } }
      } : {
        0: { cellWidth: 15, fontStyle: "bold", textColor: GREEN, cellPadding: { left: 4, right: 0, top: 4, bottom: 4 } },
        1: { cellWidth: BW - 15, cellPadding: { left: 1, right: 4, top: 4, bottom: 4 } }
      },
      willDrawCell: (cellData) => {
        const { column } = cellData;
        if (hasBoth && column.index === 2) {
          cellData.cell.styles.fillColor = [255, 255, 255];
        } else {
          cellData.cell.styles.fillColor = [248, 249, 252];
        }
      },
      didDrawCell: (cellData) => {
        const { cell, column } = cellData;
        if (cellData.section === 'head') return;
        if (hasBoth && column.index === 2) return;
        
        doc.setDrawColor(215, 220, 230);
        doc.setLineWidth(0.2);
        
        if (column.index === 0 || (hasBoth && column.index === 3)) {
          doc.line(cell.x, cell.y, cell.x, cell.y + cell.height);
          doc.line(cell.x, cell.y, cell.x + cell.width, cell.y);
          doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
        } else if (column.index === 1 || (hasBoth && column.index === 4)) {
          doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height);
          doc.line(cell.x, cell.y, cell.x + cell.width, cell.y);
          doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
        }
      }
    });
    
    ly = doc.lastAutoTable.finalY + 5;
  }

  // ─────────────────────────────────────────────────────────────
  //  SECTION 5 — TERMS & CONDITIONS
  //  Smart space: estimate height, break page only if truly needed
  // ─────────────────────────────────────────────────────────────
  const hasTerms = data.termsSections?.some(
    (s) => s.content && s.content.trim().replace(/<[^>]*>?/gm, "").length > 0,
  );

  if (hasTerms) {
    let est = 10;
    data.termsSections.forEach((s) => {
      if (!s.content || !s.content.trim().replace(/<[^>]*>?/gm, "").length)
        return;
      sf("normal", 8);
      est +=
        (s.heading ? 5 : 0) +
        doc.splitTextToSize(s.content.replace(/<[^>]*>?/gm, ""), CW).length *
          3.8 +
        5;
    });
    if (PH - ly - SIG_RESV < 15) {
      addPage();
      ly = 18;
    }

    // Dynamic Terms Sections
    ly += 2;

    data.termsSections.forEach((s) => {
      if (!s.content || !s.content.trim().replace(/<[^>]*>?/gm, "").length)
        return;
      if (ly + 25 > PH - SIG_RESV) {
        addPage();
        ly = 18;
      }
      if (s.heading) {
        sf("bold", 13);
        doc.setTextColor(...DARK);
        doc.text(s.heading, ML, ly);
        ly += 5;
      }
      const pb = () => {
        addPage();
        ly = 18;
      };
      ly = renderHTMLToPDF(doc, s.content, ML, ly, CW, 4.5, pb);
      ly += 3;
    });
    ly += 3;
  }

  // ─────────────────────────────────────────────────────────────
  //  SECTION 6 — STAMP + SIGNATURE (last page, bottom-right)
  // ─────────────────────────────────────────────────────────────
  const lp2 = doc.getNumberOfPages();
  doc.setPage(lp2);
  if (ly + 32 > PH - 12) {
    addPage();
    ly = 18;
  }

  const SIG_Y = PH - 36;
  const STAMP_X = PW - MR - 68;
  const SIGX = PW - MR - 34;

  if (stampImg) {
    try {
      doc.addImage(stampImg, "PNG", STAMP_X, SIG_Y - 13, 25, 14);
    } catch {}
  }
  sf("normal", 7);
  doc.setTextColor(...MGRAY);
  doc.text("Company Stamp", STAMP_X + 12.5, SIG_Y + 3, { align: "center" });

  if (sigImg) {
    try {
      doc.addImage(sigImg, "PNG", SIGX, SIG_Y - 13, 28, 14);
    } catch {}
  }
  sf("normal", 7);
  doc.setTextColor(...MGRAY);
  doc.text("Authorized Signatory", SIGX + 14, SIG_Y + 3, { align: "center" });

  // ─────────────────────────────────────────────────────────────
  //  FOOTER — page X of Y, every page
  // ─────────────────────────────────────────────────────────────
  const fp = doc.getNumberOfPages();
  for (let i = 1; i <= fp; i++) {
    doc.setPage(i);
    sf("normal", 7);
    doc.setTextColor(...MGRAY);
    doc.text(`Page ${i} of ${fp}`, PW - MR, PH - 5, { align: "right" });
  }

  return doc;
}

// ═══════════════════════════════════════════════════════════════════
//  REACT COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function FormatFive({ data, letterheadImage }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!data) return;
    setLoading(true);
    setError(null);
    buildPDF(data, letterheadImage)
      .then((d) => {
        setPdfUrl(URL.createObjectURL(d.output("blob")));
        setLoading(false);
      })
      .catch((e) => {
        console.error("FormatFive:", e);
        setError(e.message || "Failed");
        setLoading(false);
      });
  }, [data, letterheadImage]);

  return (
    <div style={{ minHeight: "850px", fontFamily: "sans-serif" }}>
      {loading && (
        <div
          style={{ padding: "40px", textAlign: "center", marginTop: "100px" }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #f0f0f0",
              borderTop: "3px solid #118e44",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#64748b", fontWeight: 500 }}>
            Generating Preview…
          </p>
          <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {!loading && error && (
        <div style={{ padding: "20px", color: "#c0392b", textAlign: "center" }}>
          <p>PDF Error: {error}</p>
        </div>
      )}
      {!loading && !error && pdfUrl && (
        <iframe
          src={pdfUrl}
          title="Invoice Format 5"
          width="100%"
          height="850px"
          style={{ border: "none", display: "block" }}
        />
      )}
    </div>
  );
}
