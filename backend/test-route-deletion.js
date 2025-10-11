const axios = require('axios');

const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

async function testContractDeletionRoute() {
  console.log('🔍 Testando rota de exclusão de contratos...\n');

  try {
    // 1. Registrar usuário de teste
    console.log('1. Registrando usuário de teste...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      name: 'Teste Route',
      email: `teste.route.${Date.now()}@example.com`,
      password: 'senha123'
    });
    console.log('✅ Usuário registrado com sucesso');

    // 2. Fazer login
    console.log('\n2. Fazendo login...');
    console.log('Dados do registro:', registerResponse.data);
    
    const userEmail = registerResponse.data.data?.user?.email || registerResponse.data.email || registerResponse.data.user?.email;
    if (!userEmail) {
      throw new Error('Email não encontrado na resposta do registro');
    }
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: userEmail,
      password: 'senha123'
    });
    
    const token = loginResponse.data.token || loginResponse.data.data?.token;
    console.log('✅ Login realizado com sucesso');
    console.log('Token obtido:', token ? token.substring(0, 20) + '...' : 'Token não encontrado');

    // 3. Configurar headers de autenticação
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 4. Obter um cliente existente
    console.log('\n3. Obtendo cliente existente...');
    const clientsResponse = await axios.get(`${API_BASE_URL}/clients`, {
      headers: authHeaders
    });
    
    if (clientsResponse.data.length === 0) {
      throw new Error('Nenhum cliente encontrado');
    }
    
    const clientId = clientsResponse.data[0].id;
    console.log('✅ Cliente obtido:', clientsResponse.data[0].name);

    // 5. Criar contrato de teste
    console.log('\n4. Criando contrato de teste...');
    const contractData = {
      client_id: clientId,
      description: 'Contrato teste para exclusão de rota',
      value: 1000.00,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'active',
      payment_frequency: 'monthly'
    };

    const createResponse = await axios.post(`${API_BASE_URL}/contracts`, contractData, {
      headers: authHeaders
    });
    
    const contractId = createResponse.data.id;
    console.log('✅ Contrato criado com ID:', contractId);

    // 6. Verificar se o contrato existe antes da exclusão
    console.log('\n5. Verificando contrato antes da exclusão...');
    const beforeDeleteResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, {
      headers: authHeaders
    });
    console.log('✅ Contrato encontrado:', beforeDeleteResponse.data.description);

    // 7. Testar a rota de exclusão
    console.log('\n6. Testando rota de exclusão...');
    console.log(`URL: DELETE ${API_BASE_URL}/contracts/${contractId}`);
    
    const deleteResponse = await axios.delete(`${API_BASE_URL}/contracts/${contractId}`, {
      headers: authHeaders
    });
    
    console.log('✅ Resposta da exclusão:');
    console.log('Status:', deleteResponse.status);
    console.log('Data:', deleteResponse.data);

    // 8. Verificar se o contrato foi realmente excluído
    console.log('\n7. Verificando se o contrato foi excluído...');
    try {
      const afterDeleteResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, {
        headers: authHeaders
      });
      
      if (afterDeleteResponse.data) {
        console.log('❌ PROBLEMA: Contrato ainda existe após exclusão!');
        console.log('Dados do contrato:', afterDeleteResponse.data);
        return false;
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Contrato foi excluído com sucesso (404 - Not Found)');
        return true;
      } else {
        console.log('❌ Erro inesperado ao verificar exclusão:', error.message);
        return false;
      }
    }

    console.log('❌ PROBLEMA: Contrato ainda existe após exclusão!');
    return false;

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return false;
  }
}

// Executar teste
testContractDeletionRoute().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ TESTE PASSOU: Rota de exclusão funcionando corretamente');
  } else {
    console.log('❌ TESTE FALHOU: Problema na rota de exclusão');
  }
  console.log('='.repeat(50));
});