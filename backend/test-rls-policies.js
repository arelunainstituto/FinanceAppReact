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

async function checkRLSPolicies() {
  try {
    console.log('🔍 Verificando políticas RLS...\n');

    // Verificar se RLS está habilitado nas tabelas
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_rls_status');

    if (tablesError) {
      console.log('⚠️ Não foi possível verificar RLS via RPC, tentando query direta...');
      
      // Query direta para verificar RLS
      const { data: rlsData, error: rlsError } = await supabase
        .from('pg_class')
        .select('relname, relrowsecurity')
        .in('relname', ['contracts', 'payments', 'clients', 'users']);

      if (rlsError) {
        console.error('Erro ao verificar RLS:', rlsError);
      } else {
        console.log('Status RLS das tabelas:', rlsData);
      }
    } else {
      console.log('Status RLS das tabelas:', tables);
    }

    // Verificar políticas específicas para contratos
    console.log('\n📋 Verificando políticas para tabela contracts...');
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'contracts' });

    if (policiesError) {
      console.log('⚠️ Não foi possível verificar políticas via RPC, tentando query direta...');
      
      // Query SQL direta para verificar políticas
      const { data: directPolicies, error: directError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'contracts');

      if (directError) {
        console.error('Erro ao verificar políticas:', directError);
      } else {
        console.log('Políticas encontradas para contracts:', directPolicies);
      }
    } else {
      console.log('Políticas para contracts:', policies);
    }

    // Testar exclusão direta com diferentes contextos de usuário
    console.log('\n🧪 Testando exclusão direta...');
    
    // Primeiro, criar um contrato de teste
    const testClient = {
      first_name: 'Test',
      last_name: 'RLS',
      email: `test-rls-${Date.now()}@test.com`,
      phone: '11999999999',
      address: 'Test Address'
    };

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert(testClient)
      .select()
      .single();

    if (clientError) {
      console.error('Erro ao criar cliente de teste:', clientError);
      return;
    }

    console.log('✅ Cliente de teste criado:', client.id);

    const testContract = {
      client_id: client.id,
      contract_number: `TEST-RLS-${Date.now()}`,
      description: 'Contrato de teste para RLS',
      value: 1000.00,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'ativo'
    };

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert(testContract)
      .select()
      .single();

    if (contractError) {
      console.error('Erro ao criar contrato de teste:', contractError);
      return;
    }

    console.log('✅ Contrato de teste criado:', contract.id);

    // Tentar excluir o contrato
    console.log('\n🗑️ Tentando excluir contrato...');
    
    const { data: deleteResult, error: deleteError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contract.id)
      .select();

    if (deleteError) {
      console.error('❌ Erro ao excluir contrato:', deleteError);
      console.log('Detalhes do erro:', JSON.stringify(deleteError, null, 2));
    } else {
      console.log('✅ Resultado da exclusão:', deleteResult);
    }

    // Verificar se o contrato ainda existe
    const { data: checkContract, error: checkError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contract.id);

    if (checkError) {
      console.error('Erro ao verificar contrato:', checkError);
    } else {
      console.log('Contrato após exclusão:', checkContract);
      if (checkContract.length === 0) {
        console.log('✅ Contrato foi excluído com sucesso!');
      } else {
        console.log('❌ Contrato ainda existe após exclusão!');
      }
    }

    // Limpar dados de teste
    await supabase.from('clients').delete().eq('id', client.id);

  } catch (error) {
    console.error('Erro geral:', error);
  }
}

checkRLSPolicies();