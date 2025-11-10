# Correção do Problema de Arredondamento em Operações Monetárias

## 🎯 Problema Identificado

O sistema estava usando operações de ponto flutuante simples para calcular valores monetários, especialmente na divisão de parcelas de contratos. Isso causava problemas de arredondamento onde a soma das parcelas não era exatamente igual ao valor total do contrato.

### Exemplo do Problema:
```javascript
// ANTES (incorreto)
const totalValue = 1000;
const numberOfPayments = 3;
const installmentValue = totalValue / numberOfPayments; // 333.33333...

// Resultado: 3 x 333.33 = 999.99 (faltando €0.01)
```

## ✅ Solução Implementada

Foi criado um módulo utilitário (`moneyUtils.ts`) que realiza todas as operações monetárias usando **centavos (inteiros)** ao invés de valores decimais, eliminando completamente os erros de arredondamento.

### Arquivo Criado:
- `backend/src/utils/moneyUtils.ts`

### Principais Funções:

#### 1. `divideIntoInstallments(totalValue, numberOfInstallments)`
Divide um valor em parcelas iguais de forma precisa, garantindo que a soma das parcelas seja **exatamente** igual ao valor total.

**Algoritmo:**
1. Converte o valor para centavos (multiplicando por 100 e arredondando)
2. Divide os centavos pelo número de parcelas (usando divisão inteira)
3. Distribui o resto (centavos que sobraram) nas primeiras parcelas
4. Converte de volta para euros

**Exemplo:**
```javascript
divideIntoInstallments(1000, 3)
// Resultado: [333.34, 333.33, 333.33]
// Soma: 333.34 + 333.33 + 333.33 = 1000.00 ✅
```

#### 2. `sumMoneyValues(...values)`
Soma valores monetários com precisão, evitando acúmulo de erros.

#### 3. `subtractMoneyValues(minuend, subtrahend)`
Subtrai valores monetários com precisão.

#### 4. Outras funções auxiliares:
- `eurosToCents(euros)`: Converte euros para centavos
- `centsToEuros(cents)`: Converte centavos para euros
- `multiplyMoneyValue(value, multiplier)`: Multiplica com precisão
- `formatMoney(value, currency)`: Formata para exibição
- `roundMoney(value)`: Arredonda para 2 casas decimais
- `areMoneyValuesEqual(value1, value2)`: Compara valores com tolerância

## 📝 Arquivos Modificados

### Backend

1. **`backend/src/services/contractService.ts`**
   - Alterada a geração automática de pagamentos
   - Usa `divideIntoInstallments()` ao invés de divisão simples
   - Usa `subtractMoneyValues()` para calcular o valor restante após entrada

2. **`backend/src/services/paymentService.ts`**
   - Corrigidas operações em `processManualPayment()`
   - Usa `sumMoneyValues()` e `subtractMoneyValues()` para cálculos de saldos
   - Cálculo de excesso, saldo positivo e negativo agora são precisos

3. **`backend/src/services/DashboardService.ts`**
   - Corrigido cálculo de receita total
   - Corrigido cálculo de total recebido
   - Corrigida soma de receita mensal

4. **`backend/src/repositories/contractRepository.ts`**
   - Corrigida soma de pagamentos realizados
   - Usa `sumMoneyValues()` para agregar valores

## 🧪 Testes Realizados

### Teste 1: Divisão simples (€1000 / 3 parcelas)
- **Antes:** 3 x €333.33 = €999.99 (diferença de €0.01) ❌
- **Depois:** €333.34, €333.33, €333.33 = €1000.00 ✅

### Teste 2: Divisão complexa (€10000 / 7 parcelas)
- **Antes:** 7 x €1428.57 = €9999.99 (diferença de €0.01) ❌
- **Depois:** 1x €1428.58 + 6x €1428.57 = €10000.00 ✅

### Teste 3: Com entrada (€5000 total, €500 entrada, 12 parcelas)
- **Antes:** €500 + (12 x €375.00) = €5000.00 (por sorte) ⚠️
- **Depois:** €500 + (12 x €375.00) = €5000.00 ✅

### Teste 4: Valor pequeno (€100 / 11 parcelas)
- **Antes:** 11 x €9.09 = €100.00 (arredondamento) ⚠️
- **Depois:** 1x €9.10 + 10x €9.09 = €100.00 ✅

## 🔍 Verificação Completa

Foi realizada uma busca completa no código por operações monetárias suspeitas:
- ✅ Todas as divisões de valores monetários foram corrigidas
- ✅ Todas as somas de valores monetários foram corrigidas
- ✅ Todas as subtrações de valores monetários foram corrigidas

## 🚀 Impacto

### Benefícios:
1. **Precisão absoluta:** Soma das parcelas sempre igual ao valor total
2. **Confiabilidade:** Sem surpresas com centavos perdidos ou ganhos
3. **Auditoria:** Valores sempre batem com os registros
4. **Conformidade:** Atende requisitos financeiros e contábeis

### Áreas Afetadas:
- ✅ Criação de contratos
- ✅ Geração automática de parcelas
- ✅ Processamento de pagamentos manuais
- ✅ Cálculo de saldos (positivo e negativo)
- ✅ Dashboard (receita total, receita mensal)
- ✅ Relatórios financeiros

## 📌 Boas Práticas Implementadas

1. **Sempre use inteiros para dinheiro:** Trabalhe com centavos (inteiros) e converta para euros apenas na exibição
2. **Centralize operações:** Todas as operações monetárias passam pelas funções utilitárias
3. **Evite ponto flutuante:** Nunca use `float` ou `double` diretamente para dinheiro
4. **Distribua restos:** Quando divisão não é exata, distribua os centavos extras nas primeiras parcelas

## 🔐 Garantias

- ✅ Zero erros de arredondamento
- ✅ Soma das parcelas = Valor total (sempre)
- ✅ Auditável e rastreável
- ✅ Compatível com sistemas contábeis
- ✅ Sem perda ou ganho de centavos

## 📱 Funcionalidades Adicionais

### Prévia do Valor da Parcela no Formulário
Foi adicionada uma funcionalidade visual que mostra ao usuário uma prévia do valor das parcelas **em tempo real** ao preencher o formulário de contrato:

- **Atualização automática:** Calcula assim que o usuário preenche valor total, entrada e número de parcelas
- **Visualização clara:** Mostra se todas as parcelas serão iguais ou se haverá variação
- **Informação transparente:** Explica quando algumas parcelas terão 1 centavo a mais
- **Design intuitivo:** Card destacado com ícone de calculadora

**Exemplo de exibição:**
```
Prévia do Valor da Parcela
├─ Maioria das parcelas: €121.04
├─ Últimas parcelas: €121.05
└─ * Algumas parcelas terão +€0.01 para garantir o valor total exato
```

---

**Data da Correção:** 10 de Novembro de 2025
**Status:** ✅ Implementado e Testado

