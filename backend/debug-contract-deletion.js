const axios = require('axios');

const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

async function debugContractDeletion() {
  console.log('🔍 Debug detalhado da exclusão de contratos...\n');

  try {
    // 1. Registrar e fazer login
    console.log('1. Registrando usuário e fazendo login...');
    const registerData = {
      name: 'Debug User',
      email: `debug${Date.now()}@example.com`,
      password: 'password123'
    };

    await axios.post(`${API_BASE_URL}/auth/register`, registerData);
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: registerData.email,
      password: registerData.password
    });

    const token = loginResponse.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login realizado com sucesso');

    // 2. Obter cliente existente
    console.log('\n2. Obtendo cliente existente...');
    const clientsResponse = await axios.get(`${API_BASE_URL}/clients?page=1&limit=1`, { headers });
    const clientId = clientsResponse.data.data[0].id;
    console.log(`✅ Cliente encontrado: ${clientId}`);

    // 3. Criar contrato simples (sem pagamentos automáticos)
    console.log('\n3. Criando contrato simples...');
    const contractData = {
      client_id: clientId,
      contract_number: `DEBUG-${Date.now()}`,
      description: 'Contrato para debug de exclusão',
      value: 100.00,
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      status: 'ativo',
      number_of_payments: 1,
      payment_frequency: 'monthly'
    };

    const contractResponse = await axios.post(`${API_BASE_URL}/contracts`, contractData, { headers });
    const contractId = contractResponse.data.data.id;
    console.log(`✅ Contrato criado: ${contractId}`);

    // 4. Verificar se o contrato existe antes da exclusão
    console.log('\n4. Verificando contrato antes da exclusão...');
    try {
      const beforeDeleteResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, { headers });
      console.log('✅ Contrato encontrado antes da exclusão');
      console.log('   Status:', beforeDeleteResponse.data.status);
      console.log('   Valor:', beforeDeleteResponse.data.value);
    } catch (error) {
      console.log('❌ Erro ao verificar contrato antes da exclusão:', error.response?.status);
      return;
    }

    // 5. Verificar pagamentos relacionados
    console.log('\n5. Verificando pagamentos relacionados...');
    try {
      const paymentsResponse = await axios.get(`${API_BASE_URL}/payments/contract/${contractId}`, { headers });
      console.log(`✅ Encontrados ${paymentsResponse.data.length || 0} pagamentos relacionados`);
      if (paymentsResponse.data.length > 0) {
        console.log('   IDs dos pagamentos:', paymentsResponse.data.map(p => p.id));
      }
    } catch (paymentsError) {
      console.log('⚠️  Erro ao verificar pagamentos:', paymentsError.response?.status);
    }

    // 6. Tentar excluir o contrato
    console.log(`\n6. Tentando excluir contrato ${contractId}...`);
    let deleteResponse;
    try {
      deleteResponse = await axios.delete(`${API_BASE_URL}/contracts/${contractId}`, { headers });
      console.log('✅ Resposta da exclusão:');
      console.log('   Status:', deleteResponse.status);
      console.log('   Data:', deleteResponse.data);
      console.log('   Headers:', deleteResponse.headers);
    } catch (deleteError) {
      console.log('❌ Erro na exclusão:');
      console.log('   Status:', deleteError.response?.status);
      console.log('   Data:', deleteError.response?.data);
      return;
    }

    // 7. Aguardar um pouco para garantir que a operação foi processada
    console.log('\n7. Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 8. Verificar se foi realmente excluído
    console.log('\n8. Verificando se o contrato foi excluído...');
    try {
      const afterDeleteResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, { headers });
      console.log('❌ PROBLEMA CONFIRMADO: Contrato ainda existe!');
      console.log('   Status da resposta:', afterDeleteResponse.status);
      console.log('   ID do contrato:', afterDeleteResponse.data.id);
      console.log('   Status do contrato:', afterDeleteResponse.data.status);
      
      // 9. Verificar se os pagamentos ainda existem
      console.log('\n9. Verificando se os pagamentos ainda existem...');
      try {
        const paymentsAfterResponse = await axios.get(`${API_BASE_URL}/payments/contract/${contractId}`, { headers });
        console.log(`   Pagamentos restantes: ${paymentsAfterResponse.data.length || 0}`);
      } catch (paymentsAfterError) {
        console.log('   Pagamentos não encontrados (pode ser bom sinal)');
      }

      // 10. Análise do problema
      console.log('\n🔍 ANÁLISE DO PROBLEMA:');
      console.log('   - A API retorna sucesso (200) na exclusão');
      console.log('   - Mas o contrato permanece no banco de dados');
      console.log('   - Isso indica um problema no método delete do repository');
      console.log('   - Possíveis causas:');
      console.log('     * Transação não commitada');
      console.log('     * Erro silencioso no Supabase');
      console.log('     * Problema de cache no Supabase');
      console.log('     * Restrições de chave estrangeira não tratadas');

    } catch (afterDeleteError) {
      if (afterDeleteError.response && afterDeleteError.response.status === 404) {
        console.log('✅ SUCESSO! Contrato excluído corretamente!');
        console.log('   O contrato não foi encontrado (404) - exclusão bem-sucedida');
      } else {
        console.log('⚠️  Erro inesperado ao verificar:', afterDeleteError.response?.status);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados:`, error.response.data);
    }
  }
}

debugContractDeletion().then(() => {
  console.log('\n🏁 Debug de exclusão concluído');
}).catch(error => {
  console.error('💥 Erro fatal:', error.message);
});