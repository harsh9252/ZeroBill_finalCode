# ZeroBill Book API Documentation & Application Flow

This document details every API endpoint triggered by specific Sidebar buttons and Software actions.

**Production Base URL:** `https://apiadmin.invoicebillbook.com`
**Software App URL:** `https://erp.invoicebillbook.com`
**Website (Landing Page):** `https://invoicebillbook.com`

---

## 1. Website & Marketing (Landing Page)
- **Primary URL:** `https://invoicebillbook.com`
- **Actions:**
  - **View Pricing:** `GET /api/pricing`
    - **Response:** `{ "success": true, "data": [{ "id": 1, "name": "Basic", "offer_price": 499, "features": [...] }] }`
  - **Currency Detection:** `GET /api/currency/geolocation`
    - **Response:** `{ "success": true, "country": "IN", "currency": "INR" }`
  - **Book Demo:** `POST /api/demo/book`
    - **Payload:**
      ```json
      { "name": "...", "email": "...", "demoDate": "...", "demoTime": "..." }
      ```
  - **Legal Pages:**
    - **Privacy Policy:** `https://invoicebillbook.com/privacy-policy`
    - **Terms & Conditions:** `https://invoicebillbook.com/terms-conditions`
    - **Refund Policy:** `https://invoicebillbook.com/refund-policy`

## 2. Website Checkout Page
- **Page URL:** `https://invoicebillbook.com/checkout`
- **Trigger:** "Buy Now" or "Upgrade" buttons on Website/Software.
- **Workflow 1: New User Signup (Checkout)**
  - **Endpoint:** `POST /api/approvals` (Public Signup Request)
  - **Payload:**
    ```json
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "phone": "9876543210",
      "password": "SecurePassword123",
      "planId": 1,
      "planName": "Standard",
      "planType": "subscription",
      "planPrice": 999
    }
    ```
- **Workflow 2: Existing User Upgrade**
  - **Endpoint:** `POST /api/billing/upgrade`
  - **Auth:** Requires Bearer Token in Header.
  - **Payload:**
    ```json
    {
      "planId": 2,
      "paymentMethod": "upi",
      "transactionId": "WEB-UNIQUE_ID",
      "amount": 999,
      "currency": "INR"
    }
    ```

---

## 3. Demo Management (Public & Admin)
- **Public URL:** `https://invoicebillbook.com/book-demo`
- **Workflow:** Users select a slot from the calendar.
- **Fetch Availability:** `GET /api/demo/availability`
  - *Logic:* Fetches Google Calendar events + DB overrides + Sunday blocks.
- **Book Demo:** `POST /api/demo/book`
  - **Payload:**
    ```json
    {
      "name": "Customer Name",
      "phone": "9876543210",
      "email": "cust@example.com",
      "business": "Business Name",
      "enquiryType": "Software Demo",
      "demoDate": "2023-11-27",
      "demoTime": "10:00",
      "interestedFeatures": "Invoicing, Inventory",
      "language": "Hindi"
    }
    ```
- **Admin Management (Super Admin):**
  - **Set Availability Override:** `POST /api/superadmin/demo/overrides`
    - **Payload:**
      ```json
    { "override_date": "2023-11-27", "slot_time": "10:00", "is_available": false, "reason": "Public Holiday" }
    ```
  - **Authorize Calendar:** `GET /api/calendar/auth/url`
  - **Cancel Demo:** `DELETE /api/demo/cancel/:eventId`

---

## 4. Super Admin Authentication (Landing / Internal)
- **Login URL:** `https://erp.invoicebillbook.com/#/superadmin/login`
- **Endpoints:**
  - **Login:** `POST /api/superadmin/auth/login`
    - **Payload:** `{ "email": "...", "password": "..." }`
  - **Refresh Token:** `GET /api/superadmin/auth/refresh-token`
  - **Logout:** `POST /api/superadmin/auth/logout`
  - **Get Profile:** `GET /api/superadmin/profile`
  - **Update Profile:** `PUT /api/superadmin/profile`
    - **Payload:** `{ "name": "...", "email": "..." }`
  - **Change Password:** `PUT /api/superadmin/password`
    - **Payload:** `{ "currentPassword": "...", "newPassword": "..." }`

