const { default: fetch } = require('node-fetch');

async function testProductionAPI() {
  console.log('🧪 Testando API de produção após correções...');
  
  const API_BASE_URL = 'https://financeapp-lime.vercel.app/api';
  
  try {
    // 1. Testar health check
    console.log('1. Testando health check...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Health check OK:', healthData.message);
    console.log('🌍 Environment:', healthData.environment);
    
    // 2. Testar login
    console.log('\n2. Testando login...');
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
      const errorText = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status} - ${errorText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ Login realizado com sucesso!');
    console.log('👤 Usuário:', loginData.data.user.name);

    // 3. Testar endpoint protegido - listar contratos
    console.log('\n3. Testando endpoint protegido (contratos)...');
    const contractsResponse = await fetch(`${API_BASE_URL}/contracts?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!contractsResponse.ok) {
      const errorText = await contractsResponse.text();
      throw new Error(`Contracts API failed: ${contractsResponse.status} - ${errorText}`);
    }

    const contractsData = await contractsResponse.json();
    console.log('✅ Endpoint de contratos funcionando!');
    console.log('📊 Resposta completa:', JSON.stringify(contractsData, null, 2));
    
    if (contractsData.data && contractsData.data.data) {
      console.log(`📊 Encontrados ${contractsData.data.data.length} contratos`);
      console.log(`📄 Total de páginas: ${contractsData.data.totalPages}`);
    } else if (contractsData.data && Array.isArray(contractsData.data)) {
      console.log(`📊 Encontrados ${contractsData.data.length} contratos`);
    } else {
      console.log('📊 Estrutura de resposta diferente do esperado');
    }

    // 4. Testar endpoint de pagamentos
    console.log('\n4. Testando endpoint de pagamentos...');
    const paymentsResponse = await fetch(`${API_BASE_URL}/payments?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!paymentsResponse.ok) {
      const errorText = await paymentsResponse.text();
      throw new Error(`Payments API failed: ${paymentsResponse.status} - ${errorText}`);
    }

    const paymentsData = await paymentsResponse.json();
    console.log('✅ Endpoint de pagamentos funcionando!');
    console.log('💰 Resposta completa:', JSON.stringify(paymentsData, null, 2));
    
    if (paymentsData.data && paymentsData.data.data) {
      console.log(`💰 Encontrados ${paymentsData.data.data.length} pagamentos`);
    } else if (paymentsData.data && Array.isArray(paymentsData.data)) {
      console.log(`💰 Encontrados ${paymentsData.data.length} pagamentos`);
    } else {
      console.log('💰 Estrutura de resposta diferente do esperado');
    }

    // 5. Testar dashboard stats
    console.log('\n5. Testando dashboard stats...');
    const statsResponse = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      throw new Error(`Dashboard stats failed: ${statsResponse.status} - ${errorText}`);
    }

    const statsData = await statsResponse.json();
    console.log('✅ Dashboard stats funcionando!');
    console.log('📈 Stats:', {
      totalClients: statsData.data.totalClients,
      totalContracts: statsData.data.totalContracts,
      totalPayments: statsData.data.totalPayments,
      totalRevenue: statsData.data.totalRevenue
    });

    console.log('\n🎉 Todos os testes passaram! A API está funcionando corretamente em produção.');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
  }
}

testProductionAPI();