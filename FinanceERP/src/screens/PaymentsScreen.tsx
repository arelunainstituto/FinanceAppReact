import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Payment } from '../types';
import ApiService from '../services/api';
import Button from '../components/common/Button';
import MainLayout from '../components/layout/MainLayout';
import UltimaTable, { UltimaTableColumn } from '../components/UltimaTable';
import ActionButton from '../components/common/ActionButton';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dateUtils';
import { convertDateFiltersToApiFormat } from '../utils/dateFormatUtils';
import PaymentForm from '../components/forms/PaymentForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import AdvancedFilters from '../components/filters/AdvancedFilters';
import FilterChips from '../components/filters/FilterChips';
import { ManualPaymentModal } from '../components/ManualPaymentModal';
import { MainStackParamList } from '../navigation/AppNavigator';
import { exportPaymentsToCSV } from '../utils/csvExport';
import ExportConfirmModal from '../components/common/ExportConfirmModal';
import PaginationControls from '../components/common/PaginationControls';
import ImportPaymentsModal from '../components/ImportPaymentsModal';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;
const DEFAULT_ITEMS_PER_PAGE = isTablet ? 10 : 8;

type PaymentFilter = 'all' | 'pending' | 'paid' | 'overdue' | 'failed' | 'renegociado';
type PaymentsScreenRouteProp = RouteProp<MainStackParamList, 'Payments'>;

const filters = [
  { key: 'all' as PaymentFilter, label: 'Todos' },
  { key: 'pending' as PaymentFilter, label: 'Pendentes' },
  { key: 'paid' as PaymentFilter, label: 'Pagos' },
  { key: 'overdue' as PaymentFilter, label: 'Atrasados' },
  { key: 'failed' as PaymentFilter, label: 'Falhou' },
  { key: 'renegociado' as PaymentFilter, label: 'Renegociados' },
];

