# GNIDERTON ERP — Standalone Web Frontend
## Architecture & Build Specification (v1.0)

**Purpose of this document:** This is the complete brief for rebuilding the GNIDERTON ERP frontend outside of Appsmith, as a standalone, modern web application. It contains the architecture, tech stack, module/page breakdown, full API contract, design system, folder structure, and delivery plan. A developer should be able to build the entire product from this document alone, pushing code to GitHub as they go.

---

## 1. What This Product Is

GNIDERTON ERP is a distribution/wholesale business ERP covering:

Inventory & Purchasing · Vendor Management · Customer Management · Sales Orders & Invoicing · Credit/Debit Notes · Schemes & Pricing · Supply Chain / Delivery · Finance (Loans, Cheques, Transactions, Reconciliation, GST) · HR & Payroll · Reports & Analytics · Settings & Migration Tools.

It currently exists as a low-code **Appsmith** app. Appsmith itself has **no business logic of its own** — it is purely a UI shell that calls a single external REST API. This means the rebuild is, functionally, "just" a frontend project: **all business logic already lives in the backend**, and the new frontend simply needs to call the same endpoints with a better UI.

### Backend (already exists — do not rebuild)
- **Base URL:** `https://distribution-erp.onrender.com`
- **Type:** REST API (JSON in/out)
- Single datasource for the whole app — one backend service serves every module.

> The developer's job is 100% frontend. No backend/API work is in scope unless a gap is found (see §7 Open Items).

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **React 18 + TypeScript**, built with **Vite** | Fast dev server, industry standard, huge ecosystem |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix primitives) | Modern, consistent, highly customizable design system; avoids "generic Bootstrap" look |
| Routing | **React Router v6** | Standard SPA routing, nested routes per module |
| Server state / data fetching | **TanStack Query (React Query)** | Caching, background refetch, loading/error states — replaces Appsmith's auto-run queries |
| Client/global state | **Zustand** | Lightweight store for things like selected vendor/customer/invoice (replaces `appsmith.store.*`) |
| Tables | **TanStack Table v8** | Powers every data grid (replaces `TABLE_WIDGET_V2`), sorting/filtering/pagination |
| Forms | **React Hook Form + Zod** | Replaces `JSON_FORM_WIDGET`; schema-driven validation |
| Charts | **Recharts** | Powers Reports/Analytics/Incentives dashboards |
| HTTP client | **Axios** (single configured instance) | Interceptors for auth headers + centralized error handling |
| PDF generation | **jsPDF + jspdf-autotable** | Same libraries the current app already uses (invoices, GRNs, ledgers, payslips, letterheads) |
| Icons | **lucide-react** | Modern, consistent icon set |
| Date handling | **date-fns** | Lightweight date utils for date pickers, filters |
| Auth | **JWT-based** (see §6) | Standard, stateless, scalable |
| Deployment | **Vercel** or **Netlify** (static SPA) | Zero-config CI/CD from GitHub |
| Repo/CI | **GitHub + GitHub Actions** | Lint/typecheck/build on every PR |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React SPA (Vite)                     │
│                                                           │
│  Routes (1 per module) → Page Components → Feature       │
│  Components → shadcn/ui primitives                        │
│                                                           │
│  ┌───────────────┐   ┌────────────────┐   ┌────────────┐ │
│  │ TanStack Query │──▶│  api/ layer     │──▶│  Axios      │ │
│  │ (server cache) │   │ (per-module     │   │  instance   │ │
│  │                │   │  endpoint fns)  │   │  + interceptors │
│  └───────────────┘   └────────────────┘   └──────┬─────┘ │
│                                                    │       │
│  ┌───────────────┐                                │       │
│  │ Zustand store │ (selected vendor/customer/inv.) │       │
│  └───────────────┘                                │       │
└────────────────────────────────────────────────────┼──────┘
                                                       ▼
                                     https://distribution-erp.onrender.com
                                        (existing REST API — untouched)
