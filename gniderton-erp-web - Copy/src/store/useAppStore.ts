import { create } from 'zustand'

/**
 * Global lightweight client state — the replacement for Appsmith's
 * `appsmith.store.*` pattern. Keep this store for cross-page selections
 * only (e.g. "which vendor is currently open"); everything else that comes
 * from the server belongs in TanStack Query, not here.
 */
interface AppState {
  selectedVendorId: string | null
  selectedCustomerId: string | null
  selectedInvoiceId: string | null
  sidebarCollapsed: boolean
  setSelectedVendorId: (id: string | null) => void
  setSelectedCustomerId: (id: string | null) => void
  setSelectedInvoiceId: (id: string | null) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedVendorId: null,
  selectedCustomerId: null,
  selectedInvoiceId: null,
  sidebarCollapsed: false,
  setSelectedVendorId: (id) => set({ selectedVendorId: id }),
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),
  setSelectedInvoiceId: (id) => set({ selectedInvoiceId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
