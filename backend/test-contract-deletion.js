const axios = require('axios');

const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

async function testContractDeletion() {
  console.log('🧪 Testando funcionalidade de exclusão de contratos...\n');

  try {
    // 1. Login para obter token
    console.log('1. Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Falha no login');
    }

    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login realizado com sucesso\n');

    // 2. Listar contratos existentes
    console.log('2. Listando contratos existentes...');
    const contractsResponse = await axios.get(`${API_BASE_URL}/contracts?page=1&limit=5`, { headers });
    
    if (!contractsResponse.data.data || contractsResponse.data.data.length === 0) {
      console.log('❌ Nenhum contrato encontrado para testar exclusão');
      return;
    }

    const contracts = contractsResponse.data.data;
    console.log(`✅ Encontrados ${contracts.length} contratos`);
    
    // Mostrar detalhes dos contratos
    contracts.forEach((contract, index) => {
      console.log(`   ${index + 1}. ID: ${contract.id} | Cliente: ${contract.client?.name || 'N/A'} | Status: ${contract.status}`);
    });
    console.log('');

    // 3. Tentar excluir o primeiro contrato
    const contractToDelete = contracts[0];
    console.log(`3. Tentando excluir contrato ID: ${contractToDelete.id}...`);

    try {
      const deleteResponse = await axios.delete(`${API_BASE_URL}/contracts/${contractToDelete.id}`, { headers });
      
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
      } else {
        console.log(`   Erro: ${deleteError.message}`);
      }
    }

    // 4. Verificar se o contrato foi realmente excluído
    console.log('\n4. Verificando se o contrato foi excluído...');
    try {
      const checkResponse = await axios.get(`${API_BASE_URL}/contracts/${contractToDelete.id}`, { headers });
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

    // 5. Verificar se os pagamentos relacionados foram tratados adequadamente
    console.log('\n5. Verificando pagamentos relacionados ao contrato...');
    try {
      const paymentsResponse = await axios.get(`${API_BASE_URL}/payments/contract/${contractToDelete.id}`, { headers });
      
      if (paymentsResponse.data && paymentsResponse.data.length > 0) {
        console.log('⚠️  Pagamentos relacionados ainda existem:');
        paymentsResponse.data.forEach((payment, index) => {
          console.log(`   ${index + 1}. ID: ${payment.id} | Status: ${payment.status} | Valor: R$ ${payment.amount}`);
        });
      } else {
        console.log('✅ Nenhum pagamento relacionado encontrado');
      }
    } catch (paymentsError) {
      if (paymentsError.response && paymentsError.response.status === 404) {
        console.log('✅ Nenhum pagamento relacionado encontrado');
      } else {
        console.log('⚠️  Erro ao verificar pagamentos relacionados:');
        console.log(`   Status: ${paymentsError.response?.status || 'N/A'}`);
        console.log(`   Erro: ${paymentsError.response?.data?.message || paymentsError.message}`);
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
testContractDeletion().then(() => {
  console.log('\n🏁 Teste de exclusão de contratos finalizado');
}).catch(error => {
  console.error('💥 Erro fatal:', error.message);
});