```

**Key principle:** every page = one route = one folder containing its own components, hooks, and API calls. This mirrors the 24 modules the business already understands, so nothing is "lost in translation" from the current app.

---

## 4. Folder Structure (GitHub repo layout)

```
gniderton-erp-web/
├── .github/workflows/ci.yml         # lint, typecheck, build on PR
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx                  # router + layout shell
│   │   ├── routes.tsx               # route table (all 24 modules)
│   │   └── providers.tsx            # QueryClientProvider, ThemeProvider, etc.
│   ├── layout/
│   │   ├── Sidebar.tsx              # left nav (module switcher)
│   │   ├── Topbar.tsx               # user menu, search, notifications
│   │   └── AppShell.tsx
│   ├── lib/
│   │   ├── axios.ts                 # single configured axios instance
│   │   ├── queryClient.ts
│   │   └── utils.ts
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   ├── LoginPage.tsx
│   │   └── ProtectedRoute.tsx
│   ├── store/
│   │   └── useAppStore.ts           # Zustand: selectedVendor, selectedCustomer, etc.
│   ├── components/ui/               # shadcn/ui generated primitives
│   ├── components/shared/
│   │   ├── DataTable.tsx            # generic TanStack Table wrapper
│   │   ├── FormModal.tsx
│   │   ├── PageHeader.tsx
│   │   ├── StatCard.tsx
│   │   └── ConfirmDialog.tsx
│   ├── modules/                     # ⭐ one folder per page/module below
│   │   ├── inventory/
│   │   ├── vendor/
│   │   ├── customer/
│   │   ├── items/
│   │   ├── sales-order/
│   │   ├── invoice/
│   │   ├── schemes/
│   │   ├── credit-note/
│   │   ├── debit-notes/
│   │   ├── supply-chain/
│   │   ├── loan/
│   │   ├── assets/
│   │   ├── cheque-management/
│   │   ├── transactions/
│   │   ├── payment-settlement/
│   │   ├── gst/
│   │   ├── reports/
│   │   ├── hr/
│   │   ├── incentives/
│   │   ├── migration-setup/
│   │   ├── settings/
│   │   └── letterhead-editor/
│   │       each module/xxx/ contains:
│   │         ├── XxxPage.tsx
│   │         ├── api.ts             # all endpoint calls for this module
│   │         ├── hooks.ts           # useQuery/useMutation wrappers
│   │         ├── components/        # tables, modals, forms specific to module
│   │         └── types.ts
│   ├── types/                       # shared/global types (Product, Customer, Vendor…)
│   └── main.tsx
├── .env.example
├── tailwind.config.ts
├── vite.config.ts
├── package.json
└── README.md
```

---

## 5. Design System — "Beautiful Modern" Direction

Give the sidebar/topbar shell one consistent identity, then let each module use it.

- **Style:** clean SaaS-dashboard aesthetic (think Linear / Vercel dashboard / Stripe dashboard) — generous whitespace, soft shadows, rounded-xl cards, no heavy borders.
- **Layout:** persistent left sidebar (collapsible) grouping the 24 modules into logical sections:
  - **Sell:** Sales Order, Invoice, Schemes, Credit Note
  - **Buy:** Inventory (POs/GRNs), Vendor, Debit Notes
  - **Stock:** Items, Supply Chain Management
  - **Finance:** Transactions, Loan, Cheque Management, Payment Settlement, GST, Reports
  - **People:** Customer, HR, Incentives
  - **Admin:** Settings, Migration Setup, Letterhead Editor
- **Color system:** one primary brand color + neutral gray scale (Tailwind `slate`), semantic colors for status (green=paid/success, amber=pending, red=overdue/error, blue=info). Support light + dark mode via CSS variables (shadcn's default token approach).
- **Typography:** `Inter` or `Geist` for UI text; tabular numerals for all financial figures/tables.
- **Data tables:** sticky header, zebra-free flat rows, right-aligned numeric columns, inline row actions via icon buttons, skeleton loading states (not spinners) while TanStack Query fetches.
- **Modals/Drawers:** use side-drawers (not center modals) for "create/edit" forms with many fields (Vendor, Customer, PO, GRN) — center modals only for short confirmations. This is a deliberate upgrade over the current all-modal Appsmith pattern.
- **Dashboards (Reports, Incentives, GST):** card-based KPI stat tiles at top, charts below, exportable tables at the bottom.
- **Empty/loading/error states:** every table and chart must have a designed empty state and error state, not a blank screen.

---

## 6. Authentication

**Important finding:** the current Appsmith export has **no wired authentication** — there is a Login page (username + password inputs) but no corresponding API call was found in the exported action list, and no API request anywhere sends an `Authorization` header. This likely means auth is either (a) not yet implemented in the backend, (b) handled at the network/infra level (e.g. VPN, IP allowlist), or (c) was wired via a mechanism not captured in this export.

**Action required from developer before building the login screen:** confirm with whoever owns `distribution-erp.onrender.com` what the actual auth endpoint and token mechanism is.

**Recommended implementation (once confirmed), standard JWT pattern:**
1. `POST /api/auth/login` (or actual path) with `{ email, password }` → returns `{ token, user }`.
2. Store token in memory + `localStorage` (or httpOnly cookie if backend supports it).
3. Axios request interceptor attaches `Authorization: Bearer <token>` to every call.
4. Axios response interceptor catches `401` → clears session → redirects to `/login`.
5. `ProtectedRoute` wrapper guards all module routes; unauthenticated users only see `/login`.
6. `/api/employees/profile` (already used everywhere in the current app) is likely the "who am I" endpoint — use it to populate the logged-in user's name/role in the Topbar after login.

---

## 7. Open Items to Confirm With Backend Owner Before/During Build

These aren't blockers to starting the build, but must be resolved before those specific screens go live:
- Real login/auth endpoint + token format (see §6).
- Two endpoints appear with a **malformed double-slash** in their path in the current export — confirm correct path with backend:
  - `GET //api/customers/{id}/pending-bills`
  - `PUT //api/customers/{id}`
  - `POST //api/employees/{id}/resign`
  - `GET //api/entities/income/{id}/ledger`
  - `GET //api/delivery/trips/{trip_id}/picklist-web`
