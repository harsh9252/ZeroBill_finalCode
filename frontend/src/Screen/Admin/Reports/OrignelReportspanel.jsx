import React, { useState, useMemo } from "react";
import { showInfoToast } from '../../../Components/ActionMessageModel.jsx';

/**
 * ReportsPanel.jsx
 * Drop into a React+Tailwind project.
 * Uses local image: /mnt/data/9d6cff31-2529-4835-bcba-068c0ab0ed07.png
 */

const FILTER_CHIPS = [
  "Party",
  "Category",
  "Payment Collection",
  "Item",
  "Invoice Details",
  "Summary",
];

// sample data: groupKey corresponds to column
const REPORT_COLUMNS = [
  {
    key: "favourite",
    title: "Favourite", 
    items: [
      { title: "Balance Sheet", tags: ["Summary"] },
      { title: "GSTR-1 (Sales)", tags: ["GST"] },
      { title: "Profit And Loss Report", tags: ["Summary"] },
      { title: "Sales Summary", tags: ["Category", "Summary"] },
    ],
  },
  {
    key: "gst",
    title: "GST", 
    items: [
      { title: "GSTR-2 (Purchase)", tags: ["GST"] },
      { title: "GSTR-3b", tags: ["GST"] },
      { title: "GST Purchase (With HSN)", tags: ["GST"] },
      { title: "GST Sales (With HSN)", tags: ["GST"] },
      { title: "HSN Wise Sales Summary", tags: ["GST"] },
      { title: "TDS Payable", tags: ["Category"] },
      { title: "TDS Receivable", tags: ["Category"] },
      { title: "TCS Payable", tags: ["Category"] },
      { title: "TCS Receivable", tags: ["Category"] },
    ],
  },
  {
    key: "transaction",
    title: "Transaction", 
    items: [
      { title: "Audit Trail", tags: ["Category"] },
      { title: "Bill Wise Profit", tags: ["Summary"] },
      { title: "Cash and Bank Report (All Payments)", tags: ["Payment Collection"] },
      { title: "Daybook", tags: ["Category"] },
      { title: "Expense Category Report", tags: ["Category"] },
      { title: "Expense Transaction Report", tags: ["Category"] },
      { title: "Purchase Summary", tags: ["Summary"] },
    ],
  },
  {
    key: "item",
    title: "Item", 
    items: [
      { title: "Item Report By Party", tags: ["Item"] },
      { title: "Item Sales and Purchase Summary", tags: ["Item"] },
      { title: "Low Stock Summary", tags: ["Item"] },
      { title: "Rate List", tags: ["Item"] },
      { title: "Stock Detail Report", tags: ["Item"] },
      { title: "Stock Summary", tags: ["Item"] },
    ],
  },
  {
    key: "party",
    title: "Party", 
    items: [
      { title: "Receivable Ageing Report", tags: ["Party"] },
      { title: "Party Report By Item", tags: ["Party"] },
      { title: "Party Statement (Ledger)", tags: ["Party"] },
      { title: "Party Wise Outstanding", tags: ["Party"] },
      { title: "Sales Summary - Category Wise", tags: ["Party", "Category"] },
    ],
  },
];

const smallCrown = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
    <path d="M2 20h20L17 8l-3 4-4-6-3 6L2 20z" stroke="#D4AF37" strokeWidth="1.2" fill="#F8E6B0"></path>
  </svg>
);

const starIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
    <path d="M12 17.3l-5.6 3 1.5-6.3L3 10.2l6.5-.6L12 3.5l2.5 6.1 6.5.6-4.9 3.8 1.5 6.3L12 17.3z" fill="#F3C623"></path>
  </svg>
);