## 5. Sign In (Login)
- **Button:** "Sign In"
- **Page URL:** `https://erp.invoicebillbook.com/#/login`
- **Endpoint:** `POST /api/auth/login`
- **Request Payload:**
  ```json
  {
    "identifier": "user@example.com", // or phone number
    "password": "yourpassword"
  }
  ```

## 6. Sign Up (Register) & OTP Verification
- **Button:** "Sign Up"
- **Page URL:** `https://erp.invoicebillbook.com/#/login`
- **Endpoint:** `POST /api/auth/signup`
- **Request Payload:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "securepassword",
    "planId": 1 
  }
  ```
- **3rd Party:** `ipapi.co` for auto-detecting country.
- **Get Profile:** `GET /api/auth/me`
- **Update Profile:** `PUT /api/auth/profile`
- **Change Password:** `PUT /api/auth/change-password`
- **Forgot Password:** `POST /api/auth/forgot-password`
- **OTP Workflow (Email Verification / Login / Reset Password):**
  - **Send OTP:** `POST /api/auth/send-otp`
    - **Payload:** `{ "email": "...", "purpose": "business_verification" }` // Purposes: login, reset_password, business_verification
  - **Verify OTP:** `POST /api/auth/verify-otp`
    - **Payload:** `{ "email": "...", "otp": "123456", "purpose": "..." }`

---

## 7. Dashboard
- **Button:** "Dashboard"
- **Page URL:** `https://erp.invoicebillbook.com/#/dashboard`
- **Fetch Stats:** `GET /api/dashboard/stats?business_id=123`
  - **Payload (Response):**
    ```json
    {
      "success": true,
      "data": {
        "parties": { "total": 0, "customers": 0, "vendors": 0, "receivable": 0, "payable": 0 },
        "quotations": { "total": 0, "pending": 0, "approved": 0, "rejected": 0 },
        "invoices": { "total": 0, "draft": 0, "sent": 0, "paid": 0 }
      }
    }
    ```
- **Fetch Recent Activity:** `GET /api/dashboard/recent-activity?business_id=123`
- **Wait... Stats Mapping:** Dashboard stats often return an object with summaries for Quotations, Invoices, and Parties.
- **Internal Actions:** Redirection to Quotation, Invoice, etc.

---

## 8. Manage Business
- **Button:** "Manage Business" / "Add Business"
- **Page URL:** `https://erp.invoicebillbook.com/#/business`
- **List All:** `GET /api/business`
  - **Response:** `{ "success": true, "data": [{ "id": 1, "businessName": "Shop A", "logo": "..." }] }`
- **Add Business (Form Data):** `POST /api/business`
  - **Payload:**
    ```javascript
  // Multipart/Form-Data
  {
    "businessName": "My Awesome Shop",
    "companyPhone": "9876543210",
    "companyEmail": "shop@example.com",
    "billingAddress": "123 Street, City",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "city": "Noida",
    "businessType": "Retailer",
    "industryType": "Automobile",
    "businessRegistrationType": "GST Registered", // Options: "GST Registered", "VAT Registered", "No Tax"
    "gstin": "09AAAAA0000A1Z5",
    "vatNumber": "...", // If VAT Registered
    "panNumber": "ABCDE1234F",
    "logo": File, // Binary
    "signatureUrl": File,
    "stampUrl": File
  }
  ```
- **Update Business:** `PUT /api/business/:id/upload` (Supports multipart logo/signature updates)
- **Delete:** `DELETE /api/business/:id`
- **Internal Utilities:**
  - **Pincode Lookup:** `GET /api/business/pincode/:pincode` (Hits postalpincode.in with fallback)
  - **City by State:** `GET /api/business/cities/:state`
  - **Tax Validation:** `GET /api/tax/validate?country_iso=IN&tax_id={gstin}`

---

## 9. Manage User (Sub-Users)
- **Button:** "Manage User"
- **Page URL:** `https://erp.invoicebillbook.com/#/manageUser`
- **List Users:** `GET /api/sub-users`
  - **Response:** `{ "success": true, "data": [{ "id": 1, "name": "User 1", "email": "..." }] }`