- Pagination: most `GET` list endpoints show `paginationType: NONE` in the export — confirm whether large lists (products, customers, sales) are paginated server-side or if the frontend must implement client-side pagination/virtualization for performance.
- File uploads: `Migration Setup`, `Items` (bulk import), `Settings` (backups), and `Reports` (bank statement upload) all POST files — confirm expected `multipart/form-data` field names.

---

## 8. Full Module → Endpoint Map

This is the authoritative API contract, extracted directly from the existing app. Each module below should get its own `api.ts` file in `src/modules/<module>/` containing one typed function per endpoint.

> Legend: `{param}` = a dynamic ID (row id, selected entity id, etc.) that the frontend must supply from selected state.

### 8.1 Inventory (Purchasing: POs, GRNs, Vendors linkage)
```
GET  /api/vendors
GET  /api/products
GET  /api/products/template-data
GET  /api/purchase-orders
GET  /api/purchase-orders/{id}
GET  /api/purchase-invoices                       (GRNs)
GET  /api/master/brands
GET  /api/master/categories
GET  /api/master/hsn
GET  /api/master/taxes
GET  /api/master/vendor-addresses
GET  /api/master/banks
GET  /api/bank-accounts
GET  /api/documents/next/PO                        (next PO number)
GET  /api/stock/adjust/batches/{product_id}
GET  /api/vendor-payments/ledger/{vendor_id}
GET  /api/vendors/{vendor_id}/addresses
GET  /api/debit-notes/vendor/{vendor_id}
GET  /api/debit-notes/{id}/items
GET  /api/finance/reconciliation/bank/unconsumed-debits
GET  /api/employees/profile
POST /api/purchase-orders                          (create PO)
PUT  /api/purchase-orders/{id}                      (edit PO)
POST /api/purchase-invoices                         (create GRN from PO)
POST /api/purchase-invoices/{id}/reverse            (reverse GRN)
```
**Core screens:** PO list → PO create/edit drawer → convert PO to GRN → GRN list/summary → stock adjustment.

