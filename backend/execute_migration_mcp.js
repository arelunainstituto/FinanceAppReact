// Script para executar migração usando MCP Supabase
// Projeto: finance (ID: sxbslulfitfsijqrzljd)
// Organização: finance (ID: ygmwsfnyamvyryqwrkzp)

console.log('=== EXECUTANDO MIGRAÇÃO VIA MCP SUPABASE ===\n');

console.log('Projeto identificado:');
console.log('- Nome: finance');
console.log('- ID: sxbslulfitfsijqrzljd'); 
console.log('- Organização: finance (ygmwsfnyamvyryqwrkzp)');
console.log('- Host: db.sxbslulfitfsijqrzljd.supabase.co\n');

console.log('Migração necessária:');
console.log('ALTER TABLE payments ALTER COLUMN paid_date TYPE TIMESTAMP WITH TIME ZONE;');
console.log('\nMotivo: Preservar informações completas de data e hora para auditoria e conformidade financeira.');

console.log('\n✅ Pronto para executar via MCP Supabase');