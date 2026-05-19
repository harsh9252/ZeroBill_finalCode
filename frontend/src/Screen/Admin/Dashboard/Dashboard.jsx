import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useCountUp } from "../../../helpers/useCountUp";
import { Icon } from "../../../helpers/Icon";
import { Sparkline } from "../../../helpers/Sparkline";
import { FloatingCard } from "../../../helpers/FloatingCard";
import { SmallReport } from "../../../Components/SmallReport";
import ActionBlock from "../../../buttons/ActionBlock";
import { dashboardAPI } from "../../../utils/api";
import MainLoader from "../../../Components/MainLoader.jsx";
import {
  convertAmount,
  getCurrencySymbol,
  formatCurrency,
} from "../../../utils/currency";

import {
  Plus,
  CloudUpload,
  CircleDollarSign,
  ShoppingCart,
  List,
  FileText,
  ArrowRight,
  TrendingUp,
  Receipt,
  Eye,
  FileMinus,
  FilePlus,
  Truck,
  RotateCcw,
  Edit,
  Calendar,
  FileSignature,
  BookOpen,
  Wallet,
  CreditCard,
  X,
  Package,
  ArrowLeft,
  Search,
} from "lucide-react";
import { FaFileInvoice } from "react-icons/fa";
import api from "../../../utils/api";
import { formatDate } from "../../../utils/dateFormat.js";
import { showErrorToast } from "../../../Components/ActionMessageModel.jsx";
import InvoiceChoiceModal from "../../../Components/InvoiceChoiceModal.jsx";


// -------------------------------------------------------------
// Removed local InvoiceChoiceModal as it is now a shared component in src/Components/
// -------------------------------------------------------------