- **Add User:** `POST /api/sub-users`
  - **Payload:**
    ```json
  {
    "name": "Staff Name",
    "email": "staff@example.com",
    "password": "password123",
    "businessIds": [123, 124]
  }
  ```
- **Update User:** `PUT /api/sub-users/:id`
- **Delete User:** `DELETE /api/sub-users/:id`
- **Activity Tracking:** `GET /api/sub-users` returns `last_login_at` for monitoring staff activity.

---

## 10. Parties
- **Button:** "Parties"
- **Page URL:** `https://erp.invoicebillbook.com/#/parties`
- **List Parties:** `GET /api/parties?business_id=123`
  - **Response:** `{ "success": true, "data": [{ "id": 1, "name": "Party X", "party_type": "customer" }] }`
- **Add Party (Supports Multipart Logo):** `POST /api/parties`
  - **Payload:**
    ```json
  {
    "business_id": 123,
    "name": "Customer Name",
    "phone_number": "9876543210",
    "billing_address": "Address Line",
    "shipping_address": "Same as billing",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "gstin": "09AAAAA0000A1Z5",
    "vat": "...", // If VAT registration
    "no_tax": true, // If 'No Tax' flag is checked (Boolean)
    "opening_balance": 500,
    "party_type": "customer",
    "logo": File // Binary image
  }
  ```
- **Update:** `PUT /api/parties/:id`
- **Delete (Soft):** `DELETE /api/parties/:id`
- **Hard Delete:** `DELETE /api/parties/:id/hard`
- **Addresses:** 
  - `GET /api/parties/:id/addresses`
  - `POST /api/parties/:id/addresses`
    - **Payload:** `{ "address_line": "...", "city": "...", "state": "...", "pincode": "...", "is_shipping": true }`
- **Bank Accounts (Sub-Module):**
  - `GET /api/parties/:partyId/bank-accounts`
  - `POST /api/parties/:partyId/bank-accounts`
    - **Payload:** `{ "bankName": "...", "accountNumber": "...", "ifsc": "...", "branch": "...", "upi": "...", "accountHolderName": "..." }`
  - `PUT /api/parties/:partyId/bank-accounts/:bankId`
  - `DELETE /api/parties/:partyId/bank-accounts/:bankId`

---

## 11. Inventory (Items) & Categories
- **Button:** "Inventory"
- **Page URL:** `https://erp.invoicebillbook.com/#/inventory`
- **List Items:** `GET /api/inventory?business_id=123`
  - **Response:** `{ "success": true, "data": [{ "id": 1, "item_name": "Product A", "sale_price": 1000 }] }`
- **Add Item:** `POST /api/inventory`
  - **Payload (Multipart/Form-Data):**
    ```json
  {
    "business_id": 123,
    "item_name": "Product A",
    "item_type": "product", // product or service
    "hsn_code": "1234",
    "unit": "PCS",
    "sale_price": 1000,
    "purchase_price": 800,
    "gst_rate": 18,
    "opening_stock": 50,
    "description": "...",
    "image": File
  }
  ```
- **Update Item:** `PUT /api/inventory/:id`
- **Update Stock:** `PATCH /api/inventory/:id/stock`
  - **Payload:** `{ "quantity_change": 10, "reason": "Restock" }`
- **Fetch by Code:** `GET /api/inventory/code/:code`
- **Categories:**
  - **List:** `GET /api/categories?business_id=123`
  - **Add:** `POST /api/categories` 
    - **Payload:** `{ "name": "Electronics", "business_id": 123 }`
  - **Delete:** `DELETE /api/categories/:id?business_id=123`
- **Delete Item:** `DELETE /api/inventory/:id`

---

## 12. Quotation
- **Button:** "Quotation"
- **Page URL:** `https://erp.invoicebillbook.com/#/quotation`
- **List Quotations:** `GET /api/quotations?business_id=123`
- **Add Quotation:** `POST /api/quotations`
  - **Payload:**
    ```json
  {
    "party_name": "...",
    "party_id": 456,
    "quotation_number": "Q-001",
    "quotation_date": "2023-10-27",
    "valid_until": "2023-11-27",
    "total_amount": 1000,
    "tax_amount": 180,
    "discount_amount": 0,
    "grand_total": 1180,
    "bank_id": 1,
    "notes": "...",
    "terms_sections": [{ "heading": "...", "content": "..." }]
  }
  ```
