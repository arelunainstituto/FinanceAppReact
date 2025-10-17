// Script para testar autenticação e carregamento de dados
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://localhost:3000/api';

async function testAuth() {
  try {
    console.log('🔐 Fazendo login...');
    
    // 1. Login
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

    const loginData = await loginResponse.json();
    console.log('✅ Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.data || !loginData.data.token) {
      console.error('❌ Erro: Token não encontrado na resposta');
      return;
    }
    
    const token = loginData.data.token;
    console.log('🎫 Token obtido:', token.substring(0, 50) + '...');

    // 2. Testar endpoint de clientes
    console.log('\n📋 Buscando clientes...');
    const clientsResponse = await fetch(`${API_BASE_URL}/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const clientsData = await clientsResponse.json();
    console.log('✅ Clientes encontrados:', clientsData.data?.length || 0);
    
    if (clientsData.data && clientsData.data.length > 0) {
      console.log('👤 Primeiro cliente:', {
        id: clientsData.data[0].id,
        nome: `${clientsData.data[0].first_name} ${clientsData.data[0].last_name}`,
        email: clientsData.data[0].email,
        status: clientsData.data[0].status
      });
    }

    // 3. Testar endpoint de contratos
    console.log('\n📄 Buscando contratos...');
    const contractsResponse = await fetch(`${API_BASE_URL}/contracts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const contractsData = await contractsResponse.json();
    console.log('✅ Contratos encontrados:', contractsData.data?.length || 0);

    // 4. Testar endpoint de pagamentos
    console.log('\n💰 Buscando pagamentos...');
    const paymentsResponse = await fetch(`${API_BASE_URL}/payments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const paymentsData = await paymentsResponse.json();
    console.log('✅ Pagamentos encontrados:', paymentsData.data?.length || 0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testAuth();