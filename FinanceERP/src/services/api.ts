import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Contract, Payment, User, ApiResponse, DashboardStats } from '../types';

// API Configuration - Fixed URL for production only
const getApiBaseUrl = () => {
  // Use environment variable if available
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');
  }
  
  // Always use production domain - no localhost
  return 'https://financeapp-areluna.vercel.app/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('auth_token');
    console.log('🔑 Token retrieved from storage:', token ? 'Token exists' : 'No token found');
    console.log('🔑 Token length:', token?.length || 0);
    if (token) {
      console.log('🔑 Token preview:', token.substring(0, 50) + '...');
    }
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    
    console.log('🌐 Making request to:', `${API_BASE_URL}${endpoint}`);
    console.log('🌐 Request headers:', headers);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    console.log('🌐 Response status:', response.status);
    console.log('🌐 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🌐 Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('🌐 Response data:', result);
    return result;
  }

  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: Partial<User> & { password: string }): Promise<ApiResponse<User>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Client methods
  async getClients(filters?: { search?: string; hasOverduePayments?: boolean; hasDueTodayPayments?: boolean }): Promise<ApiResponse<Client[]>> {
    let endpoint = '/clients';
    if (filters && (filters.search || filters.hasOverduePayments || filters.hasDueTodayPayments)) {
      const params: any = {};
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.hasOverduePayments) {
        params.hasOverduePayments = 'true';
      }
      if (filters.hasDueTodayPayments) {
        params.hasDueTodayPayments = 'true';
      }
      const queryString = new URLSearchParams(params).toString();
      endpoint = `/clients?${queryString}`;
    }
    return this.request(endpoint);
  }

  async getClient(id: string): Promise<ApiResponse<Client>> {
    return this.request(`/clients/${id}`);
  }

  async createClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Client>> {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
  }

  async updateClient(id: string, client: Partial<Client>): Promise<ApiResponse<Client>> {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    });
  }

  async deleteClient(id: string): Promise<ApiResponse<void>> {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Contract methods
  async getContracts(filters?: Record<string, any>): Promise<ApiResponse<Contract[]>> {
    let endpoint = '/contracts';
    if (filters && Object.keys(filters).length > 0) {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key].toString());
        }
      });
      const queryString = params.toString();
      if (queryString) {
        endpoint = `/contracts?${queryString}`;
      }
    }
    
    console.log('🌐 URL da requisição:', endpoint);
    console.log('📋 Filtros processados:', filters);
    
    return this.request(endpoint);
  }

  async getContract(id: string): Promise<ApiResponse<Contract>> {
    return this.request<Contract>(`/contracts/${id}`);
  }

  async getContractDetails(id: string): Promise<any> {
    const response = await this.request<any>(`/contracts/${id}/details`);
    return response;
  }

  async getContractsByClient(clientId: string): Promise<ApiResponse<Contract[]>> {
    return this.request<Contract[]>(`/contracts/client/${clientId}`);
  }

  async createContract(contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Contract>> {
    return this.request('/contracts', {
      method: 'POST',
      body: JSON.stringify(contract),
    });
  }

  async updateContract(id: string, contract: Partial<Contract>): Promise<ApiResponse<Contract>> {
    return this.request(`/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contract),
    });
  }

  async deleteContract(id: string): Promise<ApiResponse<void>> {
    return this.request(`/contracts/${id}`, {
      method: 'DELETE',
    });
  }

  // Payment methods
  async getPayments(): Promise<ApiResponse<Payment[]>> {
    return this.request('/payments');
  }

  async getPaymentsPaginated(
    page: number = 1, 
    limit: number = 10, 
    filters?: Record<string, any>
  ): Promise<ApiResponse<{
    data: Payment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>> {
    let url = `/payments/paginated?page=${page}&limit=${limit}`;
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== '') {
          url += `&${key}=${encodeURIComponent(filters[key])}`;
        }
      });
    }
    
    console.log('🌐 Final API URL:', url);
    return this.request(url);
  }

  async getPayment(id: string): Promise<ApiResponse<Payment>> {
    return this.request(`/payments/${id}`);
  }

  async getPaymentsByContract(contractId: string): Promise<ApiResponse<Payment[]>> {
    return this.request(`/payments/contract/${contractId}`);
  }

  async getPaymentsByContractPaginated(
    contractId: string, 
    page: number = 1, 
    limit: number = 10,
    filters?: {
      status?: string;
      search?: string;
    }
  ): Promise<ApiResponse<{
    data: Payment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>> {
    let url = `/payments/contract/${contractId}/paginated?page=${page}&limit=${limit}`;
    
    if (filters) {
      if (filters.status) url += `&status=${encodeURIComponent(filters.status)}`;
      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
    }
    
    return this.request(url);
  }

  async createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Payment>> {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async updatePayment(id: string, payment: Partial<Payment>): Promise<ApiResponse<Payment>> {
    return this.request(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payment),
    });
  }

  async deletePayment(id: string): Promise<ApiResponse<void>> {
    return this.request(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  async processManualPayment(id: string, amount: number, usePositiveBalance?: number): Promise<ApiResponse<{
    payment: Payment;
    newPayment?: Payment;
    contractUpdated?: boolean;
    message: string;
  }>> {
    return this.request(`/payments/${id}/manual-payment`, {
      method: 'POST',
      body: JSON.stringify({ amount, usePositiveBalance }),
    });
  }

  // Dashboard methods
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }
}

export default new ApiService();