/**
 * generateEmeraldDocx.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-Perfect Emerald Edition: Replicates the UI from CustomQuotation_Emerald.jsx
 * Multi-Section Architecture: Different layouts for Cover vs Content Pages.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { saveAs } from 'file-saver';

export const generateEmeraldDocx = (data) => {
  if (!data) return;

  const { company, quotation, termsSections } = data;

  const C = {
    FOREST: '#0d4022',
    EMERALD: '#129046',
    LIME: '#9ccc53',
    SOFT: '#8dad8a',
    BODY: '#374151',
    WHITE: '#FFFFFF',
    RULE: '#E5E7EB'
  };

  const fmt = (v) => v && v !== 'null' ? v : '';
  const rawDate = quotation.quotation_date || quotation.date;
  const dateObj = rawDate ? new Date(rawDate) : new Date();
  const dayMonth = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const year = dateObj.getFullYear();
  const titleText = (quotation.headerText || quotation.header_text || 'PROJECT\nPROPOSAL').toUpperCase();
  const preparedBy = fmt(company.name) || "Company Name";
  const businessName = fmt(quotation.business_name);
  const proposalFor = (fmt(data.customer?.name) || fmt(quotation.customer_name) || fmt(company.email) || "Client Name").toUpperCase();
  const phone = fmt(data.customer?.phone) || fmt(quotation.customer_phone) || fmt(company.tel) || "N/A";
  const website = fmt(company.website) || fmt(company.address) || "www.website.com";
  const remark = fmt(quotation.remark);

  const boundary = '----=_NextPart_Emerald_01DAB123';

  // --- HEADER 1: FULL COVER DESIGN ---
  const header1VML = `
    <div style='mso-element:header' id=h1>
      <!--[if gte vml 1]>
      <v:group style='position:absolute;width:595.3pt;height:841.9pt;mso-position-horizontal:left;mso-position-horizontal-relative:page;mso-position-vertical:top;mso-position-vertical-relative:page' coordsize="5953,8419">
        
        <!-- Top Right Cluster (Precision Refined) -->
        <v:rect style='position:absolute;left:5050;top:-150;width:525;height:525;z-index:-10;rotation:45' strokecolor="${C.LIME}" strokeweight="6pt" filled="f" o:allowincell="f"><v:shadow on="t" color="black" opacity="0.1"/></v:rect>
        <v:shape style='position:absolute;left:4000;top:-800;width:2400;height:2200;z-index:-5' coordsize="2400,2200" path="m 0,0 l 2000,-400 2400,2200 400,2600 x e" fillcolor="${C.FOREST}" stroked="f" o:allowincell="f"><v:shadow on="t" color="gray" opacity="0.3" offset="12pt,12pt"/></v:shape>
        <v:shape style='position:absolute;left:5050;top:-200;width:900;height:4000;z-index:-8' coordsize="900,4000" path="m 0,0 l 750,-280 900,4000 150,4280 x e" fillcolor="${C.EMERALD}" stroked="f" o:allowincell="f"/>
        <v:shape style='position:absolute;left:4900;top:-450;width:100;height:3200;z-index:-7' coordsize="100,3200" path="m 0,0 l 90,-120 100,3200 10,3120 x e" fillcolor="${C.LIME}" stroked="f" o:allowincell="f"/>

        <!-- Bottom Left Cluster (Refined with Shadows) -->
        <v:shape style='position:absolute;left:-1200;top:5800;width:4500;height:3800;z-index:-5' coordsize="4500,3800" path="m 0,0 l 2800,800 2400,3800 -400,3000 x e" fillcolor="${C.FOREST}" stroked="f" o:allowincell="f"><v:shadow on="t" color="gray" opacity="0.2" offset="6pt,6pt"/></v:shape>
        <v:shape style='position:absolute;left:1400;top:6400;width:550;height:4000;z-index:-4' coordsize="550,4000" path="m 0,0 l 550,200 500,4000 -50,3800 x e" fillcolor="${C.EMERALD}" stroked="f" o:allowincell="f"><v:shadow on="t" color="gray" opacity="0.15" offset="4pt,4pt"/></v:shape>
        <v:shape style='position:absolute;left:2000;top:6600;width:250;height:4000;z-index:-3' coordsize="250,4000" path="m 0,0 l 250,120 220,4000 -30,3880 x e" fillcolor="${C.LIME}" stroked="f" o:allowincell="f"><v:shadow on="t" color="gray" opacity="0.1" offset="3pt,3pt"/></v:shape>
        <v:rect style='position:absolute;left:2400;top:6800;width:850;height:850;z-index:-2;rotation:-35' filled="f" strokecolor="${C.LIME}" strokeweight="5pt" o:allowincell="f"><v:shadow on="t" color="black" opacity="0.1" offset="5pt,5pt"/></v:rect>
      </v:group>
      <![endif]-->
    </div>
  `;

  // --- HEADER 2: SIMPLE SIDEBAR FOR CONTENT ---
  const header2VML = `
    <div style='mso-element:header' id=h2>
      <!--[if gte vml 1]>
      <v:group style='position:absolute;width:595.3pt;height:841.9pt;mso-position-horizontal:left;mso-position-horizontal-relative:page;mso-position-vertical:top;mso-position-vertical-relative:page' coordsize="5953,8419">
        <v:rect style='position:absolute;left:0;top:0;width:100;height:8419;z-index:-10' fillcolor="${C.EMERALD}" stroked="f" o:allowincell="f"/>
        <v:rect style='position:absolute;left:100;top:0;width:30;height:8419;z-index:-9' fillcolor="${C.LIME}" opacity="0.3" stroked="f" o:allowincell="f"/>
      </v:group>
      <![endif]-->
    </div>
  `;

  const mhtmlTop = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="${boundary}"

--${boundary}
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

    body { font-family: 'Segoe UI', Arial, sans-serif; color: ${C.BODY}; margin: 0; }
    p, div { mso-line-height-rule: exactly; }
    .rich-text-container { font-size: 11pt; line-height: 1.6; }
    .rich-text-container h1, .rich-text-container h2 { color: ${C.FOREST}; font-family: 'Arial Black'; text-transform: uppercase; border-left: 10pt solid ${C.EMERALD}; padding-left: 15pt; margin-top: 30pt; }
  </style>
</head>
<body>
  ${header1VML}
  ${header2VML}

  <div class="Section1">
    <table width="100%" height="842" border="0" cellpadding="0" cellspacing="0" style="height:842pt; width:100%; table-layout:fixed; mso-height-rule:exactly;">
      <tr>
        <td valign="top" style="padding: 60pt 50pt;">
          <div style="margin-bottom: 30pt;">
            ${company.logo?.url ? `<img src="${company.logo.url}" style="height: 45pt; width: auto;" />` : `<h2 style="color:${C.FOREST}; margin:0; font-family:'Arial Black'; text-transform:uppercase;">${fmt(company.name) || preparedBy}</h2>`}
          </div>

          <div style="margin-top: 30pt;">
            <table cellpadding="0" cellspacing="0" border="0" style="mso-table-lspace:0pt; mso-table-rspace:0pt;">
              <tr>
                <td width="12" style="width: 12pt; background-color: ${C.EMERALD};">&nbsp;</td>
                <td style="padding-left: 18pt;">
                  <p style="font-size: 52pt; font-weight: 900; color: ${C.FOREST}; margin: 0; line-height: 1.0; font-family: 'Arial Black'; text-transform: uppercase;">${titleText.replace('\n', '<br/>')}</p>
                </td>
              </tr>
            </table>
            <div style="width: 85%; height: 4pt; background-color: ${C.FOREST}; margin-top: 15pt;"></div>
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
                  <p style="color: ${C.SOFT}; font-size: 12pt; font-weight: bold; margin: 0; text-transform: uppercase;">Prepared By:</p>
                  <p style="font-size: 28pt; font-weight: 900; color: ${C.FOREST}; margin: 0; font-family: 'Arial Black'; line-height: 1.0;">${preparedBy}</p>
                  ${businessName ? `<p style="font-size: 12pt; color: ${C.FOREST}; margin-top: 2pt; opacity: 0.75; font-weight: bold;">${businessName}</p>` : ''}
                </div>
                <div style="mso-margin-bottom-alt: 12pt; text-align:right;">
                  <p style="color: ${C.SOFT}; font-size: 12pt; font-weight: bold; margin: 0;">${dayMonth}</p>
                  <p style="font-size: 85pt; font-weight: 900; color: ${C.FOREST}; margin: 0; font-family: 'Arial Black'; line-height: 0.8;">${year}</p>
                </div>
                <div style="mso-margin-bottom-alt: 12pt; text-align:right;">
                  <p style="color: ${C.SOFT}; font-size: 12pt; font-weight: bold; margin: 0; text-transform: uppercase;">Proposal For:</p>
                  <p style="font-size: 28pt; font-weight: 900; color: ${C.FOREST}; margin: 0; font-family: 'Arial Black'; text-transform: uppercase; line-height: 1.0;">${proposalFor}</p>
                  ${phone ? `<p style="font-size: 11pt; font-weight: bold; color: ${C.FOREST}; margin-top: 4pt; line-height: 1.2;">Phone / Email : ${phone}</p>` : ''}
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
    ${termsSections.map((section, idx) => `
      <div style="padding-bottom: 40pt;">
        <div class="rich-text-container">
          <h2>${fmt(section.heading) || 'PROJECT DETAILS'}</h2>
          ${section.content || ''}
        </div>
      </div>
      ${idx < termsSections.length - 1 ? '<br clear="all" style="mso-special-character:line-break; page-break-before:always" />' : ''}
    `).join('')}
    
    <div style='mso-element:footer' id=f1>
      <p class=MsoFooter align=right style='text-align:right; margin-right:40pt; color:${C.SOFT}; font-weight:bold;'>
        PAGE <span style='mso-field-code:" PAGE "'><span style='mso-no-proof:yes'></span></span>
      </p>
    </div>
  </div>
</body>
</html>

--${boundary}--`;

  const blob = new Blob(['\ufeff', mhtmlTop], { type: 'application/msword' });
  const filename = `${(quotation.headerText || quotation.header_text || 'Proposal').replace(/\s+/g, '_')}.doc`;
  saveAs(blob, filename);
};