- **Convert:** `POST /api/quotations/:id/convert`
  - **Payload:** `{ "type": "sales" }` // or "proforma"
- **Public View:** `GET /api/quotations/public/:id` (No Auth)
- **Numbers:** 
  - **Generate Number (Sequenced):** `GET /api/quotations/generate-number?businessId=123`
  - **Get Next Available:** `GET /api/quotations/next-number?businessId=123`
- **Stats:** `GET /api/quotations/stats?business_id=123`

---

## 13. Proforma Invoice
- **Button:** "Proforma Invoice"
- **Page URL:** `https://erp.invoicebillbook.com/#/proformaInvoice`
- **List Proforma:** `GET /api/proforma-invoices?business_id=123`
- **Add Proforma:** `POST /api/proforma-invoices`
  - **Payload:**
    ```json
  {
    "party_id": 456,
    "party_name": "...",
    "proforma_number": "PI-001",
    "proforma_date": "2023-10-27",
    "grand_total": 5000,
    "notes": "...",
    "invoice_data": { "lines": [...] },
    "terms_sections": [...]
  }
  ```
- **Convert:** `POST /api/proforma-invoices/:id/convert` (Converts to Sales Invoice)
- **Public View:** `GET /api/proforma-invoices/public/:id` (No Auth)
- **Numbers:** 
  - **Generate Number:** `GET /api/proforma-invoices/generate-number?businessId=123`
  - **Next Number:** `GET /api/proforma-invoices/next-number?businessId=123`
- **Stats:** `GET /api/proforma-invoices/stats?business_id=123`

---

## 14. Tax Invoice (Sales Invoice)
- **Button:** "Tax Invoice" / "Create Invoice"
- **Page URL:** `https://erp.invoicebillbook.com/#/invoice`
- **List Invoices:** `GET /api/sales-invoices?business_id=123`
- **Add Invoice:** `POST /api/sales-invoices`
  - **Payload:**
    ```json
  {
    "party_id": 456,
    "party_name": "...",
    "invoice_number": "INV-101",
    "invoice_date": "2023-10-27",
    "due_date": "2023-11-27",
    "subtotal": 8000,
    "tax_amount": 1440,
    "grand_total": 9440,
    "line_items": [...],
    "po_agreement_number": "PO-999"
  }
  ```
- **Public View:** `GET /api/sales-invoices/public/:id` (No Auth)
- **Numbers:** 
  - **Generate Number:** `GET /api/sales-invoices/generate-number?businessId=123`
  - **Next Number:** `GET /api/sales-invoices/next-number?businessId=123`
- **Stats:** `GET /api/sales-invoices/stats?business_id=123`

---

## 15. Payment In
- **Button:** "Payment In" / "Record Payment"
- **Page URL:** `https://erp.invoicebillbook.com/#/payment`
- **List Payments In:** `GET /api/payment-in/:businessId`
  - **Response:** `{ "success": true, "data": [{ "id": 1, "amount_received": 500, "payment_mode": "Upi" }] }`
- **Record Payment:** `POST /api/payment-in/:businessId`
  - **Payload:**
    ```json
  {
    "party_id": 456,
    "amount_received": 500,
    "payment_date": "2023-10-27",
    "payment_mode": "Upi", // Cash, Bank, Upi, Cheque
    "notes": "Advance for Project X"
  }
  ```
- **Update:** `PUT /api/payment-in/:id/:businessId`
- **Delete:** `DELETE /api/payment-in/:id/:businessId`

---

## 16. Sales Return & Credit Note
- **Button:** "Sales Return" / "Credit Note"
- **Page URL:** `https://erp.invoicebillbook.com/#/salesReturn` / `/#/creditNote`
- **Endpoints:** `POST /api/sales-returns`, `POST /api/credit-notes`
- **Payload:**
  ```json
  {
    "party_name": "...",
    "party_id": 456,
    "return_number": "SR-001", // or credit_note_number
    "return_date": "2023-10-27",
    "grand_total": 1200,
    "line_items": [...]
  }
  ```
