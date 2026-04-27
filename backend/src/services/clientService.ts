import { ClientRepository } from '../repositories/clientRepository';
import { Client } from '../models';
import { createError } from '../middlewares/errorHandler';
import { stripeService } from './stripeService';

export class ClientService {
  private clientRepository: ClientRepository;

  constructor() {
    this.clientRepository = new ClientRepository();
  }

  async getAllClients(): Promise<Client[]> {
    return this.clientRepository.findAll();
  }

  async getClientById(id: string): Promise<Client> {
    const client = await this.clientRepository.findById(id);
    if (!client) {
      throw createError('Client not found', 404);
    }
    return client;
  }

  async createClient(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    // Validate required fields
    if (!clientData.first_name) {
      throw createError('First name is required', 400);
    }

    // Validate email format if provided
    if (clientData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientData.email)) {
        throw createError('Invalid email format', 400);
      }

      // Check if email already exists
      const existingClient = await this.clientRepository.findByEmail(clientData.email);
      if (existingClient) {
        throw createError('Client with this email already exists', 409);
      }
    }

    // Process birth_date format if provided
    if (clientData.birth_date !== undefined) {
      // If birth_date is empty string, set it to null
      if (clientData.birth_date === '') {
        clientData.birth_date = null as any;
      } else if (clientData.birth_date) {
        // Convert DD/MM/YYYY to YYYY-MM-DD format for database
        if (clientData.birth_date.includes('/')) {
          const [day, month, year] = clientData.birth_date.split('/');
          // Validate the date parts
          const dayNum = parseInt(day);
          const monthNum = parseInt(month);
          const yearNum = parseInt(year);
          
          if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > new Date().getFullYear()) {
            throw createError('Invalid birth date', 400);
          }
          
          // Convert to YYYY-MM-DD format
          clientData.birth_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Validate the final date format
        const parsedDate = new Date(clientData.birth_date);
        if (isNaN(parsedDate.getTime())) {
          throw createError('Invalid birth date', 400);
        }
      }
    }

    const createdClient = await this.clientRepository.create(clientData);

    if (stripeService.isEnabled() && !createdClient.external_id) {
      try {
        const stripeCustomerId = await stripeService.createCustomer(createdClient);
        if (stripeCustomerId) {
          const updated = await this.clientRepository.update(createdClient.id, { external_id: stripeCustomerId });
          return updated || createdClient;
        }
      } catch (error) {
        console.error(`Stripe customer creation failed for client ${createdClient.id}, rolling back:`, error);
        await this.clientRepository.delete(createdClient.id);
        throw createError('Failed to create client in Stripe', 502);
      }
    }

    return createdClient;
  }

  async updateClient(id: string, clientData: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>): Promise<Client> {
    // Check if client exists
    const existingClient = await this.clientRepository.findById(id);
    if (!existingClient) {
      throw createError('Client not found', 404);
    }

    // Validate email format if provided
    if (clientData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientData.email)) {
        throw createError('Invalid email format', 400);
      }

      // Check if email already exists for another client
      const existingClientWithEmail = await this.clientRepository.findByEmail(clientData.email);
      if (existingClientWithEmail && existingClientWithEmail.id !== id) {
        throw createError('Client with this email already exists', 409);
      }
    }

    // Process birth_date format if provided
    if (clientData.birth_date !== undefined) {
      // If birth_date is empty string, set it to null
      if (clientData.birth_date === '') {
        clientData.birth_date = null as any;
      } else if (clientData.birth_date) {
        // Convert DD/MM/YYYY to YYYY-MM-DD format for database
        if (clientData.birth_date.includes('/')) {
          const [day, month, year] = clientData.birth_date.split('/');
          // Validate the date parts
          const dayNum = parseInt(day);
          const monthNum = parseInt(month);
          const yearNum = parseInt(year);
          
          if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > new Date().getFullYear()) {
            throw createError('Invalid birth date', 400);
          }
          
          // Convert to YYYY-MM-DD format
          clientData.birth_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Validate the final date format
        const parsedDate = new Date(clientData.birth_date);
        if (isNaN(parsedDate.getTime())) {
          throw createError('Invalid birth date', 400);
        }
      }
    }

    const updatedClient = await this.clientRepository.update(id, clientData);
    if (!updatedClient) {
      throw createError('Failed to update client', 500);
    }

    return updatedClient;
  }

  async deleteClient(id: string): Promise<void> {
    const existingClient = await this.clientRepository.findById(id);
    if (!existingClient) {
      throw createError('Client not found', 404);
    }

    await this.clientRepository.delete(id);
  }

  async getClientByEmail(email: string): Promise<Client | null> {
    return this.clientRepository.findByEmail(email);
  }

  async getClientsWithFilters(filters: {
    search?: string;
    hasOverduePayments?: boolean;
    hasDueTodayPayments?: boolean;
  }): Promise<Client[]> {
    return this.clientRepository.findAllWithFilters(filters);
  }
}