import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Contract, Payment, User, ApiResponse, DashboardStats } from '../types';
import { authErrorEvent } from '../utils/authEvents';

// API Configuration - Dynamic URL based on current domain
const getApiBaseUrl = () => {
  // PRIORITY 1: Use environment variable if available (for all environments)
  if (process.env.REACT_APP_API_BASE_URL) {
    console.log('🌐 Using API URL from environment:', process.env.REACT_APP_API_BASE_URL);
    return process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');
  }
  
  // PRIORITY 2: Check if we're in a browser
  if (typeof window !== 'undefined') {
    const currentUrl = window.location.origin;
    
    // Development: localhost
    if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
      console.log('🌐 Using localhost API URL: http://localhost:3030/api');
      return 'http://localhost:3030/api';
    }
    
    // Production: Use same domain as frontend ONLY for main production domain
    // This allows Vercel preview branches to work correctly with environment variables
    if (currentUrl.includes('financeiro.institutoareluna.pt')) {
      console.log('🌐 Using production API URL:', `${currentUrl}/api`);
      return `${currentUrl}/api`;
    }
    
    // Vercel preview/production (financeapp-*.vercel.app): Use same domain
    if (currentUrl.includes('vercel.app')) {
      console.log('🌐 Using Vercel deployment API URL:', `${currentUrl}/api`);
      return `${currentUrl}/api`;
    }
  }
  
  // PRIORITY 3: Fallback for server-side rendering or React Native
  console.log('🌐 Using fallback API URL: https://financeiro.institutoareluna.pt/api');
  return 'https://financeiro.institutoareluna.pt/api';
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

      // Handle authentication errors (token expired or invalid)
      if (response.status === 401 || response.status === 403) {
        console.log('🚨 Authentication error detected - clearing session');

        // Clear authentication data
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');

        // Emit auth error event to force immediate logout
        console.log('📢 Emitting auth error event');
        authErrorEvent.emit();

        // Throw specific error for authentication failure
        const authError = new Error('Session expired. Please login again.');
        (authError as any).isAuthError = true;
        (authError as any).status = response.status;
        throw authError;
      }

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

  async updateClientRating(id: string, rating: number): Promise<ApiResponse<Client>> {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ rating }),
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

  async getContractBalances(id: string): Promise<ApiResponse<{ positive_balance: number; negative_balance: number }>> {
    return this.request<{ positive_balance: number; negative_balance: number }>(`/contracts/${id}/balances`);
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

  async getPaymentsForExport(filters?: Record<string, any>): Promise<ApiResponse<Payment[]>> {
    let url = '/payments/export';
    
    if (filters) {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key].toString());
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
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
    console.log('🔍 [ApiService] updatePayment called:', {
      paymentId: id,
      paymentData: payment
    });

    const response = await this.request(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payment),
    });

    console.log('🔍 [ApiService] updatePayment response:', response);
    return response;
  }

  async deletePayment(id: string): Promise<ApiResponse<void>> {
    return this.request(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  async importPaymentsFromExcel(file: File | { uri: string; name: string; type: string }): Promise<ApiResponse<{
    success: {
      clientName: string;
      amount: number;
      contractNumber: string;
      dueDate: string;
      paymentId: string;
    }[];
    errors: {
      row: number;
      clientName?: string;
      amount?: number;
      error: string;
    }[];
  }>> {
    const token = await AsyncStorage.getItem('auth_token');
    
    const formData = new FormData();
    
    // Check if it's a File object (web) or React Native file object
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      // React Native file object
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    }

    const response = await fetch(`${API_BASE_URL}/payments/import`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type, let the browser set it with the boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🌐 Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async previewImportFromExcel(file: File | { uri: string; name: string; type: string }): Promise<ApiResponse<{
    matches: {
      excelRow: number;
      clientName: string;
      amount: number;
      description: string;
      status: string;
      matchedPayment: {
        paymentId: string;
        contractNumber: string;
        dueDate: string;
        amount: number;
        clientName: string;
      } | null;
      error?: string;
    }[];
    errors: {
      row: number;
      error: string;
    }[];
  }>> {
    const token = await AsyncStorage.getItem('auth_token');
    
    const formData = new FormData();
    
    // Check if it's a File object (web) or React Native file object
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      // React Native file object
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    }

    const response = await fetch(`${API_BASE_URL}/payments/import/preview`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type, let the browser set it with the boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🌐 Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async confirmImport(paymentIds: string[]): Promise<ApiResponse<{
    success: {
      paymentId: string;
      clientName: string;
      amount: number;
      contractNumber: string;
      dueDate: string;
    }[];
    errors: {
      paymentId: string;
      error: string;
    }[];
  }>> {
    return this.request('/payments/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentIds }),
    });
  }

  async processManualPayment(id: string, amount: number, usePositiveBalance?: number, paymentMethod?: string): Promise<ApiResponse<{
    payment: Payment;
    newPayment?: Payment;
    contractUpdated?: boolean;
    message: string;
  }>> {
    return this.request(`/payments/${id}/manual-payment`, {
      method: 'POST',
      body: JSON.stringify({ amount, usePositiveBalance, paymentMethod }),
    });
  }

  // Dashboard methods
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  async getRecentPayments(): Promise<ApiResponse<Payment[]>> {
    return this.request<Payment[]>('/payments/recent');
  }

  async getUpcomingPayments(): Promise<ApiResponse<Payment[]>> {
    return this.request<Payment[]>('/payments/upcoming');
  }

  async getRecentContracts(): Promise<ApiResponse<Contract[]>> {
    return this.request<Contract[]>('/contracts/recent');
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

  async verifyToken(): Promise<ApiResponse<{ valid: boolean; user: User | null }>> {
    return this.request<{ valid: boolean; user: User | null }>('/auth/verify', {
      method: 'GET',
    });
  }
}

export default new ApiService();