- **Numbers:** 
  - **Sales Return Next:** `GET /api/sales-returns/next-number?business_id=123`
  - **Credit Note Next:** `GET /api/credit-notes/next-number?business_id=123`
- **Stats:** 
  - **Sales Return Stats:** `GET /api/sales-returns/stats?business_id=123`
  - **Credit Note Stats:** `GET /api/credit-notes/stats?business_id=123`

---

## 17. Delivery Challan
- **Button:** "Delivery Challan"
- **Page URL:** `https://erp.invoicebillbook.com/#/deliveryChallan`
- **List Challans:** `GET /api/delivery-challans?business_id=123`
- **Add Challan:** `POST /api/delivery-challans`
  - **Payload:** `{ "party_id": 456, "challan_number": "DC-001", "grand_total": 500, "line_items": [...] }`
- **Numbers:** `GET /api/delivery-challans/next-number?business_id=123`
- **Stats:** `GET /api/delivery-challans/stats?business_id=123`

---

## 18. Purchase Order
- **Button:** "Purchase Order"
- **Page URL:** `https://erp.invoicebillbook.com/#/purchaseOrder`
- **List POs:** `GET /api/purchase-orders?business_id=123`
- **Add PO:** `POST /api/purchase-orders`
  - **Payload:** `{ "party_id": 789, "order_number": "PO-001", "grand_total": 2000, "line_items": [...] }`
- **Numbers:** `GET /api/purchase-orders/next-number?business_id=123`
- **Stats:** `GET /api/purchase-orders/stats?business_id=123`
- **Mark Received:** `POST /api/purchase-orders/:id/book`

---

## 19. Book Purchase Order
- **Button:** "Book Purchase order"
- **Page URL:** `https://erp.invoicebillbook.com/#/bookPurchaseOrder`
- **Endpoints:**
  - **Next Number:** `GET /api/book-purchase-orders/next-number`
  - **List:** `GET /api/book-purchase-orders?business_id=123`
  - **Add:** `POST /api/book-purchase-orders`
    - **Payload:** `{ "party_id": 789, "order_number": "BPO-001", "grand_total": 2000, "line_items": [...] }`
  - **Get by ID:** `GET /api/book-purchase-orders/:id`
  - **Update:** `PUT /api/book-purchase-orders/:id`
  - **Delete:** `DELETE /api/book-purchase-orders/:id`

---

## 20. Book Invoice (Purchase Bills)
- **Button:** "Book Invoice"
- **Page URL:** `https://erp.invoicebillbook.com/#/bookInvoice`
- **List Book Invoices:** `GET /api/book-invoices?business_id=123`
- **Add Book Invoice:** `POST /api/book-invoices`
  - **Payload:** `{ "business_id": 123, "book_invoice_number": "BI-001", "party_id": 789, "grand_total": 2500, "line_items": [...] }`
- **By PO Reference:** `GET /api/book-invoices/by-po?po_reference=PO-xxx&business_id=1`
- **Numbers:** `GET /api/book-invoices/next-number?business_id=123`
- **Stats:** `GET /api/book-invoices/stats?business_id=123`

---

## 21. Payment Out
- **Button:** "Payment Out"
- **Page URL:** `https://erp.invoicebillbook.com/#/paymentOut`
- **List Payments Out:** `GET /api/payment-out/:businessId`
- **Record Payment Out:** `POST /api/payment-out/:businessId`
  - **Payload:**
    ```json
  {
    "party_id": 789,
    "amount_paid": 500,
    "payment_date": "2023-10-27",
    "payment_mode": "Bank Transfer",
    "notes": "..."
  }
  ```
- **Fetch By Party:** `GET /api/payment-out/:businessId/party/:partyId`
- **Fetch By Date:** `GET /api/payment-out/:businessId/date-range?startDate=...&endDate=...`

---

## 22. Purchase Return & Debit Note
- **Button:** "Purchase Return" / "Debit Note"
- **Page URL:** `https://erp.invoicebillbook.com/#/purchaseReturn` / `/#/debitNote`
- **Endpoints:** `POST /api/purchase-returns`, `POST /api/debit-notes`
- **Payload:**
  ```json
  {
    "party_id": 789,
    "return_number": "PR-001",
    "grand_total": 450,
    "line_items": [...]
  }
  ```
