import { supabase } from '../config/database';
import { Contract } from '../models';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface ContractFilters {
  search?: string;
  status?: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  tax_id?: string;
  contract_number?: string;
  local?: string;
  area?: string;
  gestora?: string;
  medico?: string;
  value_min?: number;
  value_max?: number;
  number_of_payments_from?: number;
  number_of_payments_to?: number;
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  created_at_from?: string;
  created_at_to?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ContractRepository {
  async findAll(): Promise<Contract[]> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(*),
          payments(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching contracts:', error);
      throw new Error('Failed to fetch contracts');
    }
  }

  async findAllPaginated(options: PaginationOptions = {}, filters: ContractFilters = {}): Promise<PaginatedResult<Contract>> {
    try {
      const { page = 1, limit = 50 } = options;
      const { 
        search,
        status,
        client_id,
        client_name,
        client_email,
        client_phone,
        tax_id,
        contract_number,
        local,
        area,
        gestora,
        medico,
        value_min,
        value_max,
        number_of_payments_from,
        number_of_payments_to,
        start_date_from,
        start_date_to,
        end_date_from,
        end_date_to,
        created_at_from,
        created_at_to
      } = filters;
      const offset = (page - 1) * limit;

      // Verificar se há filtros de cliente para determinar o tipo de JOIN
      const hasClientFilters = client_name || client_email || client_phone || tax_id || 
                               (search && search.trim().length > 0);

      // Query base para contagem
      let countQuery = supabase
        .from('contracts')
        .select(`
          *,
          client:clients${hasClientFilters ? '!inner' : ''}(*)
        `, { count: 'exact', head: true });

      // Query base para dados
      let dataQuery = supabase
        .from('contracts')
        .select(`
          *,
          client:clients${hasClientFilters ? '!inner' : ''}(*),
          payments(*)
        `);

      // Aplicar filtros de contrato
      if (client_id) {
        countQuery = countQuery.eq('client_id', client_id);
        dataQuery = dataQuery.eq('client_id', client_id);
      }

      if (status) {
        countQuery = countQuery.eq('status', status);
        dataQuery = dataQuery.eq('status', status);
      }

      if (contract_number) {
        countQuery = countQuery.ilike('contract_number', `%${contract_number}%`);
        dataQuery = dataQuery.ilike('contract_number', `%${contract_number}%`);
      }

      // Filtros dos novos campos
      if (local) {
        countQuery = countQuery.ilike('local', `%${local}%`);
        dataQuery = dataQuery.ilike('local', `%${local}%`);
      }

      if (area) {
        countQuery = countQuery.ilike('area', `%${area}%`);
        dataQuery = dataQuery.ilike('area', `%${area}%`);
      }

      if (gestora) {
        countQuery = countQuery.ilike('gestora', `%${gestora}%`);
        dataQuery = dataQuery.ilike('gestora', `%${gestora}%`);
      }

      if (medico) {
        countQuery = countQuery.ilike('medico', `%${medico}%`);
        dataQuery = dataQuery.ilike('medico', `%${medico}%`);
      }

      // Filtros de valor
      if (value_min !== undefined) {
        countQuery = countQuery.gte('value', value_min);
        dataQuery = dataQuery.gte('value', value_min);
      }

      if (value_max !== undefined) {
        countQuery = countQuery.lte('value', value_max);
        dataQuery = dataQuery.lte('value', value_max);
      }

      // Filtros de quantidade de parcelas
      if (number_of_payments_from !== undefined) {
        countQuery = countQuery.gte('number_of_payments', number_of_payments_from);
        dataQuery = dataQuery.gte('number_of_payments', number_of_payments_from);
      }

      if (number_of_payments_to !== undefined) {
        countQuery = countQuery.lte('number_of_payments', number_of_payments_to);
        dataQuery = dataQuery.lte('number_of_payments', number_of_payments_to);
      }

      // Filtros de data
      if (start_date_from) {
        countQuery = countQuery.gte('start_date', start_date_from);
        dataQuery = dataQuery.gte('start_date', start_date_from);
      }

      if (start_date_to) {
        countQuery = countQuery.lte('start_date', start_date_to);
        dataQuery = dataQuery.lte('start_date', start_date_to);
      }

      if (end_date_from) {
        countQuery = countQuery.gte('end_date', end_date_from);
        dataQuery = dataQuery.gte('end_date', end_date_from);
      }

      if (end_date_to) {
        countQuery = countQuery.lte('end_date', end_date_to);
        dataQuery = dataQuery.lte('end_date', end_date_to);
      }

      if (created_at_from) {
        countQuery = countQuery.gte('created_at', created_at_from);
        dataQuery = dataQuery.gte('created_at', created_at_from);
      }

      if (created_at_to) {
        countQuery = countQuery.lte('created_at', created_at_to);
        dataQuery = dataQuery.lte('created_at', created_at_to);
      }

      // Filtros de cliente
      if (client_name) {
        // Aplicar o filtro client_name usando múltiplos filtros separados
        countQuery = countQuery.or(`first_name.ilike.%${client_name}%,last_name.ilike.%${client_name}%`, { foreignTable: 'clients' });
        dataQuery = dataQuery.or(`first_name.ilike.%${client_name}%,last_name.ilike.%${client_name}%`, { foreignTable: 'clients' });
      }

      if (client_email) {
        countQuery = countQuery.ilike('clients.email', `%${client_email}%`);
        dataQuery = dataQuery.ilike('clients.email', `%${client_email}%`);
      }

      if (client_phone) {
        countQuery = countQuery.ilike('clients.phone', `%${client_phone}%`);
        dataQuery = dataQuery.ilike('clients.phone', `%${client_phone}%`);
      }

      if (tax_id) {
        countQuery = countQuery.eq('clients.tax_id', tax_id);
        dataQuery = dataQuery.eq('clients.tax_id', tax_id);
      }

      // Busca geral - usar abordagem mais simples sem JOIN complexo
      if (search) {
        const searchTerm = search.trim();
        const numericValue = parseFloat(searchTerm);
        const isNumeric = !isNaN(numericValue) && isFinite(numericValue);
        
        // Usar apenas campos da tabela contracts para evitar problemas com JOIN
        const searchConditions = [
          `contract_number.ilike.%${searchTerm}%`,
          `description.ilike.%${searchTerm}%`,
          `local.ilike.%${searchTerm}%`,
          `area.ilike.%${searchTerm}%`,
          `gestora.ilike.%${searchTerm}%`,
          `medico.ilike.%${searchTerm}%`
        ];
        
        // Adicionar busca por valor se for numérico
        if (isNumeric && numericValue > 0) {
          searchConditions.push(`value.eq.${numericValue}`);
        }
        
        const searchFilter = searchConditions.join(',');
        
        console.log('Search filter (contracts only):', searchFilter);
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Executar query de contagem
      console.log('Executando countQuery...');
      const { count, error: countError } = await countQuery;
      console.log('CountQuery result:', { count, countError });
      if (countError) {
        console.error('Count error details:', countError);
        throw countError;
      }

      // Executar query de dados com paginação
      console.log('Executando dataQuery...');
      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      console.log('DataQuery result:', { dataLength: data?.length, error });
      if (error) {
        console.error('Data error details:', error);
        throw error;
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error: any) {
      console.error('Error fetching paginated contracts:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Filters used:', JSON.stringify(filters, null, 2));
      console.error('Error message:', error?.message || 'No message');
      console.error('Error code:', error?.code || 'No code');
      console.error('Error details from Supabase:', error?.details || 'No details');
      throw new Error('Failed to fetch paginated contracts');
    }
  }

  async findById(id: string): Promise<Contract | null> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(*),
          payments(*)
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching contract by ID:', error);
      throw new Error('Failed to fetch contract');
    }
  }

  async findByClientId(clientId: string): Promise<Contract[]> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(*),
          payments(*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching contracts by client ID:', error);
      throw new Error('Failed to fetch contracts by client ID');
    }
  }

  async create(contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<Contract> {
    try {
      console.log('Creating contract with data:', contractData);
      const { data, error } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw new Error('Failed to create contract');
    }
  }

  async update(id: string, contractData: Partial<Omit<Contract, 'id' | 'created_at' | 'updated_at'>>): Promise<Contract | null> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update(contractData)
        .eq('id', id)
        .select(`
          *,
          client:clients(*),
          payments(*)
        `)
        .single();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error updating contract:', error);
      throw new Error('Failed to update contract');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      console.log(`Starting deletion process for contract: ${id}`);
      
      // Primeiro, verificar se o contrato existe
      const { data: existingContract, error: findError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', id)
        .single();

      if (findError || !existingContract) {
        console.warn(`Contract not found for deletion: ${id}`);
        throw new Error('Contract not found');
      }

      console.log(`Contract found, proceeding with deletion: ${id}`);

      // Primeiro, excluir todos os pagamentos relacionados
      const { data: deletedPayments, error: paymentsError, count: paymentsCount } = await supabase
        .from('payments')
        .delete()
        .eq('contract_id', id)
        .select();

      if (paymentsError) {
        console.error('Error deleting related payments:', paymentsError);
        throw new Error('Failed to delete related payments');
      }

      console.log(`Deleted ${paymentsCount || 0} related payments`);

      // Depois, excluir o contrato
      const { data: deletedContract, error: contractError, count: contractCount } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id)
        .select();

      if (contractError) {
        console.error('Error deleting contract:', contractError);
        throw new Error(`Failed to delete contract: ${contractError.message}`);
      }

      console.log(`Delete operation result:`, {
        deletedContract,
        contractCount,
        hasData: !!deletedContract,
        dataLength: deletedContract?.length || 0
      });

      // Verificar se algum registro foi realmente excluído
      if (!deletedContract || deletedContract.length === 0) {
        console.error(`No contract was deleted for id: ${id}`);
        throw new Error('Contract deletion failed - no records affected');
      }

      // Verificar se o contrato ainda existe após a exclusão
      const { data: stillExists, error: verifyError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', id)
        .single();

      if (!verifyError && stillExists) {
        console.error(`Contract still exists after deletion attempt: ${id}`);
        throw new Error('Contract deletion failed - record still exists');
      }

      console.log(`Successfully deleted contract ${id} and ${paymentsCount || 0} related payments`);
      return true;
    } catch (error) {
      console.error('Error in delete method:', error);
      throw error;
    }
  }

  async findByStatus(status: string): Promise<Contract[]> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(*),
          payments(*)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching contracts by status:', error);
      throw new Error('Failed to fetch contracts by status');
    }
  }

  async findContractDetails(id: string): Promise<any> {
    try {
      console.log('🔍 ContractRepository: Finding contract details for ID:', id);
      
      // Get contract with client and all payments
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(*),
          payments(*)
        `)
        .eq('id', id)
        .single();

      console.log('📊 ContractRepository: Supabase query result:', { contract, contractError });

      if (contractError && contractError.code !== 'PGRST116') {
        console.error('❌ ContractRepository: Supabase error:', contractError);
        throw contractError;
      }
      
      if (!contract) {
        console.log('❌ ContractRepository: Contract not found for ID:', id);
        return null;
      }

      console.log('✅ ContractRepository: Contract found:', {
        id: contract.id,
        contract_number: contract.contract_number,
        client: contract.client,
        paymentsCount: contract.payments?.length || 0
      });

      // Debug: Log the raw payments structure
      console.log('🔍 ContractRepository: Raw payments structure:', {
        paymentsExists: !!contract.payments,
        paymentsType: typeof contract.payments,
        paymentsIsArray: Array.isArray(contract.payments),
        paymentsLength: contract.payments?.length,
        firstPayment: contract.payments?.[0] || 'No first payment'
      });

      // Log detailed payment information for debugging
      if (contract.payments && contract.payments.length > 0) {
        console.log('💰 ContractRepository: Payment details:');
        contract.payments.forEach((payment: any, index: number) => {
          console.log(`  Payment ${index + 1}:`, {
            id: payment.id,
            payment_type: payment.payment_type,
            amount: payment.amount,
            status: payment.status,
            due_date: payment.due_date
          });
        });
      } else {
        console.log('❌ ContractRepository: No payments found in contract data');
      }

      // Calculate paid percentage based on actual payments made
      const contractValue = parseFloat(contract.value || '0');
      
      // Sum all paid payments (downPayment and normalPayment only, as per new requirements)
      const paidPayments = contract.payments?.filter((payment: any) => 
        payment.status === 'paid' && 
        (payment.payment_method === 'downPayment' || 
         payment.payment_method === 'normalPayment' ||
         payment.payment_type === 'downPayment' || 
         payment.payment_type === 'normalPayment')
      ) || [];
      
      const totalPaidFromPayments = paidPayments.reduce((sum: number, payment: any) => {
        return sum + parseFloat(payment.amount || '0');
      }, 0);

      // New calculation: percentage based only on actual payments made
      const totalPaid = totalPaidFromPayments;
      const paidPercentage = contractValue > 0 ? (totalPaid / contractValue) * 100 : 0;

      // Filter payments by type
      const regularPayments = contract.payments?.filter((payment: any) => 
        payment.payment_type === 'installment' || 
        payment.payment_type === 'normalPayment' || 
        payment.payment_type === 'downPayment' ||
        !payment.payment_type
      ) || [];
      
      const complementaryPayments = contract.payments?.filter((payment: any) => 
        payment.payment_type && payment.payment_type.startsWith('comp')
      ) || [];

      const result = {
        ...contract,
        client: contract.client,
        paidPercentage: Math.round(paidPercentage * 100) / 100, // Round to 2 decimal places
        totalPaid,
        totalPaidFromPayments,
        regularPayments,
        complementaryPayments,
        paymentsSummary: {
          total: contract.payments?.length || 0,
          paid: contract.payments?.filter((p: any) => p.status === 'paid').length || 0,
          pending: contract.payments?.filter((p: any) => p.status === 'pending').length || 0,
          overdue: contract.payments?.filter((p: any) => p.status === 'overdue').length || 0,
          failed: contract.payments?.filter((p: any) => p.status === 'failed').length || 0,
          regularPaymentsCount: regularPayments.length,
          complementaryPaymentsCount: complementaryPayments.length
        }
      };

      return result;
    } catch (error) {
      console.error('❌ ContractRepository: Error fetching contract details:', error);
      throw new Error('Failed to fetch contract details');
    }
  }
}