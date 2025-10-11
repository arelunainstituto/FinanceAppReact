require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testSimpleDeletion() {
  try {
    console.log('🧪 Teste Simples de Exclusão\n');

    // 1. Criar cliente de teste
    console.log('1️⃣ Criando cliente de teste...');
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Test',
        last_name: 'Simple',
        email: `test-simple-${Date.now()}@test.com`,
        phone: '11999999999',
        address: 'Test Address'
      })
      .select()
      .single();

    if (clientError) {
      console.error('❌ Erro ao criar cliente:', clientError);
      return;
    }

    console.log('✅ Cliente criado:', client.id);

    // 2. Criar contrato de teste
    console.log('\n2️⃣ Criando contrato de teste...');
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        client_id: client.id,
        contract_number: `TEST-SIMPLE-${Date.now()}`,
        description: 'Contrato de teste simples',
        value: 1000.00,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'ativo'
      })
      .select()
      .single();

    if (contractError) {
      console.error('❌ Erro ao criar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato criado:', contract.id);

    // 3. Criar alguns pagamentos para testar CASCADE
    console.log('\n3️⃣ Criando pagamentos de teste...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .insert([
        {
          contract_id: contract.id,
          amount: 500.00,
          due_date: '2024-02-01',
          status: 'pendente',
          payment_type: 'parcela'
        },
        {
          contract_id: contract.id,
          amount: 500.00,
          due_date: '2024-03-01',
          status: 'pendente',
          payment_type: 'parcela'
        }
      ])
      .select();

    if (paymentsError) {
      console.error('❌ Erro ao criar pagamentos:', paymentsError);
    } else {
      console.log(`✅ ${payments.length} pagamentos criados`);
    }

    // 4. Verificar estado inicial
    console.log('\n4️⃣ Verificando estado inicial...');
    
    const { data: initialContracts } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contract.id);
    
    const { data: initialPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('contract_id', contract.id);

    console.log(`📊 Estado inicial: ${initialContracts.length} contrato, ${initialPayments.length} pagamentos`);

    // 5. Tentar exclusão com diferentes métodos
    console.log('\n5️⃣ Testando diferentes métodos de exclusão...');

    // Método 1: Exclusão simples
    console.log('\n🔸 Método 1: Exclusão simples');
    const { data: deleteResult1, error: deleteError1 } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contract.id);

    console.log('Resultado:', deleteResult1);
    console.log('Erro:', deleteError1);

    // Verificar se foi excluído
    const { data: checkAfter1 } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contract.id);

    console.log(`Status após método 1: ${checkAfter1.length} contratos restantes`);

    if (checkAfter1.length > 0) {
      console.log('❌ Contrato ainda existe, tentando método 2...');

      // Método 2: Exclusão com select
      console.log('\n🔸 Método 2: Exclusão com select');
      const { data: deleteResult2, error: deleteError2 } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id)
        .select();

      console.log('Resultado:', deleteResult2);
      console.log('Erro:', deleteError2);

      // Verificar novamente
      const { data: checkAfter2 } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contract.id);

      console.log(`Status após método 2: ${checkAfter2.length} contratos restantes`);

      if (checkAfter2.length > 0) {
        console.log('❌ Contrato ainda existe, tentando método 3...');

        // Método 3: Exclusão manual de pagamentos primeiro
        console.log('\n🔸 Método 3: Excluir pagamentos primeiro');
        
        const { data: paymentsDeleteResult, error: paymentsDeleteError } = await supabase
          .from('payments')
          .delete()
          .eq('contract_id', contract.id);

        console.log('Pagamentos excluídos:', paymentsDeleteResult);
        console.log('Erro pagamentos:', paymentsDeleteError);

        // Agora excluir o contrato
        const { data: deleteResult3, error: deleteError3 } = await supabase
          .from('contracts')
          .delete()
          .eq('id', contract.id)
          .select();

        console.log('Resultado contrato:', deleteResult3);
        console.log('Erro contrato:', deleteError3);

        // Verificar final
        const { data: checkAfter3 } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contract.id);

        console.log(`Status após método 3: ${checkAfter3.length} contratos restantes`);
      }
    }

    // 6. Verificar estado final
    console.log('\n6️⃣ Verificação final...');
    
    const { data: finalContracts } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contract.id);
    
    const { data: finalPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('contract_id', contract.id);

    console.log(`📊 Estado final: ${finalContracts.length} contratos, ${finalPayments.length} pagamentos`);

    if (finalContracts.length === 0) {
      console.log('✅ Contrato foi excluído com sucesso!');
    } else {
      console.log('❌ Contrato ainda existe após todas as tentativas!');
      console.log('Dados do contrato:', finalContracts[0]);
    }

    // Limpar cliente de teste
    await supabase.from('clients').delete().eq('id', client.id);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testSimpleDeletion();