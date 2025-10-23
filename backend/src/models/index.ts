export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

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
  state?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  status?: string;
  external_id?: string;
  rating?: number; // Client rating from 1 to 5 stars
  created_at: Date;
  updated_at: Date;
}

export interface Contract {
  id: string;
  client_id: string;
  contract_number?: string;
  description?: string;
  value: number;
  start_date?: Date;
  end_date?: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  due_date: Date;
  paid_date?: Date;
  status: 'pending' | 'paid' | 'overdue';
  payment_method?: string;
  payment_type?: 'normalPayment' | 'downPayment';
  paid_amount?: number;
  notes?: string;
  external_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}