### 8.2 Vendor
```
GET  /api/vendors
GET  /api/vendors/{id}
GET  /api/vendors/{id}/addresses
GET  /api/master/vendor-addresses
GET  /api/master/banks
GET  /api/bank-accounts
GET  /api/purchase-invoices
GET  /api/purchase-invoices/aging
GET  /api/vendor-payments/history/{vendor_id}
GET  /api/vendor-payments/ledger/{vendor_id}
GET  /api/vendor-payments/{id}/slip-details
GET  /api/documents/all-sequences
GET  /api/debit-notes/vendor/{vendor_id}
GET  /api/debit-notes/{id}/items
GET  /api/finance/reconciliation/bank/unconsumed-debits
POST /api/vendors                                   (create vendor)
PUT  /api/vendors/{id}                               (edit vendor)
POST /api/vendors/{id}/addresses                     (add address)
POST /api/vendor-payments                            (record payment)
```
**Core screens:** Vendor directory (table) → Vendor profile (tabs: Details / Ledger / Payments / Aging) → Payment slip.

### 8.3 Items (Product Catalog & Stock Adjustments)
```
GET  /api/products
GET  /api/products/template-data
GET  /api/products/{id}/batches
GET  /api/master/brands
GET  /api/master/categories
GET  /api/master/hsn
GET  /api/master/taxes
GET  /api/stock/adjust
GET  /api/stock/adjust/batches/{product_id}
GET  /api/inventory/ledger/{product_id}
GET  /api/analytics/products/{id}/profile
GET  /api/analytics/brands/{brand_id}/history
GET  /api/employees/profile
POST /api/products                                   (create product)
PUT  /api/products/{id}
PUT  /api/products/batches/{id}
POST /api/products/bulk-status
POST /api/products/bulk-update
POST /api/products/import                            (bulk import — file upload)
POST /api/stock/adjust                                (record stock adjustment)
DELETE /api/stock/adjust/{id}
```
**Core screens:** Product catalog (table, bulk-edit) → Product profile drawer (batches/ledger/analytics) → Stock adjustment log → Bulk import wizard.

### 8.4 Sales Order
```
GET  /api/products
GET  /api/sales-orders
POST /api/sales/bulk-invoice-generate                (convert order(s) → invoice(s))
```
**Core screens:** Sales order list, bulk "generate invoices" action.

### 8.5 Invoice
```
GET  /api/sales/unified                               (invoice list, unified view)
GET  /api/sales/unified/{id}
GET  /api/sales/bank-details/3
POST /api/sales/invoices/regenerate
POST /api/sales/invoices/{id}/unlock-for-edit
PUT  /api/sales/orders/{order_id}
```
**Core screens:** Invoice list → invoice detail/preview → edit (unlock) → regenerate/PDF.

### 8.6 Schemes (Pricing & Promotions)
```
GET  /api/schemes
GET  /api/schemes/{id}/usage
GET  /api/categories
GET  /api/customers
GET  /api/products
GET  /api/products/brands
GET  /api/sales/bank-details/3
GET  /api/sales/invoices/lines-bulk
GET  /api/sales/unified/{id}
POST /api/schemes                                     (create scheme)
PUT  /api/schemes/{id}
PATCH /api/schemes/{id}/toggle                         (enable/disable)
```
**Core screens:** Scheme list (toggle active/inactive) → scheme builder (combo/price-slab logic) → usage report.

### 8.7 Credit Note
```
GET  /api/sales-returns
GET  /api/sales/returns
GET  /api/customers
GET  /api/products
GET  /api/products/batches
GET  /api/customers/{id}/pending-bills                 (fix double-slash, see §7)
POST /api/sales/returns/manual                          (create credit note)
DELETE /api/sales-returns/{id}
```
**Core screens:** Credit note list → create manual return → link to pending bill.

### 8.8 Debit Notes
```
GET  /api/debit-notes
GET  /api/debit-notes/{id}/items
GET  /api/vendors
GET  /api/products
GET  /api/products/batches
GET  /api/purchase-invoices
GET  /api/documents/all-sequences
GET  /api/stock/adjust/batches/{product_id}
GET  /api/employees/profile
POST /api/debit-notes                                    (create)
POST /api/debit-notes/{id}/convert
POST /api/debit-notes/{id}/reverse
```
**Core screens:** Debit note list → create/convert/reverse actions.

