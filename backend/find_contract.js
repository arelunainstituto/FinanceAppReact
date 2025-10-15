const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findContract() {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('contract_number', '22222');

    if (error) {
      console.error('Erro:', error);
      return;
    }

    console.log('Contrato 22222:');
    console.log('===============');
    
    if (data && data.length > 0) {
      const contract = data[0];
      console.log(`ID: ${contract.id}`);
      console.log(`Número: ${contract.contract_number}`);
      console.log(`Cliente: ${contract.client_name}`);
      console.log(`Status: ${contract.status}`);
      
      // Agora buscar os pagamentos deste contrato
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: true });

      if (paymentsError) {
        console.error('Erro ao buscar pagamentos:', paymentsError);
        return;
      }

      console.log('\nPagamentos do contrato:');
      console.log('=======================');
      
      payments.forEach((payment, index) => {
        console.log(`${index + 1}. ID: ${payment.id}`);
        console.log(`   Tipo: ${payment.payment_type || 'N/A'}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Valor: ${payment.amount}`);
        console.log(`   Valor Pago: ${payment.paid_amount || 0}`);
        console.log(`   Data Vencimento: ${payment.due_date}`);
        console.log(`   Data Pagamento: ${payment.paid_date || 'NULL'}`);
        console.log(`   Método: ${payment.payment_method || 'N/A'}`);
        console.log(`   Criado: ${payment.created_at}`);
        console.log(`   Atualizado: ${payment.updated_at}`);
        console.log('   ---');
      });
    } else {
      console.log('Contrato 22222 não encontrado');
    }
  } catch (err) {
    console.error('Erro ao consultar:', err);
  }
}

findContract();
