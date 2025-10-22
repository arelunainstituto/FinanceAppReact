import { supabase } from '../config/database';

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalContracts: number;
  activeContracts: number;
  totalPayments: number;
  totalRevenue: number;
  totalReceived: number; // NOVO: total efetivamente recebido
  pendingPayments: number;
  overduePayments: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
  paymentsByStatus: Array<{
    status: string;
    count: number;
  }>;
}

export class DashboardService {
  /**
   * Obter estatísticas do dashboard
   */
  async getStats(): Promise<DashboardStats> {
    try {
      // Executar todas as consultas em paralelo para melhor performance
      const [
        clientsResult,
        activeClientsResult,
        contractsResult,
        activeContractsResult,
        paymentsResult,
        contractsValueResult,
        paidPaymentsResult, // NOVO: para calcular totalReceived
        pendingPaymentsResult,
        overduePaymentsResult,
        monthlyRevenue,
        paymentsByStatus
      ] = await Promise.all([
        // Total de clientes
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true }),
        
        // Clientes ativos
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativo'),
        
        // Total de contratos
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true }),
        
        // Contratos ativos
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativo'),
        
        // Total de pagamentos
        supabase
          .from('payments')
          .select('*', { count: 'exact', head: true }),
        
        // Receita total (soma dos valores dos contratos)
        supabase
          .from('contracts')
          .select('value'),
        
        // NOVO: Total recebido (soma de paid_amount ou amount dos pagamentos pagos)
        supabase
          .from('payments')
          .select('amount, paid_amount')
          .eq('status', 'paid'),
        
        // Pagamentos pendentes
        supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        
        // Pagamentos em atraso (pending com data vencida)
        supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .lt('due_date', new Date().toISOString().split('T')[0]),
        
        // Receita mensal
        this.getMonthlyRevenue(),
        
        // Pagamentos por status
        this.getPaymentsByStatus()
      ]);

      // Calcular receita total (soma dos contratos)
      const totalRevenue = contractsValueResult.data?.reduce((sum: number, contract: any) => sum + contract.value, 0) || 0;

      // NOVO: Calcular total efetivamente recebido
      const totalReceived = paidPaymentsResult.data?.reduce((sum: number, payment: any) => {
        // Usar paid_amount se existir e for > 0, caso contrário usar amount
        const paymentValue = (payment.paid_amount && payment.paid_amount > 0) 
          ? Number(payment.paid_amount)
          : Number(payment.amount);
        return sum + paymentValue;
      }, 0) || 0;

      return {
        totalClients: clientsResult.count || 0,
        activeClients: activeClientsResult.count || 0,
        totalContracts: contractsResult.count || 0,
        activeContracts: activeContractsResult.count || 0,
        totalPayments: paymentsResult.count || 0,
        totalRevenue,
        totalReceived, // NOVO
        pendingPayments: pendingPaymentsResult.count || 0,
        overduePayments: overduePaymentsResult.count || 0,
        monthlyRevenue,
        paymentsByStatus
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas do dashboard:', error);
      throw error;
    }
  }

  /**
   * Obter receita mensal dos últimos 6 meses
   */
  private async getMonthlyRevenue(): Promise<Array<{ month: string; revenue: number }>> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // CORRIGIDO: usar paid_date (não paid_at) e paid_amount (não amount)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_amount, paid_date')
        .eq('status', 'paid')
        .gte('paid_date', sixMonthsAgo.toISOString())
        .not('paid_date', 'is', null);

      const monthlyData: { [key: string]: number } = {};

      payments?.forEach((payment: any) => {
        if (payment.paid_date) {
          const date = new Date(payment.paid_date);
          // Formato: "Jan", "Feb", etc.
          const monthShort = date.toLocaleDateString('pt-PT', { month: 'short' });
          const month = monthShort.charAt(0).toUpperCase() + monthShort.slice(1, 3);
          
          // CORRIGIDO: usar paid_amount se > 0, caso contrário amount
          const paymentValue = (payment.paid_amount && payment.paid_amount > 0) 
            ? Number(payment.paid_amount)
            : Number(payment.amount);
          
          monthlyData[month] = (monthlyData[month] || 0) + paymentValue;
        }
      });

      // Ordenar por mês (últimos 6 meses)
      const now = new Date();
      const result: Array<{ month: string; revenue: number }> = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthShort = date.toLocaleDateString('pt-PT', { month: 'short' });
        const month = monthShort.charAt(0).toUpperCase() + monthShort.slice(1, 3);
        result.push({
          month,
          revenue: monthlyData[month] || 0,
        });
      }

      return result;
    } catch (error) {
      console.error('Erro ao obter receita mensal:', error);
      return [];
    }
  }

  /**
   * Obter contagem de pagamentos por status
   */
  private async getPaymentsByStatus(): Promise<Array<{ status: string; count: number }>> {
    try {
      // CORRIGIDO: Usar agregação SQL direta em vez de iterar todos os pagamentos
      // Buscar contagem real de cada status
      const { data: statusCounts, error } = await supabase
        .rpc('get_payment_status_counts');

      // Se a função RPC não existe, fazer manualmente
      if (error || !statusCounts) {
        console.log('RPC não disponível, usando query manual');
        
        // Query para todos os status diretos
        const [paidResult, pendingResult, renegociadoResult, failedResult] = await Promise.all([
          supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
          supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'renegociado'),
          supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
        ]);

        // Calcular overdue (pending com due_date < hoje)
        const today = new Date().toISOString().split('T')[0];
        const overdueResult = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .lt('due_date', today);

        // Calcular pending real (pending com due_date >= hoje)
        const pendingNotOverdue = (pendingResult.count || 0) - (overdueResult.count || 0);

        return [
          { status: 'paid', count: paidResult.count || 0 },
          { status: 'pending', count: pendingNotOverdue },
          { status: 'overdue', count: overdueResult.count || 0 },
          { status: 'renegociado', count: renegociadoResult.count || 0 },
          { status: 'failed', count: failedResult.count || 0 },
        ];
      }

      return statusCounts;
    } catch (error) {
      console.error('Erro ao obter pagamentos por status:', error);
      return [];
    }
  }
}