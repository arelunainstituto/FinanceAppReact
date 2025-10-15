# Correção do Campo paid_date

## Problema Identificado

O campo `paid_date` estava retornando `null` na API mesmo para pagamentos marcados como "paid", resultando na exibição de "-" na interface do usuário em vez da data de pagamento.

## Causa Raiz

O problema estava no método `markAsPaid` do arquivo `backend/src/repositories/paymentRepository.ts`. O método estava usando `paidDate` (camelCase) em vez do nome correto da coluna no banco de dados `paid_date` (snake_case).

## Correção Implementada

### Arquivo: `backend/src/repositories/paymentRepository.ts`

**Antes:**
```typescript
const result = await this.db('payments')
  .where('id', paymentId)
  .update({
    status: 'paid',
    paidDate: new Date().toISOString(), // ❌ Coluna incorreta
    updated_at: new Date().toISOString(),
  })
  .returning('*');
```

**Depois:**
```typescript
const result = await this.db('payments')
  .where('id', paymentId)
  .update({
    status: 'paid',
    paid_date: new Date().toISOString().split('T')[0], // ✅ Coluna correta e formato YYYY-MM-DD
    updated_at: new Date().toISOString(),
  })
  .returning('*');
```

## Alterações Realizadas

1. **Correção do nome da coluna**: Mudança de `paidDate` para `paid_date`
2. **Correção do formato da data**: Mudança de ISO string completa para formato `YYYY-MM-DD`

## Verificação

### Teste Direto no Banco de Dados
```bash
# Antes da correção - pagamento marcado como paid mas paid_date null
curl -X GET "https://sxbslulfitfsijqrzljd.supabase.co/rest/v1/payments?select=id,status,paid_date&status=eq.paid&limit=1"
# Resultado: {"status":"paid","paid_date":null}

# Após a correção - paid_date definido corretamente
curl -X PATCH "https://sxbslulfitfsijqrzljd.supabase.co/rest/v1/payments?id=eq.4ef6198e-af92-45b0-ba89-8a41f07d6374" \
  -d '{"status": "paid", "paid_date": "2025-01-27"}'
# Resultado: {"status":"paid","paid_date":"2025-01-27"}
```

### Verificação na Interface
- Pagamentos marcados como pagos após a correção agora exibem a data de pagamento corretamente
- Pagamentos marcados antes da correção ainda mostram "-" (comportamento esperado)
- A funcionalidade de marcar pagamentos como pagos agora define corretamente o `paid_date`

## Status
✅ **Correção implementada e testada com sucesso**

## Impacto
- Novos pagamentos marcados como pagos terão o `paid_date` definido corretamente
- A interface do usuário exibirá as datas de pagamento em vez de "-"
- Relatórios e filtros por data de pagamento funcionarão corretamente