require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';

async function testProductionDeletion() {
  try {
    console.log('🧪 Teste de Exclusão na Produção\n');
    console.log('🌐 API Base URL:', API_BASE_URL);

    // 1. Registrar usuário
    console.log('1️⃣ Registrando usuário...');
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Production User',
        email: `test-prod-${Date.now()}@test.com`,
        password: 'testpassword123'
      }),
    });

    const registerData = await registerResponse.json();
    
    if (!registerResponse.ok) {
      console.error('❌ Erro no registro:', registerData);
      return;
    }

    const token = registerData.data?.token || registerData.token;
    if (!token) {
      console.error('❌ Token não encontrado na resposta:', registerData);
      return;
    }

    console.log('✅ Usuário registrado, token obtido');

    // 2. Criar cliente
    console.log('\n2️⃣ Criando cliente...');
    const clientResponse = await fetch(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'Production',
        email: `client-prod-${Date.now()}@test.com`,
        phone: '11999999999',
        address: 'Test Address'
      }),
    });

    const clientData = await clientResponse.json();
    
    if (!clientResponse.ok) {
      console.error('❌ Erro ao criar cliente:', clientData);
      return;
    }

    const clientId = clientData.data?.id || clientData.id;
    console.log('✅ Cliente criado:', clientId);

    // 3. Criar contrato
    console.log('\n3️⃣ Criando contrato...');
    const contractResponse = await fetch(`${API_BASE_URL}/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        client_id: clientId,
        contract_number: `PROD-TEST-${Date.now()}`,
        description: 'Contrato de teste de produção',
        value: 1000.00,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'ativo'
      }),
    });

    const contractData = await contractResponse.json();
    
    if (!contractResponse.ok) {
      console.error('❌ Erro ao criar contrato:', contractData);
      return;
    }

    const contractId = contractData.data?.id || contractData.id;
    console.log('✅ Contrato criado:', contractId);

    // 4. Verificar se o contrato existe antes da exclusão
    console.log('\n4️⃣ Verificando contrato antes da exclusão...');
    const checkBeforeResponse = await fetch(`${API_BASE_URL}/contracts/${contractId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const checkBeforeData = await checkBeforeResponse.json();
    console.log('Status da verificação antes:', checkBeforeResponse.status);
    console.log('Contrato existe antes:', checkBeforeResponse.ok);

    // 5. Tentar excluir o contrato
    console.log('\n5️⃣ Tentando excluir contrato...');
    const deleteResponse = await fetch(`${API_BASE_URL}/contracts/${contractId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const deleteData = await deleteResponse.json();
    
    console.log('Status da exclusão:', deleteResponse.status);
    console.log('Resposta da exclusão:', deleteData);

    if (!deleteResponse.ok) {
      console.error('❌ Erro na exclusão:', deleteData);
    } else {
      console.log('✅ API retornou sucesso na exclusão');
    }

    // 6. Verificar se o contrato ainda existe após a exclusão
    console.log('\n6️⃣ Verificando contrato após exclusão...');
    
    // Aguardar um pouco para garantir que a operação foi processada
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const checkAfterResponse = await fetch(`${API_BASE_URL}/contracts/${contractId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const checkAfterData = await checkAfterResponse.json();
    console.log('Status da verificação após:', checkAfterResponse.status);
    console.log('Resposta da verificação após:', checkAfterData);

    if (checkAfterResponse.status === 404) {
      console.log('✅ Contrato foi excluído corretamente (404 - não encontrado)');
    } else if (checkAfterResponse.ok) {
      console.log('❌ PROBLEMA: Contrato ainda existe após exclusão!');
      console.log('Dados do contrato que deveria ter sido excluído:', checkAfterData);
    } else {
      console.log('⚠️ Status inesperado:', checkAfterResponse.status);
    }

    // 7. Listar todos os contratos para verificar
    console.log('\n7️⃣ Listando todos os contratos...');
    const listResponse = await fetch(`${API_BASE_URL}/contracts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const listData = await listResponse.json();
    
    if (listResponse.ok) {
      const contracts = listData.data || listData;
      const foundContract = contracts.find(c => c.id === contractId);
      
      console.log(`📊 Total de contratos: ${contracts.length}`);
      console.log('Contrato ainda na lista:', !!foundContract);
      
      if (foundContract) {
        console.log('❌ CONFIRMADO: Contrato ainda existe na lista!');
        console.log('Dados:', foundContract);
      } else {
        console.log('✅ Contrato não encontrado na lista (correto)');
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testProductionDeletion();