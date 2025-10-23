import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface UltimaTableColumn {
  key: string;
  title: string;
  width?: number | string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (item: any, value: any) => React.ReactNode;
}

export interface UltimaTableProps {
  data: any[];
  columns: UltimaTableColumn[];
  loading?: boolean;
  onRowPress?: (item: any) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  emptyMessage?: string;
  keyExtractor?: (item: any, index: number) => string;
  searchPlaceholder?: string;
  onSearchChange?: (text: string) => void;
  searchValue?: string;
  actions?: (item: any) => React.ReactNode;
  showGlobalSearch?: boolean;
}

const UltimaTable: React.FC<UltimaTableProps> = ({
  data,
  columns,
  loading = false,
  onRowPress,
  onSort,
  sortColumn,
  sortDirection,
  emptyMessage = 'Nenhum item encontrado',
  keyExtractor,
  searchPlaceholder = 'Pesquisa Global',
  onSearchChange,
  searchValue = '',
  actions,
  showGlobalSearch = false,
}) => {
  const handleSort = (column: UltimaTableColumn) => {
    if (!column.sortable || !onSort) return;
    
    const newDirection = 
      sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
  };

  const renderGlobalSearch = () => {
    if (!showGlobalSearch) return null;
    
    return (
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor="#94A3B8"
          value={searchValue}
          onChangeText={onSearchChange}
        />
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.tableHeader, { flexDirection: 'row' as const }]}>
      {columns.map((column) => (
        <TouchableOpacity
          key={column.key}
          style={[
            styles.headerCell,
            {
              width: column.width || 'auto',
              minWidth: column.width || 'auto',
              maxWidth: column.width || 'auto',
              flex: column.width ? 0 : 1,
              justifyContent: 
                column.align === 'right' ? 'flex-end' : 
                column.align === 'center' ? 'center' : 
                'flex-start',
              alignItems: 'center', // Centraliza verticalmente
            }
          ]}
          onPress={() => handleSort(column)}
          disabled={!column.sortable}
          activeOpacity={column.sortable ? 0.7 : 1}
        >
          <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">
            {column.title}
          </Text>
          {column.sortable && (
            <Ionicons
              name={
                sortColumn === column.key
                  ? sortDirection === 'asc'
                    ? 'arrow-up'
                    : 'arrow-down'
                  : 'swap-vertical'
              }
              size={14}
              color={sortColumn === column.key ? '#3B82F6' : '#CBD5E1'}
              style={styles.sortIcon}
            />
          )}
        </TouchableOpacity>
      ))}
      {actions && (
        <View style={[styles.actionsHeaderCell, { alignItems: 'center' }]}>
          <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">
            AÇÕES
          </Text>
        </View>
      )}
    </View>
  );

  const renderRow = ({ item, index }: { item: any; index: number }) => {
    const RowWrapper = Platform.OS === 'web' ? View : TouchableOpacity;
    const rowProps = Platform.OS === 'web' 
      ? {
          onClick: onRowPress ? () => onRowPress(item) : undefined,
          style: [
            styles.tableRow,
            { flexDirection: 'row' as const }, // Force row direction
            index % 2 === 1 && styles.alternateRow,
            onRowPress && { cursor: 'pointer' },
          ],
        }
      : {
          onPress: () => onRowPress?.(item),
          disabled: !onRowPress,
          activeOpacity: 0.7,
          style: [
            styles.tableRow,
            { flexDirection: 'row' as const }, // Force row direction
            index % 2 === 1 && styles.alternateRow,
          ],
        };

    return (
      <RowWrapper {...rowProps as any}>
        {columns.map((column) => {
          const value = item[column.key];
          const content = column.render ? column.render(item, value) : value;
          
          // Ensure content is renderable
          let renderableContent = content;
          if (typeof content === 'object' && content !== null && !React.isValidElement(content)) {
            renderableContent = JSON.stringify(content);
          } else if (content === null || content === undefined) {
            renderableContent = '-';
          } else if (typeof content !== 'string' && typeof content !== 'number' && !React.isValidElement(content)) {
            renderableContent = String(content);
          }
          
          return (
            <View
              key={column.key}
              style={[
                styles.tableCell,
                {
                  width: column.width || 'auto',
                  minWidth: column.width || 'auto',
                  maxWidth: column.width || 'auto',
                  flex: column.width ? 0 : 1,
                  flexDirection: 'column' as const, // Explicit column for cell content
                  alignItems: 
                    column.align === 'right' ? 'flex-end' : 
                    column.align === 'center' ? 'center' : 
                    'flex-start'
                }
              ]}
            >
              {React.isValidElement(renderableContent) ? (
                renderableContent
              ) : (
                <Text style={styles.cellText} numberOfLines={2}>
                  {renderableContent}
                </Text>
              )}
            </View>
          );
        })}
        {actions && (
          <View style={styles.actionsCell}>
            {actions(item)}
          </View>
        )}
      </RowWrapper>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderGlobalSearch()}
      <View style={styles.tableContainer}>
        {renderHeader()}
        <FlatList
          data={data}
          renderItem={renderRow}
          keyExtractor={keyExtractor || ((item, index) => `${item.id || index}`)}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    outlineStyle: 'none',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'auto',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    gap: 6,
    flexWrap: 'nowrap',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  sortIcon: {
    marginLeft: 2,
    flexShrink: 0,
  },
  actionsHeaderCell: {
    width: 100,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    flexWrap: 'nowrap',
  },
  list: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 64,
    alignItems: 'center',
  },
  alternateRow: {
    backgroundColor: '#FAFBFC',
  },
  tableCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  actionsCell: {
    width: 100,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 16,
  },
});

export default UltimaTable;

