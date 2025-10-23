import React, { useState, useEffect, useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Client } from '../types';
import ApiService from '../services/api';
import Button from '../components/common/Button';
import MainLayout from '../components/layout/MainLayout';
import UltimaTable, { UltimaTableColumn } from '../components/UltimaTable';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import ActionButton from '../components/common/ActionButton';
import ClientForm from '../components/forms/ClientForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ClientAdvancedFilters from '../components/filters/ClientAdvancedFilters';
import PaginationControls from '../components/common/PaginationControls';
import { MainStackParamList } from '../navigation/AppNavigator';
import { exportClientsToCSV } from '../utils/csvExport';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;
const DEFAULT_ITEMS_PER_PAGE = isTablet ? 10 : 8;

type ClientsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Clients'>;

const ClientsScreen: React.FC = () => {
  const navigation = useNavigation<ClientsScreenNavigationProp>();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  
  // Form states
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<{
    search?: string;
    hasOverduePayments?: boolean;
    hasDueTodayPayments?: boolean;
  }>({});

  // Calculate total pages using useMemo to avoid unnecessary recalculations
  const totalPages = useMemo(() => {
    return Math.ceil(filteredClients.length / itemsPerPage);
  }, [filteredClients.length, itemsPerPage]);

  // Reset to first page if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    // Skip initial load as it's handled by the mount effect
    const delayDebounceFn = setTimeout(() => {
      loadClients();
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, appliedFilters]); // searchQuery with debounce

  // Remove the local filtering useEffect since we're now filtering on backend
  // useEffect(() => {
  //   if (!searchQuery.trim()) {
  //     setFilteredClients(clients);
  //   } else {
  //     const filtered = clients.filter(client => {
  //       const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
  //       const email = client.email?.toLowerCase() || '';
  //       const taxId = client.tax_id?.toLowerCase() || '';
  //       const query = searchQuery.toLowerCase();
  //       
  //       return fullName.includes(query) || 
  //              email.includes(query) || 
  //              taxId.includes(query);
  //     });
  //     setFilteredClients(filtered);
  //   }
  //   setCurrentPage(1); // Reset to first page when search changes
  // }, [clients, searchQuery]);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      
      // Prepare filters for backend
      const filters: any = { ...appliedFilters };
      
      // Add search query to filters if present
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      
      // Use getClients with filters
      const response = await ApiService.getClients(filters);
      
      if (response.success && response.data) {
        setClients(response.data);
        setFilteredClients(response.data); // Set filtered clients directly from backend
      } else {
        console.warn('API response not successful or no data:', response);
        setClients([]);
        setFilteredClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes. Verifique sua conexão.');
      setClients([]);
      setFilteredClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowClientForm(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleSubmitClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsSubmitting(true);
      
      if (editingClient) {
        // Update existing client
        const response = await ApiService.updateClient(editingClient.id, clientData);
        if (response.success && response.data) {
          setClients(clients.map(c => c.id === editingClient.id ? response.data : c));
          Alert.alert('Sucesso', 'Cliente actualizado com sucesso');
        } else {
          Alert.alert('Erro', 'Não foi possível actualizar o cliente');
        }
      } else {
        // Create new client
        const response = await ApiService.createClient(clientData);
        if (response.success && response.data) {
          // Reload the complete list from server to ensure data consistency
          await loadClients();
          Alert.alert('Sucesso', 'Cliente criado com sucesso');
        } else {
          Alert.alert('Erro', 'Não foi possível criar o cliente');
        }
      }
      
      setShowClientForm(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error submitting client:', error);
      Alert.alert('Erro', 'Não foi possível guardar o cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseClientForm = () => {
    setShowClientForm(false);
    setEditingClient(null);
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setShowConfirmDialog(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    
    try {
      setIsSubmitting(true);
      const response = await ApiService.deleteClient(clientToDelete.id);
      if (response.success) {
        // Recarregar os dados do servidor para garantir consistência
        // Aplicar os mesmos filtros que estão atualmente ativos
        const currentFilters: Record<string, any> = { ...appliedFilters };
        
        // Adicionar filtro de pesquisa se existir
        if (searchQuery.trim()) {
          currentFilters.search = searchQuery.trim();
        }
        
        // Recarregar clientes com os filtros atuais
        await loadClients();
        
        Alert.alert('Sucesso', 'Cliente excluído com sucesso');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      Alert.alert('Erro', 'Não foi possível excluir o cliente');
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
      setClientToDelete(null);
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      const response = await ApiService.deleteClient(clientId);
      if (response.success) {
        setClients(clients.filter(client => client.id !== clientId));
        Alert.alert('Sucesso', 'Cliente excluído com sucesso');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      Alert.alert('Erro', 'Não foi possível excluir o cliente');
    }
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    
    const sortedClients = [...clients].sort((a, b) => {
      let aValue = a[column as keyof Client] as any;
      let bValue = b[column as keyof Client] as any;
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setClients(sortedClients);
    setCurrentPage(1); // Reset to first page after sorting
  };

  const handleRowPress = (client: Client) => {
    console.log('handleRowPress called with client:', client);
    handleViewClientContracts(client);
  };

  const handleViewClientContracts = (client: Client) => {
    // Use only first name or construct full name properly handling null values
    const clientName = client.last_name 
      ? `${client.first_name} ${client.last_name}`.trim()
      : client.first_name || '';
    
    console.log('🔗 Navegando para contratos do cliente:');
    console.log('🆔 clientId:', client.id);
    console.log('👤 clientName:', clientName);
    console.log('📋 Parâmetros de navegação:', { clientId: client.id, clientName: clientName });
    
    navigation.navigate('Contracts', {
      clientId: client.id,
      clientName: clientName
    });
  };

  const handleApplyFilters = (filters: { search?: string; hasOverduePayments?: boolean; hasDueTodayPayments?: boolean }) => {
    setAppliedFilters(filters);
    setShowAdvancedFilters(false);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setAppliedFilters({});
    setSearchQuery('');
    setShowAdvancedFilters(false);
    setCurrentPage(1);
  };

  // Função para exportar clientes em CSV
  const handleExportCSV = () => {
    if (filteredClients.length === 0) {
      Alert.alert('Aviso', 'Não há dados para exportar.');
      return;
    }

    try {
      exportClientsToCSV(filteredClients);
      
      Alert.alert(
        'Sucesso', 
        `Exportação concluída! ${filteredClients.length} clientes exportados.`
      );
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      Alert.alert('Erro', 'Não foi possível exportar os dados. Tente novamente.');
    }
  };

  // Pagination functions
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredClients.slice(startIndex, endIndex);
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
    if (totalPages <= 1) return null;

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

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredClients.length)} de {filteredClients.length} clientes
          </Text>
        </View>
        
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
                onPress={() => goToPage(1)}
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
              onPress={() => goToPage(pageNumber)}
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
                onPress={() => goToPage(totalPages)}
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
      </View>
    );
  };

  const columns: UltimaTableColumn[] = [
    {
      key: 'first_name',
      title: 'Nome',
      sortable: true,
      align: 'left',
      width: '28%',
      render: (client: Client) => {
        const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'N/A';
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={fullName} size={36} />
            <Text style={{ fontSize: 14, color: '#334155', fontWeight: '500', flex: 1 }}>
              {fullName}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
      align: 'left',
      width: '30%',
      render: (client: Client) => (
        <Text style={{ fontSize: 14, color: '#64748B' }}>
          {client.email || '-'}
        </Text>
      ),
    },
    {
      key: 'tax_id',
      title: 'NIF',
      sortable: true,
      align: 'left',
      width: '18%',
      render: (client: Client) => (
        <Text style={{ fontSize: 14, color: '#64748B' }}>
          {client.tax_id || '-'}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      align: 'left',
      width: '16%',
      render: (client: Client) => (
        <StatusBadge 
          label={client.status.toUpperCase()} 
          variant={client.status === 'ativo' ? 'success' : 'default'}
        />
      ),
    },
  ];

  return (
    <MainLayout activeRoute="Clients">
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Clientes</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleExportCSV}
                disabled={filteredClients.length === 0}
              >
                <Ionicons name="download-outline" size={20} color={filteredClients.length === 0 ? '#9CA3AF' : '#059669'} />
                <Text style={[styles.exportButtonText, filteredClients.length === 0 && styles.exportButtonTextDisabled]}>
                  Exportar CSV
                </Text>
              </TouchableOpacity>
              <Button
                title="Novo Cliente"
                onPress={handleCreateClient}
                variant="primary"
              />
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Pesquisar por nome, email ou NIF..."
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
              onPress={() => setShowAdvancedFilters(true)}
            >
              <Ionicons name="filter" size={20} color="#007AFF" />
              <Text style={styles.filterButtonText}>Filtros Avançados</Text>
              {(appliedFilters.search || appliedFilters.hasOverduePayments || appliedFilters.hasDueTodayPayments) && (
                <View style={styles.filterIndicator} />
              )}
            </TouchableOpacity>
          </View>

          <UltimaTable
            data={getCurrentPageData()}
            columns={columns}
            loading={isLoading}
            onSort={handleSort}
            onRowPress={handleRowPress}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            keyExtractor={(item) => item.id}
            actions={(client: Client) => (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <ActionButton
                  icon="pencil"
                  onPress={() => handleEditClient(client)}
                  variant="secondary"
                  size={18}
                />
                <ActionButton
                  icon="trash"
                  onPress={() => handleDeleteClient(client)}
                  variant="danger"
                  size={18}
                />
              </View>
            )}
          />

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClients.length}
            itemsPerPage={itemsPerPage}
            onPageChange={goToPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            itemType="clientes"
            rowCountOptions={[5, 8, 10, 15, 20]}
          />
        </View>
      </ScrollView>

      <ClientForm
        visible={showClientForm}
        onClose={handleCloseClientForm}
        onSubmit={handleSubmitClient}
        client={editingClient}
        isLoading={isSubmitting}
      />

      <ClientAdvancedFilters
        visible={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        initialFilters={appliedFilters}
      />

      <ConfirmDialog
        visible={showConfirmDialog}
        title="Confirmar Eliminação"
        message={`Tem a certeza que deseja eliminar o cliente "${clientToDelete?.first_name} ${clientToDelete?.last_name}"?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteClient}
        onCancel={() => setShowConfirmDialog(false)}
        isDestructive={true}
        isLoading={isSubmitting}
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
  filtersRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  actionsContainer: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
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

export default ClientsScreen;