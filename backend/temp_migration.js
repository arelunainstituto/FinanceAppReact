const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://sxbslulfitfsijqrzljd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YnNsdWxmaXRmc2lqcXJ6bGpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0ODg0OSwiZXhwIjoyMDczNTI0ODQ5fQ.h_7fe7U2QLrk57pp8VArZ5qlPQEbniUHkjSV5qsygGk';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public'
  }
});

async function runMigration() {
  try {
    console.log('Conectando ao Supabase...');
    
    // Verificar estrutura atual da coluna
    console.log('Verificando estrutura atual da coluna paid_date...');
    const { data: currentStructure, error: currentError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'payments')
      .eq('column_name', 'paid_date');
    
    if (currentError) {
      console.log('Tentando query direta para verificar estrutura...');
      // Usar query SQL direta
      const { data: structureData, error: structureError } = await supabase.rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'payments' AND column_name = 'paid_date';
        `
      });
      
      if (structureError) {
        console.log('Erro ao verificar estrutura:', structureError);
      } else {
        console.log('Estrutura atual:', structureData);
      }
    } else {
      console.log('Estrutura atual:', currentStructure);
    }
    
    console.log('Executando migração para alterar paid_date de DATE para TIMESTAMP WITH TIME ZONE...');
    
    // Tentar executar a migração usando SQL direto
    const { data, error } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE payments 
        ALTER COLUMN paid_date TYPE TIMESTAMP WITH TIME ZONE 
        USING CASE 
          WHEN paid_date IS NOT NULL THEN paid_date::timestamp AT TIME ZONE 'UTC'
          ELSE NULL 
        END;
      `
    });
    
    if (error) {
      console.error('Erro ao executar migração:', error);
      
      // Tentar abordagem alternativa - criar nova coluna e migrar dados
      console.log('Tentando abordagem alternativa...');
      
      const { data: altData, error: altError } = await supabase.rpc('sql', {
        query: `
          -- Adicionar nova coluna temporária
          ALTER TABLE payments ADD COLUMN paid_date_new TIMESTAMP WITH TIME ZONE;
          
          -- Migrar dados existentes
          UPDATE payments 
          SET paid_date_new = CASE 
            WHEN paid_date IS NOT NULL THEN paid_date::timestamp AT TIME ZONE 'UTC'
            ELSE NULL 
          END;
          
          -- Remover coluna antiga
          ALTER TABLE payments DROP COLUMN paid_date;
          
          -- Renomear nova coluna
          ALTER TABLE payments RENAME COLUMN paid_date_new TO paid_date;
        `
      });
      
      if (altError) {
        console.error('Erro na abordagem alternativa:', altError);
        return;
      }
      
      console.log('Migração alternativa executada com sucesso!');
    } else {
      console.log('Migração executada com sucesso!');
    }
    
    // Verificar a estrutura da tabela após a migração
    console.log('Verificando estrutura após migração...');
    const { data: newStructure, error: newError } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'paid_date';
      `
    });
    
    if (newError) {
      console.error('Erro ao verificar nova estrutura:', newError);
    } else {
      console.log('Nova estrutura:', newStructure);
    }
    
  } catch (err) {
    console.error('Erro geral:', err);
  }
}

runMigration();