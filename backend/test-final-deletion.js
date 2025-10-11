const axios = require('axios');

const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

async function testFinalDeletion() {
  console.log('🔧 Teste final da correção de exclusão de contratos...\n');

  try {
    // 1. Registrar e fazer login
    console.log('1. Registrando usuário e fazendo login...');
    const registerData = {
      name: 'Final Test User',
      email: `finaltest${Date.now()}@example.com`,
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
      contract_number: `FINAL-${Date.now()}`,
      description: 'Contrato para teste final de exclusão',
      value: 600.00,
      start_date: '2024-01-01',
      end_date: '2024-06-30',
      status: 'ativo',
      number_of_payments: 6,
      payment_frequency: 'monthly'
    };

    const contractResponse = await axios.post(`${API_BASE_URL}/contracts`, contractData, { headers });
    const contractId = contractResponse.data.data.id;
    console.log(`✅ Contrato criado: ${contractId}`);

    // 4. Aguardar um pouco para garantir que os pagamentos foram criados
    console.log('\n4. Aguardando criação dos pagamentos automáticos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Verificar pagamentos criados
    console.log('\n5. Verificando pagamentos criados...');
    try {
      const paymentsResponse = await axios.get(`${API_BASE_URL}/payments/contract/${contractId}`, { headers });
      const payments = paymentsResponse.data;
      console.log(`✅ Encontrados ${payments.length} pagamentos relacionados`);
    } catch (paymentsError) {
      console.log('⚠️  Erro ao verificar pagamentos:', paymentsError.response?.data?.message);
    }

    // 6. Tentar excluir o contrato (agora com a correção)
    console.log(`\n6. Tentando excluir contrato ${contractId} com a correção...`);
    try {
      const deleteResponse = await axios.delete(`${API_BASE_URL}/contracts/${contractId}`, { headers });
      console.log('✅ Resposta da exclusão:', deleteResponse.data);
    } catch (deleteError) {
      console.log('❌ Erro na exclusão:', deleteError.response?.data);
      return;
    }

    // 7. Verificar se foi realmente excluído
    console.log('\n7. Verificando se o contrato foi excluído...');
    try {
      const checkResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, { headers });
      console.log('❌ PROBLEMA AINDA PERSISTE: Contrato ainda existe após exclusão!');
      console.log('   Status:', checkResponse.status);
      console.log('   Isso indica que a correção ainda não foi deployada ou há outro problema.');
    } catch (checkError) {
      if (checkError.response && checkError.response.status === 404) {
        console.log('✅ SUCESSO! Contrato excluído com sucesso!');
        console.log('   A correção funcionou - o contrato não foi encontrado (404)');
        
        // 8. Verificar se os pagamentos também foram excluídos
        console.log('\n8. Verificando se os pagamentos também foram excluídos...');
        try {
          const paymentsCheckResponse = await axios.get(`${API_BASE_URL}/payments/contract/${contractId}`, { headers });
          if (paymentsCheckResponse.data.length === 0) {
            console.log('✅ Pagamentos também foram excluídos corretamente!');
          } else {
            console.log(`⚠️  Ainda existem ${paymentsCheckResponse.data.length} pagamentos órfãos`);
          }
        } catch (paymentsCheckError) {
          console.log('✅ Pagamentos não encontrados - exclusão completa!');
        }
      } else {
        console.log('⚠️  Erro inesperado ao verificar:', checkError.response?.status, checkError.response?.data);
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

testFinalDeletion().then(() => {
  console.log('\n🏁 Teste final de exclusão concluído');
}).catch(error => {
  console.error('💥 Erro fatal:', error.message);
});