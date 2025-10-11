const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertTestDataForDeletion() {
  try {
    console.log('🚀 Inserindo dados de teste para testar deleção...\n');

    // 1. Criar clientes de teste
    console.log('1. Criando clientes de teste...');
    const clientsToInsert = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        first_name: 'João',
        last_name: 'Silva - TESTE DELEÇÃO',
        email: 'joao.teste@email.com',
        phone: '11999999999',
        address: 'Rua das Flores, 123, São Paulo, SP',
        tax_id: '12345678901',
        status: 'active'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        first_name: 'Maria',
        last_name: 'Santos - TESTE DELEÇÃO',
        email: 'maria.teste@email.com',
        phone: '11888888888',
        address: 'Av. Paulista, 456, São Paulo, SP',
        tax_id: '98765432109',
        status: 'active'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        first_name: 'Pedro',
        last_name: 'Costa - TESTE DELEÇÃO',
        email: 'pedro.teste@email.com',
        phone: '11777777777',
        address: 'Rua Augusta, 789, São Paulo, SP',
        tax_id: '45678912345',
        status: 'active'
      }
    ];

    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .upsert(clientsToInsert, { onConflict: 'id' })
      .select();

    if (clientError) {
      console.error('❌ Erro ao criar clientes:', clientError);
      return;
    }

    console.log(`✅ ${clients.length} clientes criados/atualizados`);

    // 2. Criar contratos de teste
    console.log('\n2. Criando contratos de teste...');
    const contractsToInsert = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        client_id: '11111111-1111-1111-1111-111111111111',
        contract_number: 'TESTE-001',
        description: 'Contrato TESTE para deleção - Consultoria',
        value: 5000.00,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'ativo',
        local: 'São Paulo',
        area: 'Consultoria',
        gestora: 'Gestora TESTE',
        medico: 'Dr. TESTE'
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        client_id: '22222222-2222-2222-2222-222222222222',
        contract_number: 'TESTE-002',
        description: 'Contrato TESTE para deleção - Desenvolvimento',
        value: 8000.00,
        start_date: '2024-02-01',
        end_date: '2024-11-30',
        status: 'ativo',
        local: 'Rio de Janeiro',
        area: 'Desenvolvimento',
        gestora: 'Gestora TESTE 2',
        medico: 'Dr. TESTE 2'
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        client_id: '33333333-3333-3333-3333-333333333333',
        contract_number: 'TESTE-003',
        description: 'Contrato TESTE para deleção - Manutenção',
        value: 3000.00,
        start_date: '2024-03-01',
        end_date: '2024-09-30',
        status: 'ativo',
        local: 'Belo Horizonte',
        area: 'Manutenção',
        gestora: 'Gestora TESTE 3',
        medico: 'Dr. TESTE 3'
      }
    ];

    const { data: contracts, error: contractError } = await supabase
      .from('contracts')
      .upsert(contractsToInsert, { onConflict: 'id' })
      .select();

    if (contractError) {
      console.error('❌ Erro ao criar contratos:', contractError);
      return;
    }

    console.log(`✅ ${contracts.length} contratos criados/atualizados`);

    // 3. Criar pagamentos de teste
    console.log('\n3. Criando pagamentos de teste...');
    const paymentsData = [
      // Pagamentos para Contrato 1 (João Silva)
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        contract_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        amount: 500.00,
        due_date: '2024-01-15',
        paid_date: '2024-01-15',
        status: 'paid',
        payment_method: 'pix',
        notes: 'Primeira parcela TESTE - PAGO'
      },
      {
        id: 'a1111111-1111-1111-1111-111111111112',
        contract_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        amount: 500.00,
        due_date: '2024-02-15',
        status: 'pending',
        notes: 'Segunda parcela TESTE - PENDENTE'
      },
      {
        id: 'a1111111-1111-1111-1111-111111111113',
        contract_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        amount: 500.00,
        due_date: '2024-01-01',
        status: 'overdue',
        notes: 'Terceira parcela TESTE - ATRASADA'
      },
      
      // Pagamentos para Contrato 2 (Maria Santos)
      {
        id: 'b2222222-2222-2222-2222-222222222221',
        contract_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        amount: 1000.00,
        due_date: '2024-02-15',
        paid_date: '2024-02-15',
        status: 'paid',
        payment_method: 'credit_card',
        notes: 'Primeira parcela TESTE - PAGO'
      },
      {
        id: 'b2222222-2222-2222-2222-222222222222',
        contract_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        amount: 1000.00,
        due_date: '2024-03-15',
        status: 'pending',
        notes: 'Segunda parcela TESTE - PENDENTE'
      },
      
      // Pagamentos para Contrato 3 (Pedro Costa)
      {
        id: 'c3333333-3333-3333-3333-333333333331',
        contract_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        amount: 750.00,
        due_date: '2024-03-15',
        paid_date: '2024-03-15',
        status: 'paid',
        payment_method: 'bank_transfer',
        notes: 'Primeira parcela TESTE - PAGO'
      },
      {
        id: 'c3333333-3333-3333-3333-333333333332',
        contract_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        amount: 750.00,
        due_date: '2024-01-01',
        status: 'overdue',
        notes: 'Segunda parcela TESTE - ATRASADA'
      }
    ];

    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .upsert(paymentsData, { onConflict: 'id' })
      .select();

    if (paymentError) {
      console.error('❌ Erro ao criar pagamentos:', paymentError);
      return;
    }

    console.log(`✅ ${payments.length} pagamentos criados/atualizados`);

    // 4. Resumo dos dados criados
    console.log('\n📊 RESUMO DOS DADOS DE TESTE CRIADOS:');
    console.log('=====================================');
    console.log('👥 CLIENTES:');
    clients.forEach(client => {
      console.log(`   • ${client.first_name} ${client.last_name} (${client.email})`);
    });

    console.log('\n📄 CONTRATOS:');
    contracts.forEach(contract => {
      console.log(`   • ${contract.title} - Valor: R$ ${contract.value}`);
    });

    console.log('\n💰 PAGAMENTOS:');
    console.log(`   • Total de ${payments.length} pagamentos criados`);
    console.log(`   • Status: ${payments.filter(p => p.status === 'paid').length} pagos, ${payments.filter(p => p.status === 'pending').length} pendentes, ${payments.filter(p => p.status === 'overdue').length} atrasados`);

    console.log('\n✅ DADOS DE TESTE INSERIDOS COM SUCESSO!');
    console.log('🗑️  Agora você pode testar a funcionalidade de deleção com estes dados.');
    console.log('⚠️  Todos os dados têm "TESTE" no nome/descrição para fácil identificação.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
insertTestDataForDeletion();