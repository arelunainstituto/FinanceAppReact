/**
 * Utilitários para manipulação de datas no backend
 */

/**
 * Calcula o último dia útil do mês (segunda a sexta-feira)
 * @param date - Data de referência (padrão: data atual)
 * @returns Data do último dia útil do mês
 */
export const getLastBusinessDayOfMonth = (date: string | Date = new Date()): Date => {
  try {
    const referenceDate = new Date(date);
    
    // Obter o último dia do mês
    const lastDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    
    // Verificar o dia da semana (0 = domingo, 1 = segunda, ..., 6 = sábado)
    let dayOfWeek = lastDayOfMonth.getDay();
    
    // Se for sábado (6), retroceder 1 dia para sexta
    if (dayOfWeek === 6) {
      lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);
    }
    // Se for domingo (0), retroceder 2 dias para sexta
    else if (dayOfWeek === 0) {
      lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 2);
    }
    
    return lastDayOfMonth;
  } catch (error) {
    console.error('Erro ao calcular último dia útil do mês:', error);
    return new Date();
  }
};

/**
 * Retorna o último dia útil menos 1 dia
 * @param date - Data de referência (padrão: data atual)
 * @returns Último dia útil -1 dia
 */
export const getPenultimateBusinessDay = (date: string | Date = new Date()): Date => {
  try {
    const referenceDate = new Date(date);
    const dayOfWeek = referenceDate.getDay();
    
    // Primeiro, encontrar o último dia útil
    let lastBusinessDay = new Date(referenceDate);
    
    // Se for dia útil (segunda a sexta), usar data atual
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // É dia útil, usar a data atual
    } else {
      // Se for fim de semana, voltar para o último dia útil
      if (dayOfWeek === 6) { // Sábado
        lastBusinessDay.setDate(lastBusinessDay.getDate() - 1); // Voltar para sexta
      } else if (dayOfWeek === 0) { // Domingo
        lastBusinessDay.setDate(lastBusinessDay.getDate() - 2); // Voltar para sexta
      }
    }
    
    // Agora subtrair 1 dia do último dia útil
    const resultDate = new Date(lastBusinessDay);
    resultDate.setDate(resultDate.getDate() - 1);
    
    return resultDate;
  } catch (error) {
    console.error('Erro ao calcular último dia útil -1:', error);
    return new Date();
  }
};

/**
 * Retorna a data atual se for um dia útil, ou o último dia útil anterior
 * @param date - Data de referência (padrão: data atual)
 * @returns Data atual se for dia útil, ou último dia útil anterior
 */
export const getCurrentOrLastBusinessDay = getPenultimateBusinessDay;

/**
 * Verifica se uma data é um dia útil (segunda a sexta-feira)
 * @param date - Data a ser verificada
 * @returns true se for um dia útil
 */
export const isBusinessDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 = segunda, 5 = sexta
};