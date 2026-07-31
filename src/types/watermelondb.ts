/**
 * WatermelonDB Record Types
 * Narrow types for WatermelonDB records instead of generic `any`
 */

export interface WatermelonJobRaw {
  id: string;
  artisan_id: string;
  client_id: string;
  customer_id?: string | null;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  priority?: string | null;
  estimated_cost?: number;
  material_cost: number;
  labor_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  notes?: string | null;
  client_notes?: string | null;
  artisan_notes?: string | null;
  images?: string | null;
  scheduled_date?: number | null;
  started_at?: number | null;
  completed_at?: number | null;
  due_date?: number | null;
  is_archived: boolean;
  archived_at?: number | null;
  sync_status: string;
  client_version: number;
  server_version: number;
  last_synced_at?: number | null;
  created_at: number;
  updated_at: number;
}

export interface WatermelonCustomerRaw {
  id: string;
  artisan_id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_archived: boolean;
  archived_at?: number | null;
  sync_status: string;
  client_version: number;
  server_version: number;
  last_synced_at?: number | null;
  created_at: number;
  updated_at: number;
}

export interface WatermelonInvoiceRaw {
  id: string;
  job_id: string;
  artisan_id: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  paid_status: string;
  notes?: string | null;
  payment_terms?: string | null;
  issued_at: number;
  due_date?: number | null;
  paid_at?: number | null;
  sync_status: string;
  client_version: number;
  server_version: number;
  last_synced_at?: number | null;
  created_at: number;
  updated_at: number;
}

export interface WatermelonPaymentRaw {
  id: string;
  invoice_id?: string | null;
  job_id?: string | null;
  artisan_id: string;
  amount: number;
  method: string;
  status: string;
  transaction_id?: string | null;
  receipt_number?: string | null;
  paystack_transfer_id?: string | null;
  proof_of_payment?: string | null;
  notes?: string | null;
  paid_at?: number | null;
  recorded_at: number;
  sync_status: string;
  client_version: number;
  server_version: number;
  last_synced_at?: number | null;
  created_at: number;
  updated_at: number;
}

export interface WatermelonRecord<T> {
  id: string;
  _raw: T;
  update: (fn: (raw: T) => void) => Promise<void>;
}
