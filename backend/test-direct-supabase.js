const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ixqjqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxanFqcWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyODU2NzE0MSwiZXhwIjoyMDQ0MTQzMTQxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectDeletion() {
  console.log('🔍 Testando exclusão direta no Supabase...\n');

  try {
    // 1. Criar um contrato de teste
    console.log('1. Criando contrato de teste...');
    
    // Primeiro criar um cliente
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: 'Teste',
        last_name: 'Direto',
        email: `teste.direto.${Date.now()}@example.com`,
        phone: '11999999999'
      })
      .select()
      .single();

    if (clientError) {
      console.error('Erro ao criar cliente:', clientError);
      return;
    }

    console.log('✅ Cliente criado:', clientData.id);

    // Criar contrato
    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .insert({
        client_id: clientData.id,
        description: 'Contrato teste direto',
        value: 1000,
        status: 'ativo'
      })
      .select()
      .single();

    if (contractError) {
      console.error('Erro ao criar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato criado:', contractData.id);

    // 2. Verificar se existe
    console.log('\n2. Verificando se contrato existe...');
    const { data: existsData, error: existsError } = await supabase
      .from('contracts')
      .select('id, description, value')
      .eq('id', contractData.id)
      .single();

    if (existsError) {
      console.error('Erro ao verificar existência:', existsError);
      return;
    }

    console.log('✅ Contrato encontrado:', existsData);

    // 3. Tentar excluir diretamente
    console.log('\n3. Tentando excluir diretamente...');
    const { data: deleteData, error: deleteError, count } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractData.id)
      .select();

    if (deleteError) {
      console.error('❌ Erro na exclusão:', deleteError);
      return;
    }

    console.log('✅ Resultado da exclusão:');
    console.log('   Data:', deleteData);
    console.log('   Count:', count);
    console.log('   Length:', deleteData?.length || 0);

    // 4. Verificar se foi realmente excluído
    console.log('\n4. Verificando se foi excluído...');
    const { data: stillExistsData, error: stillExistsError } = await supabase
      .from('contracts')
      .select('id')
      .eq('id', contractData.id)
      .single();

    if (stillExistsError) {
      if (stillExistsError.code === 'PGRST116') {
        console.log('✅ Contrato não encontrado - exclusão bem-sucedida!');
      } else {
        console.error('❌ Erro inesperado:', stillExistsError);
      }
    } else if (stillExistsData) {
      console.log('❌ PROBLEMA: Contrato ainda existe!');
      console.log('   ID:', stillExistsData.id);
    }

    // 5. Limpar cliente de teste
    console.log('\n5. Limpando cliente de teste...');
    const { error: clientDeleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientData.id);

    if (clientDeleteError) {
      console.error('Erro ao excluir cliente:', clientDeleteError);
    } else {
      console.log('✅ Cliente excluído');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testDirectDeletion().then(() => {
  console.log('\n🏁 Teste direto finalizado');
}).catch(error => {
  console.error('💥 Erro fatal:', error);
});