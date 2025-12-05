import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Contract } from '../types';
import ApiService from '../services/api';
import Button from '../components/common/Button';
import MainLayout from '../components/layout/MainLayout';
import UltimaTable, { UltimaTableColumn } from '../components/UltimaTable';
import ActionButton from '../components/common/ActionButton';
import StatusBadge from '../components/common/StatusBadge';
import ContractAdvancedFilters, { ContractAdvancedFiltersData } from '../components/filters/ContractAdvancedFilters';
import ContractFilterChips from '../components/filters/ContractFilterChips';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dateUtils';
import { convertDateFiltersToApiFormat } from '../utils/dateFormatUtils';
import ContractForm from '../components/forms/ContractForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { ContractDetailsModal } from '../components/ContractDetailsModal';
import { MainStackParamList } from '../navigation/AppNavigator';
import { exportContractsToCSV } from '../utils/csvExport';
import PaginationControls from '../components/common/PaginationControls';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;
const DEFAULT_ITEMS_PER_PAGE = isTablet ? 10 : 8;

type ContractsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Contracts'>;
type ContractsScreenRouteProp = RouteProp<MainStackParamList, 'Contracts'>;

const ContractsScreen: React.FC = () => {
  const navigation = useNavigation<ContractsScreenNavigationProp>();
  const route = useRoute<ContractsScreenRouteProp>();
  
  // Debug logs para verificar parâmetros de navegação
  console.log('🚀 ContractsScreen iniciado');
  console.log('📍 route.params completo:', JSON.stringify(route.params, null, 2));
  console.log('🆔 clientId recebido:', route.params?.clientId);
  console.log('👤 clientName recebido:', route.params?.clientName);
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  
  // Contract form states
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  
  // Contract details modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  
  // Advanced filters states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<ContractAdvancedFiltersData>({});

  // Calculate total pages using useMemo to avoid unnecessary recalculations
  const totalPages = useMemo(() => {
    return Math.ceil(filteredContracts.length / itemsPerPage);
  }, [filteredContracts.length, itemsPerPage]);

  // Reset to first page if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Removido useEffect que carregava todos os contratos automaticamente
  // Agora só carrega quando há clientId ou quando não há parâmetros específicos

  // Removed: Setting search query with client name as it interferes with contract title search
  // The client filter is already handled by the clientId parameter

  // Filter contracts based on search query, client filter, and advanced filters
  const applyFilters = useCallback(async (searchQuery: string, clientId?: string, advancedFilters: ContractAdvancedFiltersData = {}) => {
    // Prepare filters for backend
    const filters: Record<string, any> = {};

    // Add search query
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }

    // Add client filter
    if (clientId) {
      filters.client_id = clientId;
    }

    // Add advanced filters with field name mapping
    Object.keys(advancedFilters).forEach(key => {
      const value = advancedFilters[key as keyof ContractAdvancedFiltersData];
      if (value !== undefined && value !== null && value !== '') {
        // Map frontend field names to backend field names
        if (key === 'value_min') {
          const numericValue = parseFloat(value.toString().replace(',', '.'));
          if (!isNaN(numericValue)) {
            filters.value_min = numericValue;
            console.log('🔍 Setting value_min filter:', numericValue);
          }
        } else if (key === 'value_max') {
          const numericValue = parseFloat(value.toString().replace(',', '.'));
          if (!isNaN(numericValue)) {
            filters.value_max = numericValue;
            console.log('🔍 Setting value_max filter:', numericValue);
          }
        } else {
          filters[key] = value;
        }
      }
    });

    console.log('🔍 Filtros enviados para o backend:', filters);
    console.log('📅 Filtros de data específicos:', {
      start_date_from: filters.start_date_from,
      start_date_to: filters.start_date_to,
      end_date_from: filters.end_date_from,
      end_date_to: filters.end_date_to
    });

    // Converter datas para formato da API (DD/MM/YYYY → YYYY-MM-DD)
    const filtersWithConvertedDates = convertDateFiltersToApiFormat(filters);

    console.log('🔄 Filtros após conversão de datas:', filtersWithConvertedDates);

    // Load contracts with filters from backend
  await loadContracts(filtersWithConvertedDates);
}, []);

// Load contracts on component mount or when client filter changes
useEffect(() => {
  console.log('🔄 useEffect triggered with route.params:', route.params);
  // If there's a clientId from navigation, apply client filter immediately
  if (route.params?.clientId) {
    console.log('🔍 Loading contracts for clientId:', route.params.clientId);
    const clientFilters = {
      client_id: route.params.clientId
    };
    console.log('📋 Client filters object:', clientFilters);
    loadContracts(clientFilters);
  } else {
    // Load all contracts if no client filter
    console.log('🔍 Loading all contracts (no client filter)');
    loadContracts();
  }
}, [route.params?.clientId]);

