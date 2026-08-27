# Assets Module Implementation Plan

This plan outlines the architecture and components required to build the new Assets Management page in the GNIDERTON ERP web application, based on the original Appsmith "Assets" page, augmented with advanced enterprise features.

## User Review Required

> [!IMPORTANT]
> Please review this plan. The Assets module consists of two main tabs: Asset Register and Asset Categories (Entities). We will implement all the lifecycle actions for an asset (Purchase, Pay, Depreciate, Sell, Scrap, Receive Payment, Assign Custody, and Document Storage).

## Proposed Changes

### 1. API Integration (`src/modules/assets/api.ts`)
Create a new API service file to communicate with the backend routes.

#### [NEW] `src/modules/assets/api.ts`
- `getAssets()`: Fetch list of all assets.
- `createAsset(data)`: Purchase a new asset.
- `makeAssetPayment(assetId, data)`: Record a payment made to the vendor for an asset purchase.
- `sellAsset(assetId, data)`: Record the sale of an asset.
- `receiveAssetPayment(assetId, data)`: Record a payment received from a customer for a sold asset.
- `scrapAsset(assetId, data)`: **[NEW]** Write-off or scrap an asset.
- `assignAsset(assetId, data)`: **[NEW]** Assign an asset to an employee/branch (Custody tracking).
- `addMaintenanceLog(assetId, data)`: **[NEW]** Add a maintenance record or warranty claim.
- `getAssetLedger(assetId)`: Fetch the transaction ledger for a specific asset.
- `runDepreciation(date)`: Trigger the month-end depreciation calculation.
- `getAssetEntities()`: Fetch asset categories/classes.
- `createAssetEntity(data)` / `updateAssetEntity(id, data)`: Manage asset categories.

### 2. Document Storage Strategy (Phase 2 / Coming Soon)
> [!NOTE]
> **Storage Approach (Future Plan):** We are designing the UI for Document Attachments (Purchase Invoices, Warranty Certificates, Insurance Policies, and Photos) on the Asset Profile. However, the actual backend upload and storage logic is deferred to a future phase. The UI will show a "Coming Soon" placeholder. When we build this, we plan to use **Supabase Storage** (since the Postgres DB is already on Supabase) to store files securely in a bucket (e.g., `asset-docs`) and save the public URLs in a new `asset_documents` table.

### 3. Database Schema Updates (Backend)
We will need to add a few tables to support the new features:
- `asset_assignments`: Tracks who has custody of the asset.
- `asset_maintenance`: Tracks repair costs, service dates, and warranty info.
- `asset_documents`: (Deferred to Phase 2) Will track uploaded files.

### 4. Main Page Layout (`src/modules/assets/AssetsPage.tsx`)
Create the main page wrapper containing the navigation header and tabs.

#### [NEW] `src/modules/assets/AssetsPage.tsx`
- **Tabs**: 
  - `Asset Register`: The primary list of assets.
  - `Asset Categories`: Management of asset entities (e.g., Vehicles, Electronics).

### 5. Asset Register Component (`src/modules/assets/components/AssetRegister.tsx`)
The primary data table for managing assets.

#### [NEW] `src/modules/assets/components/AssetRegister.tsx`
- **Top Actions**:
  - `Purchase Asset` button: Opens a modal to register a new asset purchase.
  - `Run Depreciation` button: Opens a modal to select a month-end date and run the depreciation engine.
- **Data Table**:
  - Columns: Asset Name, Category, Status, Custodian **[NEW]**, Purchase Date, Purchase Amount, Current Value, Acc. Depreciation, Vendor, Customer, Payable, Receivable.
  - Row Actions (conditionally rendered):
    - `Ledger`: View the financial ledger for the asset.
    - `Profile`: **[NEW]** View the full asset profile (Maintenance logs, Assignments, and future Documents).
    - `Make Payment`: Visible if `purchase_balance_payable > 0`.
    - `Sell Asset`: Visible if `status === "Active"`.
    - `Scrap Asset`: **[NEW]** Visible if `status === "Active"`.
    - `Receive Payment`: Visible if `status === "Sold"` and `sale_balance_receivable > 0`.

### 6. Asset Profile Drawer (`src/modules/assets/components/AssetProfileDrawer.tsx`)
#### [NEW] `src/modules/assets/components/AssetProfileDrawer.tsx`
A slide-out drawer that shows the complete history of a single asset.
- **Custody Tab**: History of assignments and button to "Assign to Employee/Branch".
- **Maintenance Tab**: Log of repairs and warranty details.
- **Documents Tab**: Displays a "Coming Soon" placeholder UI with a disabled upload area, acting as a structural placeholder for the Phase 2 document upload feature.

### 7. Asset Modals (`src/modules/assets/components/modals/*`)
#### [NEW] `src/modules/assets/components/modals/PurchaseAssetModal.tsx`
#### [NEW] `src/modules/assets/components/modals/AssetPaymentModal.tsx`
#### [NEW] `src/modules/assets/components/modals/SellAssetModal.tsx`
#### [NEW] `src/modules/assets/components/modals/AssetSalePaymentModal.tsx`
#### [NEW] `src/modules/assets/components/modals/ScrapAssetModal.tsx` **[NEW]**
#### [NEW] `src/modules/assets/components/modals/DepreciationModal.tsx`
#### [NEW] `src/modules/assets/components/modals/AssetLedgerModal.tsx`

### 8. Asset Categories Component (`src/modules/assets/components/AssetCategories.tsx`)
Manages the asset entities/classes.

#### [NEW] `src/modules/assets/components/AssetCategories.tsx`
- **Top Actions**: `New Category` button.
- **Data Table**: Name, Depreciation Rate, Account References.
- **Modal**: Form to add or edit a category.

### 9. Routing Update (`src/App.tsx` & `src/components/layout/Sidebar.tsx`)
#### [MODIFY] `src/App.tsx`
- Add `<Route path="/assets" element={<AssetsPage />} />`
#### [MODIFY] `src/components/layout/Sidebar.tsx`
- Add "Assets" navigation item.

## Verification Plan

### Manual Verification
- Purchase a new Asset using the new category. Verify it appears in the register with "Active" status.
- **[NEW]** Open the Asset Profile, view the Documents tab, and verify the "Coming Soon" placeholder is present.
- **[NEW]** Add a maintenance record for $500.
- **[NEW]** Assign the asset to "Driver John Doe".
- Make a payment for the asset. Verify the payable balance drops.
- Run depreciation for a specific month. Verify the current value decreases.
- **[NEW]** Scrap a dummy asset and verify the status changes to "Scrapped".
- Sell the main asset. Verify the status changes to "Sold" and a receivable balance is created.
- Receive payment for the sold asset. Verify the receivable balance drops to 0.
