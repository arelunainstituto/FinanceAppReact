const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestContract() {
  try {
    // Criar cliente fictício
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Cliente Teste',
        last_name: 'Saldo Devedor',
        email: 'teste.saldo.' + Date.now() + '@email.com',
        phone: '999999999',
        address: 'Rua Teste, 123',
        status: 'active'
      })
      .select()
      .single();

    if (clientError) {
      console.error('Erro ao criar cliente:', clientError);
      return;
    }

    console.log('Cliente criado:', client);

    // Criar contrato fictício
    const contractNumber = 'TEST-' + Date.now();
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        client_id: client.id,
        contract_number: contractNumber,
        description: 'Contrato para testar saldo devedor',
        value: 5000.00,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'active'
      })
      .select()
      .single();

    if (contractError) {
      console.error('Erro ao criar contrato:', contractError);
      return;
    }

    console.log('Contrato criado:', contract);

    // Criar pagamentos com saldo devedor
    const payments = [
      {
        contract_id: contract.id,
        amount: 1000.00,
        paid_amount: 800.00, // Pago parcialmente - saldo devedor de 200
        due_date: '2024-01-15',
        paid_date: '2024-01-15',
        status: 'partial',
        payment_method: 'bank_transfer',
        notes: 'Pagamento parcial - saldo devedor',
        payment_type: 'normalPayment'
      },
      {
        contract_id: contract.id,
        amount: 1500.00,
        paid_amount: 0.00, // Não pago - saldo devedor total
        due_date: '2024-02-15',
        paid_date: null,
        status: 'overdue',
        payment_method: null,
        notes: 'Pagamento em atraso - saldo devedor total',
        payment_type: 'normalPayment'
      },
      {
        contract_id: contract.id,
        amount: 2000.00,
        paid_amount: 2200.00, // Pago a mais - saldo positivo
        due_date: '2024-03-15',
        paid_date: '2024-03-15',
        status: 'paid',
        payment_method: 'credit_card',
        notes: 'Pagamento com valor a mais - saldo positivo',
        payment_type: 'normalPayment'
      }
    ];

    for (const payment of payments) {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();

      if (paymentError) {
        console.error('Erro ao criar pagamento:', paymentError);
      } else {
        console.log('Pagamento criado:', paymentData);
      }
    }

    console.log('\n=== RESUMO ===');
    console.log('Cliente ID:', client.id);
    console.log('Contrato ID:', contract.id);
    console.log('Número do Contrato:', contractNumber);
    console.log('\nSaldos esperados:');
    console.log('- Saldo Devedor: R$ 1.300,00 (200 + 1500 - 400 de excesso)');
    console.log('- Saldo Positivo: R$ 200,00 (excesso do terceiro pagamento)');

  } catch (error) {
    console.error('Erro geral:', error);
  }
}

createTestContract();