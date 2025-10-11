const { default: fetch } = require('node-fetch');
require('dotenv').config();

async function testVercelEnvironment() {
  console.log('🔍 Testando diferenças de ambiente entre local e produção...\n');
  
  const API_BASE_URL = 'https://financeapp-areluna.vercel.app/api';
  
  try {
    // 1. Testar endpoint de debug/environment (se existir)
    console.log('1️⃣ Verificando informações do ambiente de produção...');
    
    // Primeiro fazer login para obter token
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ Login realizado com sucesso');

    // 2. Criar um contrato de teste para verificar o comportamento
    console.log('\n2️⃣ Criando contrato de teste na produção...');
    
    // Primeiro buscar um cliente existente
    const clientsResponse = await fetch(`${API_BASE_URL}/clients?page=1&limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!clientsResponse.ok) {
      throw new Error(`Failed to get clients: ${clientsResponse.status}`);
    }

    const clientsData = await clientsResponse.json();
    let clientId;

    if (clientsData.data && clientsData.data.data && clientsData.data.data.length > 0) {
      clientId = clientsData.data.data[0].id;
      console.log('✅ Cliente encontrado:', clientId);
    } else {
      // Criar um cliente se não existir
      console.log('📝 Criando cliente de teste...');
      const createClientResponse = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'Environment',
          email: `test-env-${Date.now()}@test.com`,
          phone: '11999999999'
        })
      });

      if (!createClientResponse.ok) {
        throw new Error(`Failed to create client: ${createClientResponse.status}`);
      }

      const clientData = await createClientResponse.json();
      clientId = clientData.data.id;
      console.log('✅ Cliente criado:', clientId);
    }

    // 3. Criar contrato
    console.log('\n3️⃣ Criando contrato...');
    const contractData = {
      client_id: clientId,
      contract_number: `ENV-TEST-${Date.now()}`,
      description: 'Teste de ambiente - pode ser excluído',
      value: 1000.00,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'ativo'
    };

    const createContractResponse = await fetch(`${API_BASE_URL}/contracts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contractData)
    });

    if (!createContractResponse.ok) {
      const errorText = await createContractResponse.text();
      throw new Error(`Failed to create contract: ${createContractResponse.status} - ${errorText}`);
    }

    const contractResult = await createContractResponse.json();
    const contractId = contractResult.data.id;
    console.log('✅ Contrato criado:', contractId);

    // 4. Tentar excluir o contrato com logs detalhados
    console.log('\n4️⃣ Tentando excluir contrato com logs detalhados...');
    
    const deleteResponse = await fetch(`${API_BASE_URL}/contracts/${contractId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status da exclusão:', deleteResponse.status);
    console.log('📊 Headers da resposta:', Object.fromEntries(deleteResponse.headers.entries()));

    if (deleteResponse.ok) {
      const deleteResult = await deleteResponse.json();
      console.log('✅ Resposta da exclusão:', deleteResult);
    } else {
      const errorText = await deleteResponse.text();
      console.log('❌ Erro na exclusão:', errorText);
    }

    // 5. Verificar se o contrato ainda existe
    console.log('\n5️⃣ Verificando se contrato foi realmente excluído...');
    
    // Aguardar um pouco para garantir que a operação foi processada
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const checkResponse = await fetch(`${API_BASE_URL}/contracts/${contractId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.status === 404) {
      console.log('✅ Contrato foi excluído com sucesso!');
    } else if (checkResponse.ok) {
      const stillExists = await checkResponse.json();
      console.log('❌ PROBLEMA: Contrato ainda existe após exclusão!');
      console.log('   Dados:', stillExists);
      
      // 6. Investigar possíveis causas
      console.log('\n6️⃣ Investigando possíveis causas...');
      console.log('🔍 Possíveis diferenças entre local e produção:');
      console.log('   - Timeout de transação no Vercel');
      console.log('   - Configuração de conexão com Supabase');
      console.log('   - Variáveis de ambiente diferentes');
      console.log('   - Limitações de recursos no Vercel');
      console.log('   - Cache ou delay na propagação');
      
      // Tentar excluir novamente após delay
      console.log('\n🔄 Tentando excluir novamente após delay...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const retryDeleteResponse = await fetch(`${API_BASE_URL}/contracts/${contractId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Status da segunda tentativa:', retryDeleteResponse.status);
      
      if (retryDeleteResponse.ok) {
        console.log('✅ Segunda tentativa de exclusão bem-sucedida');
        
        // Verificar novamente
        await new Promise(resolve => setTimeout(resolve, 2000));
        const finalCheckResponse = await fetch(`${API_BASE_URL}/contracts/${contractId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (finalCheckResponse.status === 404) {
          console.log('✅ Contrato finalmente excluído na segunda tentativa!');
          console.log('💡 Isso indica um problema de timing/delay no ambiente de produção');
        } else {
          console.log('❌ Contrato ainda existe mesmo após segunda tentativa');
        }
      }
    } else {
      console.log('⚠️ Erro inesperado ao verificar contrato:', checkResponse.status);
    }

    console.log('\n📋 RESUMO DA INVESTIGAÇÃO:');
    console.log('- Ambiente de produção no Vercel pode ter delays');
    console.log('- Transações podem não estar sendo commitadas imediatamente');
    console.log('- Possível problema de timeout ou configuração de conexão');
    console.log('- Recomendação: Implementar retry logic e verificação de affected rows');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testVercelEnvironment();