- **Numbers:** 
  - **Purchase Return Next:** `GET /api/purchase-returns/next-number?business_id=123`
  - **Debit Note Next:** `GET /api/debit-notes/next-number?business_id=123`
- **Stats:** 
  - **Purchase Return Stats:** `GET /api/purchase-returns/stats?business_id=123`
  - **Debit Note Stats:** `GET /api/debit-notes/stats?business_id=123`

---

## 23. Agreement (Contract Management)
- **Button:** "Agreement" / "Contract"
- **Page URL:** `https://erp.invoicebillbook.com/#/contract`
- **List Contracts:** `GET /api/contracts?business_id=123`
- **Add Contract:** `POST /api/contracts?business_id=123`
- **Numbers:** `GET /api/contracts/next-number`
- **Update:** `PUT /api/contracts/:id`
- **Delete:** `DELETE /api/contracts/:id`

---

## 24. Report Generator
- **Button:** "Report"
- **Page URL:** `https://erp.invoicebillbook.com/#/report`
- **Fetch Data:** `GET /api/quotations`, `/api/sales-invoices`, `/api/proforma-invoices`
- **Filters:** `start_date`, `end_date`, `party_id`, `status`.

---

## 25. E-Invoice & E-Way Bill
- **Button:** "E-Invoice"
- **Page URL:** `https://erp.invoicebillbook.com/#/eInvoice`
- **Config:** `GET /api/e-invoice/config`
- **List Logs:** `GET /api/e-invoice/list`
- **Get Log by Invoice:** `GET /api/e-invoice/invoice/:invoiceId`
- **Generate IRN:** `POST /api/e-invoice/generate/:invoiceId`
- **Cancel IRN:** `POST /api/e-invoice/cancel/:irn`
  - **Payload:** `{ "cancel_reason": "1", "cancel_remark": "..." }`
- **Preview Payload:** `GET /api/e-invoice/preview/:invoiceId`

---

## 26. Project Expense
- **Button:** "Project Expense"
- **Page URL:** `https://erp.invoicebillbook.com/#/projectExpense`
- **List Projects:** `GET /api/project-expense?business_id=123`
- **Add Project:** `POST /api/project-expense`
  - **Payload:**
    ```json
  {
    "business_id": 123,
    "account_name": "Project X",
    "amount": 50000,
    "project_type": "payable" // or "receivable"
  }
  ```
- **List Transactions:** `GET /api/project-expense-transactions/:businessId/project-expense/:expenseId`
- **Record Transaction:** `POST /api/project-expense-transactions/:businessId` (Multipart)
  - **FormData:** `project_expense_id`, `amount`, `type`, `date`, `remarks`, `screenshot` (File)
- **Project Expense Summary:** `GET /api/project-expense-transactions/:businessId/project-expense/:projectExpenseId/summary`
- **Project Parties Manager:**
  - **List:** `GET /api/project-parties/:project_expense_id`
  - **Add:** `POST /api/project-parties`
    - **Payload:** `{ "project_expense_id": 1, "party_name": "...", "phone": "...", "type": "vendor" }`
  - **Update/Delete:** `PUT /api/project-parties/:id`, `DELETE /api/project-parties/:id`

---

## 27. Z Khata Book & Ledger
- **Button:** "Z Khata Book" / "Ledger"
- **Page URL:** `https://erp.invoicebillbook.com/#/zKhataBook` / `/#/ledger`
- **Z-Khata Parties:** `GET /api/z-khata/parties?business_id=123`
- **Add Party:** `POST /api/z-khata/parties`
  - **Payload:** `{ "business_id": 123, "partyName": "Raj", "phoneNumber": "...", "partyType": "customer", "openingBalance": 100 }`
- **Add Transaction:** `POST /api/z-khata/transactions`
  - **Payload:** `{ "business_id": 123, "party_id": 456, "amount": 50, "type": "payment_in", "date": "..." }`
