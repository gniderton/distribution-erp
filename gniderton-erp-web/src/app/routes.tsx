import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import LoginPage from '@/auth/LoginPage'

import VendorPage from '@/modules/vendor/VendorPage'
import ItemsPage from '@/modules/items/ItemsPage'
import CustomerPage from '@/modules/customer/CustomerPage'
import InvoicePage from '@/modules/invoice/InvoicePage'
import ReportsPage from '@/modules/reports/ReportsPage'

import InventoryPage from '@/modules/inventory/InventoryPage'
import DebitNotesPage from '@/modules/debit-notes/DebitNotesPage'
import SalesOrderPage from '@/modules/sales-order/SalesOrderPage'
import SchemesPage from '@/modules/schemes/SchemesPage'
import CreditNotePage from '@/modules/credit-note/CreditNotePage'
import SupplyChainPage from '@/modules/supply-chain/SupplyChainPage'
import { LoanPage } from '@/modules/loan/LoanPage'
import AssetsPage from '@/modules/assets/AssetsPage'
import ChequeManagementPage from '@/modules/cheque-management/ChequeManagementPage'
import TransactionsPage from '@/modules/transactions/TransactionsPage'
import PaymentSettlementPage from '@/modules/payment-settlement/PaymentSettlementPage'
import GstPage from '@/modules/gst/GstPage'
import HrPage from '@/modules/hr/HrPage'
import IncentivesPage from '@/modules/incentives/IncentivesPage'
import MigrationSetupPage from '@/modules/migration-setup/MigrationSetupPage'
import SettingsPage from '@/modules/settings/SettingsPage'
import LetterheadEditorPage from '@/modules/letterhead-editor/LetterheadEditorPage'
import ScratchpadPage from '@/modules/scratchpad/ScratchpadPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/invoice" replace />} />

          {/* Sell */}
          <Route path="/sales-order" element={<SalesOrderPage />} />
          <Route path="/invoice" element={<InvoicePage />} />
          <Route path="/schemes" element={<SchemesPage />} />
          <Route path="/credit-note" element={<CreditNotePage />} />

          {/* Buy */}
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/vendor" element={<VendorPage />} />
          <Route path="/debit-notes" element={<DebitNotesPage />} />

          {/* Stock */}
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/supply-chain" element={<SupplyChainPage />} />

          {/* Finance */}
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/loan" element={<LoanPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/cheque-management" element={<ChequeManagementPage />} />
          <Route path="/payment-settlement" element={<PaymentSettlementPage />} />
          <Route path="/gst" element={<GstPage />} />
          <Route path="/reports" element={<ReportsPage />} />

          {/* People */}
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/hr" element={<HrPage />} />
          <Route path="/incentives" element={<IncentivesPage />} />
          
          {/* Admin / Tools */}
          <Route path="/migration-setup" element={<MigrationSetupPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/letterhead" element={<LetterheadEditorPage />} />
          <Route path="/scratchpad" element={<ScratchpadPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
