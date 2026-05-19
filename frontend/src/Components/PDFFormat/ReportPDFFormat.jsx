import React from 'react';
import { pdfFriendlyStyles } from './pdfStyles';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/dateFormat';

/*ReportPDFFormat - Premium List View for Reports (Green & Black Theme)*/

const ReportPDFFormat = ({ reportData, reportType, startDate, endDate, businessInfo, currency = 'INR' }) => {
  const businessName = businessInfo?.business_name || 'Business Name';
  
  const reportTitle = {
    quotation: 'Quotation Report',
    proforma_invoice: 'Proforma Invoice Report',
    sales_invoice: 'Tax Invoice Report'
  }[reportType] || 'Report';

  const columns = {
    quotation: [
      { header: 'Date', key: 'quotation_date', align: 'left', width: '15%' },
      { header: 'Number', key: 'quotation_number', align: 'left', width: '20%' },
      { header: 'Party Name', key: 'party_name', align: 'left', width: '35%' },
      { header: 'Tax Amount', key: 'tax_amount', align: 'right', width: '15%', format: (v) => formatCurrency(v, currency) },
      { header: 'Grand Total', key: 'grand_total', align: 'right', width: '15%', format: (v) => formatCurrency(v, currency) }
    ],
    proforma_invoice: [
      { header: 'Date', key: 'proforma_date', align: 'left', width: '15%' },
      { header: 'Number', key: 'proforma_number', align: 'left', width: '20%' },
      { header: 'Party Name', key: 'party_name', align: 'left', width: '35%' },
      { header: 'Tax Amount', key: 'tax_amount', align: 'right', width: '15%', format: (v) => formatCurrency(v, currency) },
      { header: 'Grand Total', key: 'grand_total', align: 'right', width: '15%', format: (v) => formatCurrency(v, currency) }
    ],
    sales_invoice: [
      { header: 'Date', key: 'invoice_date', align: 'left', width: '12%' },
      { header: 'Invoice #', key: 'invoice_number', align: 'left', width: '18%' },
      { header: 'Party Name', key: 'party_name', align: 'left', width: '30%' },
      { header: 'Tax Amount', key: 'tax_amount', align: 'right', width: '12%', format: (v) => formatCurrency(v, currency) },
      { header: 'Grand Total', key: 'grand_total', align: 'right', width: '16%', format: (v) => formatCurrency(v, currency) },
      { header: 'Due Date', key: 'due_date', align: 'left', width: '12%' }
    ]
  }[reportType] || [];

  // Pagination logic: ~25 rows per page for reports
  const rowsPerPage = 25;
  const pages = [];
  for (let i = 0; i < reportData.length; i += rowsPerPage) {
    pages.push(reportData.slice(i, i + rowsPerPage));
  }

  const totalAmount = reportData.reduce((sum, row) => sum + parseFloat(row.grand_total || 0), 0);

  return (
    <>
      <style>{pdfFriendlyStyles}</style>
      <style>{`
        .preview-wrapper#report-pdf-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #000000;
          background: #ffffff;
          line-height: 1.4;
        }
        
        .preview-wrapper#report-pdf-container .pdf-page {
          background: white;
          padding: 0;
          position: relative;
        }

        .preview-wrapper#report-pdf-container .page-padding {
          padding: 15mm 15mm 20mm 15mm !important;
        }

        /* HEADER REDESIGN */
        .preview-wrapper#report-pdf-container .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2.5pt solid #129046;
          padding-bottom: 20px;
          margin-bottom: 25px;
        }

        .preview-wrapper#report-pdf-container .business-info h2 {
          margin: 0 0 8px 0;
          color: #000000;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1;
        }

        .preview-wrapper#report-pdf-container .business-info p {
          margin: 3px 0;
          font-size: 10px;
          color: #333333;
          font-weight: 500;
        }

        .preview-wrapper#report-pdf-container .business-logo {
          height: 60px;
          max-width: 200px;
          object-fit: contain;
        }

        /* META SECTION */
        .preview-wrapper#report-pdf-container .report-meta {
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .preview-wrapper#report-pdf-container .report-meta-left h1 {
          margin: 0;
          font-size: 20px;
          color: #129046;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .preview-wrapper#report-pdf-container .report-meta-left p {
          margin: 6px 0 0 0;
          font-size: 11px;
          color: #1a202c;
          font-weight: 700;
        }

        .preview-wrapper#report-pdf-container .report-meta-right {
          text-align: right;
          font-size: 10px;
          color: #4a5568;
          font-weight: 500;
        }

        .preview-wrapper#report-pdf-container .report-meta-right strong {
          color: #000;
          font-weight: 700;
        }

        /* TABLE REDESIGN */
        .preview-wrapper#report-pdf-container .report-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5pt solid #000000;
        }

        .preview-wrapper#report-pdf-container .report-table th {
          padding: 10px 8px;
          text-align: left;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          background: #000000;
          color: #ffffff;
          border: 1pt solid #333333;
          letter-spacing: 0.3px;
        }

        .preview-wrapper#report-pdf-container .report-table td {
          padding: 10px 8px;
          font-size: 9.5px;
          border: 0.5pt solid #e2e8f0;
          color: #000000;
          font-weight: 500;
          vertical-align: middle;
        }

        .preview-wrapper#report-pdf-container .report-table tr:nth-child(even) {
          background-color: #f0fdf4; /* Zebra Striping - Light Green */
        }

        .preview-wrapper#report-pdf-container .report-table tr:hover {
          background-color: #f7fafc;
        }

        /* SUMMARY / FOOTER */
        .preview-wrapper#report-pdf-container .report-footer {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          padding: 20px;
          border: 2pt solid #129046;
          background: #ffffff;
          border-radius: 12px;
        }

        .preview-wrapper#report-pdf-container .summary-title {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          color: #129046;
          margin-bottom: 8px;
          display: block;
        }

        .preview-wrapper#report-pdf-container .summary-note {
          font-size: 8px;
          color: #718096;
          font-style: italic;
          max-width: 300px;
        }

        .preview-wrapper#report-pdf-container .total-box {
          text-align: right;
          min-width: 250px;
        }

        .preview-wrapper#report-pdf-container .total-item {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 20px;
          margin-bottom: 5px;
        }

        .preview-wrapper#report-pdf-container .total-label {
          font-size: 11px;
          font-weight: 700;
          color: #4a5568;
        }

        .preview-wrapper#report-pdf-container .total-value {
          font-size: 11px;
          font-weight: 900;
          color: #000000;
          min-width: 100px;
        }

        .preview-wrapper#report-pdf-container .grand-total-row {
          margin-top: 15px;
          padding: 15px;
          background: #129046;
          border-radius: 8px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 30px;
        }

        .preview-wrapper#report-pdf-container .grand-total-label {
          font-size: 14px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .preview-wrapper#report-pdf-container .grand-total-value {
          font-size: 22px;
          font-weight: 900;
          color: #ffffff;
          min-width: 150px;
          text-align: right;
        }

        .preview-wrapper#report-pdf-container .page-number {
          position: absolute;
          bottom: 10mm;
          right: 15mm;
          font-size: 10px;
          font-weight: 600;
          color: #718096;
        }
      `}</style>

      <div className="preview-wrapper" id="report-pdf-container">
        {pages.map((pageRows, pageIdx) => (
          <div key={pageIdx} className="pdf-page">
            <div className="page-padding">
              <div className="page-content">
                {/* Header only on first page */}
                {pageIdx === 0 && (
                  <>
                    <div className="report-header">
                      <div className="business-info">
                        <h2>{businessName}</h2>
                        <p>{businessInfo?.address || businessInfo?.office_address}</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          {businessInfo?.gstin && <p><strong>GSTIN:</strong> {businessInfo.gstin}</p>}
                          {businessInfo?.pan && <p><strong>PAN:</strong> {businessInfo.pan}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {businessInfo?.phone && <p><strong>PH:</strong> {businessInfo.phone}</p>}
                          {businessInfo?.email && <p><strong>EM:</strong> {businessInfo.email}</p>}
                        </div>
                      </div>
                      {businessInfo?.logo_url && (
                        <img 
                          src={businessInfo.logo_url.startsWith('http') ? businessInfo.logo_url : `${import.meta.env.VITE_BACKEND_URL}${businessInfo.logo_url}`} 
                          className="business-logo" 
                          alt="Logo" 
                        />
                      )}
                    </div>

                    <div className="report-meta">
                      <div className="report-meta-left">
                        <h1>{reportTitle}</h1>
                        <p>Period: {formatDate(startDate)} to {formatDate(endDate)}</p>
                      </div>
                      <div className="report-meta-right">
                        <p>Generated: <strong>{formatDate(new Date())} {new Date().toLocaleTimeString()}</strong></p>
                        <p>Total Records: <strong>{reportData.length}</strong></p>
                      </div>
                    </div>
                  </>
                )}

                <table className="report-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                      {columns.map((col, ci) => (
                        <th key={ci} style={{ textAlign: col.align, width: col.width }}>{col.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, ri) => (
                      <tr key={ri}>
                        <td style={{ textAlign: 'center' }}>{pageIdx * rowsPerPage + ri + 1}</td>
                        {columns.map((col, ci) => {
                          const value = row[col.key];
                          const formattedValue = col.format ? col.format(value) : (value || '-');
                          
                          if (col.key === 'status') {
                            // Status is hidden for Tax Invoices as per latest request
                            if (reportType === 'sales_invoice') {
                              return <td key={ci} style={{ textAlign: col.align }}>-</td>;
                            }
                            return (
                              <td key={ci} style={{ textAlign: col.align, fontWeight: '700', textTransform: 'uppercase' }}>
                                {value === 'proforma' ? 'OPEN' : value}
                              </td>
                            );
                          }

                          if (col.key.includes('date')) {
                            return <td key={ci} style={{ textAlign: col.align }}>{formatDate(value)}</td>;
                          }

                          return <td key={ci} style={{ textAlign: col.align }}>{formattedValue}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer only on last page */}
                {pageIdx === pages.length - 1 && (
                  <div className="report-footer">
                    <div>
                      <span className="summary-title">Statement Summary</span>
                      <p className="summary-note">* This is a computer generated statement and does not require a physical signature.</p>
                      <p className="summary-note" style={{marginTop: '4px'}}>* Generated from Zero Billing Software.</p>
                    </div>
                    <div className="total-box">
                      <div className="total-item">
                        <span className="total-label">Sub Total:</span>
                        <span className="total-value">{formatCurrency(totalAmount, currency)}</span>
                      </div>
                      <div className="total-item">
                        <span className="total-label">Transaction Count:</span>
                        <span className="total-value">{reportData.length} Items</span>
                      </div>
                      <div className="grand-total-row">
                        <span className="grand-total-label">GRAND TOTAL ({currency})</span>
                        <span className="grand-total-value">{formatCurrency(totalAmount, currency)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="page-number">Page {pageIdx + 1} of {pages.length}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ReportPDFFormat;
