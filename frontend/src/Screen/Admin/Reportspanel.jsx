import React, { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Download, ChevronDown, FileText, AlertCircle, RotateCcw } from "lucide-react";
import { partyAPI, getApiConfig, getAuthToken, businessAPI } from "../../utils/api.js";
import { formatCurrency } from "../../utils/currency";
import { generateUniversalPDF } from "../../utils/generateUniversalPDF";
import ReportPDFFormat from "../../Components/PDFFormat/ReportPDFFormat";
import Date_wise_Filter_Button, { getRangeBoundsPure } from "../../Components/Date_wise_Filter_Button.jsx";
import DashboardBackButton from "../../Components/DashboardBackButton.jsx";
import GeneralEmptyState from "../../Components/GeneralEmptyState";
import CommonDropdown from "../../Components/CustomDropdown.jsx";
import { formatDate } from "../../utils/dateFormat";


export default function ReportsPanel({ currency = 'INR', language = 'en-IN' }) {
  const [selectedBusinessId, setSelectedBusinessId] = useState(localStorage.getItem('selectedBusinessId'));
  const [reportType, setReportType] = useState("");
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState("");
  const [status, setStatus] = useState("");
  // Date range state
  const [customRange, setCustomRange] = useState({ 
    from: "", 
    to: "" 
  });
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [businessInfo, setBusinessInfo] = useState(null);

  const { baseURL } = getApiConfig();

  useEffect(() => {
    if (selectedBusinessId) {
      fetchBusinessInfo(selectedBusinessId);
      fetchParties();
    }

    const handleBusinessChange = (event) => {
      const { businessId: newId } = event.detail;
    
      if (newId && newId != selectedBusinessId) {

        setSelectedBusinessId(newId);
        setReportData([]); // Clear previous report data
        setSelectedParty(""); // Clear selected party
        // fetchParties will be called by the useEffect below
      }
    };

    window.addEventListener('businessChanged', handleBusinessChange);
    return () => window.removeEventListener('businessChanged', handleBusinessChange);
  }, [selectedBusinessId]);

  const fetchBusinessInfo = async (id) => {
    try {
      const response = await businessAPI.getById(id);
      if (response.success) {
        setBusinessInfo(response.data);
      }
    } catch (err) {
      console.error("Error fetching business info:", err);
    }
  };

  const reportTypes = [
    { value: "quotation", label: "Quotation" },
    { value: "proforma_invoice", label: "Proforma Invoice" },
    { value: "sales_invoice", label: "Tax Invoice" },
  ];

  // Dynamic status options based on report type
  const getStatusOptions = () => {
    if (reportType === "sales_invoice") {
      return [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "overdue", label: "Overdue" },
      ];
    } else if (reportType === "quotation" || reportType === "proforma_invoice") {
      return [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ];
    }
    return [];
  };

  const statusOptions = getStatusOptions();

  // Fetch parties when report type is selected
  useEffect(() => {
    if (reportType) {
      fetchParties();
    }
  }, [reportType]);

  // Auto-fetch report data ONLY when status changes (if other filters are set)
  // or just depend on the Search button for everything for better control.
  // The user specifically complained about it loading "before selecting end date".
  // So we will REMOVE the auto-fetch useEffect and rely on a Search button.

  const fetchParties = async () => {
    try {
      const busId = selectedBusinessId || localStorage.getItem('selectedBusinessId');

      if (!busId) {
    
        return;
      }
      const response = await partyAPI.getAll(busId);
      if (response.success) {
     
        setParties(response.data || []);
      }
    } catch (err) {
      console.error("Reportspanel: Error fetching parties:", err);
      setError("Failed to load parties");
    }
  };

  // Helper to clear results when filters change
  const handleFilterChange = () => {
    if (hasSearched) {
      setReportData([]);
      setHasSearched(false);
    }
  };

  const fetchReportData = async () => {
    const businessId = localStorage.getItem('selectedBusinessId');
    if (!businessId) {
      setError("Please select a business first");
      setLoading(false);
      return;
    }

    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);
    if (!reportType) {
      setError("Please select Report Type");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setHasSearched(true);

      const params = {
        business_id: businessId,
        party_id: selectedParty
      };

      if (bounds) {
        const { start, end } = bounds;
        params.start_date = start instanceof Date ? start.toISOString().split('T')[0] : start;
        params.end_date = end instanceof Date ? end.toISOString().split('T')[0] : end;
      }

      if (status) {
        params.status = status;
      }

      const queryString = new URLSearchParams(params).toString();
      const token = getAuthToken();

      let response;
      switch (reportType) {
        case "quotation":
          response = await fetch(`${baseURL}/quotations?${queryString}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          break;
        case "proforma_invoice":
          response = await fetch(`${baseURL}/proforma-invoices?${queryString}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          break;
        case "sales_invoice":
          response = await fetch(`${baseURL}/sales-invoices?${queryString}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          break;
        default:
          throw new Error("Invalid report type");
      }

      const data = await response.json();
    
      // Handle different response formats
      if (data.success) {
        const reportArray = Array.isArray(data.data) ? data.data : (data.data && Array.isArray(data.data.data) ? data.data.data : []);
        setReportData(reportArray);
        if (reportArray.length === 0) {
          setError("No data found for the selected filters");
        }
      } else {
        setError(data.message || "Failed to fetch report data");
        setReportData([]);
      }
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError("Failed to load report data: " + err.message);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setReportType("");
    setSelectedParty("");
    setStatus("");
    setCustomRange({ from: "", to: "" });
    setError("");
    setReportData([]);
    setHasSearched(false);
  };

  const handleGenerateReport = async () => {
    if (!reportData || reportData.length === 0) {
      setError("No data available to export");
      return;
    }
    generateExcel(reportData, reportType);
  };

  const handleDownloadPDF = async () => {
    if (!reportData || reportData.length === 0) {
      setError("No data available to export");
      return;
    }

    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);
    const startDate = bounds?.start?.toISOString().split('T')[0] || '-';
    const endDate = bounds?.end?.toISOString().split('T')[0] || '-';

    setLoading(true);
    try {
      await generateUniversalPDF({
        component: <ReportPDFFormat 
          reportData={reportData} 
          reportType={reportType}
          startDate={startDate}
          endDate={endDate}
          businessInfo={businessInfo}
          currency={currency}
        />,
        filename: `${reportType}_report_${startDate}_to_${endDate}.pdf`,
        onSuccess: () => {
          setLoading(false);
          setError("");
        },
        onError: (err) => {
          console.error("PDF generation failed:", err);
          setError("Failed to generate PDF");
          setLoading(false);
        }
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Failed to generate PDF");
      setLoading(false);
    }
  };

  // Helper function to format date for display
  const formatDateDisplay = (dateString) => {
    return formatDate(dateString);
  };

  // Helper function to get status for sales invoice
  const getSalesInvoiceStatus = (row) => {
    if (row.status === 'closed') return 'Closed';
    if (row.due_date) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const due = new Date(row.due_date);
      due.setHours(0, 0, 0, 0);
      if (due < now) return 'Overdue';
    }
    return 'Open';
  };

  const generateExcel = (data, type) => {
    if (!data || data.length === 0) {
      setError("No data available to export");
      return;
    }

    // Helper function to format date
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString(language, { year: 'numeric', month: '2-digit', day: '2-digit' });
      } catch (e) {
        return dateString;
      }
    };

    // Helper function to format amount with currency
    const formatAmount = (amount) => {
      if (!amount) return formatCurrency(0, currency);
      const num = parseFloat(amount);
      return formatCurrency(num, currency);
    };

    // Define columns based on report type
    let columns = [];
    let rows = [];

    if (type === "quotation") {
      columns = ["Quotation #", "Date", "Party Name", "Amount", "Status"];
      rows = data.map(row => [
        row.quotation_number || '-',
        formatDate(row.quotation_date),
        row.party_name || '-',
        formatAmount(row.grand_total),
        row.status === 'open' ? 'Open' : 'Closed'
      ]);
    } else if (type === "proforma_invoice") {
      columns = ["Proforma #", "Date", "Party Name", "Amount", "Status"];
      rows = data.map(row => [
        row.proforma_number || '-',
        formatDate(row.proforma_date),
        row.party_name || '-',
        formatAmount(row.grand_total),
        row.status === 'open' ? 'Open' : 'Closed'
      ]);
    } else if (type === "sales_invoice") {
      columns = ["Invoice #", "Date", "Party Name", "Amount", "Due Date", "Status"];
      rows = data.map(row => [
        row.invoice_number || '-',
        formatDate(row.invoice_date),
        row.party_name || '-',
        formatAmount(row.grand_total),
        formatDate(row.due_date),
        getSalesInvoiceStatus(row)
      ]);
    }

    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);
    const startDate = bounds?.start?.toISOString().split('T')[0] || '-';
    const endDate = bounds?.end?.toISOString().split('T')[0] || '-';

    // Create HTML table with modern professional styling
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 30px;
            min-height: 100vh;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            margin-bottom: 30px;
            border-left: 5px solid #129046;
            padding-left: 20px;
          }
          .header h1 {
            margin: 0 0 8px 0;
            color: #1a1a1a;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p {
            margin: 0;
            color: #666;
            font-size: 13px;
            font-weight: 500;
          }
          .table-wrapper {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid #e8e8e8;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background-color: white;
          }
          thead {
            background: linear-gradient(90deg, #129046 0%, #0d7a35 100%);
            color: white;
          }
          th {
            padding: 16px 18px;
            text-align: left;
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
            border-bottom: 2px solid #0d7a35;
          }
          th:last-child {
            border-right: none;
          }
          tbody tr {
            border-bottom: 1px solid #e8e8e8;
            transition: all 0.3s ease;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafb;
          }
          tbody tr:nth-child(odd) {
            background-color: #ffffff;
          }
          tbody tr:hover {
            background-color: #f0f8f0;
            box-shadow: inset 0 0 0 1px #e0e0e0;
          }
          td {
            padding: 14px 18px;
            font-size: 13px;
            color: #333;
            border-right: 1px solid #e8e8e8;
            border-bottom: 1px solid #e8e8e8;
          }
          td:last-child {
            border-right: none;
          }
          .status-open {
            background-color: #e3f2fd;
            color: #1565c0;
            padding: 6px 14px;
            border-radius: 6px;
            font-weight: 700;
            display: inline-block;
            border: 1.5px solid #90caf9;
            font-size: 12px;
          }
          .status-closed {
            background-color: #e8f5e9;
            color: #2e7d32;
            padding: 6px 14px;
            border-radius: 6px;
            font-weight: 700;
            display: inline-block;
            border: 1.5px solid #81c784;
            font-size: 12px;
          }
          .status-overdue {
            background-color: #ffebee;
            color: #c62828;
            padding: 6px 14px;
            border-radius: 6px;
            font-weight: 700;
            display: inline-block;
            border: 1.5px solid #ef5350;
            font-size: 12px;
          }
          .amount {
            text-align: right;
            font-weight: 700;
            color: #129046;
            font-size: 13px;
          }
          .footer {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 2px solid #e8e8e8;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .footer-left {
            color: #666;
            font-size: 12px;
          }
          .footer-right {
            background: linear-gradient(90deg, #129046 0%, #0d7a35 100%);
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${type === 'quotation' ? '📋 Quotation Report' : type === 'proforma_invoice' ? '📄 Proforma Invoice Report' : '🧾 Tax Invoice Report'}</h1>
            <p>Generated: ${new Date().toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })} | Period: ${startDate} to ${endDate}</p>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
    `;

    // Add header row
    columns.forEach(col => {
      html += `<th>${col}</th>`;
    });

    html += `
                </tr>
              </thead>
              <tbody>
    `;

    // Add data rows
    rows.forEach((row) => {
      html += `<tr>`;

      row.forEach((cell, colIdx) => {
        let cellClass = '';

        // Add class for status column
        if (colIdx === columns.length - 1) { // Status column
          if (cell === 'Open') {
            cellClass = 'class="status-open"';
          } else if (cell === 'Closed') {
            cellClass = 'class="status-closed"';
          } else if (cell === 'Overdue') {
            cellClass = 'class="status-overdue"';
          }
        }

        // Add class for amount column
        if (columns[colIdx] === 'Amount') {
          cellClass = 'class="amount"';
        }

        html += `<td ${cellClass}>${cell}</td>`;
      });

      html += `</tr>`;
    });
    html += `
              </tbody>
            </table>
          </div>
          <div class="footer">
            <div class="footer-left">
              <p>Report generated automatically | All amounts in ${currency}</p>
            </div>
            <div class="footer-right">
              Total Records: ${rows.length}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=UTF-8" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const fileName = `${type}_report_${startDate}_to_${endDate}.xls`;
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="min-h-screen mt-4">
      {/* WHITE HEADER */}
      <div className="bg-white border-1 border-yellow-200 flex items-center justify-between mb-3 p-3 rounded-xl">
        <div className="flex items-center gap-4 flex-1">
          <DashboardBackButton />
          <div>
            <h1 className="text-2xl font-bold text-yellow-900">Generate Reports</h1>
            <p className="text-sm text-gray-600 mt-1">
              Select report type and filters to download Excel report
            </p>
          </div>

          <div className="ml-auto mr-4">
            <Date_wise_Filter_Button
              dateRangeLabel={dateRangeLabel}
              onRangeChange={(label) => setDateRangeLabel(label)}
              customRange={customRange}
              onRangeApply={(range) => {
                setCustomRange(range);
                setDateRangeLabel("Custom Date Range");
                handleFilterChange();
              }}
            />
          </div>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex gap-3">
          <button
            onClick={handleResetForm}
            disabled={loading}
            className="px-4 h-8 bg-red-600 text-white rounded-[7px] text-sm font-medium hover:bg-red-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={loading || reportData.length === 0}
            className={`px-4 h-8 rounded-[7px] text-sm font-medium flex items-center gap-2 transition-all duration-200 ${loading || reportData.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white hover:from-[#129046]/90 hover:to-[#9ccc53]/90 shadow-sm transform active:scale-95"
              }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Download size={14} />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* WHITE CONTAINER */}
      <div className="border-1 border-yellow-200 rounded-lg">
        <div className="mx-auto bg-white rounded-lg shadow-sm p-3 md:p-4">

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">

            {/* LEFT CARD - Report Type & Party Selection */}
            <div className="border border-gray-200 rounded p-3 md:p-4 flex flex-col">
              <div className="mb-3">
                <label className="block text-xs font-medium text-[#8B4513] mb-1.5">
                  Report Type <span className="text-red-500">*</span>
                </label>
                <CommonDropdown
                  options={reportTypes.map(t => ({ id: t.value, label: t.label }))}
                  value={reportType}
                  valueBy="id"
                  onChange={(opt) => {
                    setReportType(opt.id);
                    setSelectedParty("");
                    setStatus("");
                    handleFilterChange();
                  }}
                  placeholder="-- Select Report Type --"
                  className="w-full"
                />
              </div>

              {reportType && (
                <div>
                  <label className="block text-xs font-medium text-[#8B4513] mb-1.5">
                    Customer / Party Name
                  </label>
                  <CommonDropdown
                    options={parties.map(party => ({
                      id: party.party_id || party.id,
                      label: party.party_name,
                      trade_name: party.trade_name || ''
                    }))}
                    value={selectedParty}
                    valueBy="id"
                    onChange={(opt) => {
                   
                      setSelectedParty(opt.id);
                      handleFilterChange();
                    }}
                    placeholder="Select Party"
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* RIGHT CARD - Status */}
            {reportType && (
              <div className="border border-gray-200 rounded p-3 md:p-4 flex flex-col">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-[#8B4513] mb-1.5">
                      Status
                    </label>
                    <CommonDropdown
                      options={statusOptions.map(s => ({ id: s.value, label: s.label }))}
                      value={status}
                      valueBy="id"
                      onChange={(opt) => {
                        setStatus(opt.id);
                        handleFilterChange();
                      }}
                      placeholder="All Status"
                      className="w-full"
                    />
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-[#8B4513] mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customRange.from}
                      onChange={(e) => {
                        setCustomRange({ ...customRange, from: e.target.value });
                        setDateRangeLabel("Custom Date Range");
                        handleFilterChange();
                      }}
                      className="w-full px-3 h-8 py-0 border-2 border-gray-200 rounded-[6px] text-sm focus:outline-none focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8B4513] mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customRange.to}
                      onChange={(e) => {
                        setCustomRange({ ...customRange, to: e.target.value });
                        setDateRangeLabel("Custom Date Range");
                        handleFilterChange();
                      }}
                      className="w-full px-3 h-8 py-0 border-2 border-gray-200 rounded-[6px] text-sm focus:outline-none focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                    />
                  </div>
                  <div>
                    <button
                      onClick={fetchReportData}
                      disabled={loading || !reportType}
                      className={`w-full h-8 px-4 rounded-[7px] text-xs font-bold transition-all duration-200 ${loading || !reportType
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-[#129046] text-white hover:bg-[#0d7a35] shadow-sm"
                        }`}
                    >
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* DATA TABLE */}
      {hasSearched && (
        <div id="report-table-container" className="border-1 border-yellow-200 rounded-lg mt-4 bg-white p-6 shadow-md">
          <div className="flex flex-col mb-4">
            <h1 className="text-xl font-bold text-gray-800">
              {reportType === 'quotation' ? 'Quotation Report' : reportType === 'proforma_invoice' ? 'Proforma Invoice Report' : 'Tax Invoice Report'}
            </h1>
            <p className="text-sm text-gray-500">
              Period: {formatDate(getRangeBoundsPure(dateRangeLabel, customRange)?.start)} to {formatDate(getRangeBoundsPure(dateRangeLabel, customRange)?.end)}
            </p>
          </div>
          <div className="mx-auto bg-white rounded-lg shadow-sm p-3 md:p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Report Data</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-yellow-50 text-[#733e0a]">
                  <tr>
                    {reportType === "quotation" && (
                      <>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Quotation #</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Date</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Party Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Tax</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Total</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Status</th>
                      </>
                    )}
                    {reportType === "proforma_invoice" && (
                      <>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Proforma #</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Date</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Party Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Tax</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Total</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Status</th>
                      </>
                    )}
                    {reportType === "sales_invoice" && (
                      <>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Invoice #</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Date</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Party Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Tax</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Total</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Due Date</th>
                        <th className="px-4 py-2 text-left font-semibold text-sm uppercase">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-100">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10">
                        <GeneralEmptyState
                          title="No data found"
                          description="Try adjusting your filters to see more results."
                        />
                      </td>
                    </tr>
                  ) : (
                    reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-yellow-50">
                      {reportType === "quotation" && (
                        <>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.quotation_number || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{formatDateDisplay(row.quotation_date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.party_name || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{formatCurrency(parseFloat(row.tax_amount || 0), currency)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 font-semibold">{formatCurrency(parseFloat(row.grand_total || 0), currency)}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${row.status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'
                              }`}>
                              {row.status === 'open' ? 'Open' : 'Closed'}
                            </span>
                          </td>
                        </>
                      )}
                      {reportType === "proforma_invoice" && (
                        <>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.proforma_number || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{formatDateDisplay(row.proforma_date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.party_name || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{formatCurrency(parseFloat(row.tax_amount || 0), currency)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 font-semibold">{formatCurrency(parseFloat(row.grand_total || 0), currency)}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${row.status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'
                              }`}>
                              {row.status === 'open' ? 'Open' : 'Closed'}
                            </span>
                          </td>
                        </>
                      )}
                      {reportType === "sales_invoice" && (
                        <>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.invoice_number || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{formatDateDisplay(row.invoice_date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.party_name || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{formatCurrency(parseFloat(row.tax_amount || 0), currency)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 font-semibold">{formatCurrency(parseFloat(row.grand_total || 0), currency)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{formatDateDisplay(row.due_date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                             <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                                getSalesInvoiceStatus(row) === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                getSalesInvoiceStatus(row) === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-green-50 text-green-700 border-green-200'
                              }`}>
                                {getSalesInvoiceStatus(row)}
                              </span>
                          </td>
                        </>
                      )}
                    </tr>
                    )
                  )
                )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">Total Records: {reportData.length}</p>
          </div>
        </div>
      )}


    </div>
  );
}
