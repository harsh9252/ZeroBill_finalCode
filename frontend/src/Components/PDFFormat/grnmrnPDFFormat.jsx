import { useReactToPrint } from "react-to-print";
import { formatCurrency } from "../../utils/currency";
import React, { useRef, useState, useLayoutEffect } from "react";
import {
  ArrowLeft,
  Download,
  Building2,
  Calendar,
  Hash,
  MapPin,
  Tag,
  MessageSquare,
} from "lucide-react";

const GrnMrnPDFFormat = ({ previewData, onBack }) => {
  const printRef = useRef(null);

  const formType = previewData.formType;
  const grnNumber = formType === "GRN" ? previewData.grn_number : previewData.mrn_number;
  const date = new Date(previewData.date).toLocaleDateString();
  const supplier = previewData.supplier;
  const orderNumber = previewData.order_no;
  const delivery = previewData.location;
  const adviceNote = previewData.advice_no;
  const costCentre = previewData.cost_center;
  const items = previewData?.items || [];
  const remarks = previewData.remarks || "";
  const currency = previewData.currency;

  const orderQtyTotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const deliveredQtyTotal = items.reduce((sum, it) => sum + (Number(it.deliveredQty) || 0), 0);

  const G = "#16A34A";
  const GL = "#DCFCE7";
  const O = "#EA580C";
  const OD = "#9A3412";
  const OL = "#FFF7ED";

  const formatCurrencyDisplay = (v) => formatCurrency(v, currency);

  // ── Content-based pagination ─────────────────────────────────────────────
  const [pages, setPages] = useState(null);

  useLayoutEffect(() => {
    if (!items || items.length === 0) {
      setPages([{ items: [], isLast: true }]);
      return;
    }

    const FIRST_PAGE_ROWS = 14;   // Reduced from 15
    const OTHER_PAGE_ROWS = 21;   // Reduced from 22

    const result = [];
    let i = 0;

    // First page
    result.push({
      items: items.slice(0, FIRST_PAGE_ROWS),
      isLast: items.length <= FIRST_PAGE_ROWS,
      startIndex: 0
    });

    let currentIdx = FIRST_PAGE_ROWS;

    // Remaining pages
    while (currentIdx < items.length) {
      result.push({
        items: items.slice(currentIdx, currentIdx + OTHER_PAGE_ROWS),
        isLast: currentIdx + OTHER_PAGE_ROWS >= items.length,
        startIndex: currentIdx
      });
      currentIdx += OTHER_PAGE_ROWS;
    }

    setPages(result);
  }, [items]);

  const MIN_ROWS = 10;

  const executePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${formType}_${grnNumber || "draft"}`,
  });

  // ── Table config ─────────────────────────────────────────────────────────
  const tableHeaders = [
    "#",
    "Description of Goods",
    "Pack Size",
    "Unit Price",
    "Order Qty",
    "Recv. Qty",
    "Comments",
  ];
  const colWidths = ["4%", "26%", "10%", "11%", "12%", "12%", "25%"];

  const pageStyle = {
    width: "210mm",
    height: "297mm",
    background: "white",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
  };

  // ── Sub-components ────────────────────────────────────────────────────────
  const Field = ({ icon, label, value }) => (
    <div style={{ padding: "10px 14px", background: "white" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
        <span style={{ color: O }}>{icon}</span>
        <span style={{
          fontSize: "9px", fontWeight: "700", color: "#9CA3AF",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: "12px", color: "#111827", fontWeight: "500",
        borderBottom: "1.5px dashed #D1D5DB", paddingBottom: "2px", minHeight: "20px",
      }}>
        {value}
      </div>
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
    <div style={{ height: "6px", background: `linear-gradient(90deg, ${G} 60%, ${O} 100%)`, flexShrink: 0 }} />
  );

  const BottomAccent = () => (
    <div style={{ height: "5px", background: `linear-gradient(90deg, ${O} 0%, ${G} 100%)`, flexShrink: 0 }} />
  );

  const ContinuationHeader = () => (
    <>
      <TopAccent />
      <div style={{
        background: G, padding: "10px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "11px", fontWeight: "600" }}>
          {formType === "GRN" ? "Goods Received Note" : "Material Receipt Note"} — Continued
        </span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>{grnNumber}</span>
      </div>
      <div style={{ height: "4px", background: O, flexShrink: 0 }} />
    </>
  );

  const SignatureBlock = () => (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      flexShrink: 0,
      paddingTop: "8px",
      gap: "40px",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ borderTop: "1.5px solid #374151", paddingTop: "8px", width: "80%" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Received By (Signature)
          </div>
          <div style={{ fontSize: "9px", color: "#9CA3AF", marginTop: "2px" }}>
            Name &amp; Date: ___________________________
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ borderTop: "1.5px solid #374151", paddingTop: "8px", width: "80%", textAlign: "right" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Checked By (Signature)
          </div>
          <div style={{ fontSize: "9px", color: "#9CA3AF", marginTop: "2px" }}>
            Name &amp; Date: ___________________________
          </div>
        </div>
      </div>
    </div>
  );

  const PageFooter = ({ pageNum, totalPgs }) => (
    <div style={{
      borderTop: `3px solid ${G}`,
      paddingTop: "10px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexShrink: 0,
      breakInside: "avoid",
      pageBreakInside: "avoid",
    }}>
      <div>
        <div style={{ fontSize: "9px", fontWeight: "800", color: O, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "7px" }}>
          Distribution Copies
        </div>
        {["Accounts / Finance Department", "Supplier Copy", "Stores / Goods Inwards"].map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
            <div style={{
              width: "16px", height: "16px", borderRadius: "4px",
              border: `1.5px solid ${i === 0 ? G : O}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9px", fontWeight: "800", color: i === 0 ? G : O, flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <span style={{ fontSize: "11px", color: "#374151" }}>{c}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "9px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "3px" }}>
          Document Reference
        </div>
        <div style={{ fontSize: "13px", fontWeight: "800", color: "#111827" }}>{grnNumber}</div>
        <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>
          Page {pageNum} of {totalPgs} · A4 Portrait
        </div>
        <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ width: "22px", height: "5px", borderRadius: "3px", background: G }} />
          <div style={{ width: "11px", height: "5px", borderRadius: "3px", background: O }} />
        </div>
      </div>
    </div>
  );

  const ItemsTable = ({ pageItems, pageIdx, isLastPage, startIndex }) => {
    const displayItems = pageItems;
    const emptyFill = Array.from({ length: Math.max(0, MIN_ROWS - displayItems.length) }).map(() => ({}));

    return (
      <div style={{ border: "1px solid #E5E7EB", borderRadius: "9px", overflow: "hidden", flexShrink: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed" }}>
          <colgroup>
            {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              {tableHeaders.map((h, i) => (
                <th key={i} style={{
                  padding: "8px 8px",
                  textAlign: i === 0 ? "center" : "left",
                  fontSize: "9px", fontWeight: "700", color: "white",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  background: i < 6 ? G : O,
                  borderRight: i < 6 ? "1px solid rgba(255,255,255,0.15)" : "none",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...displayItems, ...emptyFill].map((it, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "6px 8px", textAlign: "center", color: "#6B7280" }}>
                  {startIndex + i + 1}
                </td>
                <td style={{ padding: "6px 8px", fontWeight: "500", color: "#111827", wordBreak: "break-word", whiteSpace: "normal", overflowWrap: "anywhere" }}>
                  {it.name}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: "#374151" }}>{it.pack_size}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: "#374151" }}>
                  {it.price !== undefined ? formatCurrencyDisplay(it.price) : ""}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: G, fontWeight: "600" }}>{it.qty}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: O, fontWeight: "600" }}>{it.deliveredQty}</td>
                <td style={{ padding: "6px 8px", color: "#9CA3AF", fontSize: "10px", wordBreak: "break-word", whiteSpace: "normal", overflowWrap: "anywhere" }}>
                  {it.comments}
                </td>
              </tr>
            ))}
          </tbody>

          {isLastPage && (
            <tfoot>
              <tr style={{ background: OL, borderTop: `2px solid ${O}` }}>
                <td colSpan={4} style={{ padding: "7px 10px", fontSize: "10px", fontWeight: "800", color: OD, textAlign: "right" }}>
                  Totals →
                </td>
                <td style={{ padding: "7px 8px", fontSize: "11px", fontWeight: "800", color: G, textAlign: "center" }}>
                  {orderQtyTotal}
                </td>
                <td style={{ padding: "7px 8px", fontSize: "11px", fontWeight: "800", color: G, textAlign: "center" }}>
                  {deliveredQtyTotal}
                </td>
                <td style={{ padding: "7px 8px" }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // Show measurement div while calculating pages
  if (pages === null) {
    return (
      <div style={{ position: "fixed", left: "-9999px", top: 0, width: "210mm", visibility: "hidden" }}>
        {/* Measurement content - same as first page */}
        <div style={{ ...pageStyle, height: "auto", overflow: "visible" }}>
          <TopAccent />
          {/* ... (you can keep your existing measurement content) */}
        </div>
      </div>
    );
  }

  const totalPages = pages.length;

  return (
    <div style={{ minHeight: "100vh", background: "#D5DCD5", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Toolbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 no-print">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">GRN / MRN Preview</h1>
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

      {/* Print Content */}
      <div style={{ paddingTop: "24px", paddingBottom: "60px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div ref={printRef} className="print-root" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

          {pages.map((pg, pageIdx) => {
            const isFirstPage = pageIdx === 0;
            const isLastPage = pg.isLast;
            const pageNum = pageIdx + 1;
            const pageItems = pg.items;

            return (
              <React.Fragment key={pageIdx}>
                {pageIdx > 0 && <PageDivider num={pageNum} total={totalPages} />}

                <div className="a4-page" style={pageStyle}>
                  {isFirstPage ? (
                    <>
                      <TopAccent />
                      <div style={{
                        background: G, padding: "20px 32px 18px",
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0,
                      }}>
                        <div>
                          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "white", letterSpacing: "-0.02em" }}>
                            {formType === "GRN" ? "Goods Receipt Note" : "Material Receipt Note"}
                          </h1>
                          <p style={{ margin: "3px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>
                            {formType === "GRN" ? "Goods Receipt Note (GRN) · Original Copy" : "Material Receipt Note (MRN) · Original Copy"}
                          </p>
                        </div>
                        <div style={{
                          background: "rgba(255,255,255,0.13)", border: "1.5px solid rgba(255,255,255,0.28)",
                          borderRadius: "11px", padding: "12px 18px", textAlign: "right",
                        }}>
                          <div style={{ fontSize: "9px", fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px" }}>
                            {formType === "GRN" ? "GRN Number" : "MRN Number"}
                          </div>
                          <div style={{ fontSize: "18px", fontWeight: "800", color: "white" }}>
                            {grnNumber}
                          </div>
                        </div>
                      </div>
                      <div style={{ height: "4px", background: O, flexShrink: 0 }} />
                    </>
                  ) : (
                    <ContinuationHeader />
                  )}

                  {/* Main Body */}
                  <div style={{
                    padding: "16px 32px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    overflow: "hidden",
                  }}>

                    {isFirstPage && (
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "1px", background: "#E5E7EB",
                        border: "1px solid #E5E7EB", borderRadius: "9px", overflow: "hidden", flexShrink: 0,
                      }}>
                        <Field icon={<Building2 size={11} />} label="Supplier" value={supplier} />
                        <Field icon={<Calendar size={11} />} label="Date" value={date} />
                        <Field icon={<Hash size={11} />} label="Advice Note No." value={adviceNote} />
                        <Field icon={<Tag size={11} />} label="Order Number" value={orderNumber} />
                        <Field icon={<MapPin size={11} />} label="Delivery Location" value={delivery} />
                        <Field icon={<Hash size={11} />} label="Cost Centre" value={costCentre} />
                      </div>
                    )}

                    {/* Items Table */}
                    <ItemsTable
                      pageItems={pageItems}
                      pageIdx={pageIdx}
                      isLastPage={isLastPage}
                      startIndex={pg.startIndex}
                    />

                    {/* Last Page Content */}
                    {isLastPage && (
                      <>
                        {/* Discrepancy */}
                        <div style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                          <div style={{ background: OL, border: `1px solid #FED7AA`, borderRadius: "9px", padding: "10px 16px", minWidth: "230px" }}>
                            {[
                              { label: "Total Items Ordered", val: orderQtyTotal, c: G },
                              { label: "Total Items Received", val: deliveredQtyTotal, c: G },
                              { label: "Discrepancy", val: "—", c: O },
                            ].map((r, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < 2 ? "1px solid #FED7AA" : "none" }}>
                                <span style={{ fontSize: "11px", color: "#6B7280" }}>{r.label}</span>
                                <span style={{ fontSize: "12px", fontWeight: "800", color: r.c }}>{r.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Remarks */}
                        {remarks && (
                          <div style={{ border: "1px solid #E5E7EB", borderRadius: "9px", padding: "10px 14px", background: "white", flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                              <MessageSquare size={11} color={O} />
                              <span style={{ fontSize: "9px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                Remarks
                              </span>
                            </div>
                            <div style={{ fontSize: "11px", color: "#374151", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{remarks}</div>
                          </div>
                        )}

                        {/* Spacer - ONLY on Last Page */}
                        <div style={{ flex: 1 }} />

                        {/* Signature & Footer */}
                        <SignatureBlock />
                        <PageFooter pageNum={pageNum} totalPgs={totalPages} />
                      </>
                    )}

                    {/* Continuation Pages */}
                    {!isLastPage && (
                      <>
                        <div style={{ textAlign: "center", paddingBottom: "8px" }}>
                          <span style={{ fontSize: "9px", color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            Continued on next page →
                          </span>
                        </div>
                        <PageFooter pageNum={pageNum} totalPgs={totalPages} />
                      </>
                    )}
                  </div>

                  <BottomAccent />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

        @media print {
          .no-print { display: none !important; }
          .a4-page {
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .a4-page:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GrnMrnPDFFormat;