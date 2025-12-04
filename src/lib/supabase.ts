import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl,
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'flatfund-pro-web',
    },
  },
});

export interface Apartment {
  id: string;
  apartment_name: string;
  city?: string;
  country?: string;
  status: 'active' | 'inactive';
  public_access_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuildingBlockPhase {
  id: string;
  apartment_id: string;
  block_name: string;
  type: 'Block' | 'Building' | 'Phase' | 'Tower' | 'Wing';
  created_at: string;
}

export interface FlatNumber {
  id: string;
  block_id: string;
  flat_number: string;
  created_at: string;
}

export interface Admin {
  id: string;
  user_id: string | null;
  apartment_id: string;
  admin_name: string;
  admin_email: string;
  phone: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  apartment?: Apartment;
}

export interface SuperAdmin {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface PaymentSubmission {
  id?: string;
  apartment_id: string;
  name: string;
  block_id: string;
  flat_id: string;
  email: string;
  contact_number?: string;
  payment_amount?: number;
  payment_date?: string;
  transaction_reference?: string;
  payment_quarter?: string;
  comments?: string;
  screenshot_url: string;
  screenshot_filename: string;
  status?: 'Received' | 'Reviewed' | 'Approved';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  payer_name?: string;
  payee_name?: string;
  bank_name?: string;
  currency?: string;
  platform?: string;
  payment_type?: string;
  sender_upi_id?: string;
  receiver_account?: string;
  ifsc_code?: string;
  narration?: string;
  screenshot_source?: string;
  other_text?: string;
  expected_collection_id?: string | null;
}

export interface ExpectedCollection {
  id: string;
  apartment_id: string;
  payment_type: 'maintenance' | 'contingency' | 'emergency';
  financial_year: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  quarter_basis?: 'financial' | 'yearly';
  due_date: string;
  amount_due: number;
  daily_fine: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
export interface AuditLog {
  id?: string;
  user_id?: string;
  user_email?: string;
  action: string;
  table_name: string;
  record_id?: string;
  details?: Record<string, unknown>;
  created_at?: string;
}
