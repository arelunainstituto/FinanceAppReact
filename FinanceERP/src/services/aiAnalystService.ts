import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface N8NRequest {
  message: string;
  userName: string;
  userEmail: string;
  history?: ChatMessage[];
}

interface N8NResponse {
  response: string;
  success: boolean;
  error?: string;
}

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

class AIAnalystService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async sendMessage(
    message: string, 
    user: User, 
    history: ChatMessage[] = []
  ): Promise<N8NResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      const requestData: N8NRequest = {
        message,
        userName: user.name || user.email,
        userEmail: user.email,
        history: history.slice(-10) // Enviar apenas as últimas 10 mensagens para contexto
      };

      console.log('🤖 Enviando mensagem para AI Analyst:', {
        userName: requestData.userName,
        userEmail: requestData.userEmail,
        messageLength: message.length,
        historyLength: history.length
      });

      const response = await fetch(`${API_BASE_URL}/ai-analyst/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData)
      });

      console.log('🤖 Resposta do AI Analyst:', {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🤖 Erro na resposta do AI Analyst:', errorText);
        throw new Error(`Erro do servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🤖 Resultado processado:', result);

      return {
        response: result.data?.response || result.message || 'Resposta recebida',
        success: result.success || true
      };

    } catch (error) {
      console.error('🤖 Erro ao comunicar com AI Analyst:', error);
      
      return {
        response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Método para testar a conexão
  async testConnection(): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/ai-analyst/test`, {
        method: 'GET',
        headers
      });

      return response.ok;
    } catch (error) {
      console.error('🤖 Erro ao testar conexão:', error);
      return false;
    }
  }
}

export default new AIAnalystService();
export type { ChatMessage, N8NResponse };
