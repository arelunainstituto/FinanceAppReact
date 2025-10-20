import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemType: string; // e.g., 'clientes', 'pagamentos', 'contratos'
  rowCountOptions?: number[];
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemType,
  rowCountOptions = [10, 25, 50, 100],
}) => {
  const [showRowCountPicker, setShowRowCountPicker] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  if (totalPages <= 1 && totalItems <= Math.min(...rowCountOptions)) {
    return null;
  }

  const maxVisiblePages = isTablet ? 7 : 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleRowCountSelect = (count: number | 'custom') => {
    if (count === 'custom') {
      setShowCustomInput(true);
    } else {
      onItemsPerPageChange(count);
      setShowRowCountPicker(false);
      setShowCustomInput(false);
      setCustomValue('');
    }
  };

  const handleCustomValueSubmit = () => {
    const numValue = parseInt(customValue, 10);
    
    // Validação do valor
    if (!customValue.trim()) {
      Alert.alert('Erro', 'Por favor, insira um valor.');
      return;
    }
    
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Erro', 'Por favor, insira um número válido maior que zero.');
      return;
    }
    
    if (numValue > 1000) {
      Alert.alert('Erro', 'O valor máximo permitido é 1000 registros por página.');
      return;
    }
    
    // Aplicar o valor personalizado
    onItemsPerPageChange(numValue);
    setShowRowCountPicker(false);
    setShowCustomInput(false);
    setCustomValue('');
  };

  const handleCancelCustomInput = () => {
    setShowCustomInput(false);
    setCustomValue('');
  };

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const renderRowCountPicker = () => (
    <Modal
      visible={showRowCountPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setShowRowCountPicker(false);
        setShowCustomInput(false);
        setCustomValue('');
      }}
    >
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>
            {showCustomInput ? 'Valor Personalizado' : 'Linhas por página'}
          </Text>
          <TouchableOpacity onPress={() => {
            setShowRowCountPicker(false);
            setShowCustomInput(false);
            setCustomValue('');
          }}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        
        {showCustomInput ? (
          <View style={styles.customInputContainer}>
            <Text style={styles.customInputLabel}>
              Insira o número de registros por página:
            </Text>
            <TextInput
              style={styles.customInput}
              value={customValue}
              onChangeText={setCustomValue}
              placeholder="Ex: 30"
              keyboardType="number-pad"
              autoFocus
              maxLength={4}
            />
            <Text style={styles.customInputHint}>
              Valor máximo: 1000 registros
            </Text>
            <View style={styles.customInputButtons}>
              <TouchableOpacity
                style={[styles.customInputButton, styles.customInputButtonCancel]}
                onPress={handleCancelCustomInput}
              >
                <Text style={styles.customInputButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customInputButton, styles.customInputButtonConfirm]}
                onPress={handleCustomValueSubmit}
              >
                <Text style={styles.customInputButtonTextConfirm}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.pickerList}>
            {rowCountOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.pickerOption,
                  itemsPerPage === option && styles.pickerOptionSelected
                ]}
                onPress={() => handleRowCountSelect(option)}
              >
                <Text style={[
                  styles.pickerOptionText,
                  itemsPerPage === option && styles.pickerOptionTextSelected
                ]}>
                  {option} linhas
                </Text>
                {itemsPerPage === option && (
                  <Ionicons name="checkmark" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
            
            {/* Opção Personalizado */}
            <TouchableOpacity
              style={[
                styles.pickerOption,
                styles.customOption,
                !rowCountOptions.includes(itemsPerPage) && styles.pickerOptionSelected
              ]}
              onPress={() => handleRowCountSelect('custom')}
            >
              <View style={styles.customOptionContent}>
                <Ionicons name="create-outline" size={20} color="#3B82F6" />
                <Text style={[
                  styles.pickerOptionText,
                  styles.customOptionText,
                  !rowCountOptions.includes(itemsPerPage) && styles.pickerOptionTextSelected
                ]}>
                  Personalizado
                </Text>
                {!rowCountOptions.includes(itemsPerPage) && (
                  <Text style={styles.customOptionValue}>
                    ({itemsPerPage} linhas)
                  </Text>
                )}
              </View>
              {!rowCountOptions.includes(itemsPerPage) && (
                <Ionicons name="checkmark" size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.paginationContainer}>
      <View style={styles.paginationInfo}>
        <Text style={styles.paginationText}>
          Mostrando {startIndex} - {endIndex} de {totalItems} {itemType}
        </Text>
        
        <View style={styles.rowCountContainer}>
          <Text style={styles.rowCountLabel}>Linhas por página:</Text>
          <TouchableOpacity
            style={styles.rowCountSelector}
            onPress={() => setShowRowCountPicker(true)}
          >
            <Text style={styles.rowCountText}>{itemsPerPage}</Text>
            <Ionicons name="chevron-down" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
      
      {totalPages > 1 && (
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
            onPress={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <Ionicons 
              name="chevron-back" 
              size={16} 
              color={currentPage === 1 ? '#9CA3AF' : '#374151'} 
            />
          </TouchableOpacity>

          {startPage > 1 && (
            <React.Fragment key="start-pagination">
              <TouchableOpacity
                style={styles.paginationButton}
                onPress={() => onPageChange(1)}
              >
                <Text style={styles.paginationButtonText}>1</Text>
              </TouchableOpacity>
              {startPage > 2 && (
                <Text key="start-ellipsis" style={styles.paginationEllipsis}>...</Text>
              )}
            </React.Fragment>
          )}

          {pageNumbers.map((pageNumber) => (
            <TouchableOpacity
              key={pageNumber}
              style={[
                styles.paginationButton,
                currentPage === pageNumber && styles.paginationButtonActive
              ]}
              onPress={() => onPageChange(pageNumber)}
            >
              <Text style={[
                styles.paginationButtonText,
                currentPage === pageNumber && styles.paginationButtonTextActive
              ]}>
                {pageNumber}
              </Text>
            </TouchableOpacity>
          ))}

          {endPage < totalPages && (
            <React.Fragment key="end-pagination">
              {endPage < totalPages - 1 && (
                <Text key="end-ellipsis" style={styles.paginationEllipsis}>...</Text>
              )}
              <TouchableOpacity
                style={styles.paginationButton}
                onPress={() => onPageChange(totalPages)}
              >
                <Text style={styles.paginationButtonText}>{totalPages}</Text>
              </TouchableOpacity>
            </React.Fragment>
          )}

          <TouchableOpacity
            style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
            onPress={goToNextPage}
            disabled={currentPage === totalPages}
          >
            <Ionicons 
              name="chevron-forward" 
              size={16} 
              color={currentPage === totalPages ? '#9CA3AF' : '#374151'} 
            />
          </TouchableOpacity>
        </View>
      )}
      
      {renderRowCountPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  paginationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paginationInfo: {
    flexDirection: isTablet ? 'row' : 'column',
    justifyContent: isTablet ? 'space-between' : 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: isTablet ? 0 : 8,
  },
  paginationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  rowCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCountLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  rowCountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  rowCountText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  pickerList: {
    flex: 1,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  paginationButton: {
    minWidth: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  paginationButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  paginationButtonTextActive: {
    color: '#FFFFFF',
  },
  paginationEllipsis: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 8,
  },
  customOption: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 16,
  },
  customOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customOptionText: {
    fontWeight: '600',
  },
  customOptionValue: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 4,
  },
  customInputContainer: {
    padding: 20,
    flex: 1,
  },
  customInputLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 12,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  customInputHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 24,
  },
  customInputButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  customInputButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customInputButtonCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  customInputButtonConfirm: {
    backgroundColor: '#3B82F6',
  },
  customInputButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  customInputButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PaginationControls;