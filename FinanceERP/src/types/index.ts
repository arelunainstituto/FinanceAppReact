// Types for the ERP system entities

export interface Client {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  tax_id?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  status?: string;
  external_id?: string;
  rating?: number; // Client rating from 1 to 5 stars
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  client_id: string;
  contract_number?: string;
  description?: string;
  value?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  payment_frequency?: string;
  notes?: string;
  down_payment?: number;
  number_of_payments?: number;
  positive_balance?: number;
  negative_balance?: number;
  local?: string;
  area?: string;
  gestora?: string;
  medico?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status?: string;
  payment_method?: string;
  notes?: string;
  external_id?: string;
  payment_type?: string;
  paid_amount?: number;
  created_at: string;
  updated_at: string;
  contract?: Contract;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  token?: string;
}

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalContracts: number;
  activeContracts: number;
  totalPayments: number;
  totalRevenue: number; // Valor total dos contratos
  totalReceived: number; // Valor efetivamente recebido
  pendingPayments: number;
  overduePayments: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
  paymentsByStatus: Array<{
    status: string;
    count: number;
  }>;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  handleAuthError: () => Promise<void>;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'failed' | 'renegociado';
export type ContractStatus = 'ativo' | 'completed' | 'cancelled' | 'draft' | 'liquidado';
export type ClientStatus = 'ativo' | 'inactive' | 'prospect';