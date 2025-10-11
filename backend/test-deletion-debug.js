const axios = require('axios');

const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

async function testDeletionDebug() {
  try {
    console.log('🔍 Debug detalhado da exclusão de contratos...\n');

    // 1. Registrar usuário
    console.log('1. Registrando usuário...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      name: 'Debug User',
      email: `debug.${Date.now()}@example.com`,
      password: 'password123'
    });

    const token = registerResponse.data.token || registerResponse.data.data?.token;
    console.log('Token obtido:', token ? 'Sim' : 'Não');
    console.log('Resposta completa:', registerResponse.data);
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('✅ Usuário registrado');

    // 2. Criar cliente
    console.log('\n2. Criando cliente...');
    const clientResponse = await axios.post(`${API_BASE_URL}/clients`, {
      first_name: 'Cliente',
      last_name: 'Debug',
      email: `cliente.debug.${Date.now()}@example.com`,
      phone: '11999999999'
    }, { headers: authHeaders });

    const clientId = clientResponse.data.data.id;
    console.log('✅ Cliente criado:', clientId);

    // 3. Criar contrato
    console.log('\n3. Criando contrato...');
    const contractResponse = await axios.post(`${API_BASE_URL}/contracts`, {
      client_id: clientId,
      value: 1000.00,
      status: 'ativo',
      description: 'Contrato debug'
    }, { headers: authHeaders });

    const contractId = contractResponse.data.data.id;
    console.log('✅ Contrato criado:', contractId);

    // 4. Verificar contrato existe
    console.log('\n4. Verificando contrato antes da exclusão...');
    const beforeResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, { headers: authHeaders });
    console.log('✅ Contrato existe:', beforeResponse.data.data.id);

    // 5. Tentar excluir com logs detalhados
    console.log('\n5. Iniciando exclusão com logs detalhados...');
    
    try {
      const deleteResponse = await axios.delete(`${API_BASE_URL}/contracts/${contractId}`, { headers: authHeaders });
      console.log('✅ Resposta da exclusão:');
      console.log('Status:', deleteResponse.status);
      console.log('Data:', deleteResponse.data);
      console.log('Headers:', Object.keys(deleteResponse.headers));
    } catch (deleteError) {
      console.log('❌ Erro na exclusão:');
      console.log('Status:', deleteError.response?.status);
      console.log('Data:', deleteError.response?.data);
      throw deleteError;
    }

    // 6. Aguardar um pouco para garantir que a operação foi processada
    console.log('\n6. Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. Verificar se foi excluído
    console.log('\n7. Verificando se foi excluído...');
    try {
      const afterResponse = await axios.get(`${API_BASE_URL}/contracts/${contractId}`, { headers: authHeaders });
      console.log('❌ PROBLEMA: Contrato ainda existe!');
      console.log('Dados:', afterResponse.data);
      
      console.log('\n============================================================');
      console.log('❌ EXCLUSÃO FALHOU - CONTRATO AINDA EXISTE');
      console.log('============================================================');
    } catch (notFoundError) {
      if (notFoundError.response?.status === 404) {
        console.log('✅ SUCESSO: Contrato foi excluído corretamente!');
        console.log('\n============================================================');
        console.log('✅ EXCLUSÃO FUNCIONOU CORRETAMENTE');
        console.log('============================================================');
      } else {
        console.log('❌ Erro inesperado ao verificar exclusão:', notFoundError.response?.data);
      }
    }

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testDeletionDebug();