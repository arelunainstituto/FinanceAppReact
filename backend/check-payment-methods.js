const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPaymentMethods() {
  console.log('🔍 Verificando valores de payment_method no banco...');
  
  const { data, error } = await supabase
    .from('payments')
    .select('payment_method')
    .not('payment_method', 'is', null);
    
  if (error) {
    console.error('Erro:', error);
    return;
  }
  
  const methods = [...new Set(data.map(p => p.payment_method))].sort();
  console.log('📊 Métodos de pagamento encontrados:', methods);
  
  // Contar cada método
  const counts = {};
  data.forEach(p => {
    counts[p.payment_method] = (counts[p.payment_method] || 0) + 1;
  });
  
  console.log('📈 Contagem por método:');
  Object.entries(counts).forEach(([method, count]) => {
    console.log(`  ${method}: ${count} pagamentos`);
  });
  
  // Verificar se há métodos no banco que não estão no frontend
  const frontendMethods = [
    'DD', 'Stripe', 'Receção', 'TRF', 'PP', 'Cheque', 'Cheque/Misto',
    'Aditamento', 'DD + TB', 'TRF ou RECEÇÃO', 'Ordenado', 'Numerário', 'MB Way'
  ];
  
  const missingInFrontend = methods.filter(m => !frontendMethods.includes(m));
  const missingInDB = frontendMethods.filter(m => !methods.includes(m));
  
  if (missingInFrontend.length > 0) {
    console.log('⚠️  Métodos no banco que não estão no frontend:', missingInFrontend);
  }
  
  if (missingInDB.length > 0) {
    console.log('ℹ️  Métodos no frontend que não estão no banco:', missingInDB);
  }
  
  if (missingInFrontend.length === 0 && missingInDB.length === 0) {
    console.log('✅ Todos os métodos estão consistentes entre frontend e banco!');
  }
}

checkPaymentMethods().then(() => process.exit(0));