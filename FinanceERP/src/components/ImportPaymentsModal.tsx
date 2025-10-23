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

interface ImportResult {
  success: {
    clientName: string;
    amount: number;
    contractNumber: string;
    dueDate: string;
    paymentId: string;
  }[];
  errors: {
    row: number;
    clientName?: string;
    amount?: number;
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

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
        console.log('📄 File selected:', {
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          uri: file.uri
        });
        setSelectedFile(file);
        setImportResult(null);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo');
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      Alert.alert('Erro', 'Nenhum arquivo selecionado');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      // Create file object for FormData
      // For web, we need to fetch the blob from the URI
      let fileToUpload: any;
      
      if (typeof window !== 'undefined' && selectedFile.uri.startsWith('blob:')) {
        // Web environment - fetch the blob
        console.log('🌐 Web environment detected, fetching blob from URI');
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        fileToUpload = new File([blob], selectedFile.name, {
          type: selectedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        console.log('📦 File object created:', {
          name: fileToUpload.name,
          size: fileToUpload.size,
          type: fileToUpload.type
        });
      } else {
        // Mobile environment - use URI directly
        console.log('📱 Mobile environment detected, using URI');
        fileToUpload = {
          uri: selectedFile.uri,
          type: selectedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          name: selectedFile.name,
        };
      }

      formData.append('file', fileToUpload as any);

      // Simulate progress - goes up to 90%, then waits for actual response
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            return 90; // Stop at 90%, don't clear interval here
          }
          return prev + 10;
        });
      }, 200);

      // Get token from AsyncStorage
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }
      
      console.log('🔑 Token obtido para importação:', token ? 'Token presente' : 'Token ausente');

      // Get API URL - match the logic from api.ts
      const getApiUrl = () => {
        // PRIORITY 1: Use environment variable if available
        if (process.env.REACT_APP_API_BASE_URL) {
          const url = process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '');
          console.log('🌐 Using API URL from environment:', url);
          return url;
        }
        
        // PRIORITY 2: Detect based on current domain
        if (typeof window !== 'undefined') {
          const currentUrl = window.location.origin;
          
          // Development: localhost
          if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
            console.log('🌐 Using localhost API URL');
            return 'http://localhost:3000';
          }
          
          // Production or Vercel deployments: use same domain
          console.log('🌐 Using current domain API URL:', currentUrl);
          return currentUrl;
        }
        
        // PRIORITY 3: Fallback
        console.log('🌐 Using fallback API URL');
        return 'https://financeiro.institutoareluna.pt';
      };

      const API_URL = getApiUrl();
      console.log('📤 Sending import request to:', `${API_URL}/api/payments/import`);

      const response = await fetch(`${API_URL}/api/payments/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('📥 Response received, clearing progress interval...');
      clearInterval(progressInterval);
      setUploadProgress(100);
      console.log('✓ Progress set to 100%');

      // Check for timeout or errors before parsing
      if (!response.ok) {
        let errorMessage = 'Erro ao processar arquivo';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If can't parse JSON, use status text
          if (response.status === 504 || response.status === 524) {
            errorMessage = 'Timeout: O arquivo é muito grande ou tem muitos registros. Tente com uma planilha menor.';
          } else {
            errorMessage = `Erro ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📊 Response data parsed:', data);

      console.log('✅ Import result:', data);
      
      // Small delay to show 100% progress before showing results
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setImportResult(data.data);
      console.log('📋 Results displayed in modal');
      
      // Don't call onSuccess() here - let the user review results first
      // onSuccess() will be called when they close the modal (handleClose)
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao importar arquivo');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile]);

  const handleClose = useCallback(() => {
    // If there was a successful import, call onSuccess to refresh the payments list
    if (importResult && importResult.success.length > 0) {
      onSuccess();
    }
    
    setSelectedFile(null);
    setImportResult(null);
    setUploadProgress(0);
    onClose();
  }, [onClose, onSuccess, importResult]);

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
            {!importResult && (
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
                  disabled={isUploading}
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

                {/* Progress Bar */}
                {isUploading && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${uploadProgress}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{uploadProgress}%</Text>
                  </View>
                )}

                {/* Upload Button */}
                <View style={styles.buttonContainer}>
                  <Button
                    title={isUploading ? 'Importando...' : 'Importar'}
                    onPress={handleUpload}
                    disabled={!selectedFile || isUploading}
                    variant="primary"
                  />
                </View>
              </>
            )}

            {/* Import Results */}
            {importResult && (
              <>
                {/* Success List */}
                {importResult.success.length > 0 && (
                  <View style={styles.resultSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      <Text style={styles.sectionTitle}>
                        Pagamentos Importados ({importResult.success.length})
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
                        <View style={styles.itemRow}>
                          <Text style={styles.itemLabel}>Vencimento:</Text>
                          <Text style={styles.itemValue}>{item.dueDate}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Error List */}
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
                        <Text style={styles.errorRow}>Linha {item.row}</Text>
                        {item.clientName && (
                          <Text style={styles.errorDetail}>Cliente: {item.clientName}</Text>
                        )}
                        {item.amount !== undefined && (
                          <Text style={styles.errorDetail}>
                            Valor: {formatCurrency(item.amount)}
                          </Text>
                        )}
                        <Text style={styles.errorMessage}>{item.error}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Close Button */}
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
    maxWidth: 600,
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
  progressContainer: {
    marginHorizontal: 24,
    marginTop: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 24,
  },
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
  errorItem: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorRow: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorDetail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7F1D1D',
    marginTop: 4,
  },
});

export default ImportPaymentsModal;