### 8.9 Supply Chain Management (Delivery / Trips)
```
GET  /api/delivery/trips
GET  /api/delivery/trips/{id}/manifest-web
GET  /api/delivery/trips/{id}/picklist-web              (fix double-slash on one variant, see §7)
GET  /api/delivery/trips/{id}/product-breakdown
GET  /api/delivery/invoices-pool
GET  /api/delivery/invoices/{invoice_id}/delivery-cycle
GET  /api/delivery/teams
GET  /api/delivery/sync-logs
GET  /api/delivery/sync-logs/history
GET  /api/delivery/sync/{id}/details
GET  /api/delivery/sync/{id}/history
GET  /api/sales/unified
GET  /api/sales/unified/{id}
GET  /api/sales/bank-details/3
GET  /api/employees/profile
POST /api/delivery/trips                                  (create trip)
PUT  /api/delivery/trips/{id}
DELETE /api/delivery/trips/{id}
POST /api/delivery/mark-self-collected
POST /api/delivery/verify/settle
```
**Core screens:** Trip planner/list → trip detail (manifest, picklist, product breakdown) → delivery verification/settlement → sync logs/history.

### 8.10 Loan
```
GET  /api/finance/loans
GET  /api/finance/loans/{id}/ledger
GET  /api/loan-entities
GET  /api/loan-entities/{id}/ledger
GET  /api/employees
GET  /api/bank-accounts
GET  /api/finance/reconciliation/bank/unconsumed-credits
GET  /api/finance/reconciliation/bank/unconsumed-debits
GET  /api/employees/profile
POST /api/finance/loans                                   (issue loan)
POST /api/finance/loans/{id}/installment                  (record repayment)
POST /api/loan-entities                                    (create loan entity/party)
DELETE /api/finance/loans/{id}
DELETE /api/finance/loans/transactions/{id}
```
**Core screens:** Loan list → loan ledger → record installment → loan entities management.

### 8.11 Assets
```
GET  /api/assets
GET  /api/assets/accounts
GET  /api/assets/categories
GET  /api/assets/depreciations
GET  /api/asset-entities
GET  /api/asset-entities/{id}/ledger
GET  /api/bank-accounts
GET  /api/master/banks
GET  /api/finance/reconciliation/bank/unconsumed-credits
GET  /api/finance/reconciliation/bank/unconsumed-debits
GET  /api/employees/profile
POST /api/assets                                            (register asset)
POST /api/asset-entities
POST /api/assets/payment
POST /api/assets/auto-depreciate
POST /api/assets/{id}/sale
POST /api/assets/{id}/sale-payment
```
**Core screens:** Asset register → depreciation schedule → asset sale flow → asset ledger.

### 8.12 Cheque Management
```
GET  /api/finance/cheques
GET  /api/bank-accounts
GET  /api/finance/reconciliation/bank/unconsumed-credits
GET  /api/finance/reconciliation/bank/unconsumed-debits
GET  /api/employees/profile
POST /api/finance/cheques/bulk-clear
POST /api/finance/cheques/{id}/bounce
POST /api/finance/cheques/{id}/unclear
```
**Core screens:** Cheque register with status filters → bulk clear action → bounce/unclear actions.

### 8.13 Transactions (Expenses, Other Income, Internal Transfers)
```
GET  /api/finance/expenses
GET  /api/finance/expenses/categories
GET  /api/finance/other-income
GET  /api/finance/other-income/categories
GET  /api/finance/transfers
GET  /api/entities/expense
GET  /api/entities/expense/{id}/ledger
GET  /api/entities/income
GET  /api/entities/income/{id}/ledger                       (fix double-slash, see §7)
GET  /api/bank-accounts
GET  /api/master/banks
GET  /api/finance/reconciliation/bank/unconsumed-credits
GET  /api/finance/reconciliation/bank/unconsumed-debits
GET  /api/employees/profile
POST /api/finance/expenses
POST /api/finance/other-income
POST /api/finance/transfers
POST /api/entities/expense
POST /api/entities/income
DELETE /api/finance/expenses/{id}
DELETE /api/finance/other-income/{id}
DELETE /api/finance/transfers/{id}
```
**Core screens:** Tabbed view — Expenses / Other Income / Transfers — each with entity ledgers.

