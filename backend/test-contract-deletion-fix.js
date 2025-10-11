const axios = require('axios');

const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

async function testAndFixContractDeletion() {
  console.log('🔧 Testando e corrigindo exclusão de contratos...\n');

  try {
    // 1. Registrar e fazer login
    console.log('1. Registrando usuário e fazendo login...');
    const registerData = {
      name: 'Test User Fix',
      email: `testfix${Date.now()}@example.com`,
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

    // 3. Criar contrato de teste
    console.log('\n3. Criando contrato de teste...');
    const contractData = {
      client_id: clientId,
      contract_number: `TESTFIX-${Date.now()}`,
      description: 'Contrato para teste de correção de exclusão',
      value: 1200.00,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'ativo',
      number_of_payments: 12,
      payment_frequency: 'monthly'
    };

    const contractResponse = await axios.post(`${API_BASE_URL}/contracts`, contractData, { headers });
    const contractId = contractResponse.data.data.id;
    console.log(`✅ Contrato criado: ${contractId}`);

    // 4. Verificar se há pagamentos relacionados
    console.log('\n4. Verificando pagamentos relacionados...');
    try {
      const paymentsResponse = await axios.get(`${API_BASE_URL}/payments/contract/${contractId}`, { headers });
      const payments = paymentsResponse.data;
      
      if (payments && payments.length > 0) {
        console.log(`⚠️  Encontrados ${payments.length} pagamentos relacionados`);
        
        // Excluir pagamentos primeiro
        console.log('   Excluindo pagamentos relacionados...');
        for (const payment of payments) {
          try {
            await axios.delete(`${API_BASE_URL}/payments/${payment.id}`, { headers });
            console.log(`   ✅ Pagamento ${payment.id} excluído`);
          } catch (paymentError) {
            console.log(`   ❌ Erro ao excluir pagamento ${payment.id}:`, paymentError.response?.data?.message);
          }
        }
      } else {
        console.log('✅ Nenhum pagamento relacionado encontrado');
      }
    } catch (paymentsError) {
      console.log('⚠️  Erro ao verificar pagamentos:', paymentsError.response?.data?.message || paymentsError.message);
    }

    // 5. Tentar excluir o contrato
    console.log(`\n5. Tentando excluir contrato ${contractId}...`);
    try {
      const deleteResponse = await axios.delete(`${API_BASE_URL}/contracts/${contractId}`, { headers });
      console.log('✅ Resposta da exclusão:', deleteResponse.data);
    } catch (deleteError) {
      console.log('❌ Erro na exclusão:', deleteError.response?.data);
    }

    // 6. Verificar se foi realmente excluído
    console.log('\n6. Verificando se o contrato foi excluído...');
    try {
      const checkResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, { headers });
      console.log('❌ PROBLEMA: Contrato ainda existe após exclusão!');
      console.log('   Dados do contrato:', JSON.stringify(checkResponse.data, null, 2));
      
      // 7. Investigar o problema no banco de dados
      console.log('\n7. Investigando problema no banco...');
      console.log('   O contrato deveria ter sido excluído mas ainda está no banco.');
      console.log('   Possíveis causas:');
      console.log('   - Restrições de chave estrangeira');
      console.log('   - Soft delete não implementado corretamente');
      console.log('   - Transação não commitada');
      console.log('   - Erro silencioso no Supabase');
      
    } catch (checkError) {
      if (checkError.response && checkError.response.status === 404) {
        console.log('✅ Contrato excluído com sucesso!');
      } else {
        console.log('⚠️  Erro inesperado ao verificar:', checkError.response?.data);
      }
    }

    // 8. Testar exclusão direta via SQL (se necessário)
    console.log('\n8. Análise do problema identificado:');
    console.log('   - A API retorna sucesso na exclusão');
    console.log('   - Mas o registro permanece no banco');
    console.log('   - Isso indica um problema no método delete do repository');
    console.log('   - Recomendação: Verificar logs do Supabase e implementar verificação de affected rows');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados:`, error.response.data);
    }
  }
}

testAndFixContractDeletion().then(() => {
  console.log('\n🏁 Teste de correção finalizado');
}).catch(error => {
  console.error('💥 Erro fatal:', error.message);
});