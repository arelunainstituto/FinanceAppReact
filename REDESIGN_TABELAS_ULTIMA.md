# ✨ Redesign das Tabelas - PrimeFaces Ultima

## 📋 Objetivo

Aplicar o design minimalista e profissional do template **PrimeFaces Ultima** em todas as tabelas do sistema, criando uma experiência visual moderna e consistente.

---

## 🎨 Características do Design Ultima

### Visual
- ✅ Design clean e minimalista
- ✅ Cabeçalhos em maiúsculas com ícones de ordenação
- ✅ Espaçamento generoso entre elementos
- ✅ Linhas alternadas com fundo sutil
- ✅ Bordas suaves e arredondadas
- ✅ Cores neutras e profissionais

### Componentes
- ✅ Avatares circulares com iniciais
- ✅ Badges de status coloridos
- ✅ Barras de progresso
- ✅ Botões de ação elegantes
- ✅ Campo de busca global integrado
- ✅ Paginação intuitiva

---

## 🛠️ Componentes Criados

### 1. **UltimaTable.tsx**
Componente principal de tabela com design Ultima.

**Características:**
- Busca global integrada com ícone
- Cabeçalhos ordenáveis com ícones
- Suporte para alinhamento (left, center, right)
- Linhas alternadas automáticas
- Coluna de ações customizável
- Loading state profissional
- Empty state com ícone

**Props:**
```typescript
{
  data: any[];
  columns: UltimaTableColumn[];
  loading?: boolean;
  onRowPress?: (item: any) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  actions?: (item: any) => React.ReactNode;
  showGlobalSearch?: boolean;
}
```

---

### 2. **StatusBadge.tsx**
Badges de status estilizados.

**Variantes:**
- `success` / `paid` → Verde
- `warning` / `pending` → Amarelo
- `danger` / `overdue` / `failed` → Vermelho
- `info` / `renegociated` → Azul
- `default` → Cinza

**Uso:**
```tsx
<StatusBadge label="ATIVO" variant="success" />
<StatusBadge label="PENDENTE" variant="warning" />
```

---

### 3. **Avatar.tsx**
Avatares circulares com iniciais ou imagem.

**Características:**
- Gera iniciais automaticamente (2 letras)
- Cor de fundo baseada no nome (consistente)
- Suporte para imagens
- Tamanho customizável

**Uso:**
```tsx
<Avatar name="João Silva" size={40} />
<Avatar name="Maria Santos" imageUrl="https://..." />
```

---

### 4. **ActionButton.tsx**
Botões de ação compactos e elegantes.

**Variantes:**
- `primary` → Vermelho/Rosa (ação principal)
- `secondary` → Cinza claro (ação secundária)
- `danger` → Vermelho claro (ação destrutiva)

**Uso:**
```tsx
<ActionButton icon="pencil" variant="secondary" onPress={handleEdit} />
<ActionButton icon="trash" variant="danger" onPress={handleDelete} />
```

---

### 5. **ProgressBar.tsx**
Barras de progresso com cores dinâmicas.

**Características:**
- Valor de 0-100
- Cor automática baseada no valor:
  - 75-100%: Verde
  - 50-74%: Azul
  - 25-49%: Laranja
  - 0-24%: Vermelho

**Uso:**
```tsx
<ProgressBar value={75} height={8} />
```

---

## 🎯 Telas Atualizadas

### ✅ 1. **ClientsScreen.tsx**

**Alterações:**
- Substituído `DataTable` por `UltimaTable`
- Adicionado `Avatar` na coluna de nome
- Substituído badge customizado por `StatusBadge`
- Adicionado `ActionButton` para editar/excluir
- Busca global movida para dentro da tabela
- Campo NIF adicionado

**Colunas:**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| Nome | Avatar + Texto | Nome completo com avatar |
| Email | Texto | Email do cliente |
| NIF | Texto | Número de identificação fiscal |
| Status | Badge | Status ativo/inativo |
| Ações | Botões | Editar e excluir |

---

## 📊 Comparação Antes/Depois

### Antes (DataTable)
```
❌ Design básico e genérico
❌ Sem avatares
❌ Badges básicos sem estilo
❌ Botões de ação simples
❌ Busca externa à tabela
❌ Alinhamento centralizado forçado
```

### Depois (UltimaTable)
```
✅ Design profissional Ultima
✅ Avatares com iniciais coloridas
✅ Badges modernos e coloridos
✅ Botões de ação elegantes
✅ Busca integrada na tabela
✅ Alinhamento flexível por coluna
✅ Linhas alternadas sutis
✅ Ícones de ordenação modernos
```

---

## 🎨 Paleta de Cores

### Cores Principais
```
Background:          #FFFFFF
Border:              #E2E8F0
Header Background:   #F8FAFC
Alternate Row:       #FAFBFC
```

### Texto
```
Primary:   #334155
Secondary: #64748B
Muted:     #94A3B8
```

### Status
```
Success:   #D1FAE5 / #065F46
Warning:   #FEF3C7 / #92400E
Danger:    #FEE2E2 / #991B1B
Info:      #DBEAFE / #1E40AF
Default:   #F1F5F9 / #475569
```

---

## 📁 Estrutura de Arquivos

```
FinanceERP/src/
├── components/
│   ├── UltimaTable.tsx           ← Componente principal
│   └── common/
│       ├── StatusBadge.tsx       ← Badges de status
│       ├── Avatar.tsx            ← Avatares circulares
│       ├── ActionButton.tsx      ← Botões de ação
│       └── ProgressBar.tsx       ← Barras de progresso
└── screens/
    └── ClientsScreen.tsx         ← Atualizada com novo design
```

---

## 🚀 Próximos Passos

### Pendente
- [ ] Atualizar `ContractsScreen.tsx` com UltimaTable
- [ ] Atualizar `PaymentsScreen.tsx` com UltimaTable
- [ ] Adicionar animações de hover nos botões de ação
- [ ] Implementar skeleton loading para melhor UX
- [ ] Adicionar tooltips nos botões de ação

---

## 💡 Exemplos de Uso

### Exemplo 1: Tabela Simples
```tsx
<UltimaTable
  data={clients}
  columns={columns}
  loading={isLoading}
  showGlobalSearch={true}
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
/>
```

### Exemplo 2: Tabela com Ações
```tsx
<UltimaTable
  data={clients}
  columns={columns}
  actions={(item) => (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <ActionButton icon="pencil" variant="secondary" onPress={() => edit(item)} />
      <ActionButton icon="trash" variant="danger" onPress={() => delete(item)} />
    </View>
  )}
/>
```

### Exemplo 3: Coluna com Avatar
```tsx
{
  key: 'name',
  title: 'Nome',
  render: (item) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Avatar name={item.name} size={36} />
      <Text>{item.name}</Text>
    </View>
  ),
}
```

---

## 📈 Benefícios

✅ **Visual Moderno**: Design alinhado com templates premium  
✅ **Consistência**: Mesma experiência em todas as telas  
✅ **Profissional**: Aparência de sistema enterprise  
✅ **Reutilizável**: Componentes podem ser usados em qualquer lugar  
✅ **Manutenível**: Código organizado e documentado  
✅ **Acessível**: Cores com bom contraste  
✅ **Responsivo**: Adaptado para mobile e desktop  

---

**Status**: ✅ Fase 1 Completa (Clientes)  
**Data**: 23/10/2025  
**Próximo**: Contratos e Pagamentos

