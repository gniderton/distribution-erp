export interface Cheque {
  id: number;
  cheque_number: string;
  cheque_date: string;
  amount: number | string;
  type: 'INCOMING' | 'OUTGOING';
  party_type: 'CUSTOMER' | 'VENDOR' | 'INCOME_ENTITY' | 'EXPENSE_ENTITY';
  party_id: number;
  party_name?: string;
  reference_type?: string;
  reference_id?: number;
  status: 'PENDING' | 'CLEARED' | 'BOUNCED';
  remarks?: string;
  clearance_date?: string;
  bank_account_id?: number;
  bank_statement_entry_id?: number;
  bank_id?: number;
  bank_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ChequeFilter {
  status?: string;
  type?: string;
  party_type?: string;
  start_date?: string;
  end_date?: string;
}

export interface ClearChequePayload {
  clearance_date?: string;
  bank_statement_entry_id: number;
  remarks?: string;
}

export interface BulkClearChequeMapping {
  cheque_id: number;
  bank_statement_entry_id: number;
}

export interface BulkClearChequePayload {
  mappings: BulkClearChequeMapping[];
  clearance_date?: string;
  bank_account_id?: number;
  remarks?: string;
}

export interface BounceChequePayload {
  bounce_date?: string;
  bounce_reason: string;
  bank_charges?: number;
  customer_penalty?: number;
  vendor_penalty?: number;
  deposit_entry_id?: number;
  bounce_entry_id?: number;
}

export interface GroupedCheque {
  id: string; // composite key
  cheque_number: string;
  cheque_date: string;
  amount: number;
  type: 'INCOMING' | 'OUTGOING';
  party_name?: string;
  bank_name?: string;
  status: 'PENDING' | 'CLEARED' | 'BOUNCED';
  underlyingCheques: Cheque[];
}
