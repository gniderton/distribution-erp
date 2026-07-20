# GNIDERTON ERP — Web Frontend

A standalone React frontend for the GNIDERTON ERP, replacing the previous Appsmith app. Talks directly to the existing backend at `https://distribution-erp.onrender.com` — no backend changes required to run this.

This repo implements the architecture described in **`GNIDERTON_ERP_Frontend_Build_Spec.md`** (included at the repo root — read it first). That document is the source of truth for the full API contract, module list, and design direction; this README is just the "how to run it" companion.

## Stack

React 18 + TypeScript + Vite · Tailwind CSS v4 · TanStack Query + TanStack Table · Zustand · React Hook Form + Zod · Recharts · Axios

## Getting started

```bash
npm install
cp .env.example .env    # already points at the live backend; edit if needed
npm run dev              # http://localhost:5173
```

```bash
npm run build             # type-check + production build → dist/
npm run preview           # preview the production build locally
npm run lint               # oxlint
```

## Project status

| Module | Status |
|---|---|
| Vendor, Items, Customer, Invoice, Reports | **Fully built** — real list/create/edit wired to live endpoints. Use these as the pattern for everything else. |
| Inventory, Debit Notes, Sales Order, Schemes, Credit Note, Supply Chain, Loan, Assets, Cheque Management, Transactions, Payment Settlement, GST, HR, Incentives, Settings, Letterhead Editor | **Scaffolded** — each has a complete, accurate `api.ts` (every real endpoint for that module, extracted directly from the source app) and a working read-only list page. Not yet wired to create/edit forms. |
| Migration Setup | UI shell only (upload cards) — file upload wiring pending backend field-name confirmation. |
| Auth (Login) | UI built, but posts to a **placeholder** `/api/auth/login` — the real auth endpoint was not present in the source app export. Confirm with the backend owner before relying on this (see Build Spec §6/§7). |

## Folder structure

```
src/
  app/            # router + providers
  auth/           # AuthContext, LoginPage, ProtectedRoute
  layout/         # Sidebar, Topbar, AppShell, nav config
  lib/            # axios instance, query client, utils
  store/          # Zustand global store
  components/
    ui/           # Button, Input, Badge, Drawer, Dialog, Skeleton
    shared/       # DataTable, AutoTable, PageHeader, StatCard, EmptyState, ConfirmDialog
  modules/        # one folder per business module — api.ts / hooks.ts / types.ts / <Module>Page.tsx
```

## Extending a scaffolded module

Every scaffolded module already has its full endpoint set typed in `api.ts`. To bring one up to the same level as Vendor/Items/Customer:

1. Copy the pattern from `src/modules/vendor/` (types.ts -> api.ts already exists -> hooks.ts -> components/XxxFormDrawer.tsx -> XxxPage.tsx).
2. Replace `AutoTable` with `DataTable` + explicit typed columns once you know the real field names from the live API response.
3. Add a `Drawer`-based create/edit form using `react-hook-form` + `zod`, following `VendorFormDrawer.tsx`.

## Known open items

See **Build Spec §7** for the full list — most importantly:
- Real auth endpoint needs confirming.
- A few source endpoints had a malformed double-slash in the original export; this repo's generated `api.ts` files already normalize `//` to `/`, but double-check against the live API docs if something 404s.
- Pagination behavior on large list endpoints (products, customers, sales) hasn't been confirmed server-side.

## Deploying

Static SPA — deploy `dist/` to Vercel or Netlify. Set `VITE_API_BASE_URL` in the hosting provider's environment variables to match `.env.example`.