### 8.14 Payment Settlement (DSE/Collections Reconciliation)
```
GET  /api/finance/reconciliation/list
GET  /api/finance/reconciliation/{report_id}/details
GET  /api/finance/reconciliation/expenses
GET  /api/finance/reconciliation/bank/unconsumed-credits
GET  /api/employees/profile
POST /api/finance/reconciliation/bulk-update
POST /api/finance/reconciliation/expenses/{id}/process
```
**Core screens:** Pending settlements list → settlement detail/reconcile → bulk update.

### 8.15 GST
```
GET  /api/finance/gst/gstr1
GET  /api/finance/gst/gstr3b
GET  /api/finance/gst/hsn-summary
```
**Core screens:** Three report tabs (GSTR-1, GSTR-3B, HSN Summary) with date-range filter + export.

### 8.16 Reports (largest module — analytics & finance reporting hub)
```
GET  /api/analytics/reports/balance-sheet
GET  /api/analytics/reports/p-and-l
GET  /api/analytics/reports/cash-flow
GET  /api/analytics/reports/fy-operating-balances
GET  /api/analytics/reports/integrity-audit
GET  /api/analytics/reports/sales-lines
GET  /api/analytics/reports/sales-summary-detailed
GET  /api/analytics/sales-fy-report
GET  /api/analytics/employees/{id}/dashboard
GET  /api/accounting/cash-flow
GET  /api/accounting/forensic-snapshot
GET  /api/accounting/source-transactions
GET  /api/accounting/unified-liquid-ledger
GET  /api/general-ledger
GET  /api/journal-entries
GET  /api/finance/reconciliation/bank/list
GET  /api/finance/reconciliation/bank/audit-view
GET  /api/payments/allocations
GET  /api/payments/dse-pending-invoices
GET  /api/purchase-invoices/lines
GET  /api/sales/invoice-lines
GET  /api/employees/attendance/details
GET  /api/employees/salary-payment-headers
GET  /api/employees/salary-payment-details/{id}
GET  /api/migration/opening-capital
GET  /api/customers
GET  /api/vendors
GET  /api/employees
GET  /api/products
GET  /api/master/brands
GET  /api/bank-accounts
GET  /api/employees/profile
POST /api/finance/reconciliation/bank/upload             (bank statement upload)
```
**Core screens:** Report hub with a left-hand list of report categories (Financial Statements, Ledgers, Sales, Payroll, Reconciliation, Audit) — each opens a filterable table/chart with PDF/Excel export.

### 8.17 HR
```
GET  /api/employees
GET  /api/employees/profile
GET  /api/employees/profile/{id}
GET  /api/employees/designations
GET  /api/employees/advances
GET  /api/employees/salary-preview
GET  /api/employees/{id}/attendance
GET  /api/employees/{id}/salary-history
GET  /api/bank-accounts
GET  /api/master/banks
GET  /api/finance/reconciliation/bank/unconsumed-debits
GET  /api/sales/invoices/lookup
POST /api/employees                                        (create employee)
POST /api/employees/bulk-attendance
POST /api/employees/bulk-bonus
POST /api/employees/bulk-salary-advance
POST /api/employees/bulk-salary-payment
POST /api/employees/bulk-salary-update
POST /api/employees/liabilities
POST /api/employees/{id}/salary-update
POST /api/employees/{id}/resign                             (fix double-slash, see §7)
DELETE /api/employees/advances/{id}
```
**Core screens:** Employee directory → profile (attendance/salary history/advances) → bulk payroll actions (attendance, bonus, advance, salary payment/update) → resignation flow.

