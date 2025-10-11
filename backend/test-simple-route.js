const axios = require('axios');

const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

async function testSimpleContractDeletion() {
  console.log('🔍 Teste simples da rota de exclusão de contratos...\n');

  try {
    // 1. Registrar usuário
    console.log('1. Registrando usuário...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      name: 'Teste Simple',
      email: `teste.simple.${Date.now()}@example.com`,
      password: 'senha123'
    });

    const token = registerResponse.data.data.token;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    console.log('✅ Usuário registrado e token obtido');

    // 2. Criar cliente
    console.log('\n2. Criando cliente...');
    const clientResponse = await axios.post(`${API_BASE_URL}/clients`, {
      first_name: 'Cliente',
      last_name: 'Teste Route',
      email: `cliente.teste.${Date.now()}@example.com`,
      phone: '11999999999'
    }, { headers: authHeaders });
    
    const clientId = clientResponse.data.data?.id || clientResponse.data.id;
    console.log('✅ Cliente criado com ID:', clientId);
    console.log('Resposta completa:', clientResponse.data);

    // 3. Criar contrato
    console.log('\n3. Criando contrato...');
    const contractResponse = await axios.post(`${API_BASE_URL}/contracts`, {
      client_id: clientId,
      value: 1000.00,
      status: 'ativo',
      description: 'Contrato de teste'
    }, { headers: authHeaders });
    
    const contractId = contractResponse.data.data?.id || contractResponse.data.id;
    console.log('✅ Contrato criado com ID:', contractId);
    console.log('Resposta completa:', contractResponse.data);

    // 4. Verificar contrato existe
    console.log('\n4. Verificando contrato antes da exclusão...');
    const beforeResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, {
      headers: authHeaders
    });
    console.log('✅ Contrato encontrado:', beforeResponse.data.description);

    // 5. TESTAR A ROTA DE EXCLUSÃO
    console.log('\n5. 🎯 TESTANDO ROTA DE EXCLUSÃO...');
    console.log(`URL: DELETE ${API_BASE_URL}/contracts/${contractId}`);
    
    const deleteResponse = await axios.delete(`${API_BASE_URL}/contracts/${contractId}`, {
      headers: authHeaders
    });
    
    console.log('📊 Resposta da exclusão:');
    console.log('  Status:', deleteResponse.status);
    console.log('  Headers:', Object.keys(deleteResponse.headers));
    console.log('  Data:', deleteResponse.data);

    // 6. Verificar se foi realmente excluído
    console.log('\n6. Verificando se foi excluído...');
    
    // Aguardar um pouco para garantir que a operação foi processada
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const afterResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, {
        headers: authHeaders
      });
      
      console.log('❌ PROBLEMA: Contrato ainda existe!');
      console.log('Dados:', afterResponse.data);
      return false;
      
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ SUCESSO: Contrato foi excluído (404)');
        return true;
      } else {
        console.log('❌ Erro inesperado:', error.message);
        return false;
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return false;
  }
}

testSimpleContractDeletion().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ ROTA DE EXCLUSÃO FUNCIONANDO CORRETAMENTE');
  } else {
    console.log('❌ PROBLEMA NA ROTA DE EXCLUSÃO CONFIRMADO');
  }
  console.log('='.repeat(60));
});