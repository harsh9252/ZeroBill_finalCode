import { useReactToPrint } from "react-to-print";
import { formatCurrency } from "../../utils/currency";
import React, { useRef, useState, useLayoutEffect } from "react";
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Download,
  User,
  Calendar,
  Hash,
  MessageSquare,
  Tag,
  CheckCircle,
} from "lucide-react";

const PRPdfFormat = ({ previewData, onBack }) => {
  console.log("PR Preview Data:", previewData);
  const [pages, setPages] = useState(null);
  const printRef = useRef(null);
  const measureRef = useRef(null);

  // ── Data extraction ──────────────────────────────────────────────────────
  const prNumber = previewData.pr_number;
  const date = new Date(previewData.pr_date).toLocaleDateString();
  const requester = previewData.requester;
  const poNumber = previewData.po_number || "—";
  const approvers = previewData.approvers || "—";
  const status = previewData.status
    ? previewData.status.charAt(0).toUpperCase() + previewData.status.slice(1)
    : "—";
  const comments = previewData.comments || "";
  const items = previewData.items || [];
  const currency = previewData.currency || "INR";
  const terms = previewData.terms || [];

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const totalAmount = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const formatCurrencyDisplay = (v) => formatCurrency(v, currency);

  // ── Brand colours ────────────────────────────────────────────────────────
  const G = "#16A34A";
  const GL = "#DCFCE7";
  const B = "#2563EB";
  const BD = "#1E3A8A";
  const BL = "#EFF6FF";

  const statusColor = {
    Pending: { bg: "#FEF9C3", text: "#854D0E", border: "#FDE047" },
    Approved: { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" },
    Rejected: { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  }[status] || { bg: BL, text: BD, border: "#93C5FD" };

  // ── Term pagination — extra pages only when terms exist ──────────────────
  const [termPages, setTermPages] = useState(() =>
    terms.length > 0 ? [terms] : []
  );

  useLayoutEffect(() => {
    if (!items || items.length === 0) {
      setPages([{ items: [], isLast: true }]);
      return;
    }

    const totalItems = items.length;

    // First page me info grid bhi hai → kam rows
    let FIRST_PAGE_ROWS;
    let OTHER_PAGE_ROWS;

    // 🔥 dynamic logic
    if (totalItems <= 10) {
      FIRST_PAGE_ROWS = totalItems;     // sab ek page me
      OTHER_PAGE_ROWS = 0;
    } else if (totalItems <= 15) {
      FIRST_PAGE_ROWS = 15;
      OTHER_PAGE_ROWS = 0;
    } else if (totalItems <= 27) {
      FIRST_PAGE_ROWS = 20;
      OTHER_PAGE_ROWS = 20;
    } else {
      FIRST_PAGE_ROWS = 25;
      OTHER_PAGE_ROWS = 25;
    }
    const result = [];
    let i = 0;

    // First page
    result.push({
      items: items.slice(i, i + FIRST_PAGE_ROWS),
      isLast: items.length <= FIRST_PAGE_ROWS,
      startIndex: i,
    });

    i += FIRST_PAGE_ROWS;

    // Remaining pages
    while (i < items.length) {
      result.push({
        items: items.slice(i, i + OTHER_PAGE_ROWS),
        isLast: i + OTHER_PAGE_ROWS >= items.length,
        startIndex: i,
      });
      i += OTHER_PAGE_ROWS;
    }

    setPages(result);
  }, [items]);
  const MIN_ROWS = 10;
  const emptyRows = Array.from({ length: Math.max(0, MIN_ROWS - items.length) }).map(() => ({}));
  const hasTerms = termPages.length > 0;
  const termsToDisplay = hasTerms ? termPages : [];
  const totalPages = 1 + (hasTerms ? termPages.length : 0);

  const executePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `PR_${prNumber || "draft"}`,
  });

  // ── Table config ─────────────────────────────────────────────────────────
  const tableHeaders = ["S.No", "Description / Service", "UOM", "Qty", "Unit Price", "Amount"];
  const colWidths = ["4%", "38%", "10%", "12%", "18%", "18%"];

  const pageStyle = {
    width: "210mm",
    height: "297mm",
    background: "white",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    boxShadow:
      "0 1px 4px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.06)",
  };

  // ── Sub-components ────────────────────────────────────────────────────────
  const Field = ({ icon, label, value, badge }) => (
    <div style={{ padding: "10px 14px", background: "white" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
        <span style={{ color: B }}>{icon}</span>
        <span style={{
          fontSize: "9px", fontWeight: "700", color: "#9CA3AF",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          {label}
        </span>
      </div>
      {badge ? (
        <span style={{
          display: "inline-block", padding: "2px 10px", borderRadius: "20px",
          fontSize: "11px", fontWeight: "700",
          background: statusColor.bg, color: statusColor.text,
          border: `1px solid ${statusColor.border}`,
        }}>
          {value}
        </span>
      ) : (
        <div style={{
          fontSize: "12px", color: "#111827", fontWeight: "500",
          borderBottom: "1.5px dashed #D1D5DB", paddingBottom: "2px", minHeight: "20px",
        }}>
          {value}
        </div>
      )}
    </div>
  );

  const PageDivider = ({ num, total }) => (
    <div className="no-print" style={{
      height: "52px", display: "flex", alignItems: "center",
      justifyContent: "center", gap: "14px", flexShrink: 0,
    }}>
      <div style={{ width: "80px", height: "1px", background: "#94A3B8" }} />
      <span style={{
        fontSize: "10px", fontWeight: "700", color: "#64748B",
        letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap",
        background: "#D9DFD9", padding: "4px 12px", borderRadius: "20px",
        border: "1px solid #94A3B8",
      }}>
        Page {num} of {total}
      </span>
      <div style={{ width: "80px", height: "1px", background: "#94A3B8" }} />
    </div>
  );

  const TopAccent = () => (
    <div style={{ height: "6px", background: `linear-gradient(90deg, ${G} 60%, ${B} 100%)`, flexShrink: 0 }} />
  );
  const BottomAccent = () => (
    <div style={{ height: "5px", background: `linear-gradient(90deg, ${B} 0%, ${G} 100%)`, flexShrink: 0 }} />
  );

  const ContinuationHeader = () => (
    <>
      <TopAccent />
      <div style={{
        background: G, padding: "10px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "11px", fontWeight: "600" }}>
          Purchase Request — Continued
        </span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>{prNumber}</span>
      </div>
      <div style={{ height: "4px", background: B, flexShrink: 0 }} />
    </>
  );

  // ── Single signature block — styled like the reference image ─────────────
  const SignatureBlock = () => (
    <div style={{
      flexShrink: 0,
      paddingTop: "2px",
      width: "300px",          // ✅ FIXED WIDTH
      marginLeft: "auto"       // ✅ RIGHT ALIGN
    }}>
      <div style={{ fontSize: "13px", fontWeight: "800", color: "#111827", marginBottom: "14px" }}>
        Requested By
      </div>

      {/* Full Name */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", marginBottom: "18px" }}>
        <span style={{ fontSize: "11px", color: "#374151", minWidth: "70px" }}>
          Full Name
        </span>
        <div style={{ flex: 1, borderBottom: "1.5px solid #9CA3AF" }} />
      </div>

      {/* Signature */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
        <span style={{ fontSize: "11px", color: "#374151", minWidth: "70px" }}>
          Signature
        </span>
        <div style={{ flex: 1, borderBottom: "1.5px solid #9CA3AF" }} />
      </div>
    </div>
  );

  // ── Footer bar ────────────────────────────────────────────────────────────
  const PageFooter = ({ pageNum }) => (
    <div style={{
      borderTop: `3px solid ${G}`, paddingTop: "10px",
      display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0,
    }}>
      <div>
        <div style={{
          fontSize: "9px", fontWeight: "800", color: B,
          letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "7px",
        }}>
          Distribution Copies
        </div>
        {["Finance / Accounts Department", "Purchase / Procurement Team", "Requester Copy"].map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
            <div style={{
              width: "16px", height: "16px", borderRadius: "4px",
              border: `1.5px solid ${i === 0 ? G : B}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9px", fontWeight: "800", color: i === 0 ? G : B, flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <span style={{ fontSize: "11px", color: "#374151" }}>{c}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: "9px", fontWeight: "700", color: "#9CA3AF",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "3px",
        }}>
          Document Reference
        </div>
        <div style={{ fontSize: "13px", fontWeight: "800", color: "#111827" }}>{prNumber}</div>
        <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>
          Page {pageNum} of {totalPages} · A4 Portrait
        </div>
        <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ width: "22px", height: "5px", borderRadius: "3px", background: G }} />
          <div style={{ width: "11px", height: "5px", borderRadius: "3px", background: B }} />
        </div>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#D5DCD5", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Toolbar */}
      <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Purchase Request Preview</h1>
          </div>
          <button
            onClick={executePrint}
            className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download size={16} />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Hidden measurement div */}
      <div ref={measureRef} aria-hidden="true" style={{
        position: "fixed", left: "-9999px", top: 0,
        width: "calc(210mm - 64px)", visibility: "hidden", pointerEvents: "none", zIndex: -1,
      }}>
        {terms.map((t, i) => (
          <div key={i} className="term-measure-item">
            <div style={{ fontSize: "11px", lineHeight: "1.65", color: "#374151" }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t.content) }} />

          </div>
        ))}
      </div>

      {/* Scroll viewport */}
      <div style={{ paddingTop: "88px", paddingBottom: "60px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div ref={printRef} className="print-root" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

          {pages?.map((pg, pageIdx) => {
            const isLastPage = pg.isLast;
            const pageNum = pageIdx + 1;

            return (
              <React.Fragment key={pageIdx}>

                {pageIdx > 0 && (
                  <PageDivider num={pageNum} total={pages.length} />
                )}

                <div className="a4-page" style={pageStyle}>
                  <TopAccent />

                  {/* HEADER SAME */}
                  <div style={{
                    background: G, padding: "20px 32px 18px",
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0,
                  }}>
                    <div>
                      <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "white", letterSpacing: "-0.02em" }}>
                        Purchase Request
                      </h1>
                      <p style={{ margin: "3px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>
                        Purchase Request (PR) · Original Copy
                      </p>
                    </div>
                    <div style={{
                      background: "rgba(255,255,255,0.13)", border: "1.5px solid rgba(255,255,255,0.28)",
                      borderRadius: "11px", padding: "12px 18px", textAlign: "right",
                    }}>
                      <div style={{
                        fontSize: "9px", fontWeight: "700", color: "rgba(255,255,255,0.5)",
                        letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px",
                      }}>
                        PR Number
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "white" }}>{prNumber}</div>
                    </div>
                  </div>

                  {/* BODY */}
                  <div style={{
                    padding: "14px 32px 16px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "11px",
                    overflow: "hidden",
                  }}>

                    {/* FIRST PAGE ONLY */}
                    {pageIdx === 0 && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: status.toLowerCase() === 'completed' ? "1fr 1fr 1fr" : "1fr 1fr",
                        gap: "1px",
                        background: "#E5E7EB",
                        border: "1px solid #E5E7EB",
                        borderRadius: "9px",
                        overflow: "hidden",
                      }}>
                        <Field icon={<Hash size={11} />} label="PR Number" value={prNumber} />
                        <Field icon={<Calendar size={11} />} label="Date" value={date} />
                        <Field icon={<User size={11} />} label="Requested By" value={requester} />
                        <Field icon={<CheckCircle size={11} />} label="Status" value={status} badge />
                        {status.toLowerCase() === 'completed' && (
                          <>
                            <Field icon={<Tag size={11} />} label="PO Number" value={poNumber} />
                            <Field icon={<User size={11} />} label="Approver(s)" value={approvers} />
                          </>
                        )}
                      </div>
                    )}

                    {/* TABLE */}
                    <div style={{ border: "1px solid #E5E7EB", borderRadius: "9px", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                        <thead>
                          <tr>
                            {tableHeaders.map((h, i) => (
                              <th key={i}>{h}</th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {pg.items.map((it, i) => (
                            <tr key={i}>
                              <td>{pg.startIndex + i + 1}</td>
                              <td>{it.description}</td>
                              <td>{it.uom}</td>
                              <td>{it.qty}</td>
                              <td>{formatCurrencyDisplay(it.price)}</td>
                              <td>{formatCurrencyDisplay(it.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>


                    {isLastPage && comments && (
                      <div style={{
                        border: "1px solid #E5E7EB",
                        borderRadius: "9px",
                        padding: "10px 14px",
                        background: "white",
                        flexShrink: 0,
                        marginTop: "10px",
                        textAlign: "left"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                          <MessageSquare size={11} color={B} />
                          <span style={{ fontSize: "9px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            Remarks / Comments
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#374151", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                          {comments}
                        </div>
                      </div>
                    )}

                    {isLastPage && <div style={{ flex: 1 }} />}
                    {isLastPage && <SignatureBlock />}
                    {isLastPage && <PageFooter pageNum={pageNum} />}

                  </div>

                  <BottomAccent />
                </div>

              </React.Fragment>
            );
          })}

        </div>
      </div>

      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

        .agreement-table { width: 100% !important; border-collapse: collapse !important; margin-top: 6px; }
        .agreement-table th, .agreement-table td { border: 1px solid #d1d5db !important; padding: 6px !important; font-size: 11px !important; text-align: left; }
        .agreement-table th { background: #f3f4f6 !important; font-weight: 600; }
        table { width: 100%; }

        @media print {
          .no-print { display: none !important; }
          .print-root { display: block !important; }
          .a4-page {
            width: 210mm !important; height: 297mm !important;
            overflow: hidden !important; page-break-after: always !important;
            break-after: page !important; box-shadow: none !important;
            margin: 0 !important; display: flex !important; flex-direction: column !important;
          }
          .a4-page:last-child { page-break-after: avoid !important; break-after: avoid !important; }
        }
      `}</style>
    </div>
  );
};

export default PRPdfFormat;