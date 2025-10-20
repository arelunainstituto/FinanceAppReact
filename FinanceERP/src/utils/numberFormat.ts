/**
 * Utility functions for number formatting and validation
 */

/**
 * Formata input numérico permitindo apenas números e ponto decimal
 * Remove vírgulas e caracteres inválidos
 * @param value - Valor a ser formatado
 * @param maxDecimalPlaces - Número máximo de casas decimais (padrão: 2)
 * @returns String formatada
 */
export const formatNumberInput = (value: string, maxDecimalPlaces: number = 2): string => {
  if (!value) return '';
  
  // Remove todos os caracteres que não sejam números ou ponto
  let cleaned = value.replace(/[^\d.]/g, '');
  
  // Remove pontos extras (mantém apenas o primeiro)
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limita casas decimais
  if (parts.length === 2 && parts[1].length > maxDecimalPlaces) {
    cleaned = parts[0] + '.' + parts[1].substring(0, maxDecimalPlaces);
  }
  
  return cleaned;
};

/**
 * Valida se o valor é um número válido
 * @param value - Valor a ser validado
 * @returns true se for válido, false caso contrário
 */
export const isValidNumber = (value: string): boolean => {
  if (!value || value === '' || value === '.') return false;
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
};

/**
 * Converte string formatada para número
 * @param value - String a ser convertida
 * @returns Número ou 0 se inválido
 */
export const parseFormattedNumber = (value: string): number => {
  if (!value || value === '') return 0;
  const cleaned = value.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Formata número para exibição com casas decimais
 * @param value - Número a ser formatado
 * @param decimalPlaces - Número de casas decimais (padrão: 2)
 * @returns String formatada
 */
export const formatNumberDisplay = (value: number, decimalPlaces: number = 2): string => {
  return value.toFixed(decimalPlaces);
};

/**
 * Hook-like function para controlar input numérico
 * Retorna o valor formatado e a função para atualizar
 */
export const useNumberInput = (initialValue: string = '', maxDecimalPlaces: number = 2) => {
  const handleChange = (value: string): string => {
    return formatNumberInput(value, maxDecimalPlaces);
  };
  
  return { handleChange };
};

