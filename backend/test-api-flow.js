require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Importar as classes necessárias
const { ContractService } = require('./dist/services/contractService.js');
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

async function testApiFlow() {
  try {
    console.log('🧪 Teste do Fluxo da API\n');

    // 1. Criar cliente de teste
    console.log('1️⃣ Criando cliente de teste...');
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Test',
        last_name: 'API',
        email: `test-api-${Date.now()}@test.com`,
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
        contract_number: `TEST-API-${Date.now()}`,
        description: 'Contrato de teste da API',
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

    // 3. Testar fluxo completo da API
    console.log('\n3️⃣ Testando fluxo da API...');
    
    try {
      const contractService = new ContractService();
      
      // Verificar se o contrato existe antes da exclusão
      console.log('🔍 Verificando se contrato existe antes da exclusão...');
      const existsBefore = await contractService.getContractById(contract.id);
      console.log('Contrato existe antes da exclusão:', !!existsBefore);
      
      // Chamar o método deleteContract do serviço (igual à API)
      console.log('🗑️ Chamando contractService.deleteContract...');
      await contractService.deleteContract(contract.id);
      console.log('✅ Método deleteContract executado sem erro');
      
      // Verificar se o contrato ainda existe após a exclusão
      console.log('🔍 Verificando se contrato existe após exclusão...');
      try {
        const existsAfter = await contractService.getContractById(contract.id);
        console.log('❌ Contrato ainda existe após exclusão:', !!existsAfter);
      } catch (error) {
        if (error.message.includes('Contract not found')) {
          console.log('✅ Contrato não encontrado após exclusão (correto!)');
        } else {
          console.log('❌ Erro inesperado:', error.message);
        }
      }
      
    } catch (serviceError) {
      console.error('❌ Erro no serviço:', serviceError.message);
    }

    // 4. Verificação direta no banco
    console.log('\n4️⃣ Verificação direta no banco...');
    const { data: directCheck } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contract.id);

    console.log(`📊 Contratos encontrados no banco: ${directCheck.length}`);
    
    if (directCheck.length > 0) {
      console.log('❌ PROBLEMA: Contrato ainda existe no banco!');
      console.log('Dados do contrato:', directCheck[0]);
    } else {
      console.log('✅ Contrato foi excluído corretamente do banco');
    }

    // 5. Teste direto do repositório para comparação
    console.log('\n5️⃣ Teste direto do repositório para comparação...');
    
    // Criar outro contrato para testar o repositório diretamente
    const { data: contract2, error: contract2Error } = await supabase
      .from('contracts')
      .insert({
        client_id: client.id,
        contract_number: `TEST-REPO-${Date.now()}`,
        description: 'Contrato de teste do repositório direto',
        value: 1000.00,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'ativo'
      })
      .select()
      .single();

    if (!contract2Error) {
      console.log('✅ Segundo contrato criado:', contract2.id);
      
      const contractRepository = new ContractRepository();
      await contractRepository.delete(contract2.id);
      
      const { data: directCheck2 } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contract2.id);
        
      console.log(`📊 Contratos do repositório direto no banco: ${directCheck2.length}`);
    }

    // Limpar dados de teste
    await supabase.from('clients').delete().eq('id', client.id);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testApiFlow();