### 8.18 Incentives
```
GET  /api/finance/loans
GET  /api/finance/reconciliation/bank/list
GET  /api/products
GET  /api/targets/plans
```
**Core screens:** Incentive/target plans dashboard.

### 8.19 Migration Setup (one-time data import tools)
```
POST /api/migration/customers
POST /api/migration/vendors
POST /api/migration/customer-advances
POST /api/migration/vendor-advances
POST /api/migration/loans
POST /api/migration/opening-stock
POST /api/migration/outstanding-bills
POST /api/migration/outstanding-invoices
```
**Core screens:** A simple set of upload/import cards, one per data type — admin-only.

### 8.20 Settings
```
GET  /api/backups/list
POST /api/backups/trigger
POST /api/dse/eod-sync
```
**Core screens:** Backup history + trigger backup, end-of-day sync trigger, (theme/appearance settings live client-side only).

### 8.21 Letterhead Editor
```
GET  /api/letters
POST /api/letters/send
```
**Core screens:** Rich-text letter composer with letterhead template + send action.

### 8.22 Cross-cutting / shared endpoints
Used across many modules — build one shared `api/common.ts`:
```
GET /api/employees/profile        (current user — used almost everywhere)
GET /api/master/banks
GET /api/bank-accounts
GET /api/master/brands
GET /api/master/categories
GET /api/master/hsn
GET /api/master/taxes
GET /api/customers
GET /api/vendors
GET /api/products
```

---

## 9. Suggested Build Order (Phases)

Ship in vertical slices, not "all tables then all forms" — each phase should be independently demoable and pushed to GitHub as its own PR/milestone.

1. **Phase 0 — Foundation:** repo scaffold, Tailwind + shadcn setup, routing shell, Axios instance, auth flow (pending §7 confirmation), Sidebar/Topbar layout, generic `DataTable` and `FormModal` shared components.
2. **Phase 1 — Master data & catalog:** Items, Vendor, Customer (these unlock everything else since most modules reference vendors/customers/products).
3. **Phase 2 — Purchasing loop:** Inventory (PO → GRN), Debit Notes.
4. **Phase 3 — Sales loop:** Sales Order, Invoice, Schemes, Credit Note.
5. **Phase 4 — Operations:** Supply Chain Management (delivery/trips).
6. **Phase 5 — Finance core:** Transactions, Loan, Assets, Cheque Management, Payment Settlement.
7. **Phase 6 — Compliance & reporting:** GST, Reports (build incrementally — this module is the largest).
8. **Phase 7 — People:** HR, Incentives.
9. **Phase 8 — Admin/tail:** Settings, Migration Setup, Letterhead Editor.
10. **Phase 9 — Polish:** dark mode, responsive/tablet pass, empty/error states audit, PDF template QA, performance pass on large tables.

---

## 10. Environment & Deployment

`.env.example`:
```
VITE_API_BASE_URL=https://distribution-erp.onrender.com
VITE_APP_NAME=GNIDERTON ERP
```

- All API calls go through `src/lib/axios.ts`, which reads `VITE_API_BASE_URL` — never hardcode the URL elsewhere.
- Deploy as a static SPA (Vercel/Netlify). Set the same env var in the hosting dashboard for production.
- GitHub Actions CI (`.github/workflows/ci.yml`): run `npm run typecheck`, `npm run lint`, `npm run build` on every PR to `main`.
- Recommended branch strategy: `main` (production) ← `develop` ← feature branches per phase/module above.

---

## 11. Definition of Done (per module)

A module is "done" when it has:
- [ ] List/table view wired to real API data, with loading skeleton + empty state + error state
- [ ] Create/Edit flows wired to their POST/PUT endpoints with validation (Zod schema matching backend expectations)
- [ ] Delete/destructive actions behind a confirmation dialog
- [ ] All dynamic-ID endpoints correctly wired to the selected row/entity in state
- [ ] Responsive down to tablet width (1024px)
- [ ] No hardcoded data — everything comes from the API layer

---

*This document was generated from a full extraction of the existing Appsmith application (24 pages, 545 wired actions, 221 unique API endpoints, 119 JS logic modules) so that no functionality is lost in the rebuild.*
