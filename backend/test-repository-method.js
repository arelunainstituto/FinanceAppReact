require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Importar as classes do repositório
const path = require('path');
const { ContractRepository } = require('./dist/repositories/contractRepository.js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testRepositoryMethod() {
  try {
    console.log('🧪 Teste do Método do Repositório\n');

    // 1. Criar cliente de teste
    console.log('1️⃣ Criando cliente de teste...');
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Test',
        last_name: 'Repository',
        email: `test-repo-${Date.now()}@test.com`,
        phone: '11999999999',
        address: 'Test Address'
      })
      .select()
      .single();

    if (clientError) {
      console.error('❌ Erro ao criar cliente:', clientError);
      return;
    }

    console.log('✅ Cliente criado:', client.id);

    // 2. Criar contrato de teste
    console.log('\n2️⃣ Criando contrato de teste...');
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        client_id: client.id,
        contract_number: `TEST-REPO-${Date.now()}`,
        description: 'Contrato de teste do repositório',
        value: 1000.00,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'ativo'
      })
      .select()
      .single();

    if (contractError) {
      console.error('❌ Erro ao criar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato criado:', contract.id);

    // 3. Testar método do repositório
    console.log('\n3️⃣ Testando método delete do repositório...');
    
    try {
      const contractRepository = new ContractRepository();
      
      // Verificar se o contrato existe antes da exclusão
      const existsBefore = await contractRepository.findById(contract.id);
      console.log('Contrato existe antes da exclusão:', !!existsBefore);
      
      // Chamar o método delete
      const deleteResult = await contractRepository.delete(contract.id);
      console.log('Resultado do método delete:', deleteResult);
      
      // Verificar se o contrato ainda existe após a exclusão
      const existsAfter = await contractRepository.findById(contract.id);
      console.log('Contrato existe após exclusão:', !!existsAfter);
      
      if (!existsAfter) {
        console.log('✅ Método do repositório funcionou corretamente!');
      } else {
        console.log('❌ Método do repositório falhou - contrato ainda existe');
      }
      
    } catch (repoError) {
      console.error('❌ Erro no método do repositório:', repoError.message);
    }

    // 4. Verificação direta no banco
    console.log('\n4️⃣ Verificação direta no banco...');
    const { data: directCheck } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contract.id);

    console.log(`📊 Contratos encontrados no banco: ${directCheck.length}`);

    // Limpar dados de teste
    await supabase.from('clients').delete().eq('id', client.id);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testRepositoryMethod();