- **List Transactions:** `GET /api/z-khata/transactions/party/:partyId?business_id=123`
- **Ledger:** Ledger is a frontend view consolidating Sales, Payments, and Returns for a specific `party_id` using existing module list endpoints.

---

## 28. Documents (File Manager)
- **Button:** "Documents"
- **Page URL:** `https://erp.invoicebillbook.com/#/documents`
- **Fetch Docs:** `GET /api/documents/:businessId?path=...`
- **Add Folder:** `POST /api/documents/folder`
  - **Payload:** `{ "businessId": "...", "folderName": "...", "parentPath": "..." }`
- **Upload File:** `POST /api/documents/upload` (Multipart: `file`, `businessId`, `path`)
- **Rename:** `PUT /api/documents/rename`
  - **Payload:** `{ "businessId": "...", "oldPath": "...", "newName": "..." }`
- **Delete:** `DELETE /api/documents/delete`
  - **Payload:** `{ "businessId": "...", "itemPath": "..." }`

---

## 29. Account, Settings & Support
- **Button:** "Account" / "Support"
- **Page URL:** `https://erp.invoicebillbook.com/#/account` / `/#/support`
- **Profile Update:** `PUT /api/auth/profile`
- **Change Password:** `PUT /api/auth/change-password`
- **Business Bank Accounts (System Accounts):**
  - **Route:** `/api/bank-details`
  - **CRUD:** `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`
- **Billing & Subscription Insights:**
  - **History:** `GET /api/billing/history`
  - **Summary Stats:** `GET /api/billing/summary` (Used for renewal alerts and usage caps)
- **Support Message:** `POST /api/support/contact`
  - **Payload:**
    ```json
  { "name": "...", "email": "...", "subject": "...", "message": "..." }
  ```

---

## 30. Terms & Conditions
- **Get by Document:** `GET /api/terms-conditions/:docType/:docId`
  - *docType:* `quotation`, `sales`, `proforma`, `credit-note`, etc.
- **Bulk Create:** `POST /api/terms-conditions/bulk`
  - **Payload:** `{ "document_type": "...", "document_id": "...", "sections": [...] }`
- **Lock Section:** `PATCH /api/terms-conditions/lock/:id`

---

## 31. Super Admin Management

- **Base URL:** `https://erp.invoicebillbook.com/#/superadmin`
- **Dashboard Stats:** `GET /api/superadmin/dashboard/stats`
- **Account Approvals (Signup Requests):**
  - **Endpoint Path:** `/api/approvals` (Mounted in server.js)
  - **List Pending Approvals:** `GET /api/approvals/pending`
  - **Get Approval Stats:** `GET /api/approvals/stats`
  - **Approve Signup:** `POST /api/approvals/approve/:id`
  - **Reject Signup:** `POST /api/approvals/reject/:id`
    - **Payload:** `{ "rejectionReason": "..." }`
  - **Download Invoice:** `GET /api/approvals/:id/invoice`
- **User Management (Active/Inactive):**
  - **List Active Users:** `GET /api/superadmin/users/active`
  - **List Inactive Users:** `GET /api/superadmin/users/inactive`
  - **Deactivate User:** `PUT /api/superadmin/users/:userId/deactivate`
  - **Activate User:** `PUT /api/superadmin/users/:userId/activate`
- **Pricing & Plan Management:**
  - **List All Plans:** `GET /api/superadmin/pricing`
  - **Create Plan:** `POST /api/superadmin/pricing`
  - **Toggle Status:** `PUT /api/superadmin/pricing/:id/toggle`
  - **Visual Order:** `PUT /api/pricing/admin/reorder` (Drag & drop list order)
  - **Features:** `PUT /api/pricing/admin/:id/featured` (Adds "Popular" or "Best Value" labels)
- **Demo Management:**
  - **List All Demo Requests:** `GET /api/superadmin/demo-management`
  - **Update Status:** `PATCH /api/superadmin/demo-management/:id`
- **Data Collections & Reports:**
  - **System Status:** `GET /api/superadmin/system/status`
  - **Export Users:** `GET /api/superadmin/users/export` (Supports CSV/Excel)
  - **Export Transactions:** `GET /api/superadmin/transactions/export`

---

---