export default function Dashboard({
  currency,
  taxType,
  checkPlanExpiry,
  isPlanExpired,
  checkBusiness,
}) {
  const navigate = useNavigate();

  // State for dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    parties: { total: 0 },
    quotations: { total: 0 },
    invoices: { total: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showBookInvoiceModal, setShowBookInvoiceModal] = useState(false);

  // Get selected business ID and user permissions from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userType = localStorage.getItem("userType");
  const isSubUser = userType === "subUser" || user.isSubUser;
  const permissions = Array.isArray(user.permissions)
    ? user.permissions
    : typeof user.permissions === "string"
      ? JSON.parse(user.permissions)
      : [];

  const hasPermission = (key) => {
    if (!isSubUser) return true; // Admin has all permissions
    return permissions.includes(key);
  };

  useEffect(() => {
    const savedBusinessId = localStorage.getItem("selectedBusinessId");
    if (savedBusinessId) {
      setSelectedBusinessId(parseInt(savedBusinessId));
    } else {
      // If no business is selected, try to get the first available business
      // This will be handled by the backend as fallback
      setSelectedBusinessId(null);
    }
  }, []);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);

        // Pass the selected business ID to get stats for the correct business
        const response = await dashboardAPI.getStats(selectedBusinessId);

        if (response.success) {
          setDashboardStats(response.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };

    // Fetch stats even if no business ID is selected (backend will use first business as fallback)
    fetchDashboardStats();

    // Listen for party changes to refresh dashboard
    const handlePartyChange = () => {
      fetchDashboardStats();
    };

    // Listen for business changes to refresh dashboard with new business data
    const handleBusinessChange = (event) => {
      const { businessId } = event.detail;
      if (businessId && businessId !== selectedBusinessId) {
        setSelectedBusinessId(businessId);
      }
    };

    window.addEventListener("partyChanged", handlePartyChange);
    window.addEventListener("businessChanged", handleBusinessChange);

    return () => {
      window.removeEventListener("partyChanged", handlePartyChange);
      window.removeEventListener("businessChanged", handleBusinessChange);
    };
  }, [selectedBusinessId]); // Re-run when selectedBusinessId changes

  const convertedTotalAmount = convertAmount(46820, currency);
  const currencySymbol = getCurrencySymbol(currency);
  const totalAmount = useCountUp(convertedTotalAmount);
  const totalParties = useCountUp(dashboardStats.parties.total);
  const totalQuotations = useCountUp(dashboardStats.quotations.total);
  const totalInvoices = useCountUp(dashboardStats.invoices.total);

  const handleCreateQuotation = () =>
    checkBusiness(() =>
      checkPlanExpiry(() =>
        navigate("/quotation?mode=create", { replace: true }),
      ),
    );
  const handleViewQuotation = () =>
    checkPlanExpiry(() => navigate("/quotation"));
  const handleCustomQuotation = () =>
    checkBusiness(() => checkPlanExpiry(() => navigate("/custom-quotation")));

  // Proforma Invoice Management
  const handleCreateProforma = () =>
    checkBusiness(() =>
      checkPlanExpiry(() =>
        navigate("/proformaInvoice?mode=create", { replace: true }),
      ),
    );
  const handleViewProforma = () =>
    checkPlanExpiry(() => navigate("/proformaInvoice"));

  // Billing Invoice Management
  const handleCreateInvoice = () =>
    checkBusiness(() => checkPlanExpiry(() => setShowInvoiceModal(true)));

  const handleInvoiceContinue = (choice) => {
    setShowInvoiceModal(false);
    if (choice.type === "normal") {
      navigate("/invoice?mode=create", { replace: true });
    } else {
      const { poData, selectedItems } = choice;

      // Extract full metadata from PO Data
      let poMeta = {};
      try {
        poMeta = (poData.purchase_order_data && typeof poData.purchase_order_data === 'object')
          ? poData.purchase_order_data
          : (poData.book_purchase_order_data && typeof poData.book_purchase_order_data === 'object')
            ? poData.book_purchase_order_data
            : (typeof poData.purchase_invoice_data === 'string'
              ? JSON.parse(poData.purchase_invoice_data)
              : (poData.purchase_invoice_data || poData.invoice_data || poData.purchase_order_data || poData.order_data || poData.book_purchase_order_data || {}));
      } catch (e) {
        console.error('Failed to parse PO metadata for mapping', e);
      }

      // Map selected PO items to form structure
      const prefilledLines = selectedItems.map(item => ({
        ...item,
        qty: parseFloat(item.orderQty),
        taxType: item.taxType || 'GST',
        cgstPct: item.cgstPct ?? 9,
        sgstPct: item.sgstPct ?? 9,
        igstPct: item.igstPct ?? 18,
      }));

      const prefilledData = {
        type: 'sales',
        partyName: poData.party_name || poData.partyName,
        party_name: poData.party_name || poData.partyName,
        party_id: poData.party_id,
        bank_id: poData.bank_id,
        po_agreement_number: poData.purchase_order_number || poData.book_purchase_order_number || poData.purchase_invoice_number || poData.id,
        remark: poData.remark || poMeta.remark || "",
        notes: poData.notes || poMeta.notes || "",
        meta: {
          ...poMeta,
          lines: prefilledLines,
          notes: `Based on PO #${poData.purchase_order_number || poData.book_purchase_order_number || poData.id}. ${poMeta.notes || ""}`,
          bank_id: poData.bank_id,
          poAgreementNumber: poData.purchase_order_number || poData.book_purchase_order_number || poData.id,
          isFromPO: true,
          selectedBillingIndex: poMeta.selectedBillingIndex ?? 0,
          selectedShippingIndex: poMeta.selectedShippingIndex ?? 0,
          selectedBankIndex: poMeta.selectedBankIndex ?? -1,
          ship_to_party_id: poMeta.ship_to_party_id || poData.ship_to_party_id || null,
        },
        _sourcePoDbId: poData.id,
        _sourcePoItems: selectedItems,
        _sourcePoData: poData,
      };

      localStorage.setItem("prefilledInvoiceData", JSON.stringify(prefilledData));
      navigate("/invoice?mode=create", { replace: true });
    }
  };

  const handleBookInvoiceContinue = (choice) => {
    setShowBookInvoiceModal(false);

    if (choice.type === "normal") {
      navigate("/bookInvoice?mode=create", { replace: true });
    } else if (choice.type === "po") {
      localStorage.setItem(
        "prefilledBookInvoiceData",
        JSON.stringify({
          poData: choice.poData,
          selectedItems: choice.selectedItems,
        }),
      );

      navigate("/purchaseOrder?mode=create", { replace: true });
    }
  };

  const handleViewInvoice = () => checkPlanExpiry(() => navigate("/invoice"));
  const handleEInvoicing = () => checkPlanExpiry(() => navigate("/eInvoice"));

  // Sales Order Management
  const handleDebitNotes = () =>
    checkBusiness(() =>
      checkPlanExpiry(() =>
        navigate("/debitNote?mode=create", { replace: true }),
      ),
    );
  const handleCreditNote = () =>
    checkBusiness(() =>
      checkPlanExpiry(() =>
        navigate("/creditNote?mode=create", { replace: true }),
      ),
    );
  const handleDeliveryChallan = () =>
    checkBusiness(() =>
      checkPlanExpiry(() =>
        navigate("/deliveryChallan?mode=create", { replace: true }),
      ),
    );
  const handleSalesReturn = () =>
    checkBusiness(() =>
      checkPlanExpiry(() =>
        navigate("/salesReturn?mode=create", { replace: true }),
      ),
    );

  // Purchase Order Management
  const handlePurchaseCreate = () =>
    checkBusiness(() =>
      checkPlanExpiry(() => navigate("/purchaseOrder", { replace: true })),
    );
  const handlePurchaseBook = () =>
    checkBusiness(() =>
      checkPlanExpiry(() => navigate("/bookPurchaseOrder", { replace: true })),
    );
  const handleBookPurchaseOrder = () =>
    checkPlanExpiry(() => navigate("/bookPurchaseOrder"));
  const handleAgreement = () => checkPlanExpiry(() => navigate("/Agreement"));
  //GRN
  const handleGRNCreate = () =>
    checkBusiness(() =>
      checkPlanExpiry(() => navigate("/GRN", { replace: true })),
    );
  // const handleGRNBook = () => checkBusiness(() => checkPlanExpiry(() => navigate('/bookGRN', { replace: true })));
  // const handleBookGRN = () => checkPlanExpiry(() => navigate('/bookGRN'));
  // const handleGRNAgreement = () => checkPlanExpiry(() => navigate('/GRNAgreement'));
  //MRN
  const handleMRNCreate = () =>
    checkBusiness(() =>
      checkPlanExpiry(() => navigate("/MRN", { replace: true })),
    );
  // const handleGRNBook = () => checkBusiness(() => checkPlanExpiry(() => navigate('/bookGRN', { replace: true })));
  // const handleBookGRN = () => checkPlanExpiry(() => navigate('/bookGRN'));
  // const handleGRNAgreement = () => checkPlanExpiry(() => navigate('/GRNAgreement'));

  // Accounting Management
  const handleLedger = () => checkPlanExpiry(() => navigate("/ledger"));
  const handleBookInvoice = () =>
    checkBusiness(() => checkPlanExpiry(() => setShowBookInvoiceModal(true)));
  const handleProjectExpense = () =>
    checkBusiness(() => checkPlanExpiry(() => navigate("/projectExpense")));
  const handleZKhataBook = () =>
    checkBusiness(() => checkPlanExpiry(() => navigate("/zKhataBook")));
  const handleDocuments = () => checkPlanExpiry(() => navigate("/documents"));
  const handleProjectCode = () => checkPlanExpiry(() => navigate("/expenses"));

  // Reports
  const handleSalesReport = () =>
    checkPlanExpiry(() => navigate("/invoice?tab=reports"));
  const handlePurchaseReport = () =>
    checkPlanExpiry(() => navigate("/bookPurchaseOrder?tab=reports"));
  const handleInventoryReport = () =>
    checkPlanExpiry(() => navigate("/inventory?tab=reports"));
  const handleGSTReport = () =>
    checkPlanExpiry(() => navigate("/invoice?tab=gst"));

  // Purchase Requisition
  const handleCreatePR = () =>
    checkBusiness(() =>
      checkPlanExpiry(() => navigate("/purchaseRequisition?mode=create")),
    );
  const handleViewPR = () =>
    checkPlanExpiry(() => navigate("/purchaseRequisition"));

  // Sales Lead Management
  const handleCreateLead = () =>
    checkBusiness(() =>
      checkPlanExpiry(() => navigate("/lead-management")),
    );
  const handleViewLead = () =>
    checkPlanExpiry(() => navigate("/sales-leads"));

  if (loading) {
    return <MainLoader message="Loading dashboard..." />;
  }

  return (
    <>
      {/* TOP KPIs */}
      <div className="relative mb-2.5 mt-3">
        <div className="absolute inset-0 pointer-events-none -z-10">
          <svg
            width="100%"
            height="140"
            viewBox="0 0 800 140"
            preserveAspectRatio="none"
            className="opacity-20"
          >
            <path
              d="M0 40 C120 120 240 -40 400 40 C560 120 680 0 800 40 L800 140 L0 140 Z"
              fill="#FFF3D6"
            />
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {/* Sales Lead Management Card */}
          {hasPermission("salesLead") && (
            <FloatingCard className="border-t-4 border-yellow-400 h-full" padding="py-2.5 px-4">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-base font-semibold ">
                      Sales Lead Management
                    </div>
                    <div className="text-xs text-gray-500">
                      Manage your Sales lead
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Create Lead"
                      icon={<Plus className="h-5 w-5 text-white" />}
                      color="yellow"
                      onClick={handleCreateLead}
                    />
                  </div>
                  <div className="flex justify-center">
                    <ActionBlock
                      label="View Lead"
                      icon={<FileText className="h-5 w-5 text-white" />}
                      color="yellow"
                      onClick={handleViewLead}
                    />
                  </div>
                </div>
              </div>
            </FloatingCard>
          )}

          {/* Total Quotations & Parties Card */}
          {(hasPermission("quotation") || hasPermission("parties")) && (
            <FloatingCard className="border-t-4 border-blue-400 h-full" padding="py-2.5 px-4">
              <div className={`grid ${hasPermission("quotation") && hasPermission("parties") ? 'grid-cols-2 divide-x divide-gray-100' : 'grid-cols-1'} gap-4 h-full`}>
                {hasPermission("quotation") && (
                  <div className="flex flex-col h-full">
                    <div>
                      <div className="text-sm text-gray-600">Total Quotations</div>
                      <div className="mt-1 text-2xl font-semibold truncate">
                        <span>{loading ? "..." : totalQuotations.toLocaleString("en-US")}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Quotes Generated
                      </div>
                    </div>
                    <div className="mt-auto pt-1.5">
                      <Sparkline />
                    </div>
                  </div>
                )}

                {hasPermission("parties") && (
                  <div className={`flex flex-col justify-between ${hasPermission("quotation") ? 'pl-4' : ''}`}>
                    <div>
                      <div className="text-sm text-gray-600">Total Parties</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="text-2xl font-semibold truncate">
                          <span>{loading ? "..." : totalParties.toLocaleString("en-US")}</span>
                        </div>
                        <div className="text-[10px] text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full font-bold">
                          Active
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Customers & Vendors
                      </div>
                    </div>
                    <div className="mt-auto flex justify-end">
                      <Icon className="!p-1.5 bg-yellow-50/50">
                        <svg
                          className="h-5 w-5 text-yellow-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </Icon>
                    </div>
                  </div>
                )}
              </div>
            </FloatingCard>
          )}

          {/* Total Invoices Card */}
          {hasPermission("invoice") && (
            <FloatingCard className="border-t-4 border-green-400 h-full" padding="py-2.5 px-4">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-600">
                      Total Sales Invoices
                    </div>
                    <div className="mt-1 text-2xl font-semibold truncate">
                      <span>{loading ? "..." : totalInvoices.toLocaleString("en-US")}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created & Sent
                    </div>
                  </div>
                  <Icon>
                    <List className="h-6 w-6 text-yellow-600" />
                  </Icon>
                </div>
                <div className="mt-auto pt-1.5">
                  <Sparkline />
                </div>
              </div>
            </FloatingCard>
          )}
        </div>
      </div>

      {/* MANAGEMENT PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-3">

        {/* 1 — Quotation Management */}
        {hasPermission("quotation") && (
          <FloatingCard padding="py-2 px-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-base font-semibold">
                  Quotation Management
                </div>
                <div className="text-xs text-gray-500">
                  Manage your quotations efficiently
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
              <div className="flex justify-center">
                <ActionBlock
                  label="Create Quotation"
                  color="yellow"
                  icon={<Plus className="h-6 w-6 text-white" />}
                  onClick={handleCreateQuotation}
                />
              </div>
              <div className="flex justify-center">
                <ActionBlock
                  label="View Quotation"
                  color="yellow"
                  icon={<List className="h-6 w-6 text-white" />}
                  onClick={handleViewQuotation}
                />
              </div>
              {hasPermission("custom-quotation") && (
                <div className="flex justify-center">
                  <ActionBlock
                    label="Custom Proposal"
                    color="yellow"
                    icon={<FilePlus className="h-6 w-6 text-white" />}
                    onClick={handleCustomQuotation}
                    className="drop-shadow-[0_10px_15px_rgba(250,204,21,0.2)]"
                  />
                </div>
              )}
            </div>
          </FloatingCard>
        )}

        {/* 2 — Proforma Invoice Management */}
        {hasPermission("proformaInvoice") && (
          <FloatingCard padding="py-2 px-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-base font-semibold">
                  Proforma Invoice Management
                </div>
                <div className="text-xs text-gray-500">
                  Manage your proforma invoices
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <div className="flex justify-center">
                <ActionBlock
                  label="Create Proforma Invoice"
                  icon={<Plus className="h-6 w-6 text-white" />}
                  color="yellow"
                  onClick={handleCreateProforma}
                />
              </div>
              <div className="flex justify-center">
                <ActionBlock
                  label="View Proforma Invoice"
                  icon={<FileText className="h-6 w-6 text-white" />}
                  color="yellow"
                  onClick={handleViewProforma}
                />
              </div>
            </div>
          </FloatingCard>
        )}

        {/* 3 — Billing Invoice Management */}
        {hasPermission("invoice") && (
          <FloatingCard padding="py-2 px-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-base font-semibold">
                  Billing Invoice Management
                </div>
                <div className="text-xs text-gray-500">
                  Manage your billing invoices
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
              <div className="flex justify-center">
                <ActionBlock
                  label="Create Tax Invoice"
                  icon={<Plus className="h-6 w-6 text-white" />}
                  color="yellow"
                  onClick={handleCreateInvoice}
                />
              </div>
              <div className="flex justify-center">
                <ActionBlock
                  label="View Tax Invoice"
                  icon={<FileText className="h-6 w-6 text-white" />}
                  color="yellow"
                  onClick={handleViewInvoice}
                />
              </div>
              {taxType === "GST" && hasPermission("eInvoice") && (
                <div className="flex justify-center">
                  <ActionBlock
                    label="E-Invoicing & EWB"
                    icon={<CloudUpload className="h-6 w-6 text-white" />}
                    color="yellow"
                    onClick={handleEInvoicing}
                  />
                </div>
              )}
            </div>
          </FloatingCard>
        )}

        {/* 4 — Purchase Order Management */}
        {(hasPermission("purchaseOrder") ||
          hasPermission("bookPurchaseOrder") ||
          hasPermission("Agreement") ||
          hasPermission("purchaseRequisition")) && (
            <FloatingCard padding="py-2 px-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-base font-semibold">
                    Purchase Order Management
                  </div>
                  <div className="text-xs text-gray-500">
                    Manage purchase orders & requisitions
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
                {hasPermission("purchaseRequisition") && (
                  <>
                    <div className="flex justify-center">
                      <ActionBlock
                        label="Create Purchase Requisition"
                        icon={<Plus className="h-6 w-6 text-white" />}
                        color="yellow"
                        onClick={handleCreatePR}
                      />
                    </div>
                  </>
                )}
                {hasPermission("purchaseOrder") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Create / Edit PO"
                      icon={<Edit className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handlePurchaseCreate}
                    />
                  </div>
                )}
                {hasPermission("bookPurchaseOrder") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Book PO"
                      icon={<Calendar className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handlePurchaseBook}
                    />
                  </div>
                )}

                {hasPermission("Agreement") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Agreement"
                      icon={<FileSignature className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleAgreement}
                    />
                  </div>
                )}

                {hasPermission("GRN") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label=" Create / Edit GRN"
                      icon={<FileSignature className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleGRNCreate}
                    />
                  </div>
                )}
                {hasPermission("MRN") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label=" Create / Edit MRN"
                      icon={<FileSignature className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleMRNCreate}
                    />
                  </div>
                )}
              </div>
            </FloatingCard>
          )}

        {/* 5 — Sales Order Management */}
        {(hasPermission("debitNote") ||
          hasPermission("creditNote") ||
          hasPermission("deliveryChallan") ||
          hasPermission("salesReturn")) && (
            <FloatingCard padding="py-2 px-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-base font-semibold">
                    Sales Order Management
                  </div>
                  <div className="text-xs text-gray-500">
                    Manage sales orders efficiently
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
                {hasPermission("debitNote") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Debit Notes"
                      icon={<FileMinus className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleDebitNotes}
                    />
                  </div>
                )}
                {hasPermission("creditNote") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Credit Note"
                      icon={<FilePlus className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleCreditNote}
                    />
                  </div>
                )}
                {hasPermission("deliveryChallan") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Delivery Challan"
                      icon={<Truck className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleDeliveryChallan}
                    />
                  </div>
                )}
                {hasPermission("salesReturn") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Sales Return"
                      icon={<RotateCcw className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleSalesReturn}
                    />
                  </div>
                )}
              </div>
            </FloatingCard>
          )}

        {/* 6 — Accounting Management */}
        {(hasPermission("ledger") ||
          hasPermission("bookInvoice") ||
          hasPermission("projectExpense") ||
          hasPermission("zKhataBook") ||
          hasPermission("documents")) && (
            <FloatingCard padding="py-2 px-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-base font-semibold">
                    Accounting Management
                  </div>
                  <div className="text-xs text-gray-500">
                    Manage ledgers, invoices, and expenses
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
                {hasPermission("ledger") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Ledger"
                      icon={<BookOpen className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleLedger}
                    />
                  </div>
                )}
                {hasPermission("bookInvoice") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Book Invoice"
                      icon={<Receipt className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleBookInvoice}
                    />
                  </div>
                )}
                {hasPermission("projectExpense") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Project & Expenses"
                      icon={<CreditCard className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleProjectExpense}
                    />
                  </div>
                )}
                {hasPermission("zKhataBook") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Z Khata Book"
                      icon={<List className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleZKhataBook}
                    />
                  </div>
                )}
                {hasPermission("documents") && (
                  <div className="flex justify-center">
                    <ActionBlock
                      label="Documents"
                      icon={<CloudUpload className="h-6 w-6 text-white" />}
                      color="yellow"
                      onClick={handleDocuments}
                    />
                  </div>
                )}
              </div>
            </FloatingCard>
          )}

        {/* 7 — Reports */}
        {/* <FloatingCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Reports</div>
              <div className="text-xs text-gray-500">View all reports and insights</div>
            </div>
            <div className="text-sm text-gray-500">Insights</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div onClick={handleSalesReport} className="cursor-pointer">
              <SmallReport
                label="Sales"
                color="sales"
                icon={<TrendingUp className="h-5 w-5" />}
              />
            </div>
            <div onClick={handlePurchaseReport} className="cursor-pointer">
              <SmallReport
                label="Purchase"
                color="purchase"
                icon={<ShoppingCart className="h-5 w-5" />}
              />
            </div>
            <div onClick={handleInventoryReport} className="cursor-pointer">
              <SmallReport
                label="Inventory"
                color="inventory"
                icon={<List className="h-5 w-5" />}
              />
            </div>
            <div onClick={handleGSTReport} className="cursor-pointer">
              <SmallReport
                label="GST / Tax"
                color="tax"
                icon={<Receipt className="h-5 w-5" />}
              />
            </div>
          </div>
        </FloatingCard> */}
      </div>

      <InvoiceChoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onContinue={handleInvoiceContinue}
        currency={currency}
      />
      <InvoiceChoiceModal
        isOpen={showBookInvoiceModal}
        onClose={() => setShowBookInvoiceModal(false)}
        onContinue={handleBookInvoiceContinue}
        currency={currency}
        isBook={true}
      />
    </>
  );
}
