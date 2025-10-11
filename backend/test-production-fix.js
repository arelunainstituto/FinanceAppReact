const { default: fetch } = require('node-fetch');

const API_BASE_URL = 'https://financeapp-3s8od5cxa-areluna.vercel.app';

async function testProductionFix() {
  console.log('🧪 Testing production deletion fix...\n');
  
  let token;
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const testPassword = 'password123';
  
  try {
    // 1. Try to login first
    console.log('1. Attempting to login with existing user...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      token = loginData.data.token;
      console.log('✅ Login successful');
    } else {
      // If login fails, try to register
      console.log('❌ Login failed, attempting to register...');
      
      const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: testEmail,
          password: testPassword
        })
      });
      
      if (!registerResponse.ok) {
        const errorText = await registerResponse.text();
        throw new Error(`Registration failed: ${registerResponse.status} - ${errorText}`);
      }
      
      const registerData = await registerResponse.json();
      token = registerData.data.token;
      console.log('✅ User registered successfully');
    }

    // 2. Create client
    console.log('\n2. Creating client...');
    const clientResponse = await fetch(`${API_BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'Client',
        email: `testclient${timestamp}@example.com`,
        phone: '123456789',
        address: 'Test Address',
        status: 'ativo'
      })
    });

    if (!clientResponse.ok) {
      const errorText = await clientResponse.text();
      throw new Error(`Client creation failed: ${clientResponse.status} - ${errorText}`);
    }

    const clientData = await clientResponse.json();
    const clientId = clientData.data.id;
    console.log(`✅ Client created with ID: ${clientId}`);

    // 3. Wait a moment
    console.log('\n3. Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Create contract
    console.log('\n4. Creating contract...');
    const contractResponse = await fetch(`${API_BASE_URL}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        client_id: clientId,
        description: 'Test Contract for Deletion',
        value: 1000.00,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      })
    });

    if (!contractResponse.ok) {
      const errorText = await contractResponse.text();
      throw new Error(`Contract creation failed: ${contractResponse.status} - ${errorText}`);
    }

    const contractData = await contractResponse.json();
    const contractId = contractData.data.id;
    console.log(`✅ Contract created with ID: ${contractId}`);

    // 5. Wait and verify contract exists
    console.log('\n5. Waiting 2 seconds and verifying contract exists...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const verifyResponse = await fetch(`${API_BASE_URL}/api/contracts/${contractId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (verifyResponse.ok) {
      console.log('✅ Contract exists and is accessible');
    } else {
      console.log('❌ Contract verification failed');
    }

    // 6. Attempt deletion with the robust fix
    console.log('\n6. Attempting contract deletion with robust fix...');
    const deleteResponse = await fetch(`${API_BASE_URL}/api/contracts/${contractId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Delete response status: ${deleteResponse.status}`);
    
    if (deleteResponse.ok) {
      const deleteData = await deleteResponse.json();
      console.log('Delete response:', deleteData);
      console.log('✅ Deletion request completed successfully');
    } else {
      const errorText = await deleteResponse.text();
      console.log(`❌ Deletion failed: ${deleteResponse.status} - ${errorText}`);
    }

    // 7. Wait and verify deletion
    console.log('\n7. Waiting 3 seconds and verifying deletion...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const verifyDeleteResponse = await fetch(`${API_BASE_URL}/api/contracts/${contractId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (verifyDeleteResponse.status === 404) {
      console.log('✅ SUCCESS: Contract was successfully deleted!');
    } else if (verifyDeleteResponse.ok) {
      console.log('❌ FAILURE: Contract still exists after deletion');
      const stillExistsData = await verifyDeleteResponse.json();
      console.log('Contract data:', stillExistsData);
    } else {
      console.log(`❌ Verification failed with status: ${verifyDeleteResponse.status}`);
    }

    // 8. List all contracts to double-check
    console.log('\n8. Listing all contracts to verify...');
    const listResponse = await fetch(`${API_BASE_URL}/api/contracts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (listResponse.ok) {
      const contractsResponse = await listResponse.json();
      const contracts = contractsResponse.data || contractsResponse;
      const foundContract = contracts.find(c => c.id === contractId);
      
      if (foundContract) {
        console.log('❌ FAILURE: Contract still appears in the list');
        console.log('Found contract:', foundContract);
      } else {
        console.log('✅ SUCCESS: Contract is not in the contracts list');
      }
      
      console.log(`Total contracts in system: ${contracts.length}`);
    } else {
      console.log('❌ Failed to list contracts');
    }

    console.log('\n🎯 Test completed!');

  } catch (error) {
    console.error(`❌ Test failed with error: ${error.message}`);
    console.error('Full error:', error);
  }
}

testProductionFix();