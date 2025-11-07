import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueuedRequest {
  id: string;
  type: 'ai-chat';
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  response?: any;
  error?: string;
}

class RequestQueueService {
  private queue: Map<string, QueuedRequest> = new Map();
  private isProcessing = false;
  private listeners: Map<string, Set<(request: QueuedRequest) => void>> = new Map();

  async initialize() {
    // Carregar fila persistida do AsyncStorage
    try {
      const savedQueue = await AsyncStorage.getItem('request_queue');
      if (savedQueue) {
        const parsedQueue = JSON.parse(savedQueue);
        parsedQueue.forEach((req: QueuedRequest) => {
          this.queue.set(req.id, req);
        });
        console.log('📦 Fila de requisições carregada:', this.queue.size, 'itens');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar fila:', error);
    }
  }

  addRequest(request: Omit<QueuedRequest, 'id' | 'status' | 'createdAt'>): string {
    const id = `${request.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedRequest: QueuedRequest = {
      ...request,
      id,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.queue.set(id, queuedRequest);
    this.persistQueue();
    console.log('📦 Requisição adicionada à fila:', id);

    return id;
  }

  updateRequest(id: string, updates: Partial<QueuedRequest>) {
    const request = this.queue.get(id);
    if (request) {
      const updated = { ...request, ...updates };
      this.queue.set(id, updated);
      this.persistQueue();
      this.notifyListeners(id, updated);
      console.log('📦 Requisição atualizada:', id, updates.status);
    }
  }

  getRequest(id: string): QueuedRequest | undefined {
    return this.queue.get(id);
  }

  getQueuedRequests(status?: 'pending' | 'processing' | 'completed' | 'failed'): QueuedRequest[] {
    const requests = Array.from(this.queue.values());
    if (status) {
      return requests.filter(r => r.status === status);
    }
    return requests;
  }

  onRequestUpdate(id: string, callback: (request: QueuedRequest) => void) {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(callback);

    // Unsubscribe function
    return () => {
      const callbacks = this.listeners.get(id);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(id);
        }
      }
    };
  }

  private notifyListeners(id: string, request: QueuedRequest) {
    const callbacks = this.listeners.get(id);
    if (callbacks) {
      callbacks.forEach(callback => callback(request));
    }
  }

  private async persistQueue() {
    try {
      const queueArray = Array.from(this.queue.values());
      await AsyncStorage.setItem('request_queue', JSON.stringify(queueArray));
    } catch (error) {
      console.error('❌ Erro ao persistir fila:', error);
    }
  }

  clearCompleted() {
    let removed = 0;
    for (const [id, request] of this.queue.entries()) {
      if (request.status === 'completed' || request.status === 'failed') {
        this.queue.delete(id);
        removed++;
      }
    }
    this.persistQueue();
    console.log('📦 Requisições concluídas removidas:', removed);
  }

  clearQueue() {
    this.queue.clear();
    this.persistQueue();
    console.log('📦 Fila limpa');
  }
}

export default new RequestQueueService();

