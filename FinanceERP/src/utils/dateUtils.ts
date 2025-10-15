/**
 * Utilitários para formatação de datas
 * Padroniza todas as datas no formato DD/MM/YYYY
 */

/**
 * Formata uma data para o padrão brasileiro DD/MM/YYYY
 * @param date - Data a ser formatada (string ISO, Date object, ou timestamp)
 * @returns String formatada no padrão DD/MM/YYYY
 */
export const formatDate = (date: string | Date | number | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    
    // Verifica se a data é válida
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '';
  }
};

/**
 * Formata uma data para exibição com hora (DD/MM/YYYY HH:mm)
 * @param date - Data a ser formatada
 * @returns String formatada no padrão DD/MM/YYYY HH:mm
 */
export const formatDateTime = (date: string | Date | number | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Erro ao formatar data e hora:', error);
    return '';
  }
};

/**
 * Converte data do formato DD/MM/YYYY para YYYY-MM-DD (formato ISO)
 * @param dateString - Data no formato DD/MM/YYYY
 * @returns String no formato YYYY-MM-DD ou string vazia se inválida
 */
export const convertDateToISO = (dateString: string): string => {
  if (!dateString || typeof dateString !== 'string') return '';
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return '';
  
  const [day, month, year] = parts;
  
  // Valida se são números válidos
  if (!day || !month || !year || 
      isNaN(Number(day)) || isNaN(Number(month)) || isNaN(Number(year))) {
    return '';
  }
  
  // Valida ranges básicos
  const dayNum = Number(day);
  const monthNum = Number(month);
  const yearNum = Number(year);
  
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
    return '';
  }
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Verifica se uma data está vencida (anterior à data atual)
 * @param date - Data a ser verificada
 * @returns true se a data estiver vencida
 */
export const isOverdue = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  
  try {
    const dateObj = new Date(date);
    const today = new Date();
    
    // Remove a parte do tempo para comparar apenas as datas
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    
    return dateObj < today;
  } catch (error) {
    return false;
  }
};

/**
 * Calcula a diferença em dias entre duas datas
 * @param date1 - Primeira data
 * @param date2 - Segunda data (padrão: data atual)
 * @returns Número de dias de diferença
 */
export const daysDifference = (date1: string | Date, date2: string | Date = new Date()): number => {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    return 0;
  }
};

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