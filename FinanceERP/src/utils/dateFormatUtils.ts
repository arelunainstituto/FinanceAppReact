/**
 * Utilitários para formatação de datas para compatibilidade com API
 */

/**
 * Converte data do formato DD/MM/YYYY para YYYY-MM-DD
 * @param dateString Data no formato DD/MM/YYYY
 * @returns Data no formato YYYY-MM-DD ou string vazia se inválida
 */
export const convertDateToApiFormat = (dateString: string): string => {
  if (!dateString || dateString.trim() === '') {
    return '';
  }

  // Verifica se já está no formato correto (YYYY-MM-DD)
  const isoFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoFormatRegex.test(dateString)) {
    return dateString;
  }

  // Verifica se está no formato ISO completo (YYYY-MM-DDTHH:MM:SSZ)
  const isoWithTimeRegex = /^(\d{4})-(\d{2})-(\d{2})T/;
  const isoWithTimeMatch = dateString.match(isoWithTimeRegex);
  if (isoWithTimeMatch) {
    const [, year, month, day] = isoWithTimeMatch;
    return `${year}-${month}-${day}`;
  }

  // Converte do formato DD/MM/YYYY para YYYY-MM-DD
  const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(ddmmyyyyRegex);
  
  if (match) {
    const [, day, month, year] = match;
    
    // Valida se a data é válida
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const isValidDate = date.getFullYear() === parseInt(year) &&
                       date.getMonth() === parseInt(month) - 1 &&
                       date.getDate() === parseInt(day);
    
    if (isValidDate) {
      return `${year}-${month}-${day}`;
    }
  }

  console.warn(`⚠️ Formato de data inválido: ${dateString}`);
  return '';
};

/**
 * Converte múltiplas datas em um objeto de filtros
 * @param filters Objeto com filtros que podem conter datas
 * @returns Objeto com datas convertidas para formato da API
 */
export const convertDateFiltersToApiFormat = (filters: Record<string, any>): Record<string, any> => {
  const convertedFilters = { ...filters };
  
  // Lista de campos de data que precisam ser convertidos
  const dateFields = [
    'due_date_from',
    'due_date_to',
    'paid_date_from',
    'paid_date_to',
    'created_at_from',
    'created_at_to',
    'start_date_from',
    'start_date_to',
    'end_date_from',
    'end_date_to'
  ];

  dateFields.forEach(field => {
    if (convertedFilters[field]) {
      const convertedDate = convertDateToApiFormat(convertedFilters[field]);
      if (convertedDate) {
        convertedFilters[field] = convertedDate;
        console.log(`📅 Converted ${field}: ${filters[field]} → ${convertedDate}`);
      } else {
        // Remove campo se conversão falhou
        delete convertedFilters[field];
        console.warn(`⚠️ Removed invalid date filter: ${field} = ${filters[field]}`);
      }
    }
  });

  return convertedFilters;
};

/**
 * Converte data do formato YYYY-MM-DD para DD/MM/YYYY
 * @param dateString Data no formato YYYY-MM-DD
 * @returns Data no formato DD/MM/YYYY ou string vazia se inválida
 */
export const convertDateFromApiFormat = (dateString: string): string => {
  if (!dateString || dateString.trim() === '') {
    return '';
  }

  // Verifica se já está no formato DD/MM/YYYY
  const ddmmyyyyRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (ddmmyyyyRegex.test(dateString)) {
    return dateString;
  }

  // Converte do formato YYYY-MM-DD para DD/MM/YYYY
  const isoFormatRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateString.match(isoFormatRegex);
  
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // Converte do formato ISO completo (YYYY-MM-DDTHH:MM:SSZ)
  const isoWithTimeRegex = /^(\d{4})-(\d{2})-(\d{2})T/;
  const isoWithTimeMatch = dateString.match(isoWithTimeRegex);
  if (isoWithTimeMatch) {
    const [, year, month, day] = isoWithTimeMatch;
    return `${day}/${month}/${year}`;
  }

  console.warn(`⚠️ Formato de data da API inválido: ${dateString}`);
  return dateString; // Retorna original se não conseguir converter
};