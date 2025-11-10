/**
 * Utilitários para operações monetárias precisas
 * 
 * Este módulo fornece funções para lidar com valores monetários sem perda de precisão,
 * evitando problemas comuns de arredondamento de ponto flutuante.
 * 
 * Todas as operações são feitas em centavos (inteiros) e convertidas de volta para euros.
 */

/**
 * Converte um valor em euros para centavos (inteiro)
 * @param euros Valor em euros (pode ter casas decimais)
 * @returns Valor em centavos (inteiro)
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Converte um valor em centavos para euros
 * @param cents Valor em centavos (inteiro)
 * @returns Valor em euros com 2 casas decimais
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Divide um valor monetário em parcelas iguais de forma precisa
 * Garante que a soma das parcelas seja exatamente igual ao valor total
 * 
 * Estratégia: Todas as parcelas têm o mesmo valor (arredondado), exceto a última
 * que absorve a diferença para garantir que o total seja exato.
 * 
 * @param totalValue Valor total em euros
 * @param numberOfInstallments Número de parcelas
 * @returns Array com os valores de cada parcela em euros
 */
export function divideIntoInstallments(
  totalValue: number,
  numberOfInstallments: number
): number[] {
  if (numberOfInstallments <= 0) {
    throw new Error('Number of installments must be greater than zero');
  }

  if (totalValue < 0) {
    throw new Error('Total value cannot be negative');
  }

  // Converter para centavos para trabalhar com inteiros
  const totalCents = eurosToCents(totalValue);
  
  // Calcular o valor padrão por parcela usando arredondamento para baixo
  const baseInstallmentCents = Math.floor(totalCents / numberOfInstallments);
  
  // Calcular quantos centavos sobram após usar o valor base em todas
  const remainderCents = totalCents - (baseInstallmentCents * numberOfInstallments);
  
  // Criar array de parcelas
  const installments: number[] = [];
  
  // Distribuir os centavos extras igualmente nas ÚLTIMAS parcelas
  // Isso mantém a maioria das parcelas com o valor menor e apenas as últimas com +1 centavo
  for (let i = 0; i < numberOfInstallments; i++) {
    // As últimas 'remainderCents' parcelas recebem +1 centavo
    const installmentCents = (numberOfInstallments - i) <= remainderCents
      ? baseInstallmentCents + 1 
      : baseInstallmentCents;
    
    installments.push(centsToEuros(installmentCents));
  }
  
  return installments;
}

/**
 * Soma valores monetários de forma precisa
 * @param values Array de valores em euros
 * @returns Soma total em euros
 */
export function sumMoneyValues(...values: number[]): number {
  const totalCents = values.reduce((sum, value) => {
    return sum + eurosToCents(value);
  }, 0);
  
  return centsToEuros(totalCents);
}

/**
 * Subtrai valores monetários de forma precisa
 * @param minuend Valor do qual será subtraído
 * @param subtrahend Valor a ser subtraído
 * @returns Diferença em euros
 */
export function subtractMoneyValues(minuend: number, subtrahend: number): number {
  const resultCents = eurosToCents(minuend) - eurosToCents(subtrahend);
  return centsToEuros(resultCents);
}

/**
 * Multiplica um valor monetário de forma precisa
 * @param value Valor em euros
 * @param multiplier Multiplicador
 * @returns Resultado em euros
 */
export function multiplyMoneyValue(value: number, multiplier: number): number {
  const cents = eurosToCents(value);
  const resultCents = Math.round(cents * multiplier);
  return centsToEuros(resultCents);
}

/**
 * Formata um valor monetário para exibição
 * @param value Valor em euros
 * @param currency Símbolo da moeda (padrão: €)
 * @returns String formatada (ex: "€ 1.234,56")
 */
export function formatMoney(value: number, currency: string = '€'): string {
  const formatted = value.toFixed(2).replace('.', ',');
  const parts = formatted.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${currency} ${parts.join(',')}`;
}

/**
 * Valida se dois valores monetários são iguais (com tolerância de 1 centavo)
 * @param value1 Primeiro valor
 * @param value2 Segundo valor
 * @returns true se os valores são iguais
 */
export function areMoneyValuesEqual(value1: number, value2: number): boolean {
  return Math.abs(eurosToCents(value1) - eurosToCents(value2)) <= 1;
}

/**
 * Arredonda um valor monetário para 2 casas decimais
 * @param value Valor a ser arredondado
 * @returns Valor arredondado
 */
export function roundMoney(value: number): number {
  return centsToEuros(eurosToCents(value));
}

