import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Button from './common/Button';
import { formatCurrency } from '../utils/currency';
import api from '../services/api';

interface PreviewMatch {
  excelRow: number;
  clientName: string;
  amount: number;
  description: string;
  status: string;
  matchedPayment: {
    paymentId: string;
    contractNumber: string;
    dueDate: string;
    amount: number;
    clientName: string;
  } | null;
  error?: string;
}

interface PreviewResult {
  matches: PreviewMatch[];
  errors: {
    row: number;
    error: string;
  }[];
}

interface ImportResult {
  success: {
    paymentId: string;
    clientName: string;
    amount: number;
    contractNumber: string;
    dueDate: string;
  }[];
  errors: {
    paymentId: string;
    error: string;
  }[];
}

interface ImportPaymentsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportPaymentsModal: React.FC<ImportPaymentsModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [confirmedPayments, setConfirmedPayments] = useState<Set<string>>(new Set());

  const handlePickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('File selected:', file.name);
        setSelectedFile(file);
        setPreviewResult(null);
        setImportResult(null);
        setSelectedPayments(new Set());
        setConfirmedPayments(new Set());
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo');
    }
  }, []);

  const handlePreview = useCallback(async () => {
    if (!selectedFile) {
      Alert.alert('Erro', 'Nenhum arquivo selecionado');
      return;
    }

    setIsLoading(true);

    try {
      let fileToUpload: any;
      
      if (typeof window !== 'undefined' && selectedFile.uri.startsWith('blob:')) {
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        fileToUpload = new File([blob], selectedFile.name, {
          type: selectedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      } else {
        fileToUpload = {
          uri: selectedFile.uri,
          type: selectedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          name: selectedFile.name,
        };
      }

      const response = await api.previewImportFromExcel(fileToUpload);
      
      if (response.success && response.data) {
        setPreviewResult(response.data);
        const validMatches = response.data.matches
          .filter(m => m.matchedPayment && !m.error)
          .map(m => m.matchedPayment!.paymentId);
        setSelectedPayments(new Set(validMatches));
      } else {
        Alert.alert('Erro', 'Não foi possível processar o arquivo');
      }
    } catch (error) {
      console.error('Preview error:', error);
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  const handleTogglePayment = useCallback((paymentId: string) => {
    setSelectedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    if (!previewResult) return;
    
    const validPaymentIds = previewResult.matches
      .filter(m => m.matchedPayment && !m.error && !confirmedPayments.has(m.matchedPayment.paymentId))
      .map(m => m.matchedPayment!.paymentId);
    
    if (selectedPayments.size === validPaymentIds.length) {
      // Deselect all
      setSelectedPayments(new Set());
    } else {
      // Select all
      setSelectedPayments(new Set(validPaymentIds));
    }
  }, [previewResult, selectedPayments, confirmedPayments]);

  const handleConfirmImport = useCallback(async () => {
    if (selectedPayments.size === 0) {
      Alert.alert('Aviso', 'Nenhum pagamento selecionado para importação');
      return;
    }

    setIsLoading(true);

    try {
      const paymentIds = Array.from(selectedPayments);
      const response = await api.confirmImport(paymentIds);
      
      if (response.success && response.data) {
        setImportResult(response.data);
        response.data.success.forEach(item => {
          setConfirmedPayments(prev => new Set(prev).add(item.paymentId));
        });
        
        Alert.alert(
          'Importação Concluída',
          `${response.data.success.length} pagamento(s) importado(s) com sucesso!`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Confirm import error:', error);
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao confirmar importação');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPayments, onSuccess]);

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setPreviewResult(null);
    setImportResult(null);
    setSelectedPayments(new Set());
    setConfirmedPayments(new Set());
    onClose();
  }, [onClose]);

  const getStats = () => {
    if (!previewResult) return { total: 0, eligible: 0, errors: 0 };
    
    const eligible = previewResult.matches.filter(m => m.matchedPayment && !m.error).length;
    const errors = previewResult.matches.filter(m => m.error || !m.matchedPayment).length + previewResult.errors.length;
    
    return {
      total: previewResult.matches.length,
      eligible,
      errors
    };
  };

  const getRowStyle = (match: PreviewMatch) => {
    if (match.error || !match.matchedPayment) {
      return styles.rowError;
    }
    if (confirmedPayments.has(match.matchedPayment.paymentId)) {
      return styles.rowConfirmed;
    }
    if (selectedPayments.has(match.matchedPayment.paymentId)) {
      return styles.rowSelected;
    }
    return styles.rowDefault;
  };

  const stats = getStats();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Importar Pagamentos</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* File Selection Area */}
            {!previewResult && !importResult && (
              <>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.infoText}>
                    Selecione uma planilha Excel (.xlsx) com as colunas "Descrição" e "Status"
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={handlePickDocument}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={selectedFile ? 'document' : 'cloud-upload'}
                    size={48}
                    color={selectedFile ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={styles.uploadText}>
                    {selectedFile
                      ? selectedFile.name
                      : 'Toque para selecionar arquivo'}
                  </Text>
                  {selectedFile && (
                    <Text style={styles.uploadSubtext}>
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.buttonContainer}>
                  <Button
                    title={isLoading ? 'Processando...' : 'Analisar Arquivo'}
                    onPress={handlePreview}
                    disabled={!selectedFile || isLoading}
                    variant="primary"
                  />
                </View>
              </>
            )}

            {/* Loading */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Processando...</Text>
              </View>
            )}

            {/* Preview Table */}
            {previewResult && !importResult && !isLoading && (
              <>
                {/* Statistics Summary */}
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total Encontrado</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, styles.statValueSuccess]}>{stats.eligible}</Text>
                    <Text style={styles.statLabel}>Elegíveis</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, styles.statValueError]}>{stats.errors}</Text>
                    <Text style={styles.statLabel}>Com Erro</Text>
                  </View>
                </View>

                {/* Selection Control */}
                <View style={styles.selectionControl}>
                  <TouchableOpacity 
                    style={styles.selectAllButton}
                    onPress={handleToggleAll}
                  >
                    <Ionicons 
                      name={selectedPayments.size === stats.eligible ? 'checkbox' : 'square-outline'} 
                      size={20} 
                      color="#3B82F6" 
                    />
                    <Text style={styles.selectAllText}>
                      Selecionar todos ({selectedPayments.size}/{stats.eligible})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <View style={styles.tableHeaderCell1}>
                    <Text style={styles.tableHeaderText}>Linha</Text>
                  </View>
                  <View style={styles.tableHeaderCell2}>
                    <Text style={styles.tableHeaderText}>Dados do Excel</Text>
                  </View>
                  <View style={styles.tableHeaderCell3}>
                    <Text style={styles.tableHeaderText}>Pagamento no Banco</Text>
                  </View>
                  <View style={styles.tableHeaderCell4}>
                    <Text style={styles.tableHeaderText}>Status</Text>
                  </View>
                </View>

                {/* Table Rows */}
                <View style={styles.tableBody}>
                  {previewResult.matches.map((match, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.tableRow, getRowStyle(match)]}
                      onPress={() => match.matchedPayment && !match.error && !confirmedPayments.has(match.matchedPayment.paymentId) && handleTogglePayment(match.matchedPayment.paymentId)}
                      disabled={!match.matchedPayment || !!match.error || (match.matchedPayment && confirmedPayments.has(match.matchedPayment.paymentId))}
                    >
                      {/* Column 1: Row Number */}
                      <View style={styles.tableCell1}>
                        <Text style={styles.rowNumber}>{match.excelRow}</Text>
                      </View>

                      {/* Column 2: Excel Data */}
                      <View style={styles.tableCell2}>
                        <Text style={styles.cellTitle}>{match.clientName}</Text>
                        <Text style={styles.cellAmount}>{formatCurrency(match.amount)}</Text>
                      </View>

                      {/* Column 3: Bank Payment */}
                      <View style={styles.tableCell3}>
                        {match.matchedPayment ? (
                          <>
                            <Text style={styles.cellTitle}>{match.matchedPayment.clientName}</Text>
                            <Text style={styles.cellSubtitle}>
                              Contrato: {match.matchedPayment.contractNumber}
                            </Text>
                            <View style={styles.cellRow}>
                              <Text style={styles.cellAmount}>{formatCurrency(match.matchedPayment.amount)}</Text>
                              <Text style={styles.cellDate}>{match.matchedPayment.dueDate}</Text>
                            </View>
                          </>
                        ) : (
                          <Text style={styles.cellError}>
                            {match.error || 'Sem correspondência'}
                          </Text>
                        )}
                      </View>

                      {/* Column 4: Status/Checkbox */}
                      <View style={styles.tableCell4}>
                        {match.error || !match.matchedPayment ? (
                          <View style={styles.statusError}>
                            <Ionicons name="close-circle" size={20} color="#DC2626" />
                          </View>
                        ) : confirmedPayments.has(match.matchedPayment.paymentId) ? (
                          <View style={styles.statusConfirmed}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                          </View>
                        ) : (
                          <Ionicons
                            name={selectedPayments.has(match.matchedPayment.paymentId) ? 'checkbox' : 'square-outline'}
                            size={24}
                            color={selectedPayments.has(match.matchedPayment.paymentId) ? '#3B82F6' : '#94A3B8'}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* General Errors */}
                {previewResult.errors.length > 0 && (
                  <View style={styles.generalErrors}>
                    <Text style={styles.generalErrorsTitle}>
                      Erros de Processamento ({previewResult.errors.length})
                    </Text>
                    {previewResult.errors.map((err, index) => (
                      <View key={index} style={styles.errorItem}>
                        <Text style={styles.errorText}>
                          Linha {err.row}: {err.error}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <View style={styles.buttonHalf}>
                    <Button
                      title="Cancelar"
                      onPress={handleClose}
                      variant="secondary"
                    />
                  </View>
                  <View style={styles.buttonHalf}>
                    <Button
                      title={`Importar ${selectedPayments.size > 0 ? `(${selectedPayments.size})` : ''}`}
                      onPress={handleConfirmImport}
                      disabled={selectedPayments.size === 0 || isLoading}
                      variant="primary"
                    />
                  </View>
                </View>
              </>
            )}

            {/* Import Results */}
            {importResult && !isLoading && (
              <>
                <View style={styles.resultSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={styles.sectionTitle}>
                      Importação Concluída ({importResult.success.length})
                    </Text>
                  </View>
                  {importResult.success.map((item, index) => (
                    <View key={index} style={styles.successItem}>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemLabel}>Cliente:</Text>
                        <Text style={styles.itemValue}>{item.clientName}</Text>
                      </View>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemLabel}>Valor:</Text>
                        <Text style={[styles.itemValue, styles.amountText]}>
                          {formatCurrency(item.amount)}
                        </Text>
                      </View>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemLabel}>Contrato:</Text>
                        <Text style={styles.itemValue}>{item.contractNumber}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {importResult.errors.length > 0 && (
                  <View style={styles.resultSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="alert-circle" size={24} color="#EF4444" />
                      <Text style={[styles.sectionTitle, styles.errorTitle]}>
                        Erros ({importResult.errors.length})
                      </Text>
                    </View>
                    {importResult.errors.map((item, index) => (
                      <View key={index} style={styles.errorItem}>
                        <Text style={styles.errorText}>
                          ID: {item.paymentId} - {item.error}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  <Button
                    title="Fechar"
                    onPress={handleClose}
                    variant="secondary"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 900,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    margin: 24,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    marginHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  uploadSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#94A3B8',
  },
  buttonContainer: {
    padding: 24,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  // Statistics Cards
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statValueSuccess: {
    color: '#10B981',
  },
  statValueError: {
    color: '#DC2626',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  // Selection Control
  selectionControl: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
  tableHeaderCell1: {
    width: 60,
    justifyContent: 'center',
  },
  tableHeaderCell2: {
    flex: 2,
    justifyContent: 'center',
  },
  tableHeaderCell3: {
    flex: 3,
    justifyContent: 'center',
  },
  tableHeaderCell4: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    paddingHorizontal: 24,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    minHeight: 60,
  },
  rowDefault: {
    backgroundColor: '#FFFFFF',
  },
  rowSelected: {
    backgroundColor: '#EFF6FF',
  },
  rowConfirmed: {
    backgroundColor: '#F0FDF4',
  },
  rowError: {
    backgroundColor: '#FEF2F2',
  },
  tableCell1: {
    width: 60,
    justifyContent: 'center',
  },
  tableCell2: {
    flex: 2,
    justifyContent: 'center',
    paddingRight: 12,
  },
  tableCell3: {
    flex: 3,
    justifyContent: 'center',
    paddingRight: 12,
  },
  tableCell4: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  cellTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  cellSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  cellAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  cellDate: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
  },
  cellRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cellError: {
    fontSize: 13,
    color: '#DC2626',
    fontStyle: 'italic',
  },
  statusError: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusConfirmed: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // General Errors
  generalErrors: {
    marginHorizontal: 24,
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  generalErrorsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
  },
  errorItem: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#7F1D1D',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  buttonHalf: {
    flex: 1,
  },
  // Results
  resultSection: {
    marginHorizontal: 24,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  errorTitle: {
    color: '#EF4444',
  },
  successItem: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  itemValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  amountText: {
    color: '#10B981',
  },
});

export default ImportPaymentsModal;