// Apply additional filters (search and advanced filters) when they change
useEffect(() => {
  // Only apply filters if we have search query or advanced filters
  if (searchQuery || Object.keys(advancedFilters).length > 0) {
    console.log('🔍 Applying search/advanced filters');
    console.log('🔍 Search query:', searchQuery);
    console.log('🔍 Advanced filters:', advancedFilters);
    console.log('🔍 Client ID from route:', route.params?.clientId);
    
    // Use applyFilters which combines all filters including clientId
    applyFilters(searchQuery, route.params?.clientId, advancedFilters);
  } else if (!route.params?.clientId) {
    // If no filters and no clientId, load all contracts
    console.log('🔍 No filters active, loading all contracts');
    loadContracts();
  }
  // Note: If we have clientId but no other filters, the clientId useEffect will handle it
}, [searchQuery, advancedFilters]);

  const loadContracts = async (filters?: Record<string, any>) => {
    try {
      setIsLoading(true);
      console.log('📡 Calling ApiService.getContracts with filters:', filters);
      const response = await ApiService.getContracts(filters);
      console.log('📡 API Response received:', response);
      console.log('📡 Response success:', response.success);
      console.log('📡 Response data length:', response.data?.length || 0);
      
      if (response.success && response.data) {
        console.log('✅ Setting contracts:', response.data.length, 'contracts');
        setContracts(response.data);
        setFilteredContracts(response.data);
        setCurrentPage(1); // Reset to first page when filters change
      } else {
        console.warn('⚠️ API response not successful or no data:', response);
        setContracts([]);
        setFilteredContracts([]);
      }
    } catch (error) {
      console.error('❌ Error loading contracts:', error);
      Alert.alert('Erro', 'Não foi possível carregar os contratos. Verifique sua conexão.');
      setContracts([]);
      setFilteredContracts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContract = (contract: Contract) => {
    setContractToDelete(contract);
    setShowConfirmDialog(true);
  };

  const confirmDeleteContract = async () => {
    if (!contractToDelete) return;
    
    try {
      const response = await ApiService.deleteContract(contractToDelete.id);
      if (response.success) {
        // Recarregar os dados do servidor para garantir consistência
        // Aplicar os mesmos filtros que estão atualmente ativos
        const currentFilters: Record<string, any> = {};
        
        // Adicionar filtro de cliente se existir
        if (route.params?.clientId) {
          currentFilters.client_id = route.params.clientId;
        }
        
        // Adicionar filtro de pesquisa se existir
        if (searchQuery.trim()) {
          currentFilters.search = searchQuery.trim();
        }
        
        // Adicionar filtros avançados se existirem
        Object.keys(advancedFilters).forEach(key => {
          const value = advancedFilters[key as keyof ContractAdvancedFiltersData];
          if (value !== undefined && value !== null && value !== '') {
            currentFilters[key] = value;
          }
        });
        
        // Converter datas para formato da API se necessário
        const filtersWithConvertedDates = convertDateFiltersToApiFormat(currentFilters);
        
        // Recarregar contratos com os filtros atuais
        await loadContracts(Object.keys(filtersWithConvertedDates).length > 0 ? filtersWithConvertedDates : undefined);
        
        Alert.alert('Sucesso', 'Contrato excluído com sucesso');
      }
    } catch (error) {
      console.error('Error deleting contract:', error);
      Alert.alert('Erro', 'Não foi possível excluir o contrato');
    } finally {
      setShowConfirmDialog(false);
      setContractToDelete(null);
    }
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    
    const sortedContracts = [...filteredContracts].sort((a, b) => {
      let aValue = a[column as keyof Contract] as any;
      let bValue = b[column as keyof Contract] as any;
      
      // Handle null/undefined values - put them at the end
      if (aValue === null || aValue === undefined) {
        return direction === 'asc' ? 1 : -1;
      }
      if (bValue === null || bValue === undefined) {
        return direction === 'asc' ? -1 : 1;
      }
      
      // Handle string values (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle numeric comparison (value, number_of_payments, etc)
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (direction === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }
      
      // Handle date comparison
      if (column === 'start_date' || column === 'end_date') {
        const dateA = new Date(aValue).getTime();
        const dateB = new Date(bValue).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
      }
      
      // Handle other types
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredContracts(sortedContracts);
    setCurrentPage(1); // Reset to first page after sorting
  };

  const handleCreateContract = () => {
    setEditingContract(null);
    setShowContractForm(true);
  };

  const handleExportCSV = () => {
    try {
      if (!filteredContracts || filteredContracts.length === 0) {
        Alert.alert('Aviso', 'Não há dados de contratos para exportar.');
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `contratos_${timestamp}`;
      
      exportContractsToCSV(filteredContracts);
      
      Alert.alert('Sucesso', 'Arquivo CSV exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      Alert.alert('Erro', 'Falha ao exportar dados para CSV.');
    }
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setShowContractForm(true);
  };

  const handleSubmitContract = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsSubmitting(true);
      
      if (editingContract) {
        // Update existing contract
        const response = await ApiService.updateContract(editingContract.id, contractData);
        if (response.success && response.data) {
          // Atualizar ambos os estados: contracts e filteredContracts
          const updatedContracts = contracts.map(c => c.id === editingContract.id ? response.data : c);
          setContracts(updatedContracts);
          setFilteredContracts(filteredContracts.map(c => c.id === editingContract.id ? response.data : c));
          Alert.alert('Sucesso', 'Contrato actualizado com sucesso');
        } else {
          Alert.alert('Erro', 'Não foi possível actualizar o contrato');
        }
      } else {
        // Create new contract
        const response = await ApiService.createContract(contractData);
        if (response.success && response.data) {
          // Reload the complete list from server to ensure data consistency
          await loadContracts();
          Alert.alert('Sucesso', 'Contrato criado com sucesso');
        } else {
          Alert.alert('Erro', 'Não foi possível criar o contrato');
        }
      }
      
      setShowContractForm(false);
      setEditingContract(null);
    } catch (error) {
      console.error('Error submitting contract:', error);
      Alert.alert('Erro', 'Não foi possível guardar o contrato');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseContractForm = () => {
    setShowContractForm(false);
    setEditingContract(null);
  };

  const handleRowPress = (contract: Contract) => {
    // Navigate to payments page for this contract
    navigation.navigate('Payments', { contractId: contract.id });
  };

  // Pagination functions
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredContracts.slice(startIndex, endIndex);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const renderPaginationControls = () => {
    return (
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredContracts.length}
        itemsPerPage={itemsPerPage}
        onPageChange={goToPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        itemType="contratos"
        rowCountOptions={[5, 8, 10, 15, 20, 25, 50]}
      />
    );
  };

  const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'danger' | 'default' => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'ativo':
        return 'success';
      case 'liquidado':
        return 'info';
      case 'renegociado':
        return 'warning';
      case 'cancelado':
      case 'jurídico':
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns: UltimaTableColumn[] = [
    {
      key: 'contract_number',
      title: 'Número',
      sortable: true,
      width: '7%',
      align: 'left',
      render: (contract: Contract) => (
        <Text style={{ fontSize: 14, color: '#334155', fontWeight: '500' }} numberOfLines={1} ellipsizeMode="tail">
          {contract.contract_number || 'N/A'}
        </Text>
      ),
    },
    {
      key: 'local',
      title: 'Local',
      sortable: true,
      width: '9%',
      align: 'left',
      render: (contract: Contract) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {contract.local || 'N/A'}
        </Text>
      ),
    },
    {
      key: 'area',
      title: 'Área',
      sortable: true,
      width: '7%',
      align: 'left',
      render: (contract: Contract) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {contract.area || 'N/A'}
        </Text>
      ),
    },
    {
      key: 'gestora',
      title: 'Gestor(a)',
      sortable: true,
      width: '9%',
      align: 'left',
      render: (contract: Contract) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {contract.gestora || 'N/A'}
        </Text>
      ),
    },
    {
      key: 'medico',
      title: 'Médico(a)',
      sortable: true,
      width: '9%',
      align: 'left',
      render: (contract: Contract) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {contract.medico || 'N/A'}
        </Text>
      ),
    },
    {
      key: 'client_name',
      title: 'Cliente',
      sortable: true,
      width: '12%',
      align: 'left',
      render: (contract: Contract) => {
        if (contract.client) {
          const firstName = contract.client.first_name || '';
          const lastName = contract.client.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || 'N/A';
          return (
            <Text style={{ fontSize: 14, color: '#334155', fontWeight: '500' }} numberOfLines={1} ellipsizeMode="tail">
              {fullName}
            </Text>
          );
        }
        return (
          <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">N/A</Text>
        );
      },
    },
    {
      key: 'value',
      title: 'Valor',
      sortable: true,
      width: '7%',
      align: 'left',
      render: (contract: Contract, value: number) => (
        <Text style={{ fontSize: 14, color: '#334155', fontWeight: '600' }} numberOfLines={1} ellipsizeMode="tail">
          {formatCurrency(value as number)}
        </Text>
      ),
    },
    {
      key: 'number_of_payments',
      title: 'Nº Parcelas',
      sortable: true,
      width: '6%',
      align: 'left',
      render: (contract: Contract, numberOfPayments: number) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {numberOfPayments ? numberOfPayments.toString() : 'N/A'}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      width: '8%',
      align: 'left',
      render: (contract: Contract, status: string) => (
        <StatusBadge
          label={status.toUpperCase()}
          variant={getStatusVariant(status)}
        />
      ),
    },
    {
      key: 'start_date',
      title: 'Início',
      sortable: true,
      width: '7%',
      align: 'left',
      render: (contract: Contract, date: string) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {formatDate(date as string)}
        </Text>
      ),
    },
    {
      key: 'end_date',
      title: 'Fim',
      sortable: true,
      width: '7%',
      align: 'left',
      render: (contract: Contract, date: string) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {formatDate(date as string)}
        </Text>
      ),
    },
  ];

  return (
    <MainLayout activeRoute="Contracts">
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Contratos</Text>
              {route.params?.clientName && (
                <Text style={styles.subtitle}>
                  Filtrado por: {route.params.clientName}
                </Text>
              )}
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  (!filteredContracts || filteredContracts.length === 0) && { opacity: 0.5 }
                ]}
                onPress={handleExportCSV}
                disabled={!filteredContracts || filteredContracts.length === 0}
              >
                <Ionicons name="download" size={16} color="#059669" />
                <Text style={[
                  styles.exportButtonText,
                  (!filteredContracts || filteredContracts.length === 0) && styles.exportButtonTextDisabled
                ]}>
                  Exportar CSV
                </Text>
              </TouchableOpacity>
              <Button
                title="Novo Contrato"
                onPress={handleCreateContract}
                variant="primary"
              />
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Procurar por título do contrato..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Ionicons name="filter" size={20} color="#007AFF" />
              <Text style={styles.filterButtonText}>Filtros Avançados</Text>
              {Object.keys(advancedFilters).length > 0 && (
                <View style={styles.filterIndicator} />
              )}
            </TouchableOpacity>
          </View>

          <ContractFilterChips
            filters={advancedFilters}
            onRemoveFilter={(key) => {
              const newFilters = { ...advancedFilters };
              delete newFilters[key];
              setAdvancedFilters(newFilters);
            }}
            onClearAll={() => setAdvancedFilters({})}
          />

          <UltimaTable
            data={getCurrentPageData()}
            columns={columns}
            loading={isLoading}
            onSort={handleSort}
            onRowPress={handleRowPress}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            actions={(contract: Contract) => (
              <>
                <ActionButton
                  icon="eye"
                  variant="info"
                  onPress={() => {
                    setSelectedContractId(contract.id);
                    setShowDetailsModal(true);
                  }}
                />
                <ActionButton
                  icon="card"
                  variant="success"
                  onPress={() => navigation.navigate('Payments', { contractId: contract.id })}
                />
                <ActionButton
                  icon="pencil"
                  variant="primary"
                  onPress={() => handleEditContract(contract)}
                />
                <ActionButton
                  icon="trash"
                  variant="danger"
                  onPress={() => handleDeleteContract(contract)}
                />
              </>
            )}
          />

          {renderPaginationControls()}
        </View>
      </ScrollView>
      
      <ContractForm
        visible={showContractForm}
        onClose={handleCloseContractForm}
        onSubmit={handleSubmitContract}
        contract={editingContract}
        isLoading={isSubmitting}
      />
      
      <ConfirmDialog
        visible={showConfirmDialog}
        title="Confirmar Eliminação"
        message={`Tem certeza que deseja eliminar o contrato "${contractToDelete?.contract_number || contractToDelete?.description}"?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteContract}
        onCancel={() => setShowConfirmDialog(false)}
        isDestructive={true}
      />
      
      <ContractDetailsModal
        visible={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedContractId(null);
        }}
        contractId={selectedContractId}
      />
      
      <ContractAdvancedFilters
         visible={showAdvancedFilters}
         onClose={() => setShowAdvancedFilters(false)}
         onApplyFilters={(filters: ContractAdvancedFiltersData) => {
           setAdvancedFilters(filters);
           setShowAdvancedFilters(false);
         }}
         onClearFilters={() => {
           setAdvancedFilters({});
           setShowAdvancedFilters(false);
         }}
         initialFilters={advancedFilters}
       />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    outlineStyle: 'none',
  },
  clearSearchButton: {
    padding: 4,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  paginationContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  paginationInfo: {
    marginBottom: 12,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  paginationButton: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  paginationButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  paginationButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  paginationButtonTextActive: {
    color: '#FFFFFF',
  },
  paginationEllipsis: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  filterIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exportButtonText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    marginLeft: 6,
  },
  exportButtonTextDisabled: {
    color: '#9CA3AF',
  },
});

export default ContractsScreen;