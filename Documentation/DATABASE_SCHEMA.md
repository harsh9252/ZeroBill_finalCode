# InvoiceBillBook - Complete Database Schema

## 1. Database Overview
**Database Name:** `invoicebillbook_db`  
**Engine:** InnoDB  
**Charset:** `utf8mb4`  
**Collation:** `utf8mb4_unicode_ci`  
**Architecture:** Relational, Multi-tenant (via `business_id`)

**Total Tables:** 39 (Verified Implementation)

---

## 2. Table of Contents
1. [Core Identity & Access](#1-core-identity--access)
2. [Business & Contact Management](#2-business--contact-management)
3. [Sales & Revenue Documents](#3-sales--revenue-documents)
4. [Purchase & Expense Documents](#4-purchase--expense-documents)
5. [Financial & Payment Registry](#5-financial--payment-registry)
6. [Z Khata Book (Micro-Ledger)](#6-z-khata-book-micro-ledger)
7. [Super Admin & System Global](#7-super-admin--system-global)
8. [Technical Logs & Metadata](#8-technical-logs--metadata)

---

## 3. Schema Details

### 1. Core Identity & Access
| Table Name | Description | Related Entities |
| :--- | :--- | :--- |
| `users` | Primary software accounts (Owners) | `businesses`, `billing_history` |
| `sub_users` | Employee/Staff accounts | `users` (Parent) |
| `sub_user_business_access` | Mapping of sub-users to specific businesses | `sub_users`, `businesses` |
| `sub_user_permissions` | Granular action-level access controls | `sub_users` |
| `otps` | Security tokens for Auth/Reset | `users` |

### 2. Business & Contact Management
| Table Name | Description | Features |
| :--- | :--- | :--- |
| `businesses` | Main organization profile (Tenant) | Logos, GSTIN, Branding |
| `parties` | Unified Customer & Vendor ledger | Balance Tracking, Categories |
| `addresses` | Multi-address storage (Billing/Shipping) | Party & Business links |
| `inventory` | Product & Service catalog | Stock levels, HSN/GST |

### 3. Sales & Revenue Documents
| Table Name | Description | Status Cycle |
| :--- | :--- | :--- |
| `sales_invoices` | Tax Invoices for products/services | Unpaid, Paid, Overdue |
| `proforma_invoices` | Preliminary invoices (Draft/Estimate) | Open, Closed |
| `quotations` | Price quotes to parties | Pending, Accepted |
| `sales_returns` | Returns of sold goods | Draft, Final |
| `credit_notes` | Adjustments for sales returns/errors | Atomic updates to Party Balance |
| `delivery_challans` | Transport documents for goods | Linked to Invoices |
| `payment_in` | Record of cash/bank received | Linked to Invoices/Parties |

### 4. Purchase & Expense Documents
| Table Name | Description | Usage |
| :--- | :--- | :--- |
| `purchase_invoices` | Inward bills from vendors | Stock addition |
| `purchase_returns` | Returning goods to vendors | Stock subtraction |
| `debit_notes` | Adjustments for purchases | Atomic updates to Party Balance |
| `purchase_orders` | Orders sent to suppliers | Procurement tracking |
| `contracts` | Long-term service agreements | Periodic billing |
| `book_invoices` | Manual/Simple ledger entries | Quick entry |
| `payment_out` | Record of cash/bank paid | Vendor settlements |

### 5. Financial & Payment Registry
| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `bank_details` | Registry of business bank accounts | IFSC, A/C No, UPI |
| `invoice_sequences` | Document numbering logic per FY | Prefix, Current No |
| `project_expense` | Project-level cost tracking | Budget, Category |
| `project_expense_transactions` | Individual spend records | Date, Amount, Mode |

### 6. Z Khata Book (Micro-Ledger)
| Table Name | Description | Target User |
| :--- | :--- | :--- |
| `z_khata_parties` | Simplified contacts for credit | Small shopkeepers |
| `z_khata_transactions` | Single-entry credit items | "Gave", "Got" status |
| `z_khata_audit_logs` | Metadata for khata changes | Change history |

### 7. Super Admin & System Global
| Table Name | Description | Role |
| :--- | :--- | :--- |
| `super_admin_users` | Global platform moderators | Multi-tenant mgmt |
| `account_approvals` | Queue for new signup vetting | KYC/Verification |
| `pricing_plans` | Global subscription configurations | Tier features, Pricing |
| `billing_history` | Platform subscription payments | SaaS Revenue logs |

### 8. Technical Logs & Metadata
| Table Name | Description | Purpose |
| :--- | :--- | :--- |
| `terms_conditions` | Templates for legal fine-print | Reusable snippets |
| `e_invoice_logs` | Cleartax/GST communication logs | IRN tracking |
| `audit_logs` | Security & activity tracking | Forensics |
| `api_logs` | Performance & Integration logging | Troubleshooting |
| `error_logs` | System exception snapshots | Debugging |

---
**Total Table Count Reached:** 39
**Last Updated:** March 16, 2026
