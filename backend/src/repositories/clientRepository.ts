import { supabase } from '../config/database';
import { Client } from '../models';

export class ClientRepository {
  async findAll(): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error('Failed to fetch clients');
    }
  }

  async findById(id: string): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching client by ID:', error);
      throw new Error('Failed to fetch client');
    }
  }

  async create(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating client:', error);
      throw new Error('Failed to create client');
    }
  }

  async update(id: string, clientData: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error updating client:', error);
      throw new Error('Failed to update client');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw new Error('Failed to delete client');
    }
  }

  async findByEmail(email: string): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching client by email:', error);
      throw new Error('Failed to fetch client by email');
    }
  }

  async findAllWithFilters(filters: {
    search?: string;
    hasOverduePayments?: boolean;
    hasDueTodayPayments?: boolean;
  }): Promise<Client[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      let clientIds: string[] = [];

      // Se há filtros de pagamento, buscar IDs dos clientes primeiro
      if (filters.hasOverduePayments || filters.hasDueTodayPayments) {
        if (filters.hasOverduePayments) {
          // Buscar pagamentos atrasados (não pagos e due_date < hoje)
          const { data: overduePayments } = await supabase
            .from('payments')
            .select('contract_id')
            .neq('status', 'paid')
            .lt('due_date', today);

          if (overduePayments && overduePayments.length > 0) {
            const contractIds = Array.from(new Set(overduePayments.map(p => p.contract_id)));
            
            // Processar em lotes para evitar erro de fetch
            const batchSize = 100;
            const batches = [];
            for (let i = 0; i < contractIds.length; i += batchSize) {
              batches.push(contractIds.slice(i, i + batchSize));
            }

            for (const batch of batches) {
              // Buscar client_ids desses contratos
              const { data: contracts } = await supabase
                .from('contracts')
                .select('client_id')
                .in('id', batch);

              if (contracts && contracts.length > 0) {
                const overdueClientIds = contracts.map(c => c.client_id);
                clientIds.push(...overdueClientIds);
              }
            }
          }
        }

        if (filters.hasDueTodayPayments) {
          // Buscar pagamentos vencendo hoje
          const { data: dueTodayPayments } = await supabase
            .from('payments')
            .select('contract_id')
            .eq('status', 'pending')
            .eq('due_date', today);

          if (dueTodayPayments && dueTodayPayments.length > 0) {
            const contractIds = Array.from(new Set(dueTodayPayments.map(p => p.contract_id)));
            
            // Buscar client_ids desses contratos
            const { data: contracts } = await supabase
              .from('contracts')
              .select('client_id')
              .in('id', contractIds);

            if (contracts && contracts.length > 0) {
              const dueTodayClientIds = contracts.map(c => c.client_id);
              clientIds.push(...dueTodayClientIds);
            }
          }
        }

        // Remover duplicatas
        clientIds = Array.from(new Set(clientIds));

        // Se não encontrou clientes com os critérios de pagamento, retornar vazio
        if (clientIds.length === 0) {
          return [];
        }
      }

      // Se há filtros de pagamento, filtrar pelos IDs encontrados
      if (clientIds.length > 0) {
        // Processar em lotes também para a query final
        const batchSize = 100;
        const batches = [];
        for (let i = 0; i < clientIds.length; i += batchSize) {
          batches.push(clientIds.slice(i, i + batchSize));
        }

        let allClients: any[] = [];
        for (const batch of batches) {
          let batchQuery = supabase.from('clients').select('*').in('id', batch);
          
          // Filtro de busca por nome, email ou tax_id
          if (filters.search && filters.search.trim()) {
            const searchTerm = filters.search.trim();
            const searchParts = searchTerm.split(/\s+/); // Dividir por espaços
            
            if (searchParts.length > 1) {
              // Se tem múltiplas palavras, buscar por nome E sobrenome
              const firstName = searchParts[0];
              const lastName = searchParts.slice(1).join(' ');
              
              // Buscar onde first_name contém a primeira palavra E last_name contém as outras
              // OU buscar nos outros campos
              batchQuery = batchQuery.or(
                `and(first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%),` +
                `first_name.ilike.%${searchTerm}%,` +
                `last_name.ilike.%${searchTerm}%,` +
                `email.ilike.%${searchTerm}%,` +
                `tax_id.ilike.%${searchTerm}%`
              );
            } else {
              // Se é uma palavra só, buscar normalmente
              batchQuery = batchQuery.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,tax_id.ilike.%${searchTerm}%`);
            }
          }

          batchQuery = batchQuery.order('created_at', { ascending: false });

          const { data: batchData, error: batchError } = await batchQuery;
          
          if (batchError) {
            console.error('Error fetching clients batch:', batchError);
            continue;
          }

          if (batchData) {
            allClients.push(...batchData);
          }
        }

        return allClients;
      } else {
        // Construir query principal para clientes sem filtros de pagamento
        let query = supabase.from('clients').select('*');

        // Filtro de busca por nome, email ou tax_id
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim();
          const searchParts = searchTerm.split(/\s+/); // Dividir por espaços
          
          if (searchParts.length > 1) {
            // Se tem múltiplas palavras, buscar por nome E sobrenome
            const firstName = searchParts[0];
            const lastName = searchParts.slice(1).join(' ');
            
            // Buscar onde first_name contém a primeira palavra E last_name contém as outras
            // OU buscar nos outros campos
            query = query.or(
              `and(first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%),` +
              `first_name.ilike.%${searchTerm}%,` +
              `last_name.ilike.%${searchTerm}%,` +
              `email.ilike.%${searchTerm}%,` +
              `tax_id.ilike.%${searchTerm}%`
            );
          } else {
            // Se é uma palavra só, buscar normalmente
            query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,tax_id.ilike.%${searchTerm}%`);
          }
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching clients with filters:', error);
          return [];
        }

        return data || [];
      }
    } catch (error) {
      console.error('Error fetching clients with filters:', error);
      return [];
    }
  }
}