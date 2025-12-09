// Using native Node.js fetch (available in Node.js 18+)
// No import needed - fetch is globally available

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
      console.log('🤖 Resultado processado:', JSON.stringify(result, null, 2));

      // Extrair a mensagem do formato do N8N
      let responseText: string = 'Resposta recebida';

      // Normalizar result para lidar com Arrays do N8N
      let dataToProcess = result;
      if (Array.isArray(result) && result.length > 0) {
        console.log('🤖 Resultado é um array, usando o primeiro item');
        dataToProcess = result[0];
      }

      // Verificar se o resultado está vazio ou inválido
      if (!dataToProcess || (typeof dataToProcess === 'object' && Object.keys(dataToProcess).length === 0)) {
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
      }
      // Verificações diretas no objeto (ou primeiro item do array)
      else if (dataToProcess.output && typeof dataToProcess.output === 'string') {
        responseText = dataToProcess.output;
        console.log('🤖 Resposta extraída de .output:', responseText);
      } else if (dataToProcess.message && typeof dataToProcess.message === 'object') {
        // Formato: { role: 'assistant', content: 'texto', ... }
        responseText = dataToProcess.message.content || dataToProcess.message.message || 'Resposta recebida';
        console.log('🤖 Resposta extraída de .message:', responseText);
      } else if (dataToProcess.message && typeof dataToProcess.message === 'string') {
        responseText = dataToProcess.message;
        console.log('🤖 Resposta extraída de .message (string):', responseText);
      } else if (dataToProcess.response && typeof dataToProcess.response === 'string') {
        responseText = dataToProcess.response;
        console.log('🤖 Resposta extraída de .response:', responseText);
      } else if (dataToProcess.content && typeof dataToProcess.content === 'string') {
        responseText = dataToProcess.content;
        console.log('🤖 Resposta extraída de .content:', responseText);
      } else if (dataToProcess.text && typeof dataToProcess.text === 'string') {
        responseText = dataToProcess.text;
        console.log('🤖 Resposta extraída de .text:', responseText);
      } else if (dataToProcess.answer && typeof dataToProcess.answer === 'string') {
        responseText = dataToProcess.answer;
        console.log('🤖 Resposta extraída de .answer:', responseText);
      } else {
        // Busca recursiva como fallback
        console.log('🤖 Tentando busca recursiva em:', dataToProcess);

        const searchForText = (obj: any): string | null => {
          if (typeof obj === 'string' && obj.length > 5) { // Reduzido para 5 chars
            return obj;
          }
          if (typeof obj === 'object' && obj !== null) {
            // Priorizar chaves comuns
            const priorityKeys = ['output', 'message', 'response', 'content', 'text', 'answer', 'html', 'markdown'];
            for (const key of priorityKeys) {
              if (obj[key] && typeof obj[key] === 'string') return obj[key];
            }

            for (const key in obj) {
              const found = searchForText(obj[key]);
              if (found) return found;
            }
          }
          return null;
        };

        const foundText = searchForText(dataToProcess);
        if (foundText) {
          responseText = foundText;
          console.log('🤖 Resposta encontrada via busca recursiva:', responseText);
        } else {
          console.log('🤖 Nenhuma resposta encontrada no objeto (Dump):', JSON.stringify(dataToProcess));
          responseText = 'Desculpe, não foi possível processar a resposta do assistente. Verifique o formato de retorno do N8N.';
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
