import { supabase } from '../config/database';
import { Payment } from '../models';
import { getCurrentOrLastBusinessDay } from '../utils/dateUtils';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaymentFilters {
  status?: string;
  search?: string;
  contractId?: string;
  // Date filters
  due_date_from?: string;
  due_date_to?: string;
  paid_date_from?: string;
  paid_date_to?: string;
  created_at_from?: string;
  created_at_to?: string;
  // Amount filters
  amount_min?: number;
  amount_max?: number;
  // Payment method and type
  payment_method?: string;
  payment_type?: string;
  // Contract filters
  contract_number?: string;
  contract_status?: string;
  // Client filters
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  tax_id?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class PaymentRepository {
  async findAll(): Promise<Payment[]> {
    try {
      // Para manter compatibilidade, vamos buscar todos os pagamentos usando paginação
      const allPayments: Payment[] = [];
      let page = 1;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const result = await this.findAllPaginated({ page, limit });
        allPayments.push(...result.data);
        hasMore = result.hasNextPage;
        page++;
      }

      return allPayments;
    } catch (error) {
      console.error('Error fetching all payments:', error);
      throw new Error('Failed to fetch payments');
    }
  }

  async findAllForExport(filters: PaymentFilters = {}): Promise<Payment[]> {
    try {
      const { 
        status, 
        search, 
        contractId,
        due_date_from,
        due_date_to,
        paid_date_from,
        paid_date_to,
        created_at_from,
        created_at_to,
        amount_min,
        amount_max,
        payment_method,
        payment_type,
        contract_number,
        contract_status,
        client_name,
        client_email,
        client_phone,
        tax_id
      } = filters;

      // Query direta sem paginação para exportação
      let query = supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            *,
            client:clients(*)
          )
        `);

      // Aplicar filtros de pagamento
      if (status) {
        if (status === 'pending') {
          const today = new Date().toISOString().split('T')[0];
          query = query.eq('status', status).gte('due_date', today);
        } else if (status === 'overdue') {
          const today = new Date().toISOString().split('T')[0];
          query = query.eq('status', 'pending').lt('due_date', today);
        } else {
          query = query.eq('status', status);
        }
      }

      if (contractId) {
        query = query.eq('contract_id', contractId);
      }

      // Filtros de data
      if (due_date_from) {
        query = query.gte('due_date', due_date_from);
      }
      if (due_date_to) {
        query = query.lte('due_date', due_date_to);
      }
      if (paid_date_from) {
        query = query.gte('paid_date', paid_date_from);
      }
      if (paid_date_to) {
        query = query.lte('paid_date', paid_date_to);
      }
      if (created_at_from) {
        query = query.gte('created_at', created_at_from);
      }
      if (created_at_to) {
        query = query.lte('created_at', created_at_to);
      }

      // Filtros de valor
      if (amount_min !== undefined) {
        query = query.gte('amount', amount_min);
      }
      if (amount_max !== undefined) {
        query = query.lte('amount', amount_max);
      }

      // Filtros de método e tipo de pagamento
      if (payment_method) {
        query = query.eq('payment_method', payment_method);
      }
      if (payment_type) {
        query = query.eq('payment_type', payment_type);
      }

      // Filtros de contrato
      if (contract_number) {
        query = query.eq('contracts.contract_number', contract_number);
      }
      if (contract_status) {
        query = query.eq('contracts.status', contract_status);
      }

      // Filtros de cliente
      if (client_name) {
        query = query.or(`contracts.clients.first_name.ilike.%${client_name}%,contracts.clients.last_name.ilike.%${client_name}%`);
      }
      if (client_email) {
        query = query.ilike('contracts.clients.email', `%${client_email}%`);
      }
      if (client_phone) {
        query = query.ilike('contracts.clients.phone', `%${client_phone}%`);
      }
      if (tax_id) {
        query = query.eq('contracts.clients.tax_id', tax_id);
      }

      // Busca geral
      if (search) {
        const searchTerm = search.trim();
        const numericValue = parseFloat(searchTerm);
        const isNumeric = !isNaN(numericValue) && isFinite(numericValue);
        
        let searchConditions = [
          `notes.ilike.%${searchTerm}%`,
          `contracts.contract_number.ilike.%${searchTerm}%`,
          `contracts.clients.first_name.ilike.%${searchTerm}%`,
          `contracts.clients.last_name.ilike.%${searchTerm}%`
        ];

        if (isNumeric && numericValue > 0) {
          searchConditions.push(`amount.eq.${numericValue}`);
        }

        query = query.or(searchConditions.join(','));
      }

      // Implementar paginação interna para contornar o limite de 1000 registros do Supabase
      const batchSize = 1000;
      let allPayments: Payment[] = [];
      let offset = 0;
      let hasMoreData = true;

      while (hasMoreData) {
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allPayments = allPayments.concat(data);
          offset += batchSize;
          hasMoreData = data.length === batchSize;
        } else {
          hasMoreData = false;
        }
      }

      return allPayments;
    } catch (error) {
      console.error('Error fetching all payments for export:', error);
      throw new Error('Failed to fetch payments for export');
    }
  }

  async findAllPaginated(options: PaginationOptions = {}, filters: PaymentFilters = {}): Promise<PaginatedResult<Payment>> {
    try {
      const { page = 1, limit = 50 } = options;
      const { 
        status, 
        search, 
        contractId,
        due_date_from,
        due_date_to,
        paid_date_from,
        paid_date_to,
        created_at_from,
        created_at_to,
        amount_min,
        amount_max,
        payment_method,
        payment_type,
        contract_number,
        contract_status,
        client_name,
        client_email,
        client_phone,
        tax_id
      } = filters;
      const offset = (page - 1) * limit;

      // Se há filtro de nome do cliente, usar uma abordagem especial
      if (client_name) {
        return this.findAllPaginatedWithClientNameFilter(options, filters);
      }

      // Se o filtro for 'overdue', usar lógica especial
      if (status === 'overdue') {
        const today = new Date().toISOString().split('T')[0];
        
        // Query base para contagem de pagamentos atrasados
        let countQuery = supabase
          .from('payments')
          .select(`
            *,
            contract:contracts(
              *,
              client:clients(*)
            )
          `, { count: 'exact', head: true })
          .eq('status', 'pending')
          .lt('due_date', today);

        // Query base para dados de pagamentos atrasados
        let dataQuery = supabase
          .from('payments')
          .select(`
            *,
            contract:contracts(
              *,
              client:clients(*)
            )
          `)
          .eq('status', 'pending')
          .lt('due_date', today);

        // Aplicar outros filtros (exceto status)
        if (contractId) {
          countQuery = countQuery.eq('contract_id', contractId);
          dataQuery = dataQuery.eq('contract_id', contractId);
        }

        // Filtros de data (mantendo a lógica de overdue)
        if (due_date_from) {
          countQuery = countQuery.gte('due_date', due_date_from);
          dataQuery = dataQuery.gte('due_date', due_date_from);
        }

        if (due_date_to) {
          countQuery = countQuery.lte('due_date', due_date_to);
          dataQuery = dataQuery.lte('due_date', due_date_to);
        }

        if (paid_date_from) {
          countQuery = countQuery.gte('paid_date', paid_date_from);
          dataQuery = dataQuery.gte('paid_date', paid_date_from);
        }

        if (paid_date_to) {
          countQuery = countQuery.lte('paid_date', paid_date_to);
          dataQuery = dataQuery.lte('paid_date', paid_date_to);
        }

        if (created_at_from) {
          countQuery = countQuery.gte('created_at', created_at_from);
          dataQuery = dataQuery.gte('created_at', created_at_from);
        }

        if (created_at_to) {
          countQuery = countQuery.lte('created_at', created_at_to);
          dataQuery = dataQuery.lte('created_at', created_at_to);
        }

        // Filtros de valor
        if (amount_min !== undefined) {
          countQuery = countQuery.gte('amount', amount_min);
          dataQuery = dataQuery.gte('amount', amount_min);
        }

        if (amount_max !== undefined) {
          countQuery = countQuery.lte('amount', amount_max);
          dataQuery = dataQuery.lte('amount', amount_max);
        }

        // Filtros de método e tipo de pagamento
        if (payment_method) {
          countQuery = countQuery.eq('payment_method', payment_method);
          dataQuery = dataQuery.eq('payment_method', payment_method);
        }

        if (payment_type) {
          countQuery = countQuery.eq('payment_type', payment_type);
          dataQuery = dataQuery.eq('payment_type', payment_type);
        }

        // Filtros de contrato
        if (contract_number) {
          countQuery = countQuery.eq('contracts.contract_number', contract_number);
          dataQuery = dataQuery.eq('contracts.contract_number', contract_number);
        }

        if (contract_status) {
          countQuery = countQuery.eq('contracts.status', contract_status);
          dataQuery = dataQuery.eq('contracts.status', contract_status);
        }

        // Filtros de cliente
        if (client_email) {
          countQuery = countQuery.ilike('contracts.clients.email', `%${client_email}%`);
          dataQuery = dataQuery.ilike('contracts.clients.email', `%${client_email}%`);
        }

        if (client_phone) {
          countQuery = countQuery.ilike('contracts.clients.phone', `%${client_phone}%`);
          dataQuery = dataQuery.ilike('contracts.clients.phone', `%${client_phone}%`);
        }

        if (tax_id) {
          countQuery = countQuery.eq('contracts.clients.tax_id', tax_id);
          dataQuery = dataQuery.eq('contracts.clients.tax_id', tax_id);
        }

        // Executar query de contagem
        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        // Executar query de dados com paginação
        const { data, error } = await dataQuery
          .order('due_date', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
          data: data || [],
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        };
      }

      // Construir query base com joins para permitir filtros cruzados
      let countQuery = supabase
          .from('payments')
          .select(`
            *,
            contract:contracts(
              *,
              client:clients(*)
            )
          `, { count: 'exact', head: true });

        let dataQuery = supabase
          .from('payments')
          .select(`
            *,
            contract:contracts(
              *,
              client:clients(*)
            )
          `);

      // Aplicar filtros de pagamento
      if (status) {
        if (status === 'pending') {
          // Para status 'pending', excluir pagamentos atrasados
          const today = new Date().toISOString().split('T')[0];
          countQuery = countQuery.eq('status', status).gte('due_date', today);
          dataQuery = dataQuery.eq('status', status).gte('due_date', today);
        } else {
          countQuery = countQuery.eq('status', status);
          dataQuery = dataQuery.eq('status', status);
        }
      }

      if (contractId) {
        countQuery = countQuery.eq('contract_id', contractId);
        dataQuery = dataQuery.eq('contract_id', contractId);
      }

      // Filtros de data
      if (due_date_from) {
        countQuery = countQuery.gte('due_date', due_date_from);
        dataQuery = dataQuery.gte('due_date', due_date_from);
      }

      if (due_date_to) {
        countQuery = countQuery.lte('due_date', due_date_to);
        dataQuery = dataQuery.lte('due_date', due_date_to);
      }

      if (paid_date_from) {
        countQuery = countQuery.gte('paid_date', paid_date_from);
        dataQuery = dataQuery.gte('paid_date', paid_date_from);
      }

      if (paid_date_to) {
        countQuery = countQuery.lte('paid_date', paid_date_to);
        dataQuery = dataQuery.lte('paid_date', paid_date_to);
      }

      if (created_at_from) {
        countQuery = countQuery.gte('created_at', created_at_from);
        dataQuery = dataQuery.gte('created_at', created_at_from);
      }

      if (created_at_to) {
        countQuery = countQuery.lte('created_at', created_at_to);
        dataQuery = dataQuery.lte('created_at', created_at_to);
      }

      // Filtros de valor
      if (amount_min !== undefined) {
        countQuery = countQuery.gte('amount', amount_min);
        dataQuery = dataQuery.gte('amount', amount_min);
      }

      if (amount_max !== undefined) {
        countQuery = countQuery.lte('amount', amount_max);
        dataQuery = dataQuery.lte('amount', amount_max);
      }

      // Filtros de método e tipo de pagamento
      if (payment_method) {
        countQuery = countQuery.eq('payment_method', payment_method);
        dataQuery = dataQuery.eq('payment_method', payment_method);
      }

      if (payment_type) {
        countQuery = countQuery.eq('payment_type', payment_type);
        dataQuery = dataQuery.eq('payment_type', payment_type);
      }

      // Filtros de contrato
      if (contract_number) {
        countQuery = countQuery.eq('contracts.contract_number', contract_number);
        dataQuery = dataQuery.eq('contracts.contract_number', contract_number);
      }

      if (contract_status) {
        countQuery = countQuery.eq('contracts.status', contract_status);
        dataQuery = dataQuery.eq('contracts.status', contract_status);
      }

      // Filtros de cliente
      if (client_email) {
        countQuery = countQuery.ilike('contracts.clients.email', `%${client_email}%`);
        dataQuery = dataQuery.ilike('contracts.clients.email', `%${client_email}%`);
      }

      if (client_phone) {
        countQuery = countQuery.ilike('contracts.clients.phone', `%${client_phone}%`);
        dataQuery = dataQuery.ilike('contracts.clients.phone', `%${client_phone}%`);
      }

      if (tax_id) {
        countQuery = countQuery.eq('contracts.clients.tax_id', tax_id);
        dataQuery = dataQuery.eq('contracts.clients.tax_id', tax_id);
      }

      // Busca geral (mantendo compatibilidade)
      if (search) {
        const searchTerm = search.trim();
        const numericValue = parseFloat(searchTerm);
        const isNumeric = !isNaN(numericValue) && isFinite(numericValue);
        
        // Fazer múltiplas consultas separadas e combinar os resultados
        const searchPromises = [];
        
        // Busca em notas
         searchPromises.push(
           supabase
             .from('payments')
             .select(`
               *,
               contract:contracts(
                 *,
                 client:clients(*)
               )
             `)
             .ilike('notes', `%${searchTerm}%`)
         );
         
         // Busca em número do contrato
         searchPromises.push(
           supabase
             .from('payments')
             .select(`
               *,
               contract:contracts(
                 *,
                 client:clients(*)
               )
             `)
             .ilike('contracts.contract_number', `%${searchTerm}%`)
         );
         
         // Busca em primeiro nome do cliente
         searchPromises.push(
           supabase
             .from('payments')
             .select(`
               *,
               contract:contracts(
                 *,
                 client:clients(*)
               )
             `)
             .ilike('contracts.clients.first_name', `%${searchTerm}%`)
         );
         
         // Busca em último nome do cliente
         searchPromises.push(
           supabase
             .from('payments')
             .select(`
               *,
               contract:contracts(
                 *,
                 client:clients(*)
               )
             `)
             .ilike('contracts.clients.last_name', `%${searchTerm}%`)
         );
         
         // Busca por valor se for numérico
         if (isNumeric && numericValue > 0) {
           searchPromises.push(
             supabase
               .from('payments')
               .select(`
                 *,
                 contract:contracts(
                   *,
                   client:clients(*)
                 )
               `)
               .eq('amount', numericValue)
           );
         }
        
        // Executar todas as buscas
        const searchResults = await Promise.all(searchPromises);
        
        // Combinar resultados únicos
         const allResults: any[] = [];
         const seenIds = new Set<string>();
        
        searchResults.forEach(({ data, error }) => {
          if (error) throw error;
          if (data) {
            data.forEach(payment => {
              if (!seenIds.has(payment.id)) {
                // Aplicar outros filtros
                let includePayment = true;
                
                if (status && payment.status !== status) includePayment = false;
                if (contractId && payment.contract_id !== contractId) includePayment = false;
                if (due_date_from && payment.due_date < due_date_from) includePayment = false;
                if (due_date_to && payment.due_date > due_date_to) includePayment = false;
                if (paid_date_from && payment.paid_date && payment.paid_date < paid_date_from) includePayment = false;
                if (paid_date_to && payment.paid_date && payment.paid_date > paid_date_to) includePayment = false;
                if (created_at_from && payment.created_at < created_at_from) includePayment = false;
                if (created_at_to && payment.created_at > created_at_to) includePayment = false;
                if (amount_min !== undefined && payment.amount < amount_min) includePayment = false;
                if (amount_max !== undefined && payment.amount > amount_max) includePayment = false;
                if (payment_method && payment.payment_method !== payment_method) includePayment = false;
                if (payment_type && payment.payment_type !== payment_type) includePayment = false;
                if (contract_number && payment.contract.contract_number !== contract_number) includePayment = false;
                if (contract_status && payment.contract.status !== contract_status) includePayment = false;
                if (client_name && 
                    !payment.contract.client.first_name.toLowerCase().includes(client_name.toLowerCase()) &&
                    !payment.contract.client.last_name.toLowerCase().includes(client_name.toLowerCase())) {
                  includePayment = false;
                }
                if (client_email && !payment.contract.client.email.toLowerCase().includes(client_email.toLowerCase())) includePayment = false;
                if (client_phone && !payment.contract.client.phone.includes(client_phone)) includePayment = false;
                if (tax_id && payment.contract.client.tax_id !== tax_id) includePayment = false;
                
                if (includePayment) {
                  seenIds.add(payment.id);
                  allResults.push(payment);
                }
              }
            });
          }
        });
        
        // Ordenar por data de criação (mais recente primeiro)
        allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Aplicar paginação
        const total = allResults.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedData = allResults.slice(offset, offset + limit);
        
        return {
          data: paginatedData,
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        };
      }

      // Executar query de contagem
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      // Executar query de dados com paginação
      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    } catch (error) {
      console.error('Error fetching paginated payments:', error);
      throw new Error('Failed to fetch paginated payments');
    }
  }

  // Método especial para lidar com filtro de nome do cliente
  async findAllPaginatedWithClientNameFilter(options: PaginationOptions = {}, filters: PaymentFilters = {}): Promise<PaginatedResult<Payment>> {
    try {
      const { page = 1, limit = 50 } = options;
      const { client_name } = filters;
      const offset = (page - 1) * limit;

      if (!client_name) {
        return this.findAllPaginated(options, { ...filters, client_name: undefined });
      }

      const searchTerm = `%${client_name}%`;

      // Query para buscar por first_name
      const firstNameQuery = supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            *,
            client:clients(*)
          )
        `)
        .ilike('contracts.clients.first_name', searchTerm)
        .order('created_at', { ascending: false });

      // Query para buscar por last_name
      const lastNameQuery = supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            *,
            client:clients(*)
          )
        `)
        .ilike('contracts.clients.last_name', searchTerm)
        .order('created_at', { ascending: false });

      // Aplicar outros filtros em ambas as queries
      const applyOtherFilters = (query: any) => {
        const {
          status,
          contractId,
          due_date_from,
          due_date_to,
          paid_date_from,
          paid_date_to,
          created_at_from,
          created_at_to,
          amount_min,
          amount_max,
          payment_method,
          payment_type,
          contract_number,
          contract_status,
          client_email,
          client_phone,
          tax_id
        } = filters;

        if (status) {
          if (status === 'pending') {
            // Para status 'pending', excluir pagamentos atrasados
            const today = new Date().toISOString().split('T')[0];
            query = query.eq('status', status).gte('due_date', today);
          } else {
            query = query.eq('status', status);
          }
        }
        if (contractId) query = query.eq('contract_id', contractId);
        if (due_date_from) query = query.gte('due_date', due_date_from);
        if (due_date_to) query = query.lte('due_date', due_date_to);
        if (paid_date_from) query = query.gte('paid_date', paid_date_from);
        if (paid_date_to) query = query.lte('paid_date', paid_date_to);
        if (created_at_from) query = query.gte('created_at', created_at_from);
        if (created_at_to) query = query.lte('created_at', created_at_to);
        if (amount_min !== undefined) query = query.gte('amount', amount_min);
        if (amount_max !== undefined) query = query.lte('amount', amount_max);
        if (payment_method) query = query.eq('payment_method', payment_method);
        if (payment_type) query = query.eq('payment_type', payment_type);
        if (contract_number) query = query.eq('contracts.contract_number', contract_number);
        if (contract_status) query = query.eq('contracts.status', contract_status);
        if (client_email) query = query.ilike('contracts.clients.email', `%${client_email}%`);
        if (client_phone) query = query.ilike('contracts.clients.phone', `%${client_phone}%`);
        if (tax_id) query = query.eq('contracts.clients.tax_id', tax_id);

        return query;
      };

      // Aplicar filtros adicionais
      const firstNameQueryFiltered = applyOtherFilters(firstNameQuery);
      const lastNameQueryFiltered = applyOtherFilters(lastNameQuery);

      // Executar ambas as queries
      const [firstNameResult, lastNameResult] = await Promise.all([
        firstNameQueryFiltered,
        lastNameQueryFiltered
      ]);

      if (firstNameResult.error) throw firstNameResult.error;
      if (lastNameResult.error) throw lastNameResult.error;

      // Combinar resultados e remover duplicatas
      const allResults = [...(firstNameResult.data || []), ...(lastNameResult.data || [])];
      const uniqueResults = allResults.filter((payment, index, self) => 
        index === self.findIndex(p => p.id === payment.id)
      );

      // Ordenar por data de criação
      uniqueResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Aplicar paginação manual
      const total = uniqueResults.length;
      const paginatedData = uniqueResults.slice(offset, offset + limit);
      const totalPages = Math.ceil(total / limit);

      return {
        data: paginatedData,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    } catch (error) {
      console.error('Error fetching paginated payments with client name filter:', error);
      throw new Error('Failed to fetch paginated payments with client name filter');
    }
  }

  async findById(id: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
          .from('payments')
          .select(`
            *,
            contract:contracts(
              *,
              client:clients(*)
            )
          `)
          .eq('id', id)
          .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching payment by ID:', error);
      throw new Error('Failed to fetch payment');
    }
  }

  async findByContractId(contractId: string): Promise<Payment[]> {
    try {
      // Para contratos específicos, vamos buscar todos os pagamentos usando paginação
      const allPayments: Payment[] = [];
      let page = 1;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const result = await this.findByContractIdPaginated(contractId, { page, limit });
        allPayments.push(...result.data);
        hasMore = result.hasNextPage;
        page++;
      }

      return allPayments;
    } catch (error) {
      console.error('Error fetching payments by contract ID:', error);
      throw new Error('Failed to fetch payments by contract ID');
    }
  }

  async findByContractIdPaginated(contractId: string, options: PaginationOptions = {}, filters: PaymentFilters = {}): Promise<PaginatedResult<Payment>> {
    try {
      const { page = 1, limit = 50 } = options;
      const { status, search } = filters;
      const offset = (page - 1) * limit;

      // Construir query base para contagem
      let countQuery = supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('contract_id', contractId);

      // Construir query base para dados
      let dataQuery = supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            *,
            client:clients(*)
          )
        `)
        .eq('contract_id', contractId);

      // Aplicar filtros
      if (status) {
        if (status === 'pending') {
          // Para status 'pending', excluir pagamentos atrasados
          const today = new Date().toISOString().split('T')[0];
          countQuery = countQuery.eq('status', status).gte('due_date', today);
          dataQuery = dataQuery.eq('status', status).gte('due_date', today);
        } else if (status === 'overdue') {
          // Para status 'overdue', buscar pagamentos 'pending' com data de vencimento passada
          const today = new Date().toISOString().split('T')[0];
          countQuery = countQuery.eq('status', 'pending').lt('due_date', today);
          dataQuery = dataQuery.eq('status', 'pending').lt('due_date', today);
        } else {
          countQuery = countQuery.eq('status', status);
          dataQuery = dataQuery.eq('status', status);
        }
      }

      if (search) {
        const searchTerm = search.trim();
        const numericValue = parseFloat(searchTerm);
        const isNumeric = !isNaN(numericValue) && isFinite(numericValue);
        
        // Construir filtro de busca abrangente
        let searchFilters = [
          `notes.ilike.%${searchTerm}%`,
          `contracts.contract_number.ilike.%${searchTerm}%`,
          `contracts.clients.first_name.ilike.%${searchTerm}%`,
          `contracts.clients.last_name.ilike.%${searchTerm}%`
        ];
        
        // Adicionar busca por valor se for numérico
        if (isNumeric && numericValue > 0) {
          searchFilters.push(`amount.eq.${numericValue}`);
        }
        
        const searchFilter = searchFilters.join(',');
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Executar query de contagem
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      // Executar query de dados com paginação
      const { data, error } = await dataQuery
        .order('due_date', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    } catch (error) {
      console.error('Error fetching paginated payments by contract ID:', error);
      throw new Error('Failed to fetch paginated payments by contract ID');
    }
  }

  async create(paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select(`
          *,
          contract:contracts(
            *,
            client:clients(*)
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw new Error('Failed to create payment');
    }
  }

  async update(id: string, paymentData: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at'>>): Promise<Payment | null> {
    try {
      // Convert undefined to null for fields that need to be cleared in Supabase
      const supabaseData = { ...paymentData };
      if (paymentData.paid_date === undefined) {
        supabaseData.paid_date = null as any;
      }
      if (paymentData.paid_amount === undefined) {
        supabaseData.paid_amount = null as any;
      }

      const { data, error } = await supabase
        .from('payments')
        .update(supabaseData)
        .eq('id', id)
        .select(`
          *,
          contract:contracts(
            *,
            client:clients(*)
          )
        `)
        .single();

      if (error) throw error;
      
      return data || null;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw new Error('Failed to update payment');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw new Error('Failed to delete payment');
    }
  }

  async findByStatus(status: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            *,
            client:clients(*)
          )
        `)
        .eq('status', status)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payments by status:', error);
      throw new Error('Failed to fetch payments by status');
    }
  }

  async findOverduePayments(): Promise<Payment[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            *,
            client:clients(*)
          )
        `)
        .eq('status', 'pending')
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching overdue payments:', error);
      throw new Error('Failed to fetch overdue payments');
    }
  }

  async markAsPaid(id: string): Promise<Payment | null> {
    try {
      const businessDay = getCurrentOrLastBusinessDay();
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_date: businessDay.toISOString().split('T')[0], // Formato YYYY-MM-DD do dia útil atual ou anterior
        })
        .eq('id', id)
        .select(`
          *,
          contract:contracts(
            *,
            client:clients(*)
          )
        `)
        .single();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      throw new Error('Failed to mark payment as paid');
    }
  }

  /**
   * Remove todos os pagamentos de um contrato específico
   */
  async deleteByContractId(contractId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('contract_id', contractId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting payments by contract ID:', error);
      throw new Error('Failed to delete payments by contract ID');
    }
  }
}