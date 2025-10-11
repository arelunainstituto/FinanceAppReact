const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

async function validateEnvironment() {
  console.log('🔍 Validando variáveis de ambiente...\n');

  // Verificar variáveis obrigatórias
  const requiredVars = {
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'NODE_ENV': process.env.NODE_ENV || 'development',
    'JWT_SECRET': process.env.JWT_SECRET
  };

  let hasErrors = false;

  console.log('📋 Verificando variáveis obrigatórias:');
  for (const [varName, value] of Object.entries(requiredVars)) {
    if (!value) {
      console.log(`❌ ${varName}: NÃO DEFINIDA`);
      hasErrors = true;
    } else {
      const displayValue = varName.includes('KEY') || varName.includes('SECRET') 
        ? `${value.substring(0, 10)}...` 
        : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    }
  }

  if (hasErrors) {
    console.log('\n❌ ERRO: Variáveis de ambiente ausentes!');
    console.log('📝 Instruções:');
    console.log('1. Copie o arquivo backend/.env.example para backend/.env');
    console.log('2. Configure as variáveis do Supabase');
    console.log('3. Execute novamente este script');
    process.exit(1);
  }

  // Testar conexão com Supabase
  console.log('\n🔗 Testando conexão com Supabase...');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Teste simples de conexão
    const { data, error } = await supabase
      .from('clients')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Erro na conexão com Supabase:', error.message);
      hasErrors = true;
    } else {
      console.log('✅ Conexão com Supabase estabelecida com sucesso!');
      
      // Verificar se há dados nas tabelas principais
      const { data: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      const { data: contractCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true });
      
      const { data: paymentCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true });

      console.log('📊 Dados encontrados:');
      console.log(`   - Clientes: ${clientCount?.length || 0}`);
      console.log(`   - Contratos: ${contractCount?.length || 0}`);
      console.log(`   - Pagamentos: ${paymentCount?.length || 0}`);
    }

  } catch (error) {
    console.log('❌ Erro ao testar conexão:', error.message);
    hasErrors = true;
  }

  if (hasErrors) {
    console.log('\n❌ Validação falhou! Corrija os erros antes de continuar.');
    process.exit(1);
  } else {
    console.log('\n✅ Todas as validações passaram! Ambiente pronto para deploy.');
  }
}

validateEnvironment().catch(console.error);