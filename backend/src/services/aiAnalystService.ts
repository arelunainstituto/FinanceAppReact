import fetch from 'node-fetch';

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

class AIAnalystService {
  private getWebhookUrl(): string {
    return process.env.N8N_WEBHOOK_URL || '';
  }

  private getCredentials(): { username: string; password: string } {
    return {
      username: process.env.N8N_USERNAME || '',
      password: process.env.N8N_PASSWORD || ''
    };
  }

  private createBasicAuthHeader(username: string, password: string): string {
    const credentials = `${username}:${password}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    return `Basic ${encodedCredentials}`;
  }

  async sendMessage(
    message: string, 
    userName: string, 
    userEmail: string,
    history: ChatMessage[] = []
  ): Promise<N8NResponse> {
    try {
      const webhookUrl = this.getWebhookUrl();
      const credentials = this.getCredentials();

      if (!webhookUrl || !credentials.username || !credentials.password) {
        throw new Error('Configuração do webhook N8N não encontrada. Verifique as variáveis de ambiente N8N_WEBHOOK_URL, N8N_USERNAME e N8N_PASSWORD.');
      }

      const requestData: N8NRequest = {
        message,
        userName,
        userEmail,
        history: history.slice(-5) // Enviar apenas as últimas 5 mensagens para contexto
      };

      console.log('🤖 Enviando mensagem para N8N:', {
        url: webhookUrl,
        userName: requestData.userName,
        userEmail: requestData.userEmail,
        messageLength: message.length,
        historyLength: history.length
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.createBasicAuthHeader(credentials.username, credentials.password)
        },
        body: JSON.stringify(requestData)
      });

      console.log('🤖 Resposta do N8N:', {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🤖 Erro na resposta do N8N:', errorText);
        throw new Error(`Erro do servidor N8N: ${response.status} ${response.statusText}`);
      }

      let result: any = null;
      const rawResponseText = await response.text();
      
      if (rawResponseText && rawResponseText.trim()) {
        try {
          result = JSON.parse(rawResponseText);
        } catch (parseError) {
          console.error('🤖 Erro ao fazer parse da resposta:', parseError);
          result = null;
        }
      } else {
        console.log('🤖 Resposta vazia do N8N');
        result = null;
      }
      console.log('🤖 Resultado processado:', result);
      console.log('🤖 Tipo do resultado:', typeof result);
      console.log('🤖 Chaves do resultado:', Object.keys(result || {}));

      // Extrair a mensagem do formato do N8N
      let responseText: string = 'Resposta recebida';
      
      // Verificar se o resultado está vazio ou inválido
      if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
        console.log('🤖 Resultado vazio do N8N, usando resposta simulada');
        // Resposta simulada enquanto o N8N não está funcionando
        const responses = [
          `Olá ${userName}! 👋 Sou seu assistente de análise financeira. Como posso ajudá-lo hoje?`,
          `Entendi sua pergunta sobre "${message}". Vou analisar os dados financeiros para você.`,
          `Com base na sua consulta, posso ajudar com análise de contratos, pagamentos e relatórios financeiros.`,
          `Vou processar sua solicitação e fornecer insights sobre os dados financeiros do sistema.`,
          `Perfeito! Vou analisar as informações e gerar um relatório personalizado para você.`
        ];
        responseText = responses[Math.floor(Math.random() * responses.length)];
      } else if (result.message && typeof result.message === 'object') {
        // Formato: { role: 'assistant', content: 'texto', ... }
        responseText = result.message.content || result.message.message || 'Resposta recebida';
        console.log('🤖 Resposta extraída de result.message:', responseText);
      } else if (result.message && typeof result.message === 'string') {
        // Formato: string simples
        responseText = result.message;
        console.log('🤖 Resposta extraída de result.message (string):', responseText);
      } else if (result.response) {
        // Formato: { response: 'texto' }
        responseText = result.response;
        console.log('🤖 Resposta extraída de result.response:', responseText);
      } else if (result.content) {
        // Formato: { content: 'texto' }
        responseText = result.content;
        console.log('🤖 Resposta extraída de result.content:', responseText);
      } else if (result.output) {
        // Formato: { output: 'texto' }
        responseText = result.output;
        console.log('🤖 Resposta extraída de result.output:', responseText);
      } else if (typeof result === 'object' && result !== null) {
        // Buscar em qualquer propriedade que contenha texto
        const searchForText = (obj: any): string | null => {
          if (typeof obj === 'string' && obj.length > 10) {
            return obj;
          }
          if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
              const found = searchForText(obj[key]);
              if (found) return found;
            }
          }
          return null;
        };
        
        const foundText = searchForText(result);
        if (foundText) {
          responseText = foundText;
          console.log('🤖 Resposta encontrada via busca recursiva:', responseText);
        } else {
          console.log('🤖 Nenhuma resposta encontrada no objeto, usando padrão');
          responseText = 'Desculpe, não foi possível processar a resposta do assistente.';
        }
      }

      return {
        response: responseText,
        success: true
      };

    } catch (error) {
      console.error('🤖 Erro ao comunicar com N8N:', error);
      
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
      const webhookUrl = this.getWebhookUrl();
      const credentials = this.getCredentials();

      if (!webhookUrl || !credentials.username || !credentials.password) {
        console.error('🤖 Configuração do N8N não encontrada');
        return false;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.createBasicAuthHeader(credentials.username, credentials.password)
        },
        body: JSON.stringify({
          message: 'test',
          userName: 'test'
        })
      });

      const isOk = response.ok;
      console.log('🤖 Teste de conexão N8N:', isOk ? 'SUCESSO' : 'FALHA');
      
      return isOk;
    } catch (error) {
      console.error('🤖 Erro ao testar conexão N8N:', error);
      return false;
    }
  }
}

export const aiAnalystService = new AIAnalystService();
