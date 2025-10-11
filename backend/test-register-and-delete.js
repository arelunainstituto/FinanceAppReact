const axios = require('axios');

const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

async function testRegisterAndContractDeletion() {
  console.log('🧪 Testando registro de usuário e exclusão de contratos...\n');

  try {
    // 1. Registrar um novo usuário
    console.log('1. Registrando novo usuário...');
    const registerData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'password123'
    };

    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
      console.log('✅ Usuário registrado com sucesso');
      console.log(`   Email: ${registerData.email}`);
    } catch (registerError) {
      if (registerError.response && registerError.response.status === 409) {
        console.log('⚠️  Usuário já existe, continuando com login...');
        registerData.email = 'test@example.com'; // Usar email padrão
      } else {
        throw registerError;
      }
    }

    // 2. Login para obter token
    console.log('\n2. Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: registerData.email,
      password: registerData.password
    });

    if (!loginResponse.data.data || !loginResponse.data.data.token) {
      console.log('❌ Token não encontrado na resposta do login');
      console.log('   Resposta completa:', JSON.stringify(loginResponse.data, null, 2));
      throw new Error('Token não encontrado na resposta');
    }

    const token = loginResponse.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login realizado com sucesso\n');

    // 3. Criar um cliente primeiro (necessário para criar contrato)
    console.log('3. Criando cliente de teste...');
    const clientData = {
      name: 'Cliente Teste',
      email: 'cliente@teste.com',
      phone: '11999999999',
      tax_id: '12345678901',
      address: 'Rua Teste, 123'
    };

    let clientId;
    try {
      const clientResponse = await axios.post(`${API_BASE_URL}/clients`, clientData, { headers });
      clientId = clientResponse.data.id;
      console.log(`✅ Cliente criado com ID: ${clientId}`);
    } catch (clientError) {
      console.log('⚠️  Erro ao criar cliente, tentando usar cliente existente...');
      // Tentar obter um cliente existente
      const clientsResponse = await axios.get(`${API_BASE_URL}/clients?page=1&limit=1`, { headers });
      if (clientsResponse.data.data && clientsResponse.data.data.length > 0) {
        clientId = clientsResponse.data.data[0].id;
        console.log(`✅ Usando cliente existente com ID: ${clientId}`);
      } else {
        throw new Error('Não foi possível criar ou encontrar um cliente');
      }
    }

    // 4. Criar um contrato de teste
    console.log('\n4. Criando contrato de teste...');
    const contractData = {
      client_id: clientId,
      contract_number: `TEST-${Date.now()}`,
      description: 'Contrato de teste para exclusão',
      value: 1000.00,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'ativo',
      number_of_payments: 12,
      payment_frequency: 'monthly'
    };

    const contractResponse = await axios.post(`${API_BASE_URL}/contracts`, contractData, { headers });
    console.log('Resposta da criação do contrato:', JSON.stringify(contractResponse.data, null, 2));
    
    const contractId = contractResponse.data.data?.id || contractResponse.data.id;
    if (!contractId) {
      throw new Error('ID do contrato não encontrado na resposta');
    }
    console.log(`✅ Contrato criado com ID: ${contractId}`);

    // 5. Tentar excluir o contrato
    console.log(`\n5. Tentando excluir contrato ID: ${contractId}...`);

    try {
      const deleteResponse = await axios.delete(`${API_BASE_URL}/contracts/${contractId}`, { headers });
      
      if (deleteResponse.status === 200 && deleteResponse.data.success) {
        console.log('✅ Contrato excluído com sucesso');
        console.log(`   Resposta: ${deleteResponse.data.message}`);
      } else {
        console.log('❌ Falha na exclusão do contrato');
        console.log(`   Status: ${deleteResponse.status}`);
        console.log(`   Resposta:`, deleteResponse.data);
      }
    } catch (deleteError) {
      console.log('❌ Erro ao excluir contrato:');
      if (deleteError.response) {
        console.log(`   Status: ${deleteError.response.status}`);
        console.log(`   Erro: ${deleteError.response.data?.message || deleteError.response.data}`);
        
        // Se o erro for relacionado a pagamentos, vamos verificar
        if (deleteError.response.status === 400 || deleteError.response.status === 409) {
          console.log('\n   🔍 Verificando pagamentos relacionados...');
          try {
            const paymentsResponse = await axios.get(`${API_BASE_URL}/payments/contract/${contractId}`, { headers });
            if (paymentsResponse.data && paymentsResponse.data.length > 0) {
              console.log(`   ⚠️  Encontrados ${paymentsResponse.data.length} pagamentos relacionados:`);
              paymentsResponse.data.forEach((payment, index) => {
                console.log(`      ${index + 1}. ID: ${payment.id} | Status: ${payment.status} | Valor: R$ ${payment.amount}`);
              });
              
              // Tentar excluir os pagamentos primeiro
              console.log('\n   🗑️  Tentando excluir pagamentos relacionados...');
              for (const payment of paymentsResponse.data) {
                try {
                  await axios.delete(`${API_BASE_URL}/payments/${payment.id}`, { headers });
                  console.log(`   ✅ Pagamento ${payment.id} excluído`);
                } catch (paymentDeleteError) {
                  console.log(`   ❌ Erro ao excluir pagamento ${payment.id}:`, paymentDeleteError.response?.data?.message || paymentDeleteError.message);
                }
              }
              
              // Tentar excluir o contrato novamente
              console.log('\n   🔄 Tentando excluir contrato novamente...');
              try {
                const retryDeleteResponse = await axios.delete(`${API_BASE_URL}/contracts/${contractId}`, { headers });
                console.log('   ✅ Contrato excluído com sucesso após remoção dos pagamentos');
              } catch (retryError) {
                console.log('   ❌ Ainda não foi possível excluir o contrato:', retryError.response?.data?.message || retryError.message);
              }
            }
          } catch (paymentsError) {
            console.log('   ❌ Erro ao verificar pagamentos:', paymentsError.response?.data?.message || paymentsError.message);
          }
        }
      } else {
        console.log(`   Erro: ${deleteError.message}`);
      }
    }

    // 6. Verificar se o contrato foi realmente excluído
    console.log('\n6. Verificando se o contrato foi excluído...');
    try {
      const checkResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, { headers });
      console.log('❌ Contrato ainda existe - exclusão falhou');
      console.log(`   Status: ${checkResponse.status}`);
    } catch (checkError) {
      if (checkError.response && checkError.response.status === 404) {
        console.log('✅ Contrato não encontrado - exclusão bem-sucedida');
      } else {
        console.log('⚠️  Erro inesperado ao verificar exclusão:');
        console.log(`   Status: ${checkError.response?.status || 'N/A'}`);
        console.log(`   Erro: ${checkError.response?.data?.message || checkError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados:`, error.response.data);
    }
  }
}

// Executar teste
testRegisterAndContractDeletion().then(() => {
  console.log('\n🏁 Teste de registro e exclusão de contratos finalizado');
}).catch(error => {
  console.error('💥 Erro fatal:', error.message);
});