## 32. Custom Quotation
- **Button:** "Custom Quotation"
- **Page URL:** `https://erp.invoicebillbook.com/#/custom-quotation`
- **List All:** `GET /api/custom-quotations/business/:businessId`
- **Get by ID:** `GET /api/custom-quotations/:id`
- **Next Number:** `GET /api/custom-quotations/next-number?businessId=123`
- **Add Custom Quotation:** `POST /api/custom-quotations`
  - **Payload:**
    ```json
    {
      "business_id": 123,
      "header_text": "Professional Estimate",
      "quotation_date": "2023-10-27",
      "company_name": "...",
      "total_amount": 5000,
      "sections": [
        { "title": "Scope of Work", "content": "..." },
        { "title": "Pricing", "items": [...] }
      ],
      "status": "Draft"
    }
    ```
- **Update:** `PUT /api/custom-quotations/:id`
- **Delete:** `DELETE /api/custom-quotations/:id`

---

## 33. Agreement (Detailed Contract Management)
- **Button:** "Agreement"
- **Page URL:** `https://erp.invoicebillbook.com/#/Agreement`
- **List All:** `GET /api/contracts?business_id=123`
- **Get by ID:** `GET /api/contracts/:id?business_id=123`
- **Next Number:** `GET /api/contracts/next-number?business_id=123`
- **Add Agreement:** `POST /api/contracts?business_id=123`
  - **Payload:**
    ```json
    {
      "contract_number": "AGT-001",
      "party_id": 456,
      "contract_date": "2023-10-27",
      "content": "Full Agreement Text...",
      "status": "Active"
    }
    ```
- **Update:** `PUT /api/contracts/:id?business_id=123`
- **Delete:** `DELETE /api/contracts/:id?business_id=123`

---

## 34. Book Purchase Order (Detailed)
- **Button:** "Book Purchase order"
- **Page URL:** `https://erp.invoicebillbook.com/#/bookPurchaseOrder`
- **List All:** `GET /api/book-purchase-orders?business_id=123`
- **Next Number:** `GET /api/book-purchase-orders/next-number`
- **Add BPO:** `POST /api/book-purchase-orders`
  - **Payload:**
    ```json
    {
      "party_id": 789,
      "party_name": "Vendor X",
      "grand_total": 10000,
      "line_items": [...],
      "po_agreement_number": "AGT-001"
    }
    ```

---

## 35. System Utility Endpoints
- **Health Check:** `GET /api/health`
  - **Response:** `{ "status": "OK", "version": "1.0.1", "environment": "production" }`
- **Image Upload:** `POST /api/upload`
  - **Type:** `multipart/form-data`
  - **Field:** `image` (File)
  - **Response:** `{ "success": true, "image_url": "/uploads/filename.jpg" }`
- **Direct Image Upload (No specific context):** `POST /api/upload-direct`
  - **Type:** `multipart/form-data`
  - **Field:** `image` (File)

---

## 36. Localization & Currency
- **Live Exchange Rates:** `GET /api/currency/rates`
  - **Response:** `{ "success": true, "rates": { "USD": 1, "INR": 83.2, ... }, "timestamp": "..." }`
- **IP Geolocation Detection:** `GET /api/currency/geolocation`
  - **Logic:** Tries `ipapi.co`, then `ip-api.com`, then defaults to `IN`.

---

## 37. Additional Document Metadata (Terms & Conditions Lock)
- **Lock Terms Section:** `PATCH /api/terms-conditions/lock/:id`
  - **Purpose:** Prevents editing of a specific terms section in a document.
- **Bulk Sync Terms:** `POST /api/terms-conditions/bulk`
  - **Payload:** `{ "document_type": "...", "document_id": 123, "sections": [...] }`

---

### 3rd Party Integrations
- **GST Validation:** Cleartax API via `GET /api/tax/validate`
- **Geolocation:** `ipapi.co` & `https://api.db-ip.com/v2/free/self`
- **Currency Exchange:** `refreshRates()` hits external provider for live XE data.
- **Pincode Lookup:** `https://api.postalpincode.in/pincode/{pincode}` (Internal relayed endpoint: `GET /api/business/pincode/:pincode`)
