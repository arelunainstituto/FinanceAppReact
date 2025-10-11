require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

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

async function testApiVsDirectDeletion() {
  try {
    console.log('🧪 Teste: API vs Exclusão Direta\n');

    // 1. Registrar usuário
    console.log('1️⃣ Registrando usuário...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      name: 'Test User API',
      email: `test-api-${Date.now()}@test.com`,
      password: 'password123'
    });

    const token = registerResponse.data.token;
    console.log('✅ Usuário registrado, token obtido');

    // 2. Criar cliente via API
    console.log('\n2️⃣ Criando cliente via API...');
    const clientResponse = await axios.post(`${API_BASE_URL}/clients`, {
      first_name: 'Test',
      last_name: 'Client API',
      email: `client-api-${Date.now()}@test.com`,
      phone: '11999999999',
      address: 'Test Address'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const clientId = clientResponse.data.data.id;
    console.log('✅ Cliente criado:', clientId);

    // 3. Criar dois contratos idênticos
    console.log('\n3️⃣ Criando dois contratos idênticos...');
    
    const contractData = {
      client_id: clientId,
      contract_number: `TEST-API-${Date.now()}`,
      description: 'Contrato de teste para comparação',
      value: 1000.00,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'ativo'
    };

    // Contrato 1 - será excluído via API
    const contract1Response = await axios.post(`${API_BASE_URL}/contracts`, contractData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contract1Id = contract1Response.data.data.id;
    console.log('✅ Contrato 1 criado (para API):', contract1Id);

    // Contrato 2 - será excluído diretamente
    contractData.contract_number = `TEST-DIRECT-${Date.now()}`;
    const contract2Response = await axios.post(`${API_BASE_URL}/contracts`, contractData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contract2Id = contract2Response.data.data.id;
    console.log('✅ Contrato 2 criado (para exclusão direta):', contract2Id);

    // 4. Verificar se ambos existem
    console.log('\n4️⃣ Verificando existência dos contratos...');
    
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*')
      .in('id', [contract1Id, contract2Id]);

    if (contractsError) {
      console.error('Erro ao verificar contratos:', contractsError);
      return;
    }

    console.log(`✅ Contratos encontrados: ${contracts.length}/2`);
    contracts.forEach(c => console.log(`   - ${c.id}: ${c.contract_number}`));

    // 5. Excluir contrato 1 via API
    console.log('\n5️⃣ Excluindo contrato 1 via API...');
    
    try {
      const deleteApiResponse = await axios.delete(`${API_BASE_URL}/contracts/${contract1Id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ API retornou sucesso:', deleteApiResponse.data);
    } catch (error) {
      console.error('❌ Erro na API:', error.response?.data || error.message);
    }

    // 6. Excluir contrato 2 diretamente
    console.log('\n6️⃣ Excluindo contrato 2 diretamente...');
    
    const { data: directDeleteResult, error: directDeleteError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contract2Id)
      .select();

    if (directDeleteError) {
      console.error('❌ Erro na exclusão direta:', directDeleteError);
    } else {
      console.log('✅ Exclusão direta bem-sucedida:', directDeleteResult);
    }

    // 7. Verificar quais contratos ainda existem
    console.log('\n7️⃣ Verificação final - contratos restantes...');
    
    const { data: remainingContracts, error: remainingError } = await supabase
      .from('contracts')
      .select('*')
      .in('id', [contract1Id, contract2Id]);

    if (remainingError) {
      console.error('Erro ao verificar contratos restantes:', remainingError);
    } else {
      console.log(`📊 Contratos restantes: ${remainingContracts.length}/2`);
      
      if (remainingContracts.length === 0) {
        console.log('✅ Ambos os contratos foram excluídos com sucesso!');
      } else {
        console.log('❌ Alguns contratos ainda existem:');
        remainingContracts.forEach(c => {
          const method = c.id === contract1Id ? 'API' : 'Direto';
          console.log(`   - ${c.id} (${method}): ${c.contract_number}`);
        });
      }
    }

    // 8. Verificar logs detalhados do repositório
    console.log('\n8️⃣ Testando método do repositório diretamente...');
    
    // Criar um terceiro contrato para testar o repositório
    const { data: testContract, error: testContractError } = await supabase
      .from('contracts')
      .insert({
        client_id: clientId,
        contract_number: `TEST-REPO-${Date.now()}`,
        description: 'Contrato para teste do repositório',
        value: 1000.00,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'ativo'
      })
      .select()
      .single();

    if (testContractError) {
      console.error('Erro ao criar contrato de teste:', testContractError);
    } else {
      console.log('✅ Contrato de teste criado:', testContract.id);
      
      // Simular o que o repositório faz
      console.log('\n🔍 Simulando passos do repositório...');
      
      // Passo 1: Verificar se existe
      const { data: existsCheck, error: existsError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', testContract.id)
        .single();
      
      console.log('Passo 1 - Contrato existe?', existsCheck ? 'Sim' : 'Não', existsError);
      
      // Passo 2: Excluir pagamentos relacionados (se houver)
      const { data: paymentsDeleted, error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('contract_id', testContract.id)
        .select();
      
      console.log('Passo 2 - Pagamentos excluídos:', paymentsDeleted?.length || 0, paymentsError);
      
      // Passo 3: Excluir o contrato
      const { data: contractDeleted, error: contractDeleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', testContract.id)
        .select();
      
      console.log('Passo 3 - Contrato excluído:', contractDeleted, contractDeleteError);
      
      // Passo 4: Verificar se foi excluído
      const { data: finalCheck, error: finalError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', testContract.id);
      
      console.log('Passo 4 - Verificação final:', finalCheck?.length === 0 ? 'Excluído' : 'Ainda existe', finalError);
    }

    // Limpar dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    await supabase.from('clients').delete().eq('id', clientId);

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.error('Detalhes da resposta:', error.response.data);
    }
  }
}

testApiVsDirectDeletion();