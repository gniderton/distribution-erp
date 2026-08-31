import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface User {
  id: string
  employee_code: string
  name: string
  role: string
}

export interface Customer {
  id: string
  customer_code: string
  customer_name: string
  balance_amount: number
  [key: string]: any
}

export interface Product {
  id: string
  product_name: string
  [key: string]: any
}

export interface Brand {
  id: string
  brand_name: string
  [key: string]: any
}

export interface Scheme {
  id: string
  [key: string]: any
}

export interface PendingOrder {
  tempId: number
  offline_no: string
  customer_id: string
  customer_name: string
  dse_id: string
  order_date: string
  items: any[]
}

export interface PendingPayment {
  uid: string
  dse_id: string | number
  customer_id: string
  customer_name: string
  amount: number
  mode: string
  invoice_no: string
  cheque_no?: string
  cheque_date?: string
  bank_name?: string
  deposit_bank?: string
  ai_confidence?: number
  timestamp: string
}

export interface Expense {
  id: number
  type: string
  amount: number
  desc: string
}

export interface Denominations {
  note_500: number
  note_200: number
  note_100: number
  note_50: number
  note_20: number
  note_10: number
  coins: number
}

export interface SelectedInvoice {
  id: string
  invoice_number: string
  balance_amount: number
  grand_total?: number
}

const DEFAULT_DENOMS: Denominations = {
  note_500: 0, note_200: 0, note_100: 0,
  note_50: 0, note_20: 0, note_10: 0, coins: 0,
}

export type ThemeType = 'light' | 'dark' | 'glass';

interface AppState {
  currentUser: User | null
  selectedCustomer: Customer | null
  cart: Record<string, number>
  brandFilter: Brand | null
  selectedInvoice: SelectedInvoice | null
  products: Product[]
  brands: Brand[]
  schemes: Scheme[]
  pendingOrders: PendingOrder[]
  pendingPayments: PendingPayment[]
  expenses: Expense[]
  denominations: Denominations
  eodCheques: Record<string, string>
  activeTheme: ThemeType
  lastClearTimestamp: number | null

  // Actions
  setUser: (user: User | null) => void
  setSelectedCustomer: (customer: Customer | null) => void
  setCartItem: (productId: string, qty: number) => void
  setCart: (cart: Record<string, number>) => void
  clearCart: () => void
  setBrandFilter: (brand: Brand | null) => void
  setSelectedInvoice: (invoice: SelectedInvoice | null) => void
  setProducts: (products: Product[]) => void
  setBrands: (brands: Brand[]) => void
  setSchemes: (schemes: Scheme[]) => void
  addOrder: (order: PendingOrder) => void
  removeOrder: (tempId: number) => void
  addPayment: (payment: PendingPayment) => void
  removePayment: (uid: string) => void
  addExpense: (expense: Expense) => void
  removeExpense: (id: number) => void
  setDenom: (key: keyof Denominations, value: number) => void
  setEodCheque: (key: string, value: string) => void
  setActiveTheme: (theme: ThemeType) => void
  checkAndAutoClear: () => void
  resetEod: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      selectedCustomer: null,
      cart: {},
      brandFilter: null,
      selectedInvoice: null,
      products: [],
      brands: [],
      schemes: [],
      pendingOrders: [],
      pendingPayments: [],
      expenses: [],
      denominations: DEFAULT_DENOMS,
      eodCheques: {},
      activeTheme: 'light',
      lastClearTimestamp: null,

      setUser: (user) => set({ currentUser: user }),
      setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
      
      setCartItem: (productId, qty) => set((state) => {
        const next = { ...state.cart }
        if (qty <= 0) delete next[productId]
        else next[productId] = qty
        return { cart: next }
      }),
      setCart: (cart) => set({ cart }),
      clearCart: () => set({ cart: {} }),
      
      setBrandFilter: (brand) => set({ brandFilter: brand }),
      setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice }),
      
      setProducts: (products) => set({ products }),
      setBrands: (brands) => set({ brands }),
      setSchemes: (schemes) => set({ schemes }),
      
      addOrder: (order) => set((state) => ({ pendingOrders: [...state.pendingOrders, order], cart: {} })),
      removeOrder: (tempId) => set((state) => ({ pendingOrders: state.pendingOrders.filter(o => o.tempId !== tempId) })),
      
      addPayment: (payment) => set((state) => ({ pendingPayments: [...state.pendingPayments, payment] })),
      removePayment: (uid) => set((state) => ({ pendingPayments: state.pendingPayments.filter(p => p.uid !== uid) })),
      
      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      removeExpense: (id) => set((state) => ({ expenses: state.expenses.filter(e => e.id !== id) }) ),
      
      setDenom: (key, value) => set((state) => ({ denominations: { ...state.denominations, [key]: value } })),
      setEodCheque: (key, value) => set((state) => ({ eodCheques: { ...state.eodCheques, [key]: value } })),
      setActiveTheme: (theme) => set({ activeTheme: theme }),
      
      checkAndAutoClear: () => {
        const state = get();
        const now = new Date();
        const currentHour = now.getHours();
        
        // Only trigger auto-clear if it's 8 AM or later
        if (currentHour >= 8) {
          const today8AM = new Date();
          today8AM.setHours(8, 0, 0, 0);
          
          const lastClear = state.lastClearTimestamp || 0;
          
          // If we haven't cleared since 8 AM today, wipe memory
          if (lastClear < today8AM.getTime()) {
            state.resetEod();
            set({ lastClearTimestamp: Date.now() });
          }
        }
      },

      resetEod: () => set({
        cart: {},
        pendingOrders: [],
        pendingPayments: [],
        expenses: [],
        denominations: DEFAULT_DENOMS,
        eodCheques: {},
        lastClearTimestamp: Date.now()
      })
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pendingOrders: state.pendingOrders,
        pendingPayments: state.pendingPayments,
        expenses: state.expenses,
        denominations: state.denominations,
        eodCheques: state.eodCheques,
        activeTheme: state.activeTheme,
        lastClearTimestamp: state.lastClearTimestamp
      }),
    }
  )
)