const PaymentsScreen: React.FC = () => {
  const route = useRoute<PaymentsScreenRouteProp>();
  const contractId = route.params?.contractId;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>('all');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [contractNumber, setContractNumber] = useState<string>('');
  
  // Pagination state from backend
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  
  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Confirm dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>({});

  // Manual payment modal state
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [selectedPaymentForManual, setSelectedPaymentForManual] = useState<Payment | null>(null);

  // Export confirmation modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);

  // Load payments on mount
  useEffect(() => {
    loadPayments();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery, contractId, advancedFilters, itemsPerPage]);

  // Load payments with debounce for search query to avoid excessive API calls
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadPayments();
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, activeFilter, searchQuery, contractId, advancedFilters, itemsPerPage]);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      
      // Prepare filters
      const filters: any = {};
      
      if (activeFilter !== 'all') {
        filters.status = activeFilter;
      }
      
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      // Merge advanced filters with field name mapping
      Object.keys(advancedFilters).forEach(key => {
        if (advancedFilters[key] !== undefined && advancedFilters[key] !== '') {
          // Map frontend field names to backend field names
          if (key === 'amount_from') {
            const numericValue = parseFloat(advancedFilters[key].replace(',', '.'));
            if (!isNaN(numericValue)) {
              filters.amount_min = numericValue;
              console.log('🔍 Setting amount_min filter:', numericValue);
            }
          } else if (key === 'amount_to') {
            const numericValue = parseFloat(advancedFilters[key].replace(',', '.'));
            if (!isNaN(numericValue)) {
              filters.amount_max = numericValue;
              console.log('🔍 Setting amount_max filter:', numericValue);
            }
          } else {
            filters[key] = advancedFilters[key];
            if (key === 'payment_type') {
              console.log('🔍 Setting payment_type filter:', advancedFilters[key]);
            }
            if (key === 'payment_method') {
              console.log('💳 Setting payment_method filter:', advancedFilters[key]);
            }
          }
        }
      });

      // Convert date filters to API format (DD/MM/YYYY → YYYY-MM-DD)
      const filtersWithConvertedDates = convertDateFiltersToApiFormat(filters);

      console.log('🔍 Final filters being sent to API:', filtersWithConvertedDates);
      
      if (contractId) {
        // Load payments for specific contract using pagination
        console.log('🔍 Loading payments for contract:', contractId);
        
        const response = await ApiService.getPaymentsByContractPaginated(
          contractId, 
          currentPage, 
          itemsPerPage,
          filtersWithConvertedDates
        );
        
        if (response.success && response.data) {
          setPayments(response.data.data);
          setTotalPages(response.data.totalPages);
          setTotalItems(response.data.total);
          setHasNextPage(response.data.hasNextPage);
          setHasPreviousPage(response.data.hasPreviousPage);
          
          console.log(`✅ Loaded ${response.data.data.length} payments for contract (page ${currentPage}/${response.data.totalPages})`);
          
          // Find the contract number for display purposes
          if (response.data.data.length > 0 && response.data.data[0].contract?.contract_number) {
            setContractNumber(response.data.data[0].contract.contract_number);
          }
        }
      } else {
        // Load all payments using pagination with filters
        console.log('🔍 Loading all payments with pagination and filters...');
        
        // Add contractId filter if needed
        if (contractId) {
          filtersWithConvertedDates.contractId = contractId;
        }
        
        const response = await ApiService.getPaymentsPaginated(
          currentPage, 
          itemsPerPage, 
          filtersWithConvertedDates
        );
        
        if (response.success && response.data) {
          setPayments(response.data.data);
          setTotalPages(response.data.totalPages);
          setTotalItems(response.data.total);
          setHasNextPage(response.data.hasNextPage);
          setHasPreviousPage(response.data.hasPreviousPage);
          
          console.log(`✅ Loaded ${response.data.data.length} payments (page ${currentPage}/${response.data.totalPages})`);
        }
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      Alert.alert('Erro', 'Falha ao carregar pagamentos');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove filterPayments function completely
  
  // Update pagination functions to use backend data
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={goToPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        itemType="pagamentos"
        rowCountOptions={[5, 8, 10, 15, 20, 25]}
      />
    );
  };

  const handleDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
    setShowConfirmDialog(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    
    try {
      const response = await ApiService.deletePayment(paymentToDelete.id);
      if (response.success) {
        // Reload data from server to ensure consistency
        await loadPayments();
        Alert.alert('Sucesso', 'Pagamento excluído com sucesso');
      } else {
        Alert.alert('Erro', 'Não foi possível excluir o pagamento');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      Alert.alert('Erro', 'Não foi possível excluir o pagamento');
    } finally {
      setShowConfirmDialog(false);
      setPaymentToDelete(null);
    }
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    // Note: Sorting will be handled by backend in future implementation
    // For now, we'll reload data to reset any client-side sorting
    loadPayments();
  };

  const handleCreatePayment = () => {
    setEditingPayment(null);
    setShowPaymentForm(true);
  };

  const handleExportCSV = async () => {
    if (totalItems === 0) {
      Alert.alert('Aviso', 'Não há dados de pagamentos para exportar.');
      return;
    }

    // Show confirmation modal
    setShowExportModal(true);
  };

  const handleConfirmExport = async () => {
    try {
      setIsExporting(true);
      setShowExportModal(false);

      // Preparar filtros para buscar todos os dados
      const filters: any = {};
      
      if (activeFilter !== 'all') {
        filters.status = activeFilter;
      }
      
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      // Merge advanced filters with field name mapping
      Object.keys(advancedFilters).forEach(key => {
        if (advancedFilters[key] !== undefined && advancedFilters[key] !== '') {
          if (key === 'amount_from') {
            const numericValue = parseFloat(advancedFilters[key].replace(',', '.'));
            if (!isNaN(numericValue)) {
              filters.amount_min = numericValue;
            }
          } else if (key === 'amount_to') {
            const numericValue = parseFloat(advancedFilters[key].replace(',', '.'));
            if (!isNaN(numericValue)) {
              filters.amount_max = numericValue;
            }
          } else {
            filters[key] = advancedFilters[key];
          }
        }
      });

      // Convert date filters to API format
      const filtersWithConvertedDates = convertDateFiltersToApiFormat(filters);

      // Usar o novo endpoint de exportação sem limite
      const response = await ApiService.getPaymentsForExport(filtersWithConvertedDates);
      
      if (response.success && response.data) {
        exportPaymentsToCSV(response.data);
        
        Alert.alert('Sucesso', `Arquivo CSV exportado com sucesso! (${response.data.length} registros)`);
      } else {
        throw new Error('Falha ao exportar dados');
      }
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      Alert.alert('Erro', 'Falha ao exportar dados para CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setShowPaymentForm(true);
  };

  const handleSubmitPayment = async (paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsSubmitting(true);
      
      if (editingPayment) {
        // Update existing payment
        const response = await ApiService.updatePayment(editingPayment.id, paymentData);
        if (response.success && response.data) {
          setPayments(payments.map(p => p.id === editingPayment.id ? response.data : p));
          Alert.alert('Sucesso', 'Pagamento actualizado com sucesso');
        }
      } else {
        // Create new payment
        const response = await ApiService.createPayment(paymentData);
        if (response.success && response.data) {
          setPayments([...payments, response.data]);
          Alert.alert('Sucesso', 'Pagamento criado com sucesso');
        }
      }
      
      setShowPaymentForm(false);
      setEditingPayment(null);
    } catch (error) {
      console.error('Error submitting payment:', error);
      Alert.alert('Erro', 'Não foi possível guardar o pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFilter = (key: keyof typeof advancedFilters) => {
    setAdvancedFilters((prev: any) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const handleClearAllFilters = () => {
    setAdvancedFilters({});
  };

  const handleClosePaymentForm = () => {
    setShowPaymentForm(false);
    setEditingPayment(null);
  };

  const handleRowPress = (payment: Payment) => {
    Alert.alert(
      'Acções do Pagamento',
      `Valor: ${formatCurrency(payment.amount)}`,
      [
        { text: 'Editar', onPress: () => handleEditPayment(payment) },
        { text: 'Eliminar', style: 'destructive', onPress: () => handleDeletePayment(payment) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const markAsPago = async (paymentId: string) => {
    try {
      const response = await ApiService.updatePayment(paymentId, { 
        status: 'paid'
        // Removido paid_amount: 0 para permitir que o backend defina automaticamente
        // tanto o paid_amount quanto o paid_date
      });
      
      if (response.success && response.data) {
        const updatedPayments = payments.map(payment => 
          payment.id === paymentId ? response.data : payment
        );
        setPayments(updatedPayments);
        Alert.alert('Sucesso', 'Pagamento marcado como pago');
      } else {
        throw new Error(response.message || 'Erro ao marcar pagamento como pago');
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o pagamento');
    }
  };

  const handleTogglePaymentStatus = async (payment: Payment) => {
    try {
      console.log('🔍 handleTogglePaymentStatus called with payment:', {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        fullPayment: payment
      });

      if (payment.status === 'paid') {
        // Se está pago, apenas marcar como pendente
        const updateData = { 
          status: 'pending', 
          paid_date: undefined,
          paid_amount: 0
        };
        
        const response = await ApiService.updatePayment(payment.id, updateData);
        
        if (response.success && response.data) {
          const updatedPayments = payments.map(p => 
            p.id === payment.id ? response.data : p
          );
          setPayments(updatedPayments);
          Alert.alert('Sucesso', 'Pagamento marcado como pendente');
        } else {
          throw new Error('Failed to update payment');
        }
      } else {
        // Verificar se o amount é válido antes de enviar
        const amountToSend = payment.amount || 0;
        console.log('💰 Amount to send:', amountToSend);
        
        if (amountToSend <= 0) {
          console.error('❌ Invalid payment amount:', amountToSend);
          Alert.alert('Erro', 'O valor do pagamento deve ser maior que zero');
          return;
        }

        // Se não está pago, usar a lógica de pagamento manual com valor total
        const response = await ApiService.processManualPayment(payment.id, amountToSend);
        
        if (response.success && response.data) {
          // Atualizar o estado local imediatamente com o pagamento atualizado
          const updatedPayments = payments.map(p => 
            p.id === payment.id ? response.data.payment : p
          );
          setPayments(updatedPayments);
          
          Alert.alert('Sucesso', response.data.message);
          
          // Recarregar para pegar possíveis novos pagamentos criados (em caso de pagamento parcial)
          if (response.data.newPayment) {
            await loadPayments();
          }
        } else {
          throw new Error(response.message || 'Erro ao processar pagamento');
        }
      }
    } catch (error) {
      console.error('Error toggling payment status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o pagamento');
    }
  };

  // Função para calcular o status real do pagamento (incluindo atrasado)
  const getPaymentStatus = (payment: Payment): string => {
    if (payment.status === 'paid' || payment.status === 'failed' || payment.status === 'renegociado') {
      return payment.status || 'pending';
    }
    
    // Se o status é 'pending', verificar se está atrasado
    if (payment.status === 'pending' && payment.due_date) {
      const today = new Date();
      const dueDate = new Date(payment.due_date);
      
      // Zerar as horas para comparar apenas as datas
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        return 'overdue';
      }
    }
    
    return payment.status || 'pending';
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'renegociado':
        return 'info';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'paid': return 'PAGO';
      case 'pending': return 'PENDENTE';
      case 'overdue': return 'ATRASADO';
      case 'renegociado': return 'RENEGOCIADO';
      case 'failed': return 'CANCELADO';
      default: return status.toUpperCase();
    }
  };

  const getFilterLabel = (filter: PaymentFilter) => {
    switch (filter) {
      case 'all': return 'Todos';
      case 'pending': return 'Pendentes';
      case 'paid': return 'Pagos';
      case 'overdue': return 'Atrasados';
      case 'failed': return 'Falhou';
      case 'renegociado': return 'Renegociados';
      default: return filter;
    }
  };

  const columns: UltimaTableColumn[] = [
    {
      key: 'contract',
      title: 'Contrato',
      width: '7%',
      align: 'left',
      sortable: false,
      render: (payment: Payment) => (
        <Text style={{ fontSize: 14, color: '#334155', fontWeight: '500' }} numberOfLines={1} ellipsizeMode="tail">
          {payment.contract?.contract_number || 'N/A'}
        </Text>
      ),
    },
    {
      key: 'client',
      title: 'Cliente',
      width: '11%',
      align: 'left',
      sortable: false,
      render: (payment: Payment) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {payment.contract?.client ? payment.contract.client.first_name : 'N/A'}
        </Text>
      ),
    },
    {
      key: 'amount',
      title: 'Valor',
      width: '7%',
      align: 'left',
      sortable: true,
      render: (payment: Payment) => (
        <Text style={{ fontSize: 14, color: '#334155', fontWeight: '600' }} numberOfLines={1} ellipsizeMode="tail">
          {formatCurrency(payment.amount || 0)}
        </Text>
      ),
    },
    {
      key: 'paid_amount',
      title: 'V. Pago',
      width: '7%',
      align: 'left',
      sortable: true,
      render: (payment: Payment) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {formatCurrency(payment.paid_amount || 0)}
        </Text>
      ),
    },
    {
      key: 'due_date',
      title: 'Vencimento',
      width: '8%',
      align: 'left',
      sortable: true,
      render: (payment: Payment) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {formatDate(payment.due_date)}
        </Text>
      ),
    },
    {
      key: 'paid_date',
      title: 'Data Pagamento',
      width: '9%',
      align: 'left',
      sortable: true,
      render: (payment: Payment) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {payment.paid_date ? formatDate(payment.paid_date) : '-'}
        </Text>
      ),
    },
    {
      key: 'created_at',
      title: 'Data Criação',
      width: '9%',
      align: 'left',
      sortable: true,
      render: (payment: Payment) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {formatDate(payment.created_at)}
        </Text>
      ),
    },
    {
      key: 'payment_type',
      title: 'Tipo',
      width: '7%',
      align: 'left',
      sortable: false,
      render: (payment: Payment) => {
        const type = payment.payment_type || 'normalPayment';
        return (
          <StatusBadge
            label={type === 'downPayment' ? 'ENTRADA' : 'PARCELA'}
            variant={type === 'downPayment' ? 'info' : 'default'}
          />
        );
      },
    },
    {
      key: 'installment',
      title: 'Nº Parcela',
      width: '6%',
      align: 'left',
      sortable: false,
      render: (payment: Payment) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {payment.notes || 'N/A'}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: '7%',
      align: 'left',
      sortable: true,
      render: (payment: Payment) => {
        const realStatus = getPaymentStatus(payment);
        return (
          <StatusBadge
            label={getStatusLabel(realStatus)}
            variant={getStatusVariant(realStatus)}
          />
        );
      },
    },
    {
      key: 'paid',
      title: 'Pago',
      width: '5%',
      align: 'left',
      sortable: false,
      render: (payment: Payment) => (
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleTogglePaymentStatus(payment)}
          disabled={payment.status === 'failed' || payment.status === 'renegociado'}
        >
          <View style={[
            styles.checkbox,
            payment.status === 'paid' && styles.checkboxChecked,
            (payment.status === 'failed' || payment.status === 'renegociado') && styles.checkboxDisabled,
          ]}>
            {payment.status === 'paid' && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
        </TouchableOpacity>
      ),
    },
    {
      key: 'payment_method',
      title: 'Método',
      width: '6%',
      align: 'left',
      sortable: false,
      render: (payment: Payment) => (
        <Text style={{ fontSize: 14, color: '#64748B' }} numberOfLines={1} ellipsizeMode="tail">
          {payment.payment_method || 'N/A'}
        </Text>
      ),
    },
  ];



  return (
    <MainLayout activeRoute="Payments">
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Pagamentos</Text>
              {contractId && contractNumber && (
                <Text style={styles.subtitle}>
                  Filtrado por contrato: {contractNumber}
                </Text>
              )}
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.importButton}
                onPress={() => setShowImportModal(true)}
              >
                <Ionicons name="cloud-upload" size={16} color="#3B82F6" />
                <Text style={styles.importButtonText}>
                  Importar Planilha
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  (!payments || payments.length === 0) && { opacity: 0.5 }
                ]}
                onPress={handleExportCSV}
                disabled={!payments || payments.length === 0}
              >
                <Ionicons name="download" size={16} color="#059669" />
                <Text style={[
                  styles.exportButtonText,
                  (!payments || payments.length === 0) && styles.exportButtonTextDisabled
                ]}>
                  Exportar CSV
                </Text>
              </TouchableOpacity>
              <Button
                title="Novo Pagamento"
                onPress={handleCreatePayment}
                variant="primary"
              />
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchTextInput}
                placeholder={contractId ? "Buscar pagamentos deste contrato..." : "Buscar por nome do cliente, número do contrato ou ID do pagamento..."}
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

          <View style={styles.filtersContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
              style={styles.basicFilters}
            >
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.basicFilterButton,
                    activeFilter === filter.key && styles.activeFilterButton,
                  ]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text
                    style={[
                      styles.basicFilterButtonText,
                      activeFilter === filter.key && styles.activeFilterButtonText,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FilterChips
            filters={advancedFilters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAllFilters}
          />

          <AdvancedFilters
            visible={showAdvancedFilters}
            onClose={() => setShowAdvancedFilters(false)}
            onApplyFilters={setAdvancedFilters}
            onClearFilters={() => setAdvancedFilters({})}
            initialFilters={advancedFilters}
          />

          <UltimaTable
            data={payments}
            columns={columns}
            loading={isLoading}
            onSort={handleSort}
            onRowPress={handleRowPress}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            keyExtractor={(item) => item.id}
            actions={(payment: Payment) => (
              <>
                {payment.status !== 'paid' && (
                  <ActionButton
                    icon="cash"
                    variant="warning"
                    onPress={() => {
                      console.log('🔍 Clicou no ícone de dinheiro para pagamento:', payment.id);
                      console.log('🔍 Payment data:', payment);
                      setSelectedPaymentForManual(payment);
                      setShowManualPaymentModal(true);
                      console.log('🔍 Modal deve estar visível agora');
                    }}
                  />
                )}
                <ActionButton
                  icon="pencil"
                  variant="primary"
                  onPress={() => handleEditPayment(payment)}
                />
                <ActionButton
                  icon="trash"
                  variant="danger"
                  onPress={() => handleDeletePayment(payment)}
                />
              </>
            )}
          />

          {renderPaginationControls()}
        </View>
      </ScrollView>
      
      <PaymentForm
        visible={showPaymentForm}
        onClose={handleClosePaymentForm}
        onSubmit={handleSubmitPayment}
        payment={editingPayment}
        isLoading={isSubmitting}
      />
      
      <ConfirmDialog
        visible={showConfirmDialog}
        title="Confirmar Eliminação"
        message={`Tem a certeza que deseja eliminar este pagamento de ${formatCurrency(paymentToDelete?.amount || 0)}?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeletePayment}
        onCancel={() => setShowConfirmDialog(false)}
        isDestructive={true}
      />

      <ManualPaymentModal
        visible={showManualPaymentModal}
        payment={selectedPaymentForManual}
        contractPositiveBalance={selectedPaymentForManual?.contract?.positive_balance || 0}
        contractNegativeBalance={selectedPaymentForManual?.contract?.negative_balance || 0}
        onClose={() => {
          console.log('🔍 Fechando modal de pagamento manual');
          setShowManualPaymentModal(false);
          setSelectedPaymentForManual(null);
        }}
        onConfirm={async (amount: number, usePositiveBalance?: number, paymentMethod?: string) => {
          console.log('🔍 Confirmando pagamento manual:', { amount, usePositiveBalance, paymentMethod });
          if (!selectedPaymentForManual) return;

          try {
            setIsLoading(true);
            
            const response = await ApiService.processManualPayment(
              selectedPaymentForManual.id, 
              amount, 
              usePositiveBalance,
              paymentMethod
            );
            
            if (response.success) {
              Alert.alert('Sucesso', response.data.message);
              setShowManualPaymentModal(false);
              setSelectedPaymentForManual(null);
              await loadPayments();
            } else {
              throw new Error(response.message || 'Erro ao processar pagamento');
            }
            
          } catch (error) {
            console.error('Erro ao processar pagamento manual:', error);
            Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao processar pagamento');
          } finally {
            setIsLoading(false);
          }
        }}
      />

      <ExportConfirmModal
        visible={showExportModal}
        totalRecords={totalItems}
        onConfirm={handleConfirmExport}
        onClose={() => setShowExportModal(false)}
        isLoading={isExporting}
      />

      <ImportPaymentsModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          loadPayments();
          setShowImportModal(false);
        }}
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
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    marginBottom: 0,
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
  basicFilters: {
    flex: 1,
  },
  filtersContent: {
    paddingRight: 16,
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
    minHeight: 36,
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
  basicFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  basicFilterButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
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
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paginationButton: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
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
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  importButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 6,
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

export default PaymentsScreen;