export default function ReportsPanel() {
  const [activeFilters, setActiveFilters] = useState([]); // multi-select
  const [searchText, setSearchText] = useState("");
  const [expandedColumns, setExpandedColumns] = useState({}); // key -> bool

  // toggle filter chips
  const toggleFilter = (chip) => {
    setActiveFilters((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  // cleared
  const clearFilters = () => {
    setActiveFilters([]);
    setSearchText("");
  };

  // Determine whether an item should show given activeFilters and search
  const itemMatches = (item) => {
    const text = searchText.trim().toLowerCase();
    const matchesSearch = !text || item.title.toLowerCase().includes(text);

    // if no active filters => all items match
    if (activeFilters.length === 0) return matchesSearch;

    // item.tags contains tags. check if any tag intersects with activeFilters
    const intersects = item.tags.some((t) =>
      activeFilters.some((af) => af.toLowerCase() === t.toLowerCase())
    );

    return matchesSearch && intersects;
  };

  // derived counts for chips (how many items would match per chip)
  const chipCounts = useMemo(() => {
    const counts = {};
    FILTER_CHIPS.forEach((chip) => {
      let c = 0;
      REPORT_COLUMNS.forEach((col) =>
        col.items.forEach((it) => {
          if (it.tags.some((t) => t.toLowerCase() === chip.toLowerCase()) || chip.toLowerCase() === "category" && it.tags.some(t => t.toLowerCase()==="category")) {
            c += 1;
          }
        })
      );
      counts[chip] = c;
    });
    return counts;
  }, []);

  return (
    <div className="max-w-full mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border-1 border-yellow-200">
        <div className="flex justify-between items-start gap-4 p-4 border-b border-yellow-200">
          <div className="flex items-center gap-4">
            {/* <div className="w-14 h-14 bg-gray-50 rounded-md flex items-center justify-center overflow-hidden">
              <img
                src="/mnt/data/9d6cff31-2529-4835-bcba-068c0ab0ed07.png"
                alt="reports"
                className="w-full h-full object-cover"
              />
            </div> */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Reports</h2>
              {/* <p className="text-sm text-gray-500">Find built-in reports and summaries</p> */}
            </div>
          </div>

          {/* <div className="flex items-center gap-3">
            <button
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 transition"
              onClick={() => showInfoToast({ title: "CA Reports Sharing", text: "Feature coming soon!" })}
            >
              CA Reports Sharing
            </button>
          </div> */}
        </div>

        {/* Filter chips */}
        {/* Bottom controls: start generating button + find report */}
        <div className=" flex items-center justify-between gap-4 p-2  border-b border-yellow-200">
          {localStorage.getItem('currentTaxType') === 'GST' && (
            <div>
              <button
                className="px-4 py-0 bg-green-500 h-8 text-white rounded-md  transition"
                onClick={() => showInfoToast({ title: "E-Invoice Generation", text: "Starting e-invoice generation..." })}
              >
                Start Generating e-Invoices
              </button>
            </div>
          )}

          <div className="flex items-center gap-2"> 
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Type to search..."
              className="px-3 py-0 h-8 border-1 border-yellow-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            {/* <div className="text-xs text-gray-400 ml-2">Ctrl + F</div> */}
          </div>
        </div>
        <div className="p-4 bg-white border-b border-yellow-200">
          <div className="  items-center gap-4">
            {/* <div className="text-sm text-gray-600">Filter By :</div> */}

            <div className="flex flex-wrap gap-2">
              {FILTER_CHIPS.map((chip) => {
                const active = activeFilters.includes(chip);
                return (
                  <button
                    key={chip}
                    onClick={() => toggleFilter(chip)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-yellow-700 border-gray-200"
                    } flex items-center gap-2`}
                    title={`${chip} (${chipCounts[chip] || 0})`}
                  >
                    <span>{chip}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs">{chipCounts[chip] || 0}</span>
                  </button>
                );
              })}

              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-full text-sm bg-gray-50 border border-gray-200 text-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Columns grid */}
        <div className="p-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Render columns in two rows as in screenshot: we will show first 3 columns on top row and next 2 below, but here we'll render all in a responsive grid */}
            {REPORT_COLUMNS.map((col) => {
              // filtered items for this column
              const filtered = col.items.filter(itemMatches);

              // whether to show collapsed (first 5) or all
              const expanded = !!expandedColumns[col.key];

              const visible = expanded ? filtered : filtered.slice(0, 5);

              return (
                <div key={col.key} className="bg-white rounded-md border-1 border-yellow-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-200">
                    <div className="flex items-center gap-3">
                      {/* <div className="text-lg">{col.icon}</div> */}
                      <div>
                        <div className="text-sm font-medium text-gray-700">{col.title}</div>
                        <div className="text-xs text-gray-400">{filtered.length} reports</div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-400">{/* optional header actions */}</div>
                  </div>

                  <div className="p-3">
                    {/* list */}
                    <ul className="space-y-2">
                      {visible.length === 0 && <li className="text-sm text-gray-400">No reports</li>}
                      {visible.map((it, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-700">{it.title}</span>
                            {/* show crown for premium-looking tags */}
                            {it.tags && it.tags.includes("Summary") && (
                              <span className="ml-1" title="Premium">
                                {smallCrown}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* a star/favorite marker for favourites column */}
                            {col.key === "favourite" ? (
                              <span title="star">{starIcon}</span>
                            ) : (
                              <span title={it.tags.join(", ")} className="text-xs text-gray-400">
                                {/* show first tag small */}
                                {it.tags[0]}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* See more / See less */}
                    {filtered.length > 5 && (
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            setExpandedColumns((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                          }
                          className="text-sm text-indigo-600 hover:underline"
                        >
                          {expanded ? "See less" : `See more (${filtered.length - 5})`}
                          <span className="ml-1">{expanded ? "▲" : "▼"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          
        </div>
      </div>

      {/* small hint */}
      <div className="mt-4 text-sm text-gray-500">Tip: toggle filters to quickly show reports by category.</div>
    </div>
  );
}
