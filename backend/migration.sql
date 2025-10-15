-- Migração para alterar paid_date de DATE para TIMESTAMP WITH TIME ZONE
-- Projeto: finance
-- Data: 2025-01-15

-- Verificar estrutura atual
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'paid_date';

-- Executar migração
ALTER TABLE payments ALTER COLUMN paid_date TYPE TIMESTAMP WITH TIME ZONE;

-- Verificar estrutura após migração
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'paid_date';

-- Verificar dados após migração
SELECT id, paid_date, status, paid_amount 
FROM payments 
WHERE paid_date IS NOT NULL 
LIMIT 5;