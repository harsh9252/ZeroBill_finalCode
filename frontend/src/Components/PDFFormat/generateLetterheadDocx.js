/**
 * generateLetterheadDocx.js (Restored & Spacing-Fixed Version)
 * ─────────────────────────────────────────────────────────────────────────────
 * Restored the stable MHTML layout that user liked.
 * Fixed: Cover page spacing using negative margin to pull content up.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { saveAs } from 'file-saver';

export const generateLetterheadDocx = (data, letterheadImage) => {
  if (!data) return;

  const { company, customer, quotation, termsSections } = data;

  const safeText = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || doc.body.innerText || "").replace(/[^\x20-\x7E\t\n\r]/g, "");
  };

  const titleText = (quotation.headerText || 'TAX QUOTATION').toUpperCase();
  const dateStr = quotation.date || "";
  const qNumber = quotation.number || "";
  const custName = (customer.name || "DEEPAK VAISHNAV").toUpperCase();

  const boundary = '----=_NextPart_01DAB123.456789';
  const imgContent = letterheadImage ? letterheadImage.split(',')[1] : '';
  const imgType = letterheadImage ? letterheadImage.split(';')[0].split(':')[1] : 'image/png';

  const htmlBody = `
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
        <h1 style="font-size:48pt; font-family:'Arial Black', sans-serif; color:#000; margin:0;">${titleText}</h1>
        <p style="font-size:16pt; font-family:'Segoe UI', sans-serif; color:#333; margin-top:10pt;">${dateStr}</p>
        <p style="font-size:12pt; font-family:'Segoe UI', sans-serif; font-weight:bold; color:#000; margin-top:5pt;">${qNumber}</p>
      </div>

      <div style="margin-top:80mm;">
        <h2 style="font-size:24pt; font-family:'Arial Black', sans-serif; color:#000; margin:0;">${custName}</h2>
        <p style="font-size:8.5pt; font-family:'Segoe UI', sans-serif; color:#555; margin-top:8pt;">
          ${company.tel ? `TEL: ${company.tel} | ` : ""}${company.email ? `EMAIL: ${company.email} | ` : ""}${company.address ? `ADDR: ${company.address}` : ""}
        </p>
        ${quotation.remark ? `<p style="font-size:9pt; font-family:'Segoe UI', sans-serif; font-weight:bold; margin-top:5pt;">REMARK: ${quotation.remark}</p>` : ""}
      </div>
    </div>
  </div>

  <br clear="all" style="mso-special-character:line-break; page-break-before:always" />

  <!-- CONTENT PAGES -->
  <div class="content-body">
    ${termsSections.map(section => `
      <h2 style="font-size:16pt; font-family:'Arial Black', sans-serif; color:#0d4022; text-transform:uppercase; margin-top:5pt; margin-bottom:12pt; border-bottom:1px solid #ddd; padding-bottom:5pt;">${safeText(section.heading)}</h2>
      <div style="font-size:11pt; font-family:'Arial', sans-serif; line-height:1.7; color:#000; text-align:justify;">${safeText(section.content)}</div>
      <div style="height:15pt;">&nbsp;</div>
    `).join('')}
  </div>

  <!-- FOOTER -->
  <div style="mso-element:footer" id="f1">
    <p class="MsoFooter" align="right">
      <span style="font-size:9pt; font-family:'Segoe UI'; color:#888888; font-weight:bold;">PAGE </span>
      <span style="mso-field-code: PAGE " style="font-size:16pt; font-family:'Arial Black'; color:#000; font-weight:900;"></span>
    </p>
  </div>
</div>
`;

  const mhtmlContent = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="${boundary}"

--${boundary}
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
${htmlBody}
</body>
</html>

${letterheadImage ? `--${boundary}
Content-Type: ${imgType}
Content-Transfer-Encoding: base64
Content-ID: <bgImage>

${imgContent}
` : ''}
--${boundary}--`;

  const blob = new Blob([mhtmlContent], { type: 'application/msword' });
  saveAs(blob, `${titleText.replace(/\s+/g, '_')}